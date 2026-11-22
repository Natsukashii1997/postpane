//! Shared POSIX process transport. Host-specific command sources live beside
//! each host module; provider identity/flags remain in the account adapter.
use super::{Environment, ProcessInfo};
mod files;
pub(crate) use files::{
    capture_stderr, hook_configuration, owned_by_user, owner_only, private_append,
    private_directory, private_file, read_stdin,
};
use std::{
    collections::HashMap,
    ffi::OsStr,
    fs,
    io::Read,
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::mpsc,
    time::{Duration, Instant},
};

pub(crate) fn environment_value<'a>(env: &'a Environment, key: &str) -> Option<&'a str> {
    env.get(key).map(String::as_str)
}
pub(crate) fn is_shell(path: &Path) -> bool {
    matches!(path.to_str(), Some("/bin/sh" | "/bin/bash" | "/bin/zsh"))
}
pub(super) fn executable(path: &Path) -> bool {
    use std::os::unix::fs::PermissionsExt;
    fs::metadata(path)
        .is_ok_and(|metadata| metadata.is_file() && metadata.permissions().mode() & 0o111 != 0)
}
/// Starts `command` as the leader of a process group of its own, so ending it
/// (`kill_process_tree`) also ends what it started.
pub(crate) fn isolate_process_tree(command: &mut Command) {
    use std::os::unix::process::CommandExt;
    command.process_group(0);
}
/// Ends a child started with `isolate_process_tree`, and every process still
/// in its group, such as a helper holding the child's output open. Only that
/// one group, and only while the child is not reaped yet: until then its pid,
/// which is the group's id, can belong to nothing else.
pub(crate) fn kill_process_tree(child: &mut Child) {
    if let Ok(pid) = libc::pid_t::try_from(child.id()) {
        // SAFETY: a zeroed siginfo_t is valid; WNOWAIT leaves the child as it
        // is, so `Child::wait` still reaps it.
        let unreaped = unsafe {
            let mut info: libc::siginfo_t = std::mem::zeroed();
            libc::waitid(
                libc::P_PID,
                pid as libc::id_t,
                &mut info,
                libc::WEXITED | libc::WNOHANG | libc::WNOWAIT,
            ) == 0
        };
        if unreaped {
            // SAFETY: signals the child's own group, checked above.
            unsafe { libc::killpg(pid, libc::SIGKILL) };
        }
    }
    let _ = child.kill();
}
fn script_command(script: &str, args: &[&OsStr]) -> Command {
    let mut command = Command::new("/bin/sh");
    command
        .args(["-c", script, "agenthud-os"])
        .args(args)
        .stdin(Stdio::null())
        .stderr(Stdio::null());
    command
}
/// Errs with why, for the log: the caller says what failed (#517).
pub(super) fn spawn_script(script: &str, args: &[&OsStr]) -> Result<(), String> {
    // Starting sh only proves the wrapper exists. Report success only after the
    // actual fixed operation exits successfully within the existing bound.
    run(script, args, BOUND)
        .map(|_| ())
        .map_err(|failure| failure.to_string())
}
fn inspect(script: &str, args: &[&OsStr]) -> Result<String, String> {
    run(script, args, BOUND).map_err(|failure| match failure {
        Failure::Start => "Local service process inspection is unavailable.".to_owned(),
        _ => "Local service process inspection did not complete.".to_owned(),
    })
}
const BOUND: Duration = Duration::from_secs(3);
/// Which way a script failed. None carries its output.
enum Failure {
    Start,
    Wait(std::io::ErrorKind),
    Timeout(Duration),
    Status(std::process::ExitStatus),
    Output,
}
impl std::fmt::Display for Failure {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Start => f.write_str("could not start"),
            Self::Wait(kind) => write!(f, "could not be waited for ({kind})"),
            Self::Timeout(bound) => write!(f, "did not finish within {bound:?} and was ended"),
            Self::Status(status) => write!(f, "exited with {status}"),
            Self::Output => f.write_str("its output could not be read"),
        }
    }
}
/// Output may contain a local token. It stays in memory, bounded to 2 MiB,
/// and is never copied into errors or diagnostics.
fn run(script: &str, args: &[&OsStr], bound: Duration) -> Result<String, Failure> {
    let mut child = script_command(script, args)
        .stdout(Stdio::piped())
        .spawn()
        .map_err(|_| Failure::Start)?;
    let Some(output) = child.stdout.take() else {
        let _ = child.kill();
        let _ = child.wait();
        return Err(Failure::Start);
    };
    let (sender, receiver) = mpsc::sync_channel(1);
    const LIMIT: u64 = 2 * 1024 * 1024;
    if std::thread::Builder::new()
        .name("agenthud-os-inspect".into())
        .spawn(move || {
            let mut bytes = Vec::new();
            let result = output.take(LIMIT + 1).read_to_end(&mut bytes);
            let _ = sender.send((result.is_ok(), bytes));
        })
        .is_err()
    {
        let _ = child.kill();
        let _ = child.wait();
        return Err(Failure::Start);
    }
    let deadline = Instant::now() + bound;
    let ended = loop {
        let failure = match child.try_wait() {
            Ok(Some(status)) if status.success() => break None,
            Ok(Some(status)) => Failure::Status(status),
            Ok(None) if Instant::now() < deadline => {
                std::thread::sleep(Duration::from_millis(10));
                continue;
            }
            Ok(None) => Failure::Timeout(bound),
            Err(error) => Failure::Wait(error.kind()),
        };
        let _ = child.kill();
        let _ = child.wait();
        break Some(failure);
    };
    let received = receiver.recv_timeout(Duration::from_millis(100));
    if let Some(failure) = ended {
        return Err(failure);
    }
    let (read, bytes) = received.map_err(|_| Failure::Output)?;
    if !read || bytes.len() as u64 > LIMIT {
        return Err(Failure::Output);
    }
    Ok(String::from_utf8_lossy(&bytes).into_owned())
}
fn rows(output: &str) -> HashMap<u32, &str> {
    output
        .lines()
        .filter_map(|line| {
            let line = line.trim_start();
            let at = line.find(char::is_whitespace)?;
            Some((line[..at].parse().ok()?, line[at..].trim()))
        })
        .collect()
}
pub(super) fn processes(
    names_script: &str,
    arguments_script: &str,
) -> Result<Vec<ProcessInfo>, String> {
    unsafe extern "C" {
        fn getuid() -> u32;
    }
    let uid = unsafe { getuid() }.to_string();
    let args = [OsStr::new(&uid)];
    let names = inspect(names_script, &args)?;
    let commands = inspect(arguments_script, &args)?;
    let names = rows(&names);
    Ok(rows(&commands)
        .into_iter()
        .filter_map(|(pid, command)| {
            Some(ProcessInfo {
                pid,
                executable: names.get(&pid)?.to_string(),
                command: command.into(),
            })
        })
        .collect())
}
pub(super) fn listening_ports(script: &str, pid: u32) -> Result<Vec<u16>, String> {
    let pid = pid.to_string();
    let output = inspect(script, &[OsStr::new(&pid)])?;
    let mut ports = output
        .lines()
        .filter(|line| line.starts_with('n'))
        .filter_map(|line| line.rsplit(':').next()?.parse::<u16>().ok())
        .filter(|port| *port != 0)
        .collect::<Vec<_>>();
    ports.sort_unstable();
    ports.dedup();
    Ok(ports)
}
/// Entries of `directory`, newest name first.
/// The visible entries of `directory`, highest version number first:
/// numbers within names compare by value, so 2.0.10 comes before 2.0.9
/// (agent-hud-native-open ClaudeEngineLocator.newestFirst).
pub(super) fn newest(directory: &Path) -> Vec<PathBuf> {
    let mut entries = std::fs::read_dir(directory)
        .into_iter()
        .flatten()
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| {
            path.file_name()
                .and_then(|name| name.to_str())
                .is_some_and(|name| !name.starts_with('.'))
        })
        .collect::<Vec<_>>();
    let name = |path: &PathBuf| {
        path.file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("")
            .to_owned()
    };
    entries.sort_by(|a, b| numeric_order(&name(b), &name(a)));
    entries
}

/// Compares two names with their runs of digits read as numbers, as
/// Foundation's `.numeric` comparison does.
pub(super) fn numeric_order(a: &str, b: &str) -> std::cmp::Ordering {
    fn runs(text: &str) -> Vec<(bool, &str)> {
        let mut runs = Vec::new();
        let mut start = 0;
        let bytes = text.as_bytes();
        for index in 1..=bytes.len() {
            if index == bytes.len()
                || bytes[index].is_ascii_digit() != bytes[start].is_ascii_digit()
            {
                runs.push((bytes[start].is_ascii_digit(), &text[start..index]));
                start = index;
            }
        }
        runs
    }
    let (left, right) = (runs(a), runs(b));
    for ((digits_a, run_a), (digits_b, run_b)) in left.iter().zip(&right) {
        let order = if *digits_a && *digits_b {
            let (a, b) = (run_a.trim_start_matches('0'), run_b.trim_start_matches('0'));
            a.len().cmp(&b.len()).then_with(|| a.cmp(b))
        } else {
            run_a.cmp(run_b)
        };
        if order != std::cmp::Ordering::Equal {
            return order;
        }
    }
    left.len().cmp(&right.len())
}

#[cfg(test)]
mod version_tests {
    use super::*;

    #[test]
    fn versions_sort_by_their_numbers_newest_first() {
        let directory = tempfile::tempdir().unwrap();
        for name in ["2.0.9", "2.0.10", "1.9.99", ".partial", "2.1.0"] {
            std::fs::create_dir(directory.path().join(name)).unwrap();
        }
        let names = newest(directory.path())
            .iter()
            .map(|path| path.file_name().unwrap().to_string_lossy().into_owned())
            .collect::<Vec<_>>();
        assert_eq!(names, ["2.1.0", "2.0.10", "2.0.9", "1.9.99"]);
    }
}

#[cfg(test)]
mod spawn_tests {
    use super::*;

    // #517: a failed open says which way it failed, for the log.
    #[test]
    fn a_script_that_exits_non_zero_says_its_status() {
        let reason = spawn_script("exit 3", &[]).unwrap_err();
        assert!(
            reason.contains("exited with") && reason.contains('3'),
            "{reason}"
        );
    }

    #[test]
    fn a_script_past_its_bound_says_it_was_ended() {
        let failure = run("sleep 2", &[], Duration::from_millis(100)).unwrap_err();
        assert_eq!(
            failure.to_string(),
            "did not finish within 100ms and was ended"
        );
    }

    #[test]
    fn a_script_that_succeeds_opens() {
        assert_eq!(spawn_script("exit 0", &[]), Ok(()));
    }

    #[test]
    fn inspection_keeps_its_own_words() {
        assert_eq!(
            inspect("exit 1", &[]).unwrap_err(),
            "Local service process inspection did not complete."
        );
    }
}
