//! The extension's channel as a same-user Unix socket in a private folder,
//! as the local tools channel is; each accepted connection stays open.
use super::{folder, socket_path, Peer, Shared, INBOUND_LIMIT};
use std::{
    fs::{self, File},
    io::{self, Read, Write},
    net::Shutdown,
    os::fd::AsRawFd,
    os::unix::{
        fs::{FileTypeExt, MetadataExt, OpenOptionsExt, PermissionsExt},
        net::{UnixListener, UnixStream},
    },
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    time::Duration,
};

impl Peer for UnixStream {
    fn close(&self) {
        let _ = self.shutdown(Shutdown::Both);
    }
}

fn identity(path: &Path) -> Option<(u64, u64)> {
    fs::symlink_metadata(path).ok().map(|m| (m.dev(), m.ino()))
}

pub(super) struct Server {
    path: PathBuf,
    owned: (u64, u64),
    running: Arc<AtomicBool>,
    wake: UnixStream,
    _lock: File,
}
impl Server {
    pub(super) fn start(data: &Path, shared: Arc<Shared>) -> Result<Self, String> {
        let path = socket_path(data);
        crate::os::private_directory(&folder(data))?;
        let lock = File::options()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .mode(0o600)
            .custom_flags(libc::O_NOFOLLOW)
            .open(path.with_extension("lock"))
            .map_err(|_| "ChatGPT channel lock unavailable")?;
        lock.try_lock()
            .map_err(|_| "Another application owns the ChatGPT channel")?;
        if let Ok(metadata) = fs::symlink_metadata(&path) {
            if !metadata.file_type().is_socket() {
                return Err("ChatGPT channel path is occupied by another file".into());
            }
            fs::remove_file(&path).map_err(|_| "Stale ChatGPT channel unavailable")?;
        }
        let listener = UnixListener::bind(&path).map_err(|_| {
            "ChatGPT channel could not open (the data-directory path may be too long)"
        })?;
        if fs::set_permissions(&path, fs::Permissions::from_mode(0o600)).is_err() {
            let _ = fs::remove_file(&path);
            return Err("ChatGPT channel permissions unavailable".into());
        }
        let owned = identity(&path).ok_or("ChatGPT channel unavailable")?;
        listener
            .set_nonblocking(true)
            .map_err(|_| "ChatGPT channel unavailable")?;
        let (wake, wake_reader) =
            UnixStream::pair().map_err(|_| "ChatGPT channel shutdown unavailable")?;
        let running = Arc::new(AtomicBool::new(true));
        let worker_running = running.clone();
        let spawned = std::thread::Builder::new()
            .name("postpane-chatgpt".into())
            .spawn(move || {
                while worker_running.load(Ordering::Acquire) {
                    let mut events = [
                        libc::pollfd {
                            fd: listener.as_raw_fd(),
                            events: libc::POLLIN,
                            revents: 0,
                        },
                        libc::pollfd {
                            fd: wake_reader.as_raw_fd(),
                            events: libc::POLLIN,
                            revents: 0,
                        },
                    ];
                    let ready = unsafe { libc::poll(events.as_mut_ptr(), 2, -1) };
                    if ready < 0 {
                        if io::Error::last_os_error().kind() == io::ErrorKind::Interrupted {
                            continue;
                        }
                        break;
                    }
                    if events[1].revents != 0 || !worker_running.load(Ordering::Acquire) {
                        break;
                    }
                    let stream = match listener.accept() {
                        Ok((stream, _)) => stream,
                        Err(error) if error.kind() == io::ErrorKind::WouldBlock => continue,
                        Err(_) => break,
                    };
                    accept(stream, &shared);
                }
                worker_running.store(false, Ordering::Release);
            });
        if spawned.is_err() {
            if identity(&path) == Some(owned) {
                let _ = fs::remove_file(&path);
            }
            return Err("ChatGPT channel worker could not start".into());
        }
        Ok(Self {
            path,
            owned,
            running,
            wake,
            _lock: lock,
        })
    }
}
impl Drop for Server {
    fn drop(&mut self) {
        self.running.store(false, Ordering::Release);
        let _ = self.wake.write_all(&[1]);
        if identity(&self.path) == Some(self.owned) {
            let _ = fs::remove_file(&self.path);
        }
    }
}

/// Darwin accepts inherit the listener's nonblocking flag; reads block until
/// the extension writes or goes, writes give up after a while.
fn accept(stream: UnixStream, shared: &Arc<Shared>) {
    crate::os::suppress_sigpipe(stream.as_raw_fd());
    if stream.set_nonblocking(false).is_err()
        || stream
            .set_write_timeout(Some(Duration::from_secs(5)))
            .is_err()
    {
        return;
    }
    let Ok(mut reader) = stream.try_clone() else {
        return;
    };
    let id = shared.attach(Box::new(stream));
    let shared = shared.clone();
    let _ = std::thread::Builder::new()
        .name("postpane-chatgpt-reader".into())
        .spawn(move || {
            while let Ok(Some(message)) = super::read_frame(&mut reader, INBOUND_LIMIT) {
                shared.inbound(id, message);
            }
            shared.detach(id);
        });
}

/// Carries frames between Chrome (standard input and output) and the app's
/// socket as they are, until either side closes.
pub(super) fn relay(socket: &Path) -> Result<(), String> {
    let stream = UnixStream::connect(socket)
        .map_err(|_| "PostPane is not running, or its ChatGPT channel is closed".to_owned())?;
    crate::os::suppress_sigpipe(stream.as_raw_fd());
    let mut upstream = stream
        .try_clone()
        .map_err(|_| "ChatGPT channel unavailable")?;
    std::thread::spawn(move || {
        let _ = copy(&mut io::stdin().lock(), &mut upstream);
        // Chrome went: the app sees the end and lets the connection go.
        let _ = upstream.shutdown(Shutdown::Write);
    });
    let mut downstream = stream;
    copy(&mut downstream, &mut io::stdout().lock()).map_err(|_| "ChatGPT relay stopped".into())
}

/// Copies until the end, flushing each piece: standard output buffers lines,
/// and a frame has none.
fn copy(from: &mut impl Read, to: &mut impl Write) -> io::Result<()> {
    let mut buffer = [0u8; 64 * 1024];
    loop {
        let count = match from.read(&mut buffer) {
            Ok(0) => return Ok(()),
            Ok(count) => count,
            Err(error) if error.kind() == io::ErrorKind::Interrupted => continue,
            Err(error) => return Err(error),
        };
        to.write_all(&buffer[..count])?;
        to.flush()?;
    }
}
