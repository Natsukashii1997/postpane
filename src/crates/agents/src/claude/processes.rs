//! Claude Code's process registry (#251): every live Claude Code process, in
//! a terminal or the desktop app, writes `sessions/<pid>.json` under its
//! config home naming its session. It removes the file as it exits cleanly; a
//! process killed outright (`kill -9`, a closed terminal, a crash) leaves the
//! file behind with a pid that no longer runs.
//!
//! A session ends here only on the registry's own word: a file named it and
//! its process has gone, either the file left with it or its pid no longer
//! runs. A session no file ever named keeps the transcript's half hour, as a
//! Claude Code that does not register yet (a terminal session before its
//! first reply) is no sign of an ended one.
//!
//! A file's process counts only while the process on its pid started when the
//! file says (`procStart`): a reused pid is another program. Only the platform
//! layer can ask the operating system that (`set_host`); until it does, every
//! process a file names runs.
use std::{
    collections::{HashMap, HashSet},
    fs,
    path::{Path, PathBuf},
    sync::OnceLock,
    time::SystemTime,
};

/// Whether a process runs on `pid` that started at `started` (Unix seconds);
/// a start the host cannot read is taken on trust.
pub type Runs = fn(pid: i32, started: Option<i64>) -> bool;

/// The host's pid domain as Claude Code writes it (`pidDomain`: `darwin`,
/// `linux`, `win32`) and its way to tell whether a pid runs.
static HOST: OnceLock<(&'static str, Runs)> = OnceLock::new();

/// Lets the platform layer answer whether a file's process still runs.
pub fn set_host(os: crate::Os, runs: Runs) {
    let _ = HOST.set((pid_domain(os), runs));
}

fn pid_domain(os: crate::Os) -> &'static str {
    match os {
        crate::Os::MacOs => "darwin",
        crate::Os::Linux => "linux",
        crate::Os::Windows => "win32",
    }
}

#[derive(Clone)]
struct Entry {
    stamp: (Option<SystemTime>, u64),
    pid: Option<i32>,
    session: Option<String>,
    domain: Option<String>,
    started: Option<i64>,
}

impl Entry {
    fn read(path: &Path, stamp: (Option<SystemTime>, u64)) -> Self {
        let value = fs::read(path)
            .ok()
            .and_then(|bytes| serde_json::from_slice::<serde_json::Value>(&bytes).ok())
            .unwrap_or_default();
        let text = |key: &str| value[key].as_str().map(str::to_owned);
        Self {
            stamp,
            pid: value["pid"]
                .as_i64()
                .and_then(|pid| i32::try_from(pid).ok()),
            session: text("sessionId").filter(|id| super::transcript::uuid(id)),
            domain: text("pidDomain"),
            // `Mon Nov  9 00:21:08 2026`, in UTC.
            started: value["procStart"].as_str().and_then(|text| {
                chrono::NaiveDateTime::parse_from_str(text, "%a %b %e %H:%M:%S %Y")
                    .ok()
                    .map(|at| at.and_utc().timestamp())
            }),
        }
    }

    /// A file without a pid, from another host, or read before the host
    /// could be asked says nothing of its process: it runs.
    fn runs(&self, host: Option<(&str, Runs)>) -> bool {
        let (Some(pid), Some((domain, runs))) = (self.pid, host) else {
            return true;
        };
        if self.domain.as_deref().is_some_and(|own| own != domain) {
            return true;
        }
        runs(pid, self.started)
    }
}

#[derive(Clone, Default)]
pub struct ClaudeProcesses {
    files: HashMap<PathBuf, Entry>,
    /// Sessions a running process names now.
    held: HashSet<String>,
    /// Sessions whose last process has gone, and when that was first seen.
    gone: HashMap<String, i64>,
    /// This registry's own host, over the platform layer's (tests).
    host: Option<(&'static str, Runs)>,
}

impl ClaudeProcesses {
    /// A registry that asks `runs` rather than the platform layer.
    pub fn with_host(os: crate::Os, runs: Runs) -> Self {
        let host = Some((pid_domain(os), runs));
        Self {
            host,
            ..Self::default()
        }
    }

    /// Reads the registry of every Claude config home among `provider_roots`,
    /// each file again only when it changed, and asks each file's process
    /// whether it still runs. True when a session's process went or came back.
    pub fn refresh(&mut self, provider_roots: &[(PathBuf, &'static str)], now: i64) -> bool {
        let host = self.host.or_else(|| HOST.get().copied());
        self.refresh_with(provider_roots, now, host)
    }

    fn refresh_with(
        &mut self,
        provider_roots: &[(PathBuf, &'static str)],
        now: i64,
        host: Option<(&str, Runs)>,
    ) -> bool {
        let mut files = HashMap::new();
        for config in config_homes(provider_roots) {
            let Ok(entries) = fs::read_dir(config.join("sessions")) else {
                continue;
            };
            for path in entries.flatten().map(|entry| entry.path()) {
                if path.extension().and_then(|e| e.to_str()) != Some("json") {
                    continue;
                }
                let Some(meta) = super::jobs::small_file(&path) else {
                    continue;
                };
                let stamp = (meta.modified().ok(), meta.len());
                let entry = match self.files.remove(&path) {
                    Some(kept) if kept.stamp == stamp => kept,
                    _ => Entry::read(&path, stamp),
                };
                files.insert(path, entry);
            }
        }
        self.files = files;
        let (mut held, mut dead) = (HashSet::new(), HashSet::new());
        for entry in self.files.values() {
            let Some(session) = entry.session.clone() else {
                continue;
            };
            if entry.runs(host) {
                held.insert(session);
            } else {
                dead.insert(session);
            }
        }
        let mut changed = false;
        // Gone: held before and not now, or named only by files whose process
        // no longer runs. A session already gone keeps the time it went.
        for session in self.held.iter().chain(&dead) {
            if !held.contains(session) && !self.gone.contains_key(session) {
                self.gone.insert(session.clone(), now);
                changed = true;
            }
        }
        for session in &held {
            changed |= self.gone.remove(session).is_some();
        }
        self.held = held;
        // A gone session stays gone until a process holds it again: a request
        // its log left open never lapses on its own (ADR 0001).
        changed
    }

    /// Whether the session's process has gone since its last event: a file
    /// named it, none that runs does now, and nothing happened in it after.
    pub fn ended(&self, session: &str, last_event: Option<i64>) -> bool {
        self.gone
            .get(session)
            .is_some_and(|gone| last_event.is_none_or(|last| last <= *gone))
    }
}

/// The Claude config homes: each `projects` folder's parent.
fn config_homes(provider_roots: &[(PathBuf, &'static str)]) -> Vec<PathBuf> {
    let mut homes = Vec::new();
    for (root, source) in provider_roots {
        if let Some(home) = root.parent().filter(|_| *source == "claude") {
            if !homes.iter().any(|known: &PathBuf| known == home) {
                homes.push(home.to_path_buf());
            }
        }
    }
    homes
}

#[cfg(test)]
#[path = "processes_tests.rs"]
mod tests;
