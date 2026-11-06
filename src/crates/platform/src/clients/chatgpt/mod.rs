//! The ChatGPT channel (docs/chatgpt-channel.md): the PostPane Chrome
//! extension on chatgpt.com reaches the app through Chrome Native Messaging
//! and a relay (`bridge`) that connects to a private socket here. One
//! extension connection at a time, kept open both ways: it reports finished
//! turns, which become completion events, and answers `open` and `send`.
use agent_hud_agents::{chatgpt as agent, HookEvent};
use agent_hud_core::l10n;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    fs,
    io::{self, Read, Write},
    path::{Path, PathBuf},
    sync::{mpsc, Arc, Mutex, Weak},
    time::Duration,
};

pub mod handoffs;
mod manifest;
pub use manifest::{
    install_manifest, manifest, manifest_directory, manifest_path, manifest_state, remove_manifest,
    transient,
};

// A Unix socket; Windows has no transport yet.
#[cfg(unix)]
#[path = "unix.rs"]
mod host;
#[cfg(windows)]
#[path = "windows.rs"]
mod host;

/// The largest frame the extension may send: a reply in full.
pub const INBOUND_LIMIT: usize = 8 * 1024 * 1024;
/// Chrome refuses a message to an extension above 1 MB.
pub const OUTBOUND_LIMIT: usize = 1024 * 1024;
/// How long a new conversation may take to open and send its first words.
pub const OPEN_TIME: Duration = Duration::from_secs(90);
/// How long words may take to reach a conversation.
pub const SEND_TIME: Duration = Duration::from_secs(30);

/// The channel's private folder in the data folder.
pub fn folder(data: &Path) -> PathBuf {
    data.join("chatgpt")
}
pub fn socket_path(data: &Path) -> PathBuf {
    folder(data).join("extension.sock")
}
fn watched_path(data: &Path) -> PathBuf {
    folder(data).join("watched.json")
}

/// One frame: a 4-byte little-endian length, then UTF-8 JSON. None when the
/// stream ends cleanly before a frame starts.
pub fn read_frame(reader: &mut impl Read, limit: usize) -> io::Result<Option<Value>> {
    let mut header = [0; 4];
    match reader.read_exact(&mut header) {
        Ok(()) => {}
        Err(error) if error.kind() == io::ErrorKind::UnexpectedEof => return Ok(None),
        Err(error) => return Err(error),
    }
    let length = u32::from_le_bytes(header) as usize;
    if length == 0 || length > limit {
        return Err(io::Error::new(io::ErrorKind::InvalidData, "frame size"));
    }
    let mut bytes = vec![0; length];
    reader.read_exact(&mut bytes)?;
    let value: Value = serde_json::from_slice(&bytes)
        .map_err(|_| io::Error::new(io::ErrorKind::InvalidData, "frame JSON"))?;
    if !value.is_object() {
        return Err(io::Error::new(io::ErrorKind::InvalidData, "frame JSON"));
    }
    Ok(Some(value))
}
pub fn write_frame(writer: &mut impl Write, value: &Value, limit: usize) -> io::Result<()> {
    let bytes = serde_json::to_vec(value)?;
    if bytes.is_empty() || bytes.len() > limit {
        return Err(io::Error::new(io::ErrorKind::InvalidInput, "frame size"));
    }
    writer.write_all(&(bytes.len() as u32).to_le_bytes())?;
    writer.write_all(&bytes)?;
    writer.flush()
}

/// Whether Chrome started the relay for PostPane's own extension: its first
/// argument is the caller's origin, which must be exactly the fixed one.
pub fn origin_allowed(origin: &str) -> bool {
    origin == agent::EXTENSION_ORIGIN
}
/// The relay Chrome starts (`agent-hud-engine chrome-extension://<id>/`):
/// None when the arguments are not Chrome's, else its exit status. Frames
/// are carried both ways as they are, until either side closes.
pub fn bridge(arguments: &[String], data: &Path) -> Option<i32> {
    let origin = arguments.get(1)?;
    if !origin.starts_with("chrome-extension://") {
        return None;
    }
    if !origin_allowed(origin) {
        eprintln!("PostPane only relays for its own Chrome extension");
        return Some(1);
    }
    Some(match host::relay(&socket_path(data)) {
        Ok(()) => 0,
        Err(error) => {
            eprintln!("{error}");
            1
        }
    })
}

/// A conversation the extension reports on: one PostPane opened.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Watched {
    pub id: String,
    #[serde(default)]
    pub title: String,
    pub opened_at: i64,
    /// Whether PostPane named it (a handoff's title): that name comes before
    /// the tab's on its replies.
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub named: bool,
}
/// The watched list; empty when there is none or it cannot be read.
pub fn load_watched(data: &Path) -> Vec<Watched> {
    let path = watched_path(data);
    let Ok(metadata) = fs::symlink_metadata(&path) else {
        return vec![];
    };
    if !metadata.is_file() || metadata.len() > 4 * 1024 * 1024 {
        return vec![];
    }
    fs::read(&path)
        .ok()
        .and_then(|bytes| serde_json::from_slice::<Vec<Watched>>(&bytes).ok())
        .map(|list| {
            list.into_iter()
                .filter(|entry| agent::conversation_id(&entry.id))
                .collect()
        })
        .unwrap_or_default()
}
/// Replaces the watched list, privately and at once.
pub fn save_watched(data: &Path, list: &[Watched]) -> Result<(), String> {
    let bytes = serde_json::to_vec_pretty(list).map_err(|_| "Watched list unavailable")?;
    write_private(data, "watched", &bytes, &watched_path(data))
        .map_err(|_| "The watched list could not be saved".into())
}
/// Replaces `path` in the channel's private folder with `bytes`, at once:
/// written beside it under a name made from `stem`, then moved over it.
fn write_private(data: &Path, stem: &str, bytes: &[u8], path: &Path) -> Result<(), String> {
    let directory = folder(data);
    crate::os::private_directory(&directory)?;
    let temporary = directory.join(format!(".{stem}.{}.tmp", std::process::id()));
    let _ = fs::remove_file(&temporary);
    let result = crate::os::private_file(&temporary, true)
        .and_then(|mut file| file.write_all(bytes))
        .and_then(|()| fs::rename(&temporary, path));
    if result.is_err() {
        let _ = fs::remove_file(&temporary);
    }
    result.map_err(|error| error.to_string())
}

/// The extension's end of one connection, as the host transport gives it.
pub(crate) trait Peer: Write + Send {
    /// Ends the connection both ways, so its reader stops.
    fn close(&self);
}
struct Connection {
    id: u64,
    peer: Box<dyn Peer>,
}
#[derive(Default)]
struct State {
    connection: Option<Connection>,
    next: u64,
    hello: Value,
    last_seen: Option<i64>,
    tabs: Value,
    pending: HashMap<String, mpsc::Sender<Value>>,
    /// The names conversations being opened are to be listed under, by request.
    names: HashMap<String, String>,
    watched: Vec<Watched>,
}
/// Told of what the extension reports: turns starting and finishing, and
/// conversations opened (late ones too).
pub type Listener = Arc<dyn Fn(&Value) + Send + Sync>;
pub(crate) struct Shared {
    data: PathBuf,
    state: Mutex<State>,
    listener: Mutex<Option<Listener>>,
}
fn now_ms() -> i64 {
    chrono::Utc::now().timestamp_millis()
}
impl Shared {
    fn new(data: PathBuf) -> Self {
        let watched = load_watched(&data);
        Self {
            data,
            state: Mutex::new(State {
                watched,
                ..State::default()
            }),
            listener: Mutex::new(None),
        }
    }
    fn tell(&self, message: &Value) {
        let listener = self
            .listener
            .lock()
            .unwrap_or_else(|p| p.into_inner())
            .clone();
        if let Some(listener) = listener {
            listener(message);
        }
    }
    fn lock(&self) -> std::sync::MutexGuard<'_, State> {
        self.state.lock().unwrap_or_else(|p| p.into_inner())
    }
    /// A new extension connection replaces the one before: the newest wins.
    /// It is told the whole watched list first.
    pub(crate) fn attach(&self, peer: Box<dyn Peer>) -> u64 {
        let mut state = self.lock();
        state.next += 1;
        let id = state.next;
        if let Some(old) = state.connection.take() {
            old.peer.close();
        }
        // Requests asked of the old connection are not answered by this one.
        state.pending.clear();
        state.connection = Some(Connection { id, peer });
        state.last_seen = Some(now_ms());
        let watch = watch_message(&state.watched);
        post_locked(&mut state, &watch);
        id
    }
    pub(crate) fn detach(&self, id: u64) {
        let mut state = self.lock();
        if state.connection.as_ref().is_some_and(|c| c.id == id) {
            if let Some(old) = state.connection.take() {
                old.peer.close();
            }
            state.pending.clear();
        }
    }
    fn close(&self) {
        let mut state = self.lock();
        if let Some(old) = state.connection.take() {
            old.peer.close();
        }
        state.pending.clear();
    }
    pub(crate) fn inbound(&self, id: u64, message: Value) {
        let mut state = self.lock();
        if !state.connection.as_ref().is_some_and(|c| c.id == id) {
            return;
        }
        state.last_seen = Some(now_ms());
        match message["type"].as_str() {
            Some("hello") => {
                state.hello =
                    json!({"version":message["version"],"extensionId":message["extensionId"]});
            }
            Some("tabs") => state.tabs = message["conversations"].clone(),
            Some("turn") if message["phase"] == "start" => {
                let watched = watched_entry(&state.watched, &message);
                drop(state);
                if let Some(event) = started(&message, watched.as_ref(), now_ms()) {
                    if let Err(error) = crate::hooks::record_event(&self.data, &event) {
                        eprintln!("ChatGPT turn start could not be recorded: {error}");
                    }
                }
                self.tell(&message);
            }
            Some("turn") if message["phase"] == "complete" => {
                let watched = watched_entry(&state.watched, &message);
                drop(state);
                if let Some(event) = completion(&message, watched.as_ref(), now_ms()) {
                    if let Err(error) = crate::hooks::record_event(&self.data, &event) {
                        eprintln!("ChatGPT reply could not be recorded: {error}");
                    }
                }
                self.tell(&message);
            }
            Some("opened") => {
                let named = message["requestId"]
                    .as_str()
                    .and_then(|id| state.names.remove(id));
                if message["ok"] == true {
                    if let Some(conversation) = message["conversation"]
                        .as_str()
                        .filter(|id| agent::conversation_id(id))
                    {
                        let (title, named) = match named {
                            Some(name) => (name, true),
                            None => (message["title"].as_str().unwrap_or("").to_owned(), false),
                        };
                        if add_watched(&mut state.watched, conversation, &title, named, now_ms()) {
                            if let Err(error) = save_watched(&self.data, &state.watched) {
                                eprintln!("{error}");
                            }
                        }
                        let watch = watch_message(&state.watched);
                        post_locked(&mut state, &watch);
                    }
                }
                let ok = message["ok"] == true;
                answer(&mut state, message.clone());
                drop(state);
                if ok {
                    self.tell(&message);
                }
            }
            Some("sent") => answer(&mut state, message),
            _ => {}
        }
    }
    fn post(&self, message: &Value) -> Result<(), String> {
        let mut state = self.lock();
        if state.connection.is_none() {
            return Err(not_connected());
        }
        if post_locked(&mut state, message) {
            Ok(())
        } else {
            Err(not_connected())
        }
    }
    /// Sends `message` with a new request id and waits for its answer.
    fn ask(&self, message: Value, timeout: Duration) -> Result<Value, String> {
        self.ask_as(request_id(), message, timeout)
    }
    /// `ask` under the caller's request id, which a late answer still carries.
    fn ask_as(&self, id: String, mut message: Value, timeout: Duration) -> Result<Value, String> {
        message["requestId"] = json!(id);
        let (sender, receiver) = mpsc::channel();
        {
            let mut state = self.lock();
            if state.connection.is_none() {
                return Err(not_connected());
            }
            state.pending.insert(id.clone(), sender);
            if !post_locked(&mut state, &message) {
                state.pending.remove(&id);
                return Err(not_connected());
            }
        }
        let reply = receiver.recv_timeout(timeout);
        self.lock().pending.remove(&id);
        match reply {
            Ok(reply) if reply["ok"] == true => Ok(reply),
            Ok(reply) => Err(refused(reply["reason"].as_str().unwrap_or("send-failed"))),
            Err(mpsc::RecvTimeoutError::Timeout) => Err(refused("timeout")),
            Err(mpsc::RecvTimeoutError::Disconnected) => Err(not_connected()),
        }
    }
    fn status(&self) -> Value {
        let state = self.lock();
        json!({
            "connected": state.connection.is_some(),
            "extensionVersion": state.hello["version"],
            "extensionId": state.hello["extensionId"],
            "lastSeen": state.last_seen,
            "tabs": state.tabs,
            "watched": state.watched,
        })
    }
}
/// Writes to the current connection; a failed write ends it.
fn post_locked(state: &mut State, message: &Value) -> bool {
    let Some(connection) = state.connection.as_mut() else {
        return false;
    };
    if write_frame(&mut connection.peer, message, OUTBOUND_LIMIT).is_ok() {
        return true;
    }
    if let Some(old) = state.connection.take() {
        old.peer.close();
    }
    state.pending.clear();
    false
}
fn answer(state: &mut State, message: Value) {
    if let Some(sender) = message["requestId"]
        .as_str()
        .and_then(|id| state.pending.remove(id))
    {
        let _ = sender.send(message);
    }
}
fn watch_message(list: &[Watched]) -> Value {
    json!({"type":"watch","conversations":list.iter().map(|w| &w.id).collect::<Vec<_>>()})
}
/// Adds a conversation to the list, or names it again; whether it changed.
/// A name PostPane gave is not replaced by the tab's.
fn add_watched(list: &mut Vec<Watched>, id: &str, title: &str, named: bool, at: i64) -> bool {
    if let Some(entry) = list.iter_mut().find(|entry| entry.id == id) {
        if title.is_empty() || entry.title == title || (entry.named && !named) {
            return false;
        }
        entry.title = title.to_owned();
        entry.named = named;
        return true;
    }
    list.push(Watched {
        id: id.to_owned(),
        title: title.to_owned(),
        opened_at: at,
        named,
    });
    true
}
fn request_id() -> String {
    use std::sync::atomic::{AtomicU64, Ordering};
    static SEQUENCE: AtomicU64 = AtomicU64::new(0);
    format!(
        "pp-{}-{}",
        now_ms(),
        SEQUENCE.fetch_add(1, Ordering::Relaxed)
    )
}
fn not_connected() -> String {
    l10n::text(
        "ChatGPT 插件没有连上驿窗",
        "The ChatGPT extension is not connected",
    )
}
fn refused(reason: &str) -> String {
    if l10n::chinese() {
        format!("ChatGPT 插件没能完成：{reason}")
    } else {
        format!("The ChatGPT extension could not finish: {reason}")
    }
}

/// The watched entry a turn's conversation is, if PostPane opened it.
fn watched_entry(list: &[Watched], message: &Value) -> Option<Watched> {
    list.iter()
        .find(|w| Some(w.id.as_str()) == message["conversation"].as_str())
        .cloned()
}

/// A turn's conversation, and when it happened (never later than now).
fn turn_at(message: &Value, now: i64) -> Option<(&str, i64)> {
    let conversation = message["conversation"]
        .as_str()
        .filter(|id| agent::conversation_id(id))?;
    let at = message["at"]
        .as_i64()
        .filter(|at| *at > 0)
        .unwrap_or(now)
        .min(now);
    Some((conversation, at))
}

/// The name a turn's conversation goes by: the tab's title first, unless
/// PostPane named the conversation (a handoff's title).
fn turn_title<'a>(message: &'a Value, watched: Option<&'a Watched>) -> Option<&'a str> {
    let watched_title = watched
        .map(|w| w.title.as_str())
        .filter(|title| !title.trim().is_empty());
    let tab_title = message["title"]
        .as_str()
        .filter(|title| !title.trim().is_empty());
    if watched.is_some_and(|w| w.named) {
        watched_title.or(tab_title)
    } else {
        tab_title.or(watched_title)
    }
}

/// The running observation a turn that starts becomes, so the sidebar shows
/// the conversation answering. `review` says PostPane opened it (a relay's
/// conversation); every other conversation is the owner's own chat. None for
/// a new chat that has no address yet.
pub fn started(message: &Value, watched: Option<&Watched>, now: i64) -> Option<HookEvent> {
    let (conversation, at) = turn_at(message, now)?;
    Some(HookEvent {
        source: agent::AGENT.id.into(),
        session_id: agent::session_id(conversation),
        kind: "session-observation".into(),
        at_ms: at,
        data: json!({
            "state": "running",
            "turnId": format!("start-{at}"),
            "startedAtMs": at,
            "title": turn_title(message, watched),
            "prompt": message["prompt"].as_str().filter(|text| !text.is_empty()),
            "review": watched.is_some(),
            "navigationTarget": agent::navigation_target(conversation),
        }),
    })
}

/// The completion event a finished turn becomes: the reply in full, the
/// prompt, the conversation's title, whether it is a review (as `started`)
/// and its way back. None for a turn that names no conversation.
pub fn completion(message: &Value, watched: Option<&Watched>, now: i64) -> Option<HookEvent> {
    let (conversation, at) = turn_at(message, now)?;
    let turn = message["messageId"]
        .as_str()
        .filter(|id| !id.is_empty())
        .map(str::to_owned)
        .unwrap_or_else(|| at.to_string());
    let title = turn_title(message, watched);
    Some(HookEvent {
        source: agent::AGENT.id.into(),
        session_id: agent::session_id(conversation),
        kind: "completion".into(),
        at_ms: at,
        data: json!({
            "turnId": turn,
            "title": title,
            "prompt": message["prompt"].as_str().filter(|text| !text.is_empty()),
            "message": message["reply"].as_str().filter(|text| !text.is_empty()),
            "review": watched.is_some(),
            "navigationTarget": agent::navigation_target(conversation),
        }),
    })
}

/// The channel the app runs while it is open.
pub struct Channel {
    shared: Arc<Shared>,
    _server: host::Server,
}
static CURRENT: Mutex<Option<Weak<Shared>>> = Mutex::new(None);
impl Channel {
    /// Listens on `<data>/chatgpt/extension.sock`. Opens no network port.
    pub fn start(data: PathBuf) -> Result<Self, String> {
        let shared = Arc::new(Shared::new(data.clone()));
        let server = host::Server::start(&data, shared.clone())?;
        *CURRENT.lock().unwrap_or_else(|p| p.into_inner()) = Some(Arc::downgrade(&shared));
        Ok(Self {
            shared,
            _server: server,
        })
    }
    /// Opens a new conversation (in the project page `project` names, when
    /// given) with `text` as its first message: `{conversation, title}`.
    pub fn open(&self, text: &str, project: Option<&str>) -> Result<Value, String> {
        self.open_as(text, project, None, None)
    }
    /// `open`, listed under `name` and asked as `request`: an answer that
    /// comes after the wait still reaches the listener under that id.
    pub fn open_as(
        &self,
        text: &str,
        project: Option<&str>,
        name: Option<&str>,
        request: Option<&str>,
    ) -> Result<Value, String> {
        if text.trim().is_empty() {
            return Err(l10n::text("缺少要发出的文字", "Text is required"));
        }
        let mut message = json!({"type":"open","text":text});
        if let Some(project) = project.filter(|p| !p.is_empty()) {
            if !project.starts_with("https://chatgpt.com/") {
                return Err(l10n::text(
                    "项目必须是 chatgpt.com 上的项目页网址",
                    "The project must be a chatgpt.com project page",
                ));
            }
            message["project"] = json!(project);
        }
        let id = request.map(str::to_owned).unwrap_or_else(request_id);
        if let Some(name) = name.map(str::trim).filter(|name| !name.is_empty()) {
            self.shared.lock().names.insert(id.clone(), name.to_owned());
        }
        let reply = self.shared.ask_as(id, message, OPEN_TIME)?;
        let conversation = reply["conversation"]
            .as_str()
            .filter(|id| agent::conversation_id(id))
            .ok_or_else(|| refused("send-failed"))?;
        Ok(json!({"conversation":conversation,"title":reply["title"]}))
    }
    /// Sends `text` to a watched conversation.
    pub fn send(&self, conversation: &str, text: &str) -> Result<Value, String> {
        if !agent::conversation_id(conversation) {
            return Err(l10n::text("会话 id 不对", "Invalid conversation id"));
        }
        if text.trim().is_empty() {
            return Err(l10n::text("缺少要发出的文字", "Text is required"));
        }
        self.shared.ask(
            json!({"type":"send","conversation":conversation,"text":text}),
            SEND_TIME,
        )?;
        Ok(json!({"sent":true}))
    }
    /// Tells `listener` of turns and openings from now on.
    pub fn listen(&self, listener: Listener) {
        *self
            .shared
            .listener
            .lock()
            .unwrap_or_else(|p| p.into_inner()) = Some(listener);
    }
    /// Whether the extension is connected, what it said of itself and its
    /// tabs, and the watched list.
    pub fn status(&self) -> Value {
        self.shared.status()
    }
}
impl Drop for Channel {
    fn drop(&mut self) {
        self.shared.close();
    }
}

/// Brings a conversation's tab forward through the extension; false when no
/// extension is connected, so the caller opens it in the browser instead.
pub(crate) fn focus(conversation: &str) -> bool {
    if !agent::conversation_id(conversation) {
        return false;
    }
    let shared = CURRENT
        .lock()
        .unwrap_or_else(|p| p.into_inner())
        .as_ref()
        .and_then(Weak::upgrade);
    shared.is_some_and(|shared| {
        shared
            .post(&json!({"type":"focus","conversation":conversation}))
            .is_ok()
    })
}

#[cfg(test)]
mod tests;
