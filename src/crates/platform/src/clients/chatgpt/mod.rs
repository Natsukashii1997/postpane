//! The ChatGPT channel (docs/chatgpt-channel.md): the PostPane Chrome
//! extension on chatgpt.com reaches the app through Chrome Native Messaging
//! and a relay (`bridge`) that connects to a private socket here. One
//! extension connection at a time, kept open both ways: it reports finished
//! turns, which become completion events, and answers `open` and `send`.
use agent_hud_agents::chatgpt as agent;
use agent_hud_core::l10n;
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    fs,
    io::{self, Read, Write},
    path::{Path, PathBuf},
    sync::{mpsc, Arc, Mutex, Weak},
    time::Duration,
};

mod commands;
mod listening;
pub(crate) use commands::focus;
pub mod files;
mod manifest;
mod sending;
pub mod shadow;
mod texts;
mod turns;
pub mod version;
mod watched;
pub use manifest::{
    install_manifest, manifest, manifest_directory, manifest_path, manifest_state, remove_manifest,
    transient,
};
pub use sending::SendFailed;
use sending::Unasked;
use texts::refused;
pub use turns::{completion, started};
use watched::{add_watched, tell_watch, watched_entry};
pub use watched::{load_watched, save_watched, Ended, Watched};

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

/// Replaces `path` in the channel's private folder with `bytes`, at once:
/// written beside it under a name made from `stem`, then moved over it.
pub fn write_private(data: &Path, stem: &str, bytes: &[u8], path: &Path) -> Result<(), String> {
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
    /// What ended, for the extension to close their tabs (#542).
    ended: Ended,
}
/// Told of what the extension reports: turns starting and finishing,
/// conversations opened and words sent (late ones too).
pub type Listener = Arc<dyn Fn(&Value) + Send + Sync>;
pub(crate) struct Shared {
    data: PathBuf,
    state: Mutex<State>,
    listening: listening::Listening,
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
            listening: listening::Listening::default(),
        }
    }
    fn tell(&self, message: &Value) {
        self.listening.tell(message);
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
        // What the one before said of itself is not this one's (#493).
        state.hello = Value::Null;
        state.last_seen = Some(now_ms());
        tell_watch(&mut state, &self.data);
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
            Some("hello") => state.hello = version::hello(&message),
            Some("tabs") => state.tabs = message["conversations"].clone(),
            Some("turn") if message["phase"] == "start" => {
                let watched = watched_entry(&state.watched, &message);
                drop(state);
                if let Some(event) = started(&message, watched.as_ref(), now_ms()) {
                    if let Err(error) = crate::hooks::record_event(&self.data, &event) {
                        agent_hud_core::note!("ChatGPT turn start could not be recorded: {error}");
                    }
                }
                self.tell(&message);
            }
            Some("turn") if message["phase"] == "complete" => {
                let watched = watched_entry(&state.watched, &message);
                drop(state);
                if let Some(event) = completion(&message, watched.as_ref(), now_ms()) {
                    if let Err(error) = crate::hooks::record_event(&self.data, &event) {
                        agent_hud_core::note!("ChatGPT reply could not be recorded: {error}");
                    }
                }
                self.tell(&message);
            }
            // Stopped before a word was written (#526): for the writing gate.
            Some("turn") if message["phase"] == "stopped" => {
                drop(state);
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
                                agent_hud_core::note!("{error}");
                            }
                        }
                        tell_watch(&mut state, &self.data);
                    }
                }
                let ok = message["ok"] == true;
                answer(&mut state, message.clone());
                drop(state);
                if ok {
                    self.tell(&message);
                }
            }
            // What a shadow read found (#488): kept, and nothing else.
            Some("shadow") => {
                let watched = watched_entry(&state.watched, &message).is_some();
                drop(state);
                shadow::heard(&self.data, watched, &message, now_ms());
            }
            // Heard as well, so words that arrive after the wait for them
            // gave up still count (#223); what a read again found (#457).
            Some(kind @ ("sent" | "reread" | "found")) => {
                let ok = kind != "sent" || message["ok"] == true;
                answer(&mut state, message.clone());
                drop(state);
                if ok {
                    self.tell(&message);
                }
            }
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
    /// Sends `message` under the caller's request id, which a late answer
    /// still carries, and waits for its answer.
    fn ask_as(&self, id: String, mut message: Value, timeout: Duration) -> Result<Value, Unasked> {
        message["requestId"] = json!(id);
        let (sender, receiver) = mpsc::channel();
        {
            let mut state = self.lock();
            if state.connection.is_none() {
                return Err(Unasked::Unposted(not_connected()));
            }
            state.pending.insert(id.clone(), sender);
            if !post_locked(&mut state, &message) {
                state.pending.remove(&id);
                return Err(Unasked::Unposted(not_connected()));
            }
        }
        let reply = receiver.recv_timeout(timeout);
        self.lock().pending.remove(&id);
        match reply {
            Ok(reply) if reply["ok"] == true => Ok(reply),
            Ok(reply) => Err(Unasked::Refused(reply)),
            Err(mpsc::RecvTimeoutError::Timeout) => Err(Unasked::Silent(refused("timeout"))),
            Err(mpsc::RecvTimeoutError::Disconnected) => Err(Unasked::Silent(not_connected())),
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
        Ok(json!({"conversation":conversation,"title":reply["title"],"promptId":reply["promptId"]}))
    }
    /// Tells `listener` of turns and openings from now on, after those
    /// that came before it listened (#507).
    pub fn listen(&self, listener: Listener) {
        self.shared.listening.listen(listener);
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

#[cfg(test)]
mod tests;
