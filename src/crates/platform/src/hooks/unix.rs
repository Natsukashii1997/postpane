use super::{now_ms, socket_path, Wake, PAYLOAD_LIMIT};
use agent_hud_core::requests::Requests;
use serde_json::{json, Value};
use std::{
    fs::{self, File},
    io::{Read, Write},
    os::{
        fd::AsRawFd,
        unix::{
            fs::{DirBuilderExt, FileTypeExt, MetadataExt, OpenOptionsExt, PermissionsExt},
            net::{UnixListener, UnixStream},
        },
    },
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, AtomicUsize, Ordering},
        mpsc::RecvTimeoutError,
        Arc,
    },
    thread::JoinHandle,
    time::Duration,
};

fn identity(path: &Path) -> Option<(u64, u64)> {
    fs::symlink_metadata(path).ok().map(|m| (m.dev(), m.ino()))
}
fn directory(path: &Path) -> Result<(), String> {
    fs::create_dir_all(path.parent().ok_or("Hooks directory unavailable")?)
        .map_err(|_| "Hooks directory unavailable")?;
    match fs::DirBuilder::new().mode(0o700).create(path) {
        Ok(()) => {}
        Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => {}
        Err(_) => return Err("Hooks directory unavailable".into()),
    }
    let metadata = fs::symlink_metadata(path).map_err(|_| "Hooks directory unavailable")?;
    if !metadata.is_dir() || metadata.uid() != unsafe { libc::getuid() } {
        return Err("Hooks directory must belong to the current user".into());
    }
    fs::set_permissions(path, fs::Permissions::from_mode(0o700))
        .map_err(|_| "Hooks directory permissions unavailable".into())
}

pub(crate) struct Server {
    path: PathBuf,
    owned: (u64, u64),
    running: Arc<AtomicBool>,
    wake: UnixStream,
    worker: Option<JoinHandle<()>>,
    _lock: File,
}
impl Server {
    pub fn start(
        data: &Path,
        requests: Requests,
        wake: Wake,
        reminders: super::reminders::Reminders,
    ) -> Result<Self, String> {
        let path = socket_path(data);
        directory(path.parent().ok_or("Hooks directory unavailable")?)?;
        let lock = File::options()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .mode(0o600)
            .custom_flags(libc::O_NOFOLLOW)
            .open(path.with_extension("lock"))
            .map_err(|_| "Hooks owner lock unavailable")?;
        if lock
            .metadata()
            .map_err(|_| "Hooks owner lock unavailable")?
            .uid()
            != unsafe { libc::getuid() }
        {
            return Err("Hooks owner lock belongs to another user".into());
        }
        lock.try_lock()
            .map_err(|_| "Another application owns the Agent HUD hooks channel")?;
        if let Ok(metadata) = fs::symlink_metadata(&path) {
            if !metadata.file_type().is_socket() || metadata.uid() != unsafe { libc::getuid() } {
                return Err("Hooks socket path is occupied by another file".into());
            }
            fs::remove_file(&path).map_err(|_| "Stale hooks channel unavailable")?;
        }
        let listener = UnixListener::bind(&path)
            .map_err(|error| format!("Hooks channel could not open: {error} (check permissions and the Unix socket path length)"))?;
        fs::set_permissions(&path, fs::Permissions::from_mode(0o600))
            .map_err(|_| "Hooks channel permissions unavailable")?;
        let owned = identity(&path).ok_or("Hooks channel unavailable")?;
        listener
            .set_nonblocking(true)
            .map_err(|_| "Hooks channel unavailable")?;
        let (signal, signal_reader) =
            UnixStream::pair().map_err(|_| "Hooks shutdown channel unavailable")?;
        let running = Arc::new(AtomicBool::new(true));
        let alive = running.clone();
        let worker = std::thread::Builder::new()
            .name("agenthud-hooks".into())
            .spawn(move || {
                let active = Arc::new(AtomicUsize::new(0));
                let mut workers: Vec<JoinHandle<()>> = Vec::new();
                while alive.load(Ordering::Acquire) {
                    let mut descriptors = [
                        libc::pollfd {
                            fd: listener.as_raw_fd(),
                            events: libc::POLLIN,
                            revents: 0,
                        },
                        libc::pollfd {
                            fd: signal_reader.as_raw_fd(),
                            events: libc::POLLIN,
                            revents: 0,
                        },
                    ];
                    let ready = unsafe { libc::poll(descriptors.as_mut_ptr(), 2, -1) };
                    if ready < 0 {
                        if std::io::Error::last_os_error().kind() == std::io::ErrorKind::Interrupted
                        {
                            continue;
                        }
                        break;
                    }
                    if descriptors[1].revents != 0 || !alive.load(Ordering::Acquire) {
                        break;
                    }
                    let Ok((stream, _)) = listener.accept() else {
                        continue;
                    };
                    if active.load(Ordering::Acquire) >= 64 {
                        continue;
                    }
                    workers.retain(|worker| !worker.is_finished());
                    let requests = requests.clone();
                    let wake = wake.clone();
                    let reminders = reminders.clone();
                    let alive = alive.clone();
                    let count = active.clone();
                    count.fetch_add(1, Ordering::AcqRel);
                    let count_on_error = count.clone();
                    match std::thread::Builder::new()
                        .name("agenthud-hook-call".into())
                        .spawn(move || {
                            serve(stream, requests, wake, reminders, &alive);
                            count.fetch_sub(1, Ordering::AcqRel);
                        }) {
                        Ok(worker) => workers.push(worker),
                        Err(_) => {
                            count_on_error.fetch_sub(1, Ordering::AcqRel);
                        }
                    }
                }
                alive.store(false, Ordering::Release);
                for worker in workers {
                    let _ = worker.join();
                }
            })
            .map_err(|_| "Hooks worker could not start")?;
        Ok(Self {
            path,
            owned,
            running,
            wake: signal,
            worker: Some(worker),
            _lock: lock,
        })
    }
    pub fn is_listening(&self) -> bool {
        self.running.load(Ordering::Acquire)
    }
}
impl Drop for Server {
    fn drop(&mut self) {
        self.running.store(false, Ordering::Release);
        let _ = self.wake.write_all(&[1]);
        if let Some(worker) = self.worker.take() {
            let _ = worker.join();
        }
        if identity(&self.path) == Some(self.owned) {
            let _ = fs::remove_file(&self.path);
        }
    }
}

fn serve(
    mut stream: UnixStream,
    requests: Requests,
    wake: Wake,
    reminders: super::reminders::Reminders,
    running: &AtomicBool,
) {
    if stream.set_nonblocking(false).is_err() {
        return;
    }
    let _ = stream.set_read_timeout(Some(Duration::from_secs(2)));
    let _ = stream.set_write_timeout(Some(Duration::from_secs(2)));
    let Some(bytes) = read_frame(&mut stream, running) else {
        return;
    };
    let Ok(message) = serde_json::from_slice::<Value>(&bytes) else {
        return;
    };
    let (Some(source), Some(flag), Some(payload)) = (
        message.get("source").and_then(Value::as_str),
        message.get("flag").and_then(Value::as_str),
        message.get("payload"),
    ) else {
        return;
    };
    if !running.load(Ordering::Acquire) {
        return;
    }
    if flag != "--permission-hook" {
        // Reporting facts were atomically committed by the callback, even if
        // the application was absent. This connection merely accelerates wake.
        reminders.record(source, flag, payload);
        wake();
        let _ = stream.write_all(b"{}\n");
        return;
    }
    // A request PostPane leaves to the client (one it cannot answer, or a
    // turn with no user reviewer) is handed back with `{}` at once: closing
    // without a word would read as PostPane quitting, and the callback would
    // put it again and again (#222).
    let Ok(Some(request)) = agent_hud_agents::parse_request(source, payload) else {
        hand_back(&mut stream, running);
        return;
    };
    if request.requires_user_reviewer
        && !super::reviewer::is_user(&requests, &request.source, payload)
    {
        hand_back(&mut stream, running);
        return;
    }
    reminders.record(source, flag, payload);
    let ticket = requests.register(request, now_ms());
    // PostPane ended the request itself (its wait ran out, or it was settled
    // elsewhere): the callback is told so with `{}`. Closing without a word
    // means PostPane went away, and the callback asks the next one (#174).
    let mut ended = false;
    loop {
        if !running.load(Ordering::Acquire) || disconnected(&stream) {
            break;
        }
        match ticket.response.recv_timeout(Duration::from_millis(100)) {
            Ok(Some(response)) => {
                let _ = serde_json::to_writer(&mut stream, &response);
                let _ = stream.write_all(b"\n");
                break;
            }
            Ok(None) => {
                ended = true;
                break;
            }
            Err(RecvTimeoutError::Disconnected) => break,
            Err(RecvTimeoutError::Timeout) => {
                if requests
                    .deadline(&ticket.id)
                    .is_none_or(|deadline| now_ms() >= deadline)
                {
                    ended = true;
                    break;
                }
            }
        }
    }
    requests.cancel(&ticket.id);
    if ended {
        hand_back(&mut stream, running);
    }
}
/// Tells the callback PostPane gives no decision, so the client asks itself;
/// only a PostPane on its way out closes without a word (#174).
fn hand_back(stream: &mut UnixStream, running: &AtomicBool) {
    if running.load(Ordering::Acquire) {
        let _ = stream.write_all(b"{}\n");
    }
}
fn read_frame(stream: &mut UnixStream, running: &AtomicBool) -> Option<Vec<u8>> {
    let deadline = std::time::Instant::now() + Duration::from_secs(2);
    let mut bytes = Vec::new();
    while bytes.len() <= PAYLOAD_LIMIT && running.load(Ordering::Acquire) {
        let remaining = deadline.saturating_duration_since(std::time::Instant::now());
        if remaining.is_zero() {
            return None;
        }
        stream
            .set_read_timeout(Some(remaining.min(Duration::from_millis(100))))
            .ok()?;
        let mut chunk = [0u8; 8192];
        match stream.read(&mut chunk) {
            Ok(0) => return None,
            Ok(n) => {
                bytes.extend_from_slice(&chunk[..n]);
                if let Some(end) = bytes.iter().position(|b| *b == b'\n') {
                    return (end + 1 == bytes.len() && bytes.len() <= PAYLOAD_LIMIT)
                        .then_some(bytes);
                }
            }
            Err(e)
                if matches!(
                    e.kind(),
                    std::io::ErrorKind::WouldBlock
                        | std::io::ErrorKind::TimedOut
                        | std::io::ErrorKind::Interrupted
                ) =>
            {
                continue
            }
            Err(_) => return None,
        }
    }
    None
}
fn disconnected(stream: &UnixStream) -> bool {
    let mut byte = 0u8;
    let count = unsafe {
        libc::recv(
            stream.as_raw_fd(),
            (&mut byte as *mut u8).cast(),
            1,
            libc::MSG_PEEK | libc::MSG_DONTWAIT,
        )
    };
    count >= 0
        || !matches!(
            std::io::Error::last_os_error().kind(),
            std::io::ErrorKind::WouldBlock | std::io::ErrorKind::Interrupted
        )
}

pub(crate) fn send(
    data: &Path,
    source: &str,
    flag: &str,
    payload: &Value,
    origin: Option<Value>,
) -> Result<Option<Value>, String> {
    let message = json!({"source":source,"flag":flag,"payload":payload,"origin":origin});
    let mut bytes = serde_json::to_vec(&message).map_err(|_| "Invalid hook callback")?;
    bytes.push(b'\n');
    if bytes.len() > PAYLOAD_LIMIT {
        return Err("Hook callback is too large".into());
    }
    if flag != "--permission-hook" {
        let stream = connect(data, &bytes, Duration::from_secs(3))?;
        let mut response = Vec::new();
        stream
            .take((PAYLOAD_LIMIT + 1) as u64)
            .read_to_end(&mut response)
            .map_err(|_| "Hook response did not complete")?;
        return finish(response);
    }
    let mut transcript = if super::settles_in_transcript(source) {
        super::transcript::Transcript::new(payload)
    } else {
        None
    };
    let deadline = std::time::Instant::now() + Duration::from_secs(86_405);
    let mut stream = connect(data, &bytes, Duration::from_millis(100))?;
    loop {
        match wait(&mut stream, &mut transcript, deadline)? {
            Waited::Answer(response) => return finish(response),
            Waited::Over => return Ok(None),
            // PostPane quit with the request open, as installing a new version
            // does: put it to the PostPane that comes back (#174).
            Waited::Gone => match reconnect(data, &bytes, &mut transcript, deadline) {
                Some(next) => stream = next,
                None => return Ok(None),
            },
        }
    }
}

/// How long a request waits for PostPane to come back after it quit; an
/// update restarts it within seconds. Past this the client asks on its own,
/// unless the user chose to wait until answered (「一直等」, #184).
const RETURN_WAIT: Duration = Duration::from_secs(120);

/// Whether the saved settings say approvals wait until answered: PostPane's
/// `approvalWaitMinutes` of 0. Read when PostPane is gone, so it is the file.
fn waits_until_answered(data: &Path) -> bool {
    std::fs::read(data.join("settings.json"))
        .ok()
        .and_then(|bytes| serde_json::from_slice::<Value>(&bytes).ok())
        .is_some_and(|saved| saved["settings"]["approvalWaitMinutes"] == 0)
}

fn connect(data: &Path, bytes: &[u8], read: Duration) -> Result<UnixStream, String> {
    let mut stream = UnixStream::connect(socket_path(data))
        .map_err(|_| "Agent HUD hooks are disabled or not running")?;
    stream
        .set_write_timeout(Some(Duration::from_secs(2)))
        .map_err(|_| "Hook timeout unavailable")?;
    stream
        .set_read_timeout(Some(read))
        .map_err(|_| "Hook timeout unavailable")?;
    // Keep the write side open: EOF means the waiting CLI was cancelled. The
    // JSONL request already frames its payload without requiring a half-close.
    stream
        .write_all(bytes)
        .map_err(|_| "Hook callback failed")?;
    Ok(stream)
}

enum Waited {
    /// PostPane's answer, or `{}` when it ended the request itself.
    Answer(Vec<u8>),
    /// Answered in the client's own window, or waited the longest a client does.
    Over,
    /// PostPane closed without a word: it quit.
    Gone,
}

fn wait(
    stream: &mut UnixStream,
    transcript: &mut Option<super::transcript::Transcript>,
    deadline: std::time::Instant,
) -> Result<Waited, String> {
    let mut response = Vec::new();
    loop {
        if transcript.as_mut().is_some_and(|watch| watch.settled())
            || std::time::Instant::now() >= deadline
        {
            return Ok(Waited::Over);
        }
        let mut chunk = [0u8; 8192];
        match stream.read(&mut chunk) {
            Ok(0) if response.is_empty() => return Ok(Waited::Gone),
            Ok(0) => return Ok(Waited::Answer(response)),
            Ok(n) => {
                response.extend_from_slice(&chunk[..n]);
                if response.len() > PAYLOAD_LIMIT {
                    return Err("Hook response is too large".into());
                }
            }
            Err(e)
                if matches!(
                    e.kind(),
                    std::io::ErrorKind::WouldBlock
                        | std::io::ErrorKind::TimedOut
                        | std::io::ErrorKind::Interrupted
                ) =>
            {
                continue
            }
            Err(e) if e.kind() == std::io::ErrorKind::ConnectionReset && response.is_empty() => {
                return Ok(Waited::Gone)
            }
            Err(_) => return Err("Hook response did not complete".into()),
        }
    }
}

fn reconnect(
    data: &Path,
    bytes: &[u8],
    transcript: &mut Option<super::transcript::Transcript>,
    deadline: std::time::Instant,
) -> Option<UnixStream> {
    let give_up = if waits_until_answered(data) {
        deadline
    } else {
        (std::time::Instant::now() + RETURN_WAIT).min(deadline)
    };
    loop {
        std::thread::sleep(Duration::from_millis(500));
        if transcript.as_mut().is_some_and(|watch| watch.settled())
            || std::time::Instant::now() >= give_up
        {
            return None;
        }
        if let Ok(stream) = connect(data, bytes, Duration::from_millis(100)) {
            return Some(stream);
        }
    }
}

fn finish(response: Vec<u8>) -> Result<Option<Value>, String> {
    if response.len() > PAYLOAD_LIMIT {
        return Err("Hook response is too large".into());
    }
    if response.is_empty() {
        Ok(None)
    } else {
        serde_json::from_slice(&response)
            .map(Some)
            .map_err(|_| "Invalid hook response".into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Instant;

    fn permission() -> Value {
        json!({
            "session_id": "session-174",
            "hook_event_name": "PermissionRequest",
            "tool_name": "Bash",
            "tool_input": {"command": "git branch -D claude/174"},
            "cwd": "/"
        })
    }

    fn open(data: &Path, requests: &Requests) -> Server {
        Server::start(
            data,
            requests.clone(),
            Arc::new(|| {}),
            super::super::reminders::Reminders::default(),
        )
        .unwrap()
    }

    fn waiting(requests: &Requests) -> Vec<String> {
        let until = Instant::now() + Duration::from_secs(10);
        loop {
            let ids: Vec<String> = requests
                .views(now_ms())
                .iter()
                .filter_map(|view| view["id"].as_str().map(str::to_owned))
                .collect();
            if !ids.is_empty() || Instant::now() >= until {
                return ids;
            }
            std::thread::sleep(Duration::from_millis(20));
        }
    }

    fn ask(data: &Path) -> std::thread::JoinHandle<Result<Option<Value>, String>> {
        let data = data.to_owned();
        std::thread::spawn(move || send(&data, "claude", "--permission-hook", &permission(), None))
    }

    #[test]
    fn a_request_open_when_postpane_restarts_is_put_to_the_new_one() {
        let dir = tempfile::tempdir().unwrap();
        let first = Requests::default();
        let server = open(dir.path(), &first);
        let callback = ask(dir.path());
        assert_eq!(waiting(&first).len(), 1, "the sidebar shows it");

        // Installing a new version quits PostPane with the request open…
        drop(server);
        std::thread::sleep(Duration::from_millis(300));
        assert!(!callback.is_finished(), "the callback waits for PostPane");

        // …and the PostPane that comes back shows it again.
        let second = Requests::default();
        let _server = open(dir.path(), &second);
        let ids = waiting(&second);
        assert_eq!(ids.len(), 1, "put to the new PostPane");
        second
            .answer(&ids[0], &json!({"kind": "allow"}), now_ms())
            .unwrap();
        let response = callback.join().unwrap().unwrap().expect("its answer");
        assert_eq!(
            response["hookSpecificOutput"]["decision"]["behavior"],
            "allow"
        );
    }

    #[test]
    fn a_request_postpane_ends_itself_goes_back_to_the_client_once() {
        let dir = tempfile::tempdir().unwrap();
        let requests = Requests::default();
        let _server = open(dir.path(), &requests);
        requests.set_hold_ms(1);
        let callback = ask(dir.path());
        let response = callback.join().unwrap().unwrap();
        assert_eq!(response, Some(json!({})), "no decision: the client asks");
        std::thread::sleep(Duration::from_millis(300));
        assert!(requests.views(now_ms()).is_empty(), "not put again");
    }

    #[test]
    fn a_request_postpane_leaves_alone_goes_straight_back_to_the_client() {
        let dir = tempfile::tempdir().unwrap();
        let requests = Requests::default();
        let _server = open(dir.path(), &requests);
        // A plan Qoder keeps for itself, and a Codex turn with no user
        // reviewer: PostPane is up but does not take either (#222).
        let plan = json!({"session_id": "s", "tool_name": "ExitPlanMode", "tool_input": {}});
        let automatic = permission();
        for (source, payload) in [("qoder", plan), ("codex", automatic)] {
            let data = dir.path().to_owned();
            let callback = std::thread::spawn(move || {
                send(&data, source, "--permission-hook", &payload, None)
            });
            let until = Instant::now() + Duration::from_secs(2);
            while !callback.is_finished() && Instant::now() < until {
                std::thread::sleep(Duration::from_millis(20));
            }
            assert!(
                callback.is_finished(),
                "{source}: handed back at once, not reconnecting"
            );
            let response = callback.join().unwrap().unwrap();
            assert_eq!(response, Some(json!({})), "{source}: the client asks");
            assert!(requests.views(now_ms()).is_empty(), "{source}: no card");
        }
    }

    #[test]
    fn waiting_until_answered_never_runs_out() {
        let requests = Requests::default();
        requests.set_hold_ms(0);
        let dir = tempfile::tempdir().unwrap();
        let _server = open(dir.path(), &requests);
        let callback = ask(dir.path());
        let ids = waiting(&requests);
        assert_eq!(ids.len(), 1);
        requests.expire(now_ms() + 30 * 86_400_000);
        assert_eq!(waiting(&requests), ids, "still waiting a month on");
        requests
            .answer(&ids[0], &json!({"kind": "deny"}), now_ms())
            .unwrap();
        assert!(callback.join().unwrap().unwrap().is_some());
    }

    #[test]
    fn a_request_waits_for_postpane_past_two_minutes_only_when_set_to_wait_until_answered() {
        let dir = tempfile::tempdir().unwrap();
        assert!(
            !waits_until_answered(dir.path()),
            "no settings: two minutes"
        );
        for (minutes, waits) in [(0, true), (10, false)] {
            std::fs::write(
                dir.path().join("settings.json"),
                json!({"settings": {"approvalWaitMinutes": minutes}, "providers": {}}).to_string(),
            )
            .unwrap();
            assert_eq!(waits_until_answered(dir.path()), waits, "{minutes} minutes");
        }
    }
}
