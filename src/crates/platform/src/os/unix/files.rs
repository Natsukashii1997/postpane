//! Owner-only files on POSIX hosts: mode bits and the effective user ID.
use std::{
    fs,
    io::{self, Read},
    os::fd::{AsRawFd, RawFd},
    os::unix::fs::{DirBuilderExt, MetadataExt, OpenOptionsExt, PermissionsExt},
    path::Path,
    time::{Duration, Instant},
};

/// A directory only this user can open (0700), created when absent. A symlink
/// or another user's directory is refused.
pub(crate) fn private_directory(path: &Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|_| "The private directory is unavailable")?;
    }
    match fs::DirBuilder::new().mode(0o700).create(path) {
        Ok(()) => {}
        Err(error) if error.kind() == io::ErrorKind::AlreadyExists => {}
        Err(_) => return Err("The private directory is unavailable".into()),
    }
    let metadata =
        fs::symlink_metadata(path).map_err(|_| "The private directory is unavailable")?;
    if !metadata.is_dir() || !owned_by_user(path, &metadata) {
        return Err("The private directory must be a directory of the current user".into());
    }
    if metadata.permissions().mode() & 0o777 != 0o700 {
        fs::set_permissions(path, fs::Permissions::from_mode(0o700))
            .map_err(|_| "The private directory could not be protected")?;
    }
    Ok(())
}

pub(crate) fn owned_by_user(_path: &Path, metadata: &fs::Metadata) -> bool {
    metadata.uid() == unsafe { libc::geteuid() }
}

/// Owned by this user and closed to group and others.
pub(crate) fn owner_only(path: &Path, metadata: &fs::Metadata) -> bool {
    owned_by_user(path, metadata) && metadata.permissions().mode() & 0o077 == 0
}

/// Opens a private read/write file without following a symlink. Existing files
/// are preserved; callers that need exclusive creation pass `create_new`.
pub(crate) fn private_file(path: &Path, create_new: bool) -> io::Result<fs::File> {
    let mut options = fs::OpenOptions::new();
    options
        .read(true)
        .write(true)
        .mode(0o600)
        .custom_flags(libc::O_NOFOLLOW);
    if create_new {
        options.create_new(true);
    } else {
        options.create(true).truncate(false);
    }
    options.open(path)
}

/// A file only this user can read or write, opened to append: each write
/// lands whole at the end, so two writers never overwrite each other.
pub(crate) fn private_append(path: &Path) -> io::Result<fs::File> {
    fs::OpenOptions::new()
        .append(true)
        .create(true)
        .mode(0o600)
        .custom_flags(libc::O_NOFOLLOW)
        .open(path)
}

/// A hook payload from stdin, or Err after five seconds or past `limit` bytes.
pub(crate) fn read_stdin(bytes: &mut Vec<u8>, limit: usize) -> Result<(), ()> {
    use std::os::fd::AsRawFd;
    let stdin = io::stdin();
    let mut stdin = stdin.lock();
    let deadline = Instant::now() + Duration::from_secs(5);
    while bytes.len() <= limit {
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            return Err(());
        }
        let mut descriptor = libc::pollfd {
            fd: stdin.as_raw_fd(),
            events: libc::POLLIN,
            revents: 0,
        };
        let ready = unsafe {
            libc::poll(
                &mut descriptor,
                1,
                remaining.as_millis().min(i32::MAX as u128) as i32,
            )
        };
        if ready < 0 && io::Error::last_os_error().kind() == io::ErrorKind::Interrupted {
            continue;
        }
        if ready <= 0 {
            return Err(());
        }
        let mut chunk = [0; 8192];
        match stdin.read(&mut chunk) {
            Ok(0) => return Ok(()),
            Ok(n) => bytes.extend_from_slice(&chunk[..n]),
            Err(_) => return Err(()),
        }
    }
    Err(())
}

/// The client's hook command runs the executable through the user's POSIX shell.
pub(crate) fn hook_configuration(
    source: &str,
    flag: &str,
    current: &serde_json::Value,
    executable: Option<&Path>,
) -> Result<serde_json::Value, String> {
    let command = executable.map(|executable| {
        format!(
            "'{}' {} {}",
            executable.to_string_lossy().replace('\'', "'\\''"),
            flag,
            source
        )
    });
    agent_hud_agents::patch_configuration(source, flag, current, command.as_deref())
}

/// Standard error from here on is `file` (#486): what the app, its panics and
/// the libraries under it write there lands in the file instead.
pub(crate) fn capture_stderr(file: &fs::File) -> io::Result<()> {
    point(libc::STDERR_FILENO, file)
}

/// Makes `descriptor` another name for `file`.
fn point(descriptor: RawFd, file: &fs::File) -> io::Result<()> {
    if unsafe { libc::dup2(file.as_raw_fd(), descriptor) } == -1 {
        return Err(io::Error::last_os_error());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{io::Write, os::fd::FromRawFd};

    #[test]
    fn a_descriptor_pointed_at_a_file_writes_into_it() {
        let folder = tempfile::tempdir().unwrap();
        let (first, log) = (folder.path().join("first"), folder.path().join("log"));
        // A stand-in for standard error: a descriptor open on another file.
        let stand_in = fs::File::create(&first).unwrap();
        let kept = private_append(&log).unwrap();
        point(stand_in.as_raw_fd(), &kept).unwrap();
        let mut writer = unsafe { fs::File::from_raw_fd(libc::dup(stand_in.as_raw_fd())) };
        writer.write_all(b"went wrong\n").unwrap();
        assert_eq!(fs::read_to_string(&log).unwrap(), "went wrong\n");
        assert_eq!(fs::read_to_string(&first).unwrap(), "");
    }
}
