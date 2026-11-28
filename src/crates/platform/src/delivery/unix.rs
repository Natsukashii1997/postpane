//! Private files and command lines on macOS and Linux.
use super::Result;
use std::{
    fs,
    os::unix::fs::{OpenOptionsExt, PermissionsExt},
    path::{Path, PathBuf},
};

/// Makes `path` and the folders above it, and closes it to everyone but this
/// user (0700).
pub fn private_dir(path: &Path) -> Result<()> {
    fs::create_dir_all(path)?;
    fs::set_permissions(path, fs::Permissions::from_mode(0o700))?;
    Ok(())
}

/// Options that create a new file to write, readable only by this user (0600).
pub(crate) fn new_file_options() -> fs::OpenOptions {
    let mut options = fs::OpenOptions::new();
    options.write(true).create_new(true);
    options.mode(0o600);
    options
}

/// Whether an environment key names the command search path: `PATH`, as
/// written.
pub(crate) fn is_path_key(key: &str) -> bool {
    key == "PATH"
}

/// Where command lines are installed that a GUI app's `PATH` lacks: Homebrew's
/// folder and `/usr/local/bin`.
pub(crate) fn command_folders() -> Vec<PathBuf> {
    vec![
        PathBuf::from("/opt/homebrew/bin"),
        PathBuf::from("/usr/local/bin"),
    ]
}

#[cfg(test)]
mod tests {
    use super::super::process::{CommandPlan, NativeProcessRunner, ProcessRunner};
    use super::*;
    use std::time::Duration;

    /// What a background process prints (an `agy` start's whole turn) is
    /// readable by this user only.
    #[test]
    fn a_background_processs_log_is_readable_by_this_user_only() {
        let folder = tempfile::tempdir().unwrap();
        let logs = folder.path().join("agy-starts");
        private_dir(&logs).unwrap();
        let log = logs.join("stream.ndjson");
        let plan = CommandPlan {
            executable: "/bin/echo".into(),
            arguments: vec!["hi".into()],
            directory: None,
            environment: Default::default(),
            timeout: Duration::from_secs(5),
        };
        let mut echo = NativeProcessRunner.spawn(&plan, &log).unwrap();
        while echo.running() {
            std::thread::sleep(Duration::from_millis(20));
        }
        let mode = |path: &Path| fs::metadata(path).unwrap().permissions().mode() & 0o777;
        assert_eq!(mode(&logs), 0o700);
        assert_eq!(mode(&log), 0o600);
        assert_eq!(fs::read_to_string(&log).unwrap(), "hi\n");
    }
}
