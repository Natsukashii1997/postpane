//! Runs client processes. Protocol decisions and retry identity stay with the
//! callers; a fixture runner can stand in without running a client.
use super::*;
use std::{
    collections::BTreeMap,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    time::Instant,
};

mod stdio;
// Reading a child's pipes without blocking, and ending its descendants with
// it: non-blocking descriptors on macOS and Linux; `PeekNamedPipe` and a job
// object on Windows.
#[cfg(unix)]
#[path = "unix.rs"]
mod children;
#[cfg(windows)]
#[path = "windows.rs"]
mod children;
pub(super) use stdio::StdioServer;

#[derive(Clone, Debug)]
pub struct CommandPlan {
    pub executable: PathBuf,
    pub arguments: Vec<String>,
    pub directory: Option<PathBuf>,
    pub environment: BTreeMap<String, String>,
    pub timeout: Duration,
}
#[derive(Clone, Debug)]
pub struct ProcessOutput {
    pub code: Option<i32>,
    pub stdout: Vec<u8>,
    pub stderr: Vec<u8>,
    pub timed_out: bool,
}
pub trait ProcessRunner: Send + Sync {
    fn run(&self, plan: &CommandPlan) -> Result<ProcessOutput>;
    fn open(&self, uri: &str) -> Result<()>;
    /// Starts `plan` with its stdout and stderr written to `log`, and leaves
    /// it running after this returns.
    fn spawn(&self, plan: &CommandPlan, log: &Path) -> Result<Box<dyn Background>>;
}
/// A process started to outlive the call that started it.
pub trait Background: Send {
    fn running(&mut self) -> bool;
    fn stop(&mut self);
}
struct Spawned(Option<std::process::Child>);
impl Background for Spawned {
    fn running(&mut self) -> bool {
        self.0
            .as_mut()
            .is_some_and(|child| matches!(child.try_wait(), Ok(None)))
    }
    fn stop(&mut self) {
        if let Some(mut child) = self.0.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}
impl Drop for Spawned {
    /// Left running: reaped once it ends, so it leaves no zombie behind.
    fn drop(&mut self) {
        if let Some(mut child) = self.0.take() {
            std::thread::spawn(move || child.wait());
        }
    }
}
pub struct NativeProcessRunner;
impl ProcessRunner for NativeProcessRunner {
    fn run(&self, plan: &CommandPlan) -> Result<ProcessOutput> {
        if !plan.executable.is_absolute() || plan.timeout.is_zero() {
            return Err(Failure::InvalidInput(
                "Explicit executable and timeout required".into(),
            ));
        }
        let mut command = Command::new(&plan.executable);
        command
            .args(&plan.arguments)
            .envs(&plan.environment)
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        if let Some(folder) = &plan.directory {
            command.current_dir(folder);
        }
        crate::os::configure_command(&mut command);
        let mut child = command.spawn()?;
        let mut stdout = child.stdout.take().expect("piped stdout");
        let mut stderr = child.stderr.take().expect("piped stderr");
        children::prepare(&mut child, &stdout, &stderr)?;
        let mut out = Vec::new();
        let mut err = Vec::new();
        let began = Instant::now();
        let mut timed_out = false;
        let status = loop {
            children::drain(&mut stdout, &mut out)?;
            children::drain(&mut stderr, &mut err)?;
            if let Some(status) = child.try_wait()? {
                break status;
            }
            if began.elapsed() >= plan.timeout {
                timed_out = true;
                let _ = child.kill();
                break child.wait()?;
            }
            std::thread::sleep(Duration::from_millis(10));
        };
        // A successfully detached --bg worker can retain these descriptors.
        // Drain what is already buffered, then close; never await descendant EOF.
        children::drain(&mut stdout, &mut out)?;
        children::drain(&mut stderr, &mut err)?;
        Ok(ProcessOutput {
            code: status.code(),
            stdout: out,
            stderr: err,
            timed_out,
        })
    }
    fn spawn(&self, plan: &CommandPlan, log: &Path) -> Result<Box<dyn Background>> {
        if !plan.executable.is_absolute() {
            return Err(Failure::InvalidInput("Explicit executable required".into()));
        }
        // Only this user may read what the process prints (0600).
        let file = host::new_file_options().open(log)?;
        let mut command = Command::new(&plan.executable);
        command
            .args(&plan.arguments)
            .envs(&plan.environment)
            .stdin(Stdio::null())
            .stdout(file.try_clone()?)
            .stderr(file);
        if let Some(folder) = &plan.directory {
            command.current_dir(folder);
        }
        crate::os::configure_command(&mut command);
        Ok(Box::new(Spawned(Some(command.spawn()?))))
    }
    fn open(&self, uri: &str) -> Result<()> {
        if !(uri.starts_with("claude://resume?session=")
            || uri.starts_with("codex://threads/wake/"))
        {
            return Err(Failure::InvalidInput("Unsupported client link".into()));
        }
        let (executable, arguments) = host::link_opener(uri)?;
        let output = self.run(&CommandPlan {
            executable,
            arguments,
            directory: None,
            environment: BTreeMap::new(),
            timeout: Duration::from_secs(15),
        })?;
        if output.code == Some(0) && !output.timed_out {
            Ok(())
        } else {
            Err(Failure::Unavailable(
                "Client link could not be opened".into(),
            ))
        }
    }
}
