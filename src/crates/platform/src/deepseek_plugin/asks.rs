//! The questions and approvals DeepSeek Harness sessions wait on, which
//! Agent HUD's plugin writes into the channel folder (`asks/<id>.json`),
//! shown on the HUD next to Harness's own cards. The HUD's answer goes back
//! as `asks/<id>.answer`; the plugin hands it to Harness and removes both
//! files. An ask whose file goes is settled: answered in Harness, cancelled,
//! or answered here. While this runs, `app.json` tells the plugin the app is
//! there, so a host with no window of its own can still be answered here.
mod card;

pub use card::{answer, parse};

use super::DeepSeekChannel;
use crate::claude_plugin::{valid_name, write_private};
use crate::clients::deepseek::questions::QuestionItem;
use crate::hooks::Wake;
use agent_hud_agents::deepseek::AGENT;
use agent_hud_core::l10n;
use agent_hud_core::requests::{Requests, Ticket};
use serde_json::{json, Value};
use std::{
    collections::{HashMap, HashSet},
    fs,
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc::RecvTimeoutError,
        Arc, Condvar, Mutex,
    },
    thread::{self, JoinHandle},
    time::{Duration, SystemTime, UNIX_EPOCH},
};

const POLL: Duration = Duration::from_millis(300);
const HEARTBEAT: Duration = Duration::from_secs(2);
const SWEEP: Duration = Duration::from_secs(60);
/// An ask from a session that has not checked in for this long belongs to a
/// host that stopped: its file goes.
const ORPHAN_GRACE: Duration = Duration::from_secs(5);

/// What a session waits on.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Kind {
    Question(Vec<QuestionItem>),
    Approval,
}

/// One ask the HUD can show.
#[derive(Clone, Debug)]
pub struct Ask {
    /// The plugin's id for it, the file's name.
    pub id: String,
    /// Harness's session id.
    pub session: String,
    pub kind: Kind,
    /// The HUD's card.
    pub view: Value,
}

/// The id the HUD's requests know an ask by.
pub fn request_id(ask: &str) -> String {
    format!("{}-plugin:{ask}", AGENT.id)
}

pub(crate) fn session_id(session: &str) -> String {
    format!("{}:{session}", AGENT.id)
}

struct Known {
    request: String,
    session: String,
    /// Registered with the HUD; an ask it cannot show is only remembered.
    shown: bool,
    /// Answered here, or its answer could not be left: the session no longer
    /// waits on the user, though the file stays until the plugin takes it.
    settled: bool,
}

struct Shared {
    active: AtomicBool,
    channel: DeepSeekChannel,
    requests: Requests,
    wake: Wake,
    known: Mutex<HashMap<String, Known>>,
    sleep: Mutex<()>,
    changed: Condvar,
}

/// Watches the channel folder's asks while the HUD answers requests.
pub struct Observer {
    shared: Arc<Shared>,
    worker: Option<JoinHandle<()>>,
}

impl Observer {
    pub fn start(channel: DeepSeekChannel, requests: Requests, wake: Wake) -> Result<Self, String> {
        let shared = Arc::new(Shared {
            active: AtomicBool::new(true),
            channel,
            requests,
            wake,
            known: Mutex::new(HashMap::new()),
            sleep: Mutex::new(()),
            changed: Condvar::new(),
        });
        let owned = shared.clone();
        let worker = thread::Builder::new()
            .name("DeepSeek plugin asks".into())
            .spawn(move || work(owned))
            .map_err(|_| "DeepSeek Harness plugin observer could not start")?;
        Ok(Self {
            shared,
            worker: Some(worker),
        })
    }

    /// One pass now, for tests.
    #[cfg(test)]
    pub(crate) fn pass(&self) {
        pass(&self.shared, SystemTime::now());
    }
}

impl Drop for Observer {
    fn drop(&mut self) {
        self.shared.active.store(false, Ordering::Release);
        self.shared.changed.notify_all();
        let known =
            std::mem::take(&mut *self.shared.known.lock().unwrap_or_else(|p| p.into_inner()));
        for entry in known.values().filter(|entry| entry.shown) {
            self.shared.requests.settle_native(&entry.request);
        }
        self.shared
            .requests
            .set_native_waiting_by(AGENT.id, "plugin", &[], crate::hooks::now_ms());
        let _ = fs::remove_file(self.shared.channel.directory().join("app.json"));
        if let Some(worker) = self.worker.take() {
            if worker.is_finished() {
                let _ = worker.join();
            }
        }
    }
}

fn millis(now: SystemTime) -> u64 {
    now.duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn work(shared: Arc<Shared>) {
    let mut heartbeat: Option<SystemTime> = None;
    let mut swept: Option<SystemTime> = None;
    while shared.active.load(Ordering::Acquire) {
        let now = SystemTime::now();
        let due = |last: Option<SystemTime>, every: Duration| {
            last.is_none_or(|last| now.duration_since(last).unwrap_or_default() >= every)
        };
        if due(heartbeat, HEARTBEAT) {
            let file = shared.channel.directory().join("app.json");
            if crate::os::private_directory(shared.channel.directory()).is_ok()
                && write_private(&file, json!({ "at": millis(now) }).to_string().as_bytes()).is_ok()
            {
                heartbeat = Some(now);
            }
        }
        if due(swept, SWEEP) {
            shared.channel.sweep(now);
            swept = Some(now);
        }
        pass(&shared, now);
        let guard = shared.sleep.lock().unwrap_or_else(|p| p.into_inner());
        if shared.active.load(Ordering::Acquire) {
            let _ = shared.changed.wait_timeout(guard, POLL);
        }
    }
}

/// Shows new asks, settles the ones whose files went, and says which
/// sessions wait.
fn pass(shared: &Arc<Shared>, now: SystemTime) {
    let folder = shared.channel.directory().join("asks");
    let loaded = shared.channel.loaded(now);
    let mut present = HashSet::new();
    let mut started = Vec::new();
    {
        let mut known = shared.known.lock().unwrap_or_else(|p| p.into_inner());
        for entry in fs::read_dir(&folder).into_iter().flatten().flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) != Some("json") {
                continue;
            }
            let Some(id) = path
                .file_stem()
                .and_then(|s| s.to_str())
                .filter(|s| valid_name(s))
            else {
                continue;
            };
            present.insert(id.to_owned());
            // A known ask is not read again, but its host is checked each
            // pass: one that stopped leaves its file behind.
            let value = match known.get(id) {
                Some(_) => None,
                None => match fs::read(&path)
                    .ok()
                    .and_then(|bytes| serde_json::from_slice::<Value>(&bytes).ok())
                {
                    Some(value) => Some(value),
                    None => continue,
                },
            };
            let session = match (&value, known.get(id)) {
                (Some(value), _) => value["sessionId"].as_str().unwrap_or_default(),
                (None, Some(entry)) => entry.session.as_str(),
                (None, None) => continue,
            }
            .to_owned();
            if !loaded.contains(&session) {
                let old = fs::metadata(&path)
                    .and_then(|m| m.modified())
                    .ok()
                    .and_then(|at| now.duration_since(at).ok())
                    .is_some_and(|age| age > ORPHAN_GRACE);
                if old && fs::remove_file(&path).is_ok() {
                    present.remove(id);
                }
                continue;
            }
            let Some(value) = value else {
                continue;
            };
            let Some(ask) = parse(id, &value) else {
                known.insert(
                    id.to_owned(),
                    Known {
                        request: request_id(id),
                        session,
                        shown: false,
                        settled: false,
                    },
                );
                continue;
            };
            let request = request_id(id);
            let ticket = shared.requests.register_native(
                request.clone(),
                ask.view.clone(),
                crate::hooks::now_ms(),
            );
            known.insert(
                id.to_owned(),
                Known {
                    request,
                    session: ask.session.clone(),
                    shown: ticket.is_some(),
                    settled: false,
                },
            );
            if let Some(ticket) = ticket {
                started.push((ask, ticket));
            }
        }
        let gone: Vec<String> = known
            .keys()
            .filter(|id| !present.contains(*id))
            .cloned()
            .collect();
        for id in gone {
            if let Some(entry) = known.remove(&id) {
                if entry.shown {
                    shared.requests.settle_native(&entry.request);
                }
            }
        }
    }
    for (ask, ticket) in started {
        let owned = shared.clone();
        let _ = thread::Builder::new()
            .name("DeepSeek plugin answer".into())
            .spawn(move || deliver(owned, ask, ticket));
    }
    publish(shared);
}

fn publish(shared: &Shared) {
    let mut sessions: Vec<String> = shared
        .known
        .lock()
        .unwrap_or_else(|p| p.into_inner())
        .values()
        .filter(|entry| entry.shown && !entry.settled)
        .map(|entry| session_id(&entry.session))
        .collect::<HashSet<_>>()
        .into_iter()
        .collect();
    sessions.sort();
    shared
        .requests
        .set_native_waiting_by(AGENT.id, "plugin", &sessions, crate::hooks::now_ms());
    (shared.wake)();
}

/// Waits for the HUD's decision on `ask`, and leaves it for the plugin.
fn deliver(shared: Arc<Shared>, ask: Ask, ticket: Ticket) {
    let decision = loop {
        if !shared.active.load(Ordering::Acquire) {
            return;
        }
        match ticket.response.recv_timeout(Duration::from_millis(100)) {
            Ok(Some(decision)) => break decision,
            Ok(None) | Err(RecvTimeoutError::Disconnected) => return,
            Err(RecvTimeoutError::Timeout) => continue,
        }
    };
    if !shared.active.load(Ordering::Acquire) {
        return;
    }
    let request = request_id(&ask.id);
    let session = session_id(&ask.session);
    let left = answer(&ask.kind, &decision).and_then(|value| match value {
        None => Ok(false),
        Some(value) => {
            let file = shared
                .channel
                .directory()
                .join("asks")
                .join(format!("{}.answer", ask.id));
            write_private(&file, value.to_string().as_bytes())
                .map(|()| true)
                .map_err(|_| {
                    l10n::text(
                        "回答没能交给 DeepSeek Harness 插件。",
                        "The answer could not be left for the DeepSeek Harness plugin.",
                    )
                })
        }
    });
    match left {
        Ok(false) => return,
        Ok(true) => shared.requests.note_native_delivery(
            &request,
            AGENT.id,
            &session,
            "confirmed",
            None,
            crate::hooks::now_ms(),
        ),
        Err(reason) => {
            shared.requests.note_native_delivery(
                &request,
                AGENT.id,
                &session,
                "failed",
                Some(reason),
                crate::hooks::now_ms(),
            );
            shared.requests.settle_native(&request);
        }
    }
    let mut known = shared.known.lock().unwrap_or_else(|p| p.into_inner());
    if let Some(entry) = known.get_mut(&ask.id) {
        entry.settled = true;
    }
    drop(known);
    publish(&shared);
}
