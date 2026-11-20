//! Where the running app writes what goes wrong (#486). Started from Finder,
//! the app's standard error is /dev/null: every `eprintln!`, every thread's
//! panic and whatever Tauri or WebKit print were lost. The one running copy
//! points its standard error at `<data folder>/logs/postpane.log` instead.
//!
//! - Only the app itself: the same executable run as `--mcp` or as a hook
//!   writes to its caller, and is left alone. So is the demo.
//! - Started from a terminal, the lines stay on the terminal.
//! - The file is this user's alone (0600, in a 0700 folder). Past `LIMIT` at
//!   a start it becomes `postpane.1.log`; `KEPT` older ones are kept.
//! - A panic on any thread writes when, where, on which thread and the stack.
use crate::os;
use agent_hud_core::app_log::{stamp, stamp_of};
use std::{
    fs,
    io::{self, IsTerminal, Write},
    path::Path,
};

/// The folder, in the data folder, and the file the lines go to.
pub const FOLDER: &str = "logs";
pub const FILE: &str = "postpane.log";
/// The size past which a start sets the file aside.
const LIMIT: u64 = 2 * 1024 * 1024;
/// How many set-aside files are kept.
const KEPT: u32 = 2;
/// Set to 1, a start panics a thread of its own once, to see the panic
/// written in the real app. Nothing else reads it.
const SELF_TEST: &str = "POSTPANE_SELFTEST_PANIC";

/// Sets the file aside once it is past `limit`: `postpane.log` becomes
/// `postpane.1.log`, that one `postpane.2.log`, and the oldest goes.
fn rotate(folder: &Path, limit: u64) -> io::Result<()> {
    let current = folder.join(FILE);
    match fs::metadata(&current) {
        Ok(file) if file.len() > limit => {}
        Ok(_) => return Ok(()),
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(error),
    }
    let aside = |number: u32| folder.join(format!("postpane.{number}.log"));
    for number in (1..=KEPT).rev() {
        let moved = match number == KEPT {
            true => fs::remove_file(aside(number)),
            false => fs::rename(aside(number), aside(number + 1)),
        };
        match moved {
            Err(error) if error.kind() != io::ErrorKind::NotFound => return Err(error),
            _ => {}
        }
    }
    fs::rename(current, aside(1))
}

/// The line a start writes first, to tell one run's lines from the last's.
fn header(stamp: &str, version: &str, process: u32, executable: &str, built: &str) -> String {
    format!("{stamp} ==== PostPane {version} started, pid {process}, {executable} built {built}")
}

/// What a panic writes: when, on which thread, where, what it said, and the
/// stack that led there.
fn panic_report(stamp: &str, thread: &str, place: &str, said: &str, stack: &str) -> String {
    let stack = stack
        .lines()
        .map(|line| format!("\n  {line}"))
        .collect::<String>();
    format!("{stamp} PANIC on thread {thread} at {place}: {said}{stack}")
}

/// Standard error becomes the file in the data folder, set aside first when
/// it has grown past `LIMIT`.
fn capture() -> Result<(), String> {
    let folder = crate::NativePlatform::new()?.data_dir().join(FOLDER);
    os::private_directory(&folder)?;
    let rotated = rotate(&folder, LIMIT);
    let file = os::private_append(&folder.join(FILE)).map_err(|error| error.to_string())?;
    os::capture_stderr(&file).map_err(|error| error.to_string())?;
    if let Err(error) = rotated {
        agent_hud_core::note!("The log could not be set aside: {error}");
    }
    Ok(())
}

/// What a panic said, when it said it in words.
fn said(panic: &std::panic::PanicHookInfo) -> String {
    let payload = panic.payload();
    payload
        .downcast_ref::<&str>()
        .map(|words| words.to_string())
        .or_else(|| payload.downcast_ref::<String>().cloned())
        .unwrap_or_else(|| "(no message)".into())
}

/// Called once by the app that runs, after it knows it is the one copy.
/// Never by `--mcp`, a hook or the demo, whose standard error is their
/// caller's. Nothing here stops the app: a log that cannot be kept is only
/// said on the standard error there was.
pub fn start(demo: bool) {
    if demo {
        return;
    }
    std::panic::set_hook(Box::new(|panic| {
        let thread = std::thread::current();
        let place = panic.location().map(|place| place.to_string());
        let report = panic_report(
            &stamp(),
            thread.name().unwrap_or("unnamed"),
            place.as_deref().unwrap_or("an unknown place"),
            &said(panic),
            std::backtrace::Backtrace::force_capture()
                .to_string()
                .trim_end(),
        );
        // Not `eprintln!`: a write that fails must not panic inside a panic.
        let _ = writeln!(io::stderr(), "{report}");
    }));
    // On a terminal the lines stay on the terminal.
    if !io::stderr().is_terminal() {
        if let Err(error) = capture() {
            eprintln!("The log file is unavailable: {error}");
        }
    }
    let executable = std::env::current_exe().ok();
    let built = executable
        .as_deref()
        .and_then(|path| fs::metadata(path).ok()?.modified().ok())
        .map(|time| stamp_of(&chrono::DateTime::<chrono::Local>::from(time)));
    eprintln!(
        "{}",
        header(
            &stamp(),
            env!("CARGO_PKG_VERSION"),
            std::process::id(),
            &executable.map_or_else(|| "?".into(), |path| path.display().to_string()),
            built.as_deref().unwrap_or("?"),
        )
    );
    if std::env::var(SELF_TEST).as_deref() == Ok("1") {
        let thread = std::thread::Builder::new().name("postpane-selftest".into());
        if let Ok(thread) = thread.spawn(|| panic!("self-test: {SELF_TEST} asked for this panic")) {
            let _ = thread.join();
        }
    }
}

#[cfg(test)]
mod tests;
