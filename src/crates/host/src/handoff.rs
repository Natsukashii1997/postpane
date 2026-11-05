//! Relay 1c (docs/chatgpt-channel.md, 1c 接力): a Claude Code session hands
//! its work to a ChatGPT conversation for review, and words go back and forth
//! between the two. The host owns the handoffs because it holds both ways
//! out: the ChatGPT extension's channel and Agent HUD's Claude Code plugin.
//! Started by Claude (the `relay_to_chatgpt` local tool); the HUD's handoff
//! card moves it on (`handoff_act`). Each step is kept (handoffs.rs), and
//! the ChatGPT channel tells the desk when ChatGPT starts and finishes.
use agent_hud_runtime::chatgpt::handoffs::{self, Book, Handoff, Phase, Status, StepKind, Verdict};
use agent_hud_runtime::l10n;
use serde_json::{json, Value};
use std::{
    collections::HashSet,
    path::PathBuf,
    sync::{Mutex, MutexGuard},
};
use tauri::Manager;

/// Claude Code's source id, the only client words go back into.
const CLAUDE: &str = "claude";
/// The local tool Claude calls to hand its work to ChatGPT.
pub(crate) const RELAY_METHOD: &str = "relay_to_chatgpt";
/// The longest text sent either way: Chrome refuses a message to an
/// extension above 1 MB, and a refused one drops its connection.
const TEXT_LIMIT: usize = 768 * 1024;
/// How long a failed handoff stays in the snapshot.
const FAILED_SHOWN_MS: i64 = 24 * 60 * 60 * 1000;

/// The ways words travel, as the app has them; tests pass their own.
pub(crate) trait Lines {
    /// Whether the ChatGPT extension is connected.
    fn connected(&self) -> bool;
    /// Opens a conversation (in `project`) with `text`, listed under
    /// `title` and asked as `request`: its id.
    fn open(
        &self,
        text: &str,
        project: Option<&str>,
        title: &str,
        request: &str,
    ) -> Result<String, String>;
    fn send(&self, conversation: &str, text: &str) -> Result<(), String>;
    /// Whether words left for a Claude Code session would reach it.
    fn reaches(&self, session: &str) -> Result<(), String>;
    fn reply(&self, session: &str, text: &str) -> Result<(), String>;
}

/// What a start did, or leaves to do away from the caller.
#[derive(Debug, PartialEq)]
pub(crate) enum Started {
    /// The brief went into the session's review conversation (or had
    /// already: `repeated`).
    Sent { handoff: Handoff, repeated: bool },
    /// A review conversation is to be opened with the brief (`Desk::open`).
    Opening {
        handoff: Handoff,
        project: Option<String>,
    },
}

pub(crate) struct Desk {
    data: Option<PathBuf>,
    book: Mutex<Book>,
}

impl Desk {
    /// The handoffs kept in `data`; none kept in the demo. Conversations
    /// that were opening when the app stopped count as failed, to retry.
    pub(crate) fn new(data: Option<PathBuf>) -> Self {
        let mut book = data.as_deref().map(handoffs::load).unwrap_or_default();
        let desk = |book| Self {
            data,
            book: Mutex::new(book),
        };
        if book.interrupted(now_ms(), &interrupted()) {
            let desk = desk(book);
            desk.change(|_| ());
            return desk;
        }
        desk(book)
    }
    fn lock(&self) -> MutexGuard<'_, Book> {
        self.book.lock().unwrap_or_else(|p| p.into_inner())
    }
    /// Changes the book and keeps it.
    fn change<R>(&self, change: impl FnOnce(&mut Book) -> R) -> R {
        let mut book = self.lock();
        let result = change(&mut book);
        if let Some(data) = &self.data {
            if let Err(error) = handoffs::save(data, &book) {
                eprintln!("{error}");
            }
        }
        result
    }
    /// The ChatGPT project new review conversations open in.
    pub(crate) fn project(&self) -> Option<String> {
        self.data.as_deref().and_then(handoffs::project)
    }
    pub(crate) fn set_project(&self, text: &str) -> Result<Option<String>, String> {
        let data = self.data.as_deref().ok_or_else(demo)?;
        handoffs::set_project(data, text)
    }
    /// The snapshot's `handoffs`: the live ones and those that failed or
    /// ended lately, without their briefs.
    pub(crate) fn projection(&self, now: i64) -> Value {
        if self.lock().expire(now, &timed_out()) {
            self.change(|_| ());
        }
        let book = self.lock();
        let shown = book
            .list
            .iter()
            .filter(|handoff| {
                handoff.live()
                    || (matches!(handoff.phase, Phase::Failed | Phase::Ended)
                        && handoff.status != Status::Open
                        && now - handoff.updated_at < FAILED_SHOWN_MS)
            })
            .map(Handoff::shown)
            .collect::<Vec<_>>();
        json!(shown)
    }

    /// Hands `brief` to ChatGPT for `session`: into the review conversation
    /// the session already has, else a new one (always a new one when
    /// `fresh`). Sending waits for the extension; opening is left to the
    /// caller, to do away from it (`Desk::open`).
    #[allow(clippy::too_many_arguments)]
    pub(crate) fn start(
        &self,
        lines: &dyn Lines,
        session: &str,
        cwd: Option<&str>,
        title: &str,
        summary: Option<&str>,
        brief: &str,
        fresh: bool,
        now: i64,
    ) -> Result<Started, String> {
        if !agent_hud_runtime::claude_plugin::valid_name(session) {
            return Err(l10n::text(
                "Claude 会话 id 不对",
                "Invalid Claude session id",
            ));
        }
        if brief.trim().is_empty() {
            return Err(l10n::text(
                "缺少要交给 ChatGPT 的内容",
                "Nothing to hand to ChatGPT",
            ));
        }
        if brief.len() > TEXT_LIMIT {
            return Err(too_long());
        }
        if !lines.connected() {
            return Err(not_connected());
        }
        if self.lock().expire(now, &timed_out()) {
            self.change(|_| ());
        }
        let current = (!fresh)
            .then(|| self.lock().for_session(session).cloned())
            .flatten();
        let summary = summary.map(str::trim).filter(|text| !text.is_empty());
        if let Some(handoff) = current {
            match (handoff.status, handoff.chatgpt_conversation.as_deref()) {
                (Status::Open, Some(conversation)) => {
                    // The same words again (a retry after a slow answer) are not sent twice.
                    if self.lock().asked_already(&handoff.id, brief) {
                        return Ok(Started::Sent {
                            handoff,
                            repeated: true,
                        });
                    }
                    lines.send(conversation, brief)?;
                    self.change(|book| book.asked(&handoff.id, summary, brief, now));
                    let sent = self.lock().get(&handoff.id).cloned().unwrap_or(handoff);
                    return Ok(Started::Sent {
                        handoff: sent,
                        repeated: false,
                    });
                }
                (Status::Opening, _) => {
                    return Err(l10n::text(
                        "上一次交给 ChatGPT 的新会话还在打开，等它打开后再试。",
                        "The review conversation is still opening; try again once it is open.",
                    ))
                }
                _ => {}
            }
        }
        let title = if title.trim().is_empty() {
            l10n::text("驿窗审核", "PostPane review")
        } else {
            title.to_owned()
        };
        let handoff = self.change(|book| book.begin(session, cwd, &title, summary, brief, now));
        Ok(Started::Opening {
            handoff,
            project: self.project(),
        })
    }

    /// Opens the review conversation of an opening handoff with `brief`,
    /// and binds the handoff to it or records why it could not be opened.
    /// It is asked under the handoff's id, so an answer that comes late
    /// still binds it (`observe`).
    pub(crate) fn open(
        &self,
        lines: &dyn Lines,
        id: &str,
        brief: &str,
        project: Option<&str>,
        now: impl Fn() -> i64,
    ) -> Result<String, String> {
        let title = self
            .lock()
            .get(id)
            .map(|h| h.title.clone())
            .unwrap_or_default();
        let opened = lines.open(brief, project, &title, id);
        self.change(|book| match &opened {
            Ok(conversation) => book.opened(id, conversation, now()),
            Err(error) => book.failed(id, error, now()),
        });
        opened
    }

    /// What the ChatGPT channel reports: a turn starting or finishing in a
    /// handoff's conversation, or a conversation opened for a handoff after
    /// its wait. Whether a handoff changed.
    pub(crate) fn observe(&self, message: &Value, now: i64) -> bool {
        let conversation = message["conversation"].as_str().unwrap_or("");
        match (message["type"].as_str(), message["phase"].as_str()) {
            (Some("turn"), Some("start")) => self.change(|book| book.working(conversation, now)),
            (Some("turn"), Some("complete")) => {
                let reply = message["reply"].as_str().unwrap_or("");
                self.change(|book| book.replied(conversation, reply, now))
            }
            (Some("opened"), _) if message["ok"] == true => {
                let id = message["requestId"].as_str().unwrap_or("");
                let waiting = self.lock().get(id).is_some_and(|h| {
                    h.status == Status::Failed && h.chatgpt_conversation.is_none()
                });
                waiting && self.change(|book| book.opened(id, conversation, now))
            }
            _ => false,
        }
    }

    /// The handoff card's buttons: `back` (转回 Claude, with ChatGPT's
    /// answer), `again` (再审一轮: Claude hands its changes over again),
    /// `end` (结束接力) and `retry` (a failed opening). What to open, for a retry.
    pub(crate) fn act(
        &self,
        lines: &dyn Lines,
        id: &str,
        action: &str,
        now: i64,
    ) -> Result<Acted, String> {
        let handoff = self
            .lock()
            .get(id)
            .cloned()
            .ok_or_else(|| l10n::text("找不到这次接力", "No such handoff"))?;
        match action {
            "back" | "again" => {
                if !handoff.live() {
                    return Err(l10n::text("这次接力已经结束", "This handoff has ended"));
                }
                let (kind, text) = if action == "back" {
                    let reply = handoff
                        .last_reply()
                        .and_then(|step| step.text.clone())
                        .ok_or_else(|| {
                            l10n::text("ChatGPT 还没回信", "ChatGPT has not answered yet")
                        })?;
                    (StepKind::Back, back_text(&handoff, &reply))
                } else {
                    (StepKind::Again, again_text(handoff.reviews() + 1))
                };
                if self.lock().returned_already(id, &text) {
                    return Ok(Acted::Done);
                }
                lines.reaches(&handoff.claude_session)?;
                lines.reply(&handoff.claude_session, &text)?;
                self.change(|book| book.returned(id, kind, &text, now));
                Ok(Acted::Done)
            }
            "end" => {
                self.change(|book| book.end(id, now));
                Ok(Acted::Done)
            }
            "retry" => {
                if !lines.connected() {
                    return Err(not_connected());
                }
                let brief = self.change(|book| book.retry(id, now)).ok_or_else(|| {
                    l10n::text("这次接力不能重试", "This handoff cannot be retried")
                })?;
                Ok(Acted::Open {
                    brief,
                    project: self.project(),
                })
            }
            _ => Err("Unknown handoff action".into()),
        }
    }
}

/// What a card button left to do away from the caller.
#[derive(Debug, PartialEq)]
pub(crate) enum Acted {
    Done,
    /// A retry: the conversation is to be opened again (`Desk::open`).
    Open {
        brief: String,
        project: Option<String>,
    },
}

/// 转回 Claude: ChatGPT's answer in full, and what to do with it.
fn back_text(handoff: &Handoff, reply: &str) -> String {
    let round = handoff.reviews().max(1);
    let verdict = match handoff.last_reply().and_then(|step| step.verdict) {
        Some(Verdict::Pass) => "通过",
        Some(Verdict::Revise) => "需修改",
        None => "未写",
    };
    format!(
        "ChatGPT 对「{title}」的审核意见（第 {round} 轮，结论：{verdict}）：\n\n{reply}\n\n请按意见处理；不同意的意见说明理由即可。改完后调用 relay_to_chatgpt 交回 ChatGPT 复审（最多 {max} 轮，写「结论：通过」就停），summary 写一句这轮改了什么。",
        title = handoff.title,
        max = handoffs::ROUNDS,
    )
}
/// 再审一轮: Claude hands its changes over again.
fn again_text(round: u32) -> String {
    format!(
        "请把按意见修改后的改动交回 ChatGPT 复审（第 {round} 轮）：调用 relay_to_chatgpt，brief 写这轮改了什么、对应哪几条意见、diff 或 PR 链接，最后请 ChatGPT 写「结论：通过」或「结论：需修改」；summary 写一句这轮改了什么。"
    )
}
fn timed_out() -> String {
    l10n::text(
        "ChatGPT 新会话两分钟没打开",
        "The ChatGPT conversation did not open within two minutes",
    )
}
fn interrupted() -> String {
    l10n::text(
        "驿窗重启时 ChatGPT 新会话还在打开",
        "PostPane restarted while the ChatGPT conversation was opening",
    )
}

fn too_long() -> String {
    l10n::text(
        "内容太长（超过 768 KB）：改动请只带摘要和关键片段，完整改动让 ChatGPT 去看 PR。",
        "Too long (over 768 KB): send a summary and the key hunks, and let ChatGPT read the PR.",
    )
}
fn demo() -> String {
    l10n::text("演示模式不接 ChatGPT", "The demo reaches no ChatGPT")
}
fn not_connected() -> String {
    l10n::text(
        "ChatGPT 插件没有连上驿窗：在 Chrome 加载驿窗的 ChatGPT 插件，并在驿窗设置 → 智能体插件 →「ChatGPT（Chrome 插件）」里登记。",
        "The ChatGPT extension is not connected: load PostPane's ChatGPT extension in Chrome and register it in Settings → Agent plugins → ChatGPT (Chrome extension).",
    )
}

/// A Claude Code session the snapshot lists, as the caller's fallback needs it.
#[derive(Clone, Debug, PartialEq)]
pub(crate) struct Known {
    pub id: String,
    pub cwd: Option<String>,
    /// When it last did something, in milliseconds.
    pub at: i64,
}

/// The snapshot's Claude Code sessions.
pub(crate) fn claude_sessions(snapshot: &Value) -> Vec<Known> {
    snapshot["sessions"]
        .as_array()
        .into_iter()
        .flatten()
        .filter(|session| session["source"] == CLAUDE)
        .filter_map(|session| {
            let at = ["lastMessageAt", "updatedAt"]
                .iter()
                .filter_map(|key| session[*key].as_str())
                .filter_map(|text| chrono::DateTime::parse_from_rfc3339(text).ok())
                .map(|at| at.timestamp_millis())
                .max()
                .unwrap_or(0);
            Some(Known {
                id: session["id"].as_str()?.to_owned(),
                cwd: session["cwd"].as_str().map(str::to_owned),
                at,
            })
        })
        .collect()
}

fn same_folder(a: &str, b: &str) -> bool {
    let trim = |path: &str| path.trim_end_matches(['/', '\\']).to_owned();
    !a.is_empty() && trim(a) == trim(b)
}

/// The Claude Code session that called, never guessed: the one Claude Code
/// named (`CLAUDE_CODE_SESSION_ID`) while it runs the plugin; else, as that
/// id goes stale after /clear or a resume, the only session the plugin says
/// runs now in the same folder; else the named one as it is. None when two
/// run in the folder and neither is named, or nothing names one.
pub(crate) fn resolve_session(
    named: Option<&str>,
    cwd: Option<&str>,
    loaded: &HashSet<String>,
    sessions: &[Known],
) -> Option<String> {
    let named = named.filter(|id| agent_hud_runtime::claude_plugin::valid_name(id));
    if let Some(id) = named.filter(|id| loaded.contains(*id)) {
        return Some(id.to_owned());
    }
    let running_here = sessions
        .iter()
        .filter(|session| {
            loaded.contains(&session.id)
                && cwd
                    .zip(session.cwd.as_deref())
                    .is_some_and(|(cwd, theirs)| same_folder(cwd, theirs))
        })
        .collect::<Vec<_>>();
    match running_here.as_slice() {
        [only] => Some(only.id.clone()),
        [] => named.map(str::to_owned),
        _ => None,
    }
}

/// The app's own lines: the ChatGPT channel and Agent HUD's Claude Code plugin.
struct AppLines<'a>(&'a tauri::AppHandle);
impl Lines for AppLines<'_> {
    fn connected(&self) -> bool {
        self.0
            .try_state::<super::chatgpt::ChatGpt>()
            .is_some_and(|chatgpt| chatgpt.connected())
    }
    fn open(
        &self,
        text: &str,
        project: Option<&str>,
        title: &str,
        request: &str,
    ) -> Result<String, String> {
        let state = self
            .0
            .try_state::<super::chatgpt::ChatGpt>()
            .ok_or("The ChatGPT channel is unavailable")?;
        let opened = state
            .channel()?
            .open_as(text, project, Some(title), Some(request))?;
        opened["conversation"]
            .as_str()
            .map(str::to_owned)
            .ok_or_else(|| "The ChatGPT extension named no conversation".into())
    }
    fn send(&self, conversation: &str, text: &str) -> Result<(), String> {
        let state = self
            .0
            .try_state::<super::chatgpt::ChatGpt>()
            .ok_or("The ChatGPT channel is unavailable")?;
        state.channel()?.send(conversation, text).map(drop)
    }
    fn reaches(&self, session: &str) -> Result<(), String> {
        let plugin = self
            .0
            .try_state::<super::claude_plugin::ClaudePlugin>()
            .ok_or_else(no_plugin)?;
        plugin
            .replies()
            .reaches(CLAUDE, session)
            .map_err(|unreachable| unreachable.note)
    }
    fn reply(&self, session: &str, text: &str) -> Result<(), String> {
        let plugin = self
            .0
            .try_state::<super::claude_plugin::ClaudePlugin>()
            .ok_or_else(no_plugin)?;
        plugin.replies().reply(CLAUDE, session, text)
    }
}
fn no_plugin() -> String {
    l10n::text(
        "Claude Code 插件通道不可用",
        "Claude Code's plugin channel is unavailable",
    )
}

fn now_ms() -> i64 {
    chrono::Utc::now().timestamp_millis()
}

/// Sends the snapshot again with the handoffs as they are now.
fn republish(app: &tauri::AppHandle) {
    if let Some(service) = app.try_state::<super::Service>() {
        if let Ok(mut backend) = service.backend.lock() {
            backend.refresh_handoffs(app);
        }
    }
}

/// Starts a handoff and, when a conversation is to be opened, opens it on a
/// thread of its own; the answer says which.
#[allow(clippy::too_many_arguments)]
fn start(
    app: &tauri::AppHandle,
    session: &str,
    cwd: Option<&str>,
    title: &str,
    summary: Option<&str>,
    brief: &str,
    fresh: bool,
) -> Result<Value, String> {
    let desk = app.try_state::<Desk>().ok_or_else(demo)?;
    let started = desk.start(
        &AppLines(app),
        session,
        cwd,
        title,
        summary,
        brief,
        fresh,
        now_ms(),
    );
    republish(app);
    match started? {
        Started::Sent { handoff, repeated } => Ok(json!({
            "handoffId": handoff.id,
            "status": if repeated { "repeated" } else { "sent" },
            "conversation": handoff.chatgpt_conversation,
        })),
        Started::Opening { handoff, project } => {
            open_away(app, &handoff.id, brief, project)?;
            Ok(json!({"handoffId": handoff.id, "status": "opening", "conversation": null}))
        }
    }
}

/// Opens a handoff's conversation on a thread of its own.
fn open_away(
    app: &tauri::AppHandle,
    id: &str,
    brief: &str,
    project: Option<String>,
) -> Result<(), String> {
    let (app, id, brief) = (app.clone(), id.to_owned(), brief.to_owned());
    std::thread::Builder::new()
        .name("postpane-handoff".into())
        .spawn(move || {
            if let Some(desk) = app.try_state::<Desk>() {
                let _ = desk.open(&AppLines(&app), &id, &brief, project.as_deref(), now_ms);
            }
            republish(&app);
        })
        .map(drop)
        .map_err(|error| error.to_string())
}

/// Hears what the ChatGPT extension reports, for the handoffs.
pub(crate) fn listen(app: &tauri::AppHandle) {
    let Some(chatgpt) = app.try_state::<super::chatgpt::ChatGpt>() else {
        return;
    };
    let Ok(channel) = chatgpt.channel() else {
        return;
    };
    let app = app.clone();
    channel.listen(std::sync::Arc::new(move |message: &Value| {
        let changed = app
            .try_state::<Desk>()
            .is_some_and(|desk| desk.observe(message, now_ms()));
        if changed {
            republish(&app);
        }
    }));
}

/// `relay_to_chatgpt`: Claude Code hands its work to ChatGPT for review.
/// Only a Claude Code session may; which one is checked against the
/// sessions the plugin says run now (`resolve_session`).
pub(crate) fn relay(
    app: &tauri::AppHandle,
    params: &Value,
    sessions: &[Known],
) -> Result<Value, String> {
    let caller = &params["caller"];
    if !caller.is_null() && caller["client"] != CLAUDE {
        return Err(l10n::text(
            "只有 Claude Code 会话能把工作交给 ChatGPT 审核。",
            "Only a Claude Code session can hand its work to ChatGPT for review.",
        ));
    }
    let title = params["title"].as_str().unwrap_or("").trim();
    let summary = params["summary"].as_str();
    let brief = params["brief"].as_str().unwrap_or("");
    let cwd = params["cwd"].as_str().filter(|cwd| !cwd.is_empty());
    let loaded = app
        .try_state::<super::claude_plugin::ClaudePlugin>()
        .map(|plugin| plugin.loaded())
        .unwrap_or_default();
    let session = resolve_session(caller["sessionId"].as_str(), cwd, &loaded, sessions)
        .ok_or_else(|| {
            l10n::text(
                "认不准是哪个 Claude Code 会话在调用（同一目录有几个会话在跑，或没有会话 id），没有发出。请在 Claude Code 会话里调用这个工具，或先关掉同目录多余的会话。",
                "Could not tell for sure which Claude Code session is calling (several run in this folder, or none is named); nothing was sent. Call this tool from a Claude Code session, or close the other sessions in this folder.",
            )
        })?;
    let mut answer = start(app, &session, cwd, title, summary, brief, false)?;
    answer["claudeSession"] = json!(session);
    answer["message"] = json!(if answer["status"] == "repeated" {
        l10n::text(
            "这段内容刚才已经送到 ChatGPT，还没回信，没有再送一次；回信会出现在驿窗侧栏。",
            "These words already reached ChatGPT and await an answer; they were not sent again. The answer shows in PostPane's sidebar.",
        )
    } else if answer["status"] == "sent" {
        l10n::text(
            "已送进这个会话对应的 ChatGPT 审核会话；回复会出现在驿窗侧栏，常浩看过后会把意见转回这个会话。",
            "Sent into this session's ChatGPT review conversation; the reply shows in PostPane's sidebar and will be forwarded back here.",
        )
    } else {
        l10n::text(
            "已交给 ChatGPT 审核：新会话正在打开，回复会出现在驿窗侧栏，常浩看过后会把意见转回这个会话。",
            "Handed to ChatGPT for review: a new conversation is opening; the reply shows in PostPane's sidebar and will be forwarded back here.",
        )
    });
    Ok(answer)
}

/// The handoff card's buttons (`Desk::act`).
#[tauri::command]
pub async fn handoff_act(
    app: tauri::AppHandle,
    id: String,
    action: String,
) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let desk = app.try_state::<Desk>().ok_or_else(demo)?;
        let acted = desk.act(&AppLines(&app), &id, &action, now_ms());
        republish(&app);
        if let Acted::Open { brief, project } = acted? {
            open_away(&app, &id, &brief, project)?;
        }
        Ok(json!({"done": true}))
    })
    .await
    .map_err(|error| error.to_string())?
}

/// Settings' 「新会话放进项目」: the project page, read (no `project`) or set.
#[tauri::command]
pub fn chatgpt_project(
    window: tauri::WebviewWindow,
    app: tauri::AppHandle,
    project: Option<String>,
) -> Result<Value, String> {
    if window.label() != "main" {
        return Err("The ChatGPT project is set in Settings".into());
    }
    let desk = app.try_state::<Desk>().ok_or_else(demo)?;
    let project = match project {
        Some(text) => desk.set_project(&text)?,
        None => desk.project(),
    };
    Ok(json!({ "project": project }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::RefCell;

    /// Lines that write down what was sent and answer as told.
    #[derive(Default)]
    struct Fake {
        offline: bool,
        open_fails: bool,
        unreachable: bool,
        sent: RefCell<Vec<(String, String, String)>>,
    }
    impl Lines for Fake {
        fn connected(&self) -> bool {
            !self.offline
        }
        fn open(
            &self,
            text: &str,
            project: Option<&str>,
            title: &str,
            request: &str,
        ) -> Result<String, String> {
            self.sent.borrow_mut().push((
                "open".into(),
                format!("{}|{title}|{request}", project.unwrap_or("")),
                text.into(),
            ));
            if self.open_fails {
                Err("timeout".into())
            } else {
                Ok("c-new".into())
            }
        }
        fn send(&self, conversation: &str, text: &str) -> Result<(), String> {
            self.sent
                .borrow_mut()
                .push(("send".into(), conversation.into(), text.into()));
            Ok(())
        }
        fn reaches(&self, _session: &str) -> Result<(), String> {
            if self.unreachable {
                Err("这个会话还没加载 Agent HUD 插件".into())
            } else {
                Ok(())
            }
        }
        fn reply(&self, session: &str, text: &str) -> Result<(), String> {
            self.sent
                .borrow_mut()
                .push(("reply".into(), session.into(), text.into()));
            Ok(())
        }
    }
    fn desk() -> (tempfile::TempDir, Desk) {
        let temp = tempfile::tempdir().unwrap();
        let desk = Desk::new(Some(temp.path().join("data")));
        (temp, desk)
    }
    fn opened(desk: &Desk, lines: &Fake) -> Handoff {
        let Started::Opening { handoff, project } = desk
            .start(
                lines,
                "s1",
                Some("/w"),
                "修登录",
                Some("改了 6 个文件"),
                "改动如下",
                false,
                1,
            )
            .unwrap()
        else {
            panic!("a first brief opens a conversation");
        };
        desk.open(lines, &handoff.id, "改动如下", project.as_deref(), || 2)
            .unwrap();
        handoff
    }
    fn turn(phase: &str, reply: &str) -> Value {
        json!({"type":"turn","phase":phase,"conversation":"c-new","reply":reply})
    }

    #[test]
    fn the_first_brief_opens_a_review_and_the_next_goes_into_it() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        desk.set_project("https://chatgpt.com/g/g-p-1-review/project")
            .unwrap();
        let Started::Opening { handoff, project } = desk
            .start(
                &lines,
                "s1",
                Some("/w"),
                "修登录",
                None,
                "改动如下",
                false,
                1,
            )
            .unwrap()
        else {
            panic!("a first brief opens a conversation");
        };
        assert_eq!(
            project.as_deref(),
            Some("https://chatgpt.com/g/g-p-1-review/project")
        );
        // While it opens, another brief waits.
        assert!(desk
            .start(&lines, "s1", Some("/w"), "修登录", None, "再看看", false, 2)
            .is_err());
        assert_eq!(
            desk.open(&lines, &handoff.id, "改动如下", project.as_deref(), || 3)
                .unwrap(),
            "c-new"
        );
        // Opened under the handoff's title and asked as the handoff.
        assert_eq!(
            lines.sent.borrow()[0].1,
            format!(
                "https://chatgpt.com/g/g-p-1-review/project|修登录|{}",
                handoff.id
            )
        );
        let Started::Sent {
            handoff: sent,
            repeated,
        } = desk
            .start(
                &lines,
                "s1",
                Some("/w"),
                "修登录",
                Some("按意见改完"),
                "第二轮",
                false,
                4,
            )
            .unwrap()
        else {
            panic!("the next brief goes into the same conversation");
        };
        assert!(!repeated);
        assert_eq!(sent.id, handoff.id);
        assert_eq!(sent.reviews(), 2);
        assert_eq!(
            lines.sent.borrow().last().unwrap(),
            &("send".into(), "c-new".into(), "第二轮".into())
        );
        // The same words again are not sent twice.
        let Started::Sent { repeated, .. } = desk
            .start(&lines, "s1", Some("/w"), "修登录", None, "第二轮", false, 5)
            .unwrap()
        else {
            panic!()
        };
        assert!(repeated);
        assert_eq!(lines.sent.borrow().len(), 2);
        let shown = desk.projection(5);
        assert_eq!(shown[0]["status"], "open");
        assert_eq!(shown[0]["phase"], "delivered");
        assert_eq!(shown[0]["chatgptConversation"], "c-new");
        assert_eq!(shown[0]["claudeSession"], "s1");
        assert!(shown[0].get("brief").is_none());
        // A new review asked for opens another and closes this one.
        let Started::Opening { handoff: fresh, .. } = desk
            .start(&lines, "s1", None, "修登录", None, "重新审", true, 6)
            .unwrap()
        else {
            panic!("a fresh start opens a conversation");
        };
        assert_ne!(fresh.id, handoff.id);
        let shown = desk.projection(7);
        assert_eq!(shown.as_array().unwrap().len(), 1);
        assert_eq!(shown[0]["id"], fresh.id.as_str());
    }

    #[test]
    fn chatgpt_starting_and_answering_moves_the_handoff_on() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        let handoff = opened(&desk, &lines);
        assert!(desk.observe(&turn("start", ""), 3));
        assert_eq!(desk.projection(3)[0]["phase"], "working");
        let reply = "1. 会话认不准时不该猜\n2. opening 要超时\n结论：需修改";
        assert!(desk.observe(&turn("complete", reply), 4));
        let shown = desk.projection(4);
        assert_eq!(shown[0]["phase"], "replied");
        let last = shown[0]["steps"]
            .as_array()
            .unwrap()
            .last()
            .unwrap()
            .clone();
        assert_eq!(last["kind"], "reply");
        assert_eq!(last["verdict"], "revise");
        assert_eq!(
            last["points"],
            json!(["会话认不准时不该猜", "opening 要超时"])
        );
        // Another conversation's turns change nothing.
        assert!(!desk.observe(
            &json!({"type":"turn","phase":"start","conversation":"c-other"}),
            5
        ));
        // 转回 Claude: the answer in full, once.
        desk.act(&lines, &handoff.id, "back", 6).unwrap();
        let (kind, to, text) = lines.sent.borrow().last().unwrap().clone();
        assert_eq!((kind.as_str(), to.as_str()), ("reply", "s1"));
        assert!(
            text.contains(reply)
                && text.contains("结论：需修改")
                && text.contains("relay_to_chatgpt")
        );
        desk.act(&lines, &handoff.id, "back", 7).unwrap();
        assert_eq!(lines.sent.borrow().len(), 2, "not sent twice");
        assert_eq!(desk.projection(7)[0]["phase"], "returned");
        // 再审一轮 asks Claude to hand over round 2.
        desk.act(&lines, &handoff.id, "again", 8).unwrap();
        assert!(lines.sent.borrow().last().unwrap().2.contains("第 2 轮"));
        // 结束接力.
        desk.act(&lines, &handoff.id, "end", 9).unwrap();
        let shown = desk.projection(9);
        assert_eq!(shown[0]["phase"], "ended");
        assert!(desk.act(&lines, &handoff.id, "back", 10).is_err());
        assert!(desk.act(&lines, &handoff.id, "nope", 10).is_err());
    }

    #[test]
    fn words_back_to_claude_wait_for_an_answer_and_a_way_there() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        let handoff = opened(&desk, &lines);
        assert!(
            desk.act(&lines, &handoff.id, "back", 3).is_err(),
            "no answer yet"
        );
        desk.observe(&turn("complete", "结论：通过"), 4);
        let unreachable = Fake {
            unreachable: true,
            ..Fake::default()
        };
        assert_eq!(
            desk.act(&unreachable, &handoff.id, "back", 5).unwrap_err(),
            "这个会话还没加载 Agent HUD 插件"
        );
        assert!(unreachable.sent.borrow().is_empty());
        assert_eq!(desk.projection(5)[0]["phase"], "replied");
    }

    #[test]
    fn a_review_that_cannot_open_says_why_and_can_be_retried() {
        let (_temp, desk) = desk();
        let offline = Fake {
            offline: true,
            ..Fake::default()
        };
        assert!(desk
            .start(&offline, "s1", None, "t", None, "brief", false, 1)
            .unwrap_err()
            .contains("ChatGPT"));
        assert!(desk
            .start(&offline, "s1", None, "t", None, " ", false, 1)
            .is_err());
        let long = "改".repeat(TEXT_LIMIT / 3 + 1);
        assert!(desk
            .start(&Fake::default(), "s1", None, "t", None, &long, false, 1)
            .unwrap_err()
            .contains("768"));
        assert!(desk
            .start(&offline, "../x", None, "t", None, "b", false, 1)
            .is_err());
        let failing = Fake {
            open_fails: true,
            ..Fake::default()
        };
        let Started::Opening { handoff, .. } = desk
            .start(&failing, "s1", None, "", None, "brief", false, 1)
            .unwrap()
        else {
            panic!()
        };
        assert!(!handoff.title.is_empty(), "an untitled review is named");
        assert!(desk
            .open(&failing, &handoff.id, "brief", None, || 2)
            .is_err());
        let shown = desk.projection(3);
        assert_eq!(shown[0]["status"], "failed");
        assert_eq!(shown[0]["error"], "timeout");
        // Retried: opening again with the same brief.
        let Acted::Open { brief, .. } =
            desk.act(&Fake::default(), &handoff.id, "retry", 4).unwrap()
        else {
            panic!("a retry opens again")
        };
        assert_eq!(brief, "brief");
        assert_eq!(desk.projection(4)[0]["status"], "opening");
        // An opening that hangs fails after two minutes.
        let later = 4 + handoffs::OPEN_TIMEOUT_MS + 1;
        assert_eq!(desk.projection(later)[0]["status"], "failed");
        // The answer came late after all: bound.
        assert!(desk.observe(
            &json!({"type":"opened","requestId":handoff.id,"ok":true,"conversation":"c-late"}),
            later + 1
        ));
        assert_eq!(
            desk.projection(later + 1)[0]["chatgptConversation"],
            "c-late"
        );
        // A failed one leaves the snapshot after a day.
        assert!(desk
            .act(&Fake::default(), &handoff.id, "end", later + 2)
            .is_ok());
        assert_eq!(desk.projection(later + 2 + FAILED_SHOWN_MS), json!([]));
    }

    #[test]
    fn an_opening_cut_off_by_a_restart_fails_to_retry() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        let Started::Opening { handoff, .. } = desk
            .start(&lines, "s1", None, "t", None, "brief", false, now_ms())
            .unwrap()
        else {
            panic!()
        };
        let again = Desk::new(desk.data.clone());
        let shown = again.projection(now_ms());
        assert_eq!(shown[0]["id"], handoff.id.as_str());
        assert_eq!(shown[0]["status"], "failed");
        assert!(matches!(
            again.act(&lines, &handoff.id, "retry", now_ms()).unwrap(),
            Acted::Open { .. }
        ));
    }

    #[test]
    fn the_caller_is_the_session_running_now_never_a_guess() {
        let known = |id: &str, cwd: &str, at: i64| Known {
            id: id.into(),
            cwd: Some(cwd.into()),
            at,
        };
        let sessions = [
            known("old", "/w", 1),
            known("new", "/w/", 5),
            known("other", "/x", 9),
        ];
        let loaded = |ids: &[&str]| ids.iter().map(|id| id.to_string()).collect();
        // The named session runs the plugin now.
        assert_eq!(
            resolve_session(Some("old"), Some("/w"), &loaded(&["old", "new"]), &sessions),
            Some("old".into())
        );
        // The named one went stale (/clear): the only one running here now.
        assert_eq!(
            resolve_session(Some("old"), Some("/w"), &loaded(&["new"]), &sessions),
            Some("new".into())
        );
        assert_eq!(
            resolve_session(None, Some("/w"), &loaded(&["new"]), &sessions),
            Some("new".into())
        );
        // Two run here and neither is named: no guess.
        assert_eq!(
            resolve_session(
                Some("stale"),
                Some("/w"),
                &loaded(&["old", "new"]),
                &sessions
            ),
            None
        );
        // Without the plugin, the named one as it is; never the folder's latest.
        assert_eq!(
            resolve_session(Some("old"), Some("/w"), &loaded(&[]), &sessions),
            Some("old".into())
        );
        assert_eq!(
            resolve_session(None, Some("/w"), &loaded(&[]), &sessions),
            None
        );
        assert_eq!(
            resolve_session(Some("fresh"), Some("/y"), &loaded(&[]), &sessions),
            Some("fresh".into())
        );
        assert_eq!(
            resolve_session(None, None, &loaded(&["new"]), &sessions),
            None
        );
        assert_eq!(
            resolve_session(Some("../x"), None, &loaded(&[]), &sessions),
            None
        );
    }

    #[test]
    fn the_snapshot_lists_claude_sessions_by_their_latest_time() {
        let snapshot = json!({"sessions":[
            {"id":"a","source":"claude","cwd":"/w","updatedAt":"2026-11-05T10:00:00Z","lastMessageAt":"2026-11-05T09:00:00Z"},
            {"id":"b","source":"codex","cwd":"/w","updatedAt":"2026-11-05T10:00:00Z"},
            {"id":"c","source":"claude","cwd":null,"updatedAt":"bad"},
        ]});
        let found = claude_sessions(&snapshot);
        assert_eq!(found.len(), 2);
        assert_eq!(found[0].id, "a");
        assert_eq!(
            found[0].at,
            chrono::DateTime::parse_from_rfc3339("2026-11-05T10:00:00Z")
                .unwrap()
                .timestamp_millis()
        );
        assert_eq!(
            found[1],
            Known {
                id: "c".into(),
                cwd: None,
                at: 0
            }
        );
    }
}
