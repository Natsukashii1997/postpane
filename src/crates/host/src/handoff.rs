//! Relay 1c (docs/chatgpt-channel.md, 1c 接力): a Claude Code session hands
//! its work to a ChatGPT conversation for review, and words go back and forth
//! between the two. The host owns the handoffs because it holds both ways
//! out: the ChatGPT extension's channel and Agent HUD's Claude Code plugin.
//! Started by Claude (the `relay_to_chatgpt` local tool) or from a reply's
//! handoff sheet in the HUD (`handoff_start`, `handoff_forward`).
use agent_hud_runtime::chatgpt::handoffs::{self, Book, Handoff, Status};
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
    /// Opens a conversation (in `project`) with `text`: its id.
    fn open(&self, text: &str, project: Option<&str>) -> Result<String, String>;
    fn send(&self, conversation: &str, text: &str) -> Result<(), String>;
    /// Whether words left for a Claude Code session would reach it.
    fn reaches(&self, session: &str) -> Result<(), String>;
    fn reply(&self, session: &str, text: &str) -> Result<(), String>;
}

/// What a start did, or leaves to do away from the caller.
#[derive(Debug, PartialEq)]
pub(crate) enum Started {
    /// The brief went into the session's review conversation.
    Sent(Handoff),
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
    /// The handoffs kept in `data`; none kept in the demo.
    pub(crate) fn new(data: Option<PathBuf>) -> Self {
        let book = data.as_deref().map(handoffs::load).unwrap_or_default();
        Self {
            data,
            book: Mutex::new(book),
        }
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
    /// The snapshot's `handoffs`: the live ones and those that failed lately.
    pub(crate) fn projection(&self, now: i64) -> Value {
        let book = self.lock();
        let shown = book
            .list
            .iter()
            .filter(|handoff| {
                handoff.live()
                    || (handoff.status == Status::Failed
                        && now - handoff.updated_at < FAILED_SHOWN_MS)
            })
            .collect::<Vec<_>>();
        json!(shown)
    }

    /// Hands `brief` to ChatGPT for `session`: into the review conversation
    /// the session already has, else a new one (always a new one when
    /// `fresh`). Sending waits for the extension; opening is left to the
    /// caller, to do away from it (`Desk::open`).
    pub(crate) fn start(
        &self,
        lines: &dyn Lines,
        session: &str,
        cwd: Option<&str>,
        title: &str,
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
        let current = (!fresh)
            .then(|| self.lock().for_session(session).cloned())
            .flatten();
        if let Some(handoff) = current {
            match (handoff.status, handoff.chatgpt_conversation.as_deref()) {
                (Status::Open, Some(conversation)) => {
                    lines.send(conversation, brief)?;
                    self.change(|book| book.round(&handoff.id, now));
                    let sent = self.lock().get(&handoff.id).cloned().unwrap_or(handoff);
                    return Ok(Started::Sent(sent));
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
        let handoff = self.change(|book| book.begin(session, cwd, &title, now));
        Ok(Started::Opening {
            handoff,
            project: self.project(),
        })
    }

    /// Opens the review conversation of an opening handoff with `brief`,
    /// and binds the handoff to it or records why it could not be opened.
    pub(crate) fn open(
        &self,
        lines: &dyn Lines,
        id: &str,
        brief: &str,
        project: Option<&str>,
        now: impl Fn() -> i64,
    ) -> Result<String, String> {
        let opened = lines.open(brief, project);
        self.change(|book| match &opened {
            Ok(conversation) => book.opened(id, conversation, now()),
            Err(error) => book.failed(id, error, now()),
        });
        opened
    }

    /// Sends `text` on, to a Claude Code session (`to` "claude", `target`
    /// its id) or a ChatGPT conversation (`to` "chatgpt", `target` its id),
    /// and counts a round on the handoff it belongs to.
    pub(crate) fn forward(
        &self,
        lines: &dyn Lines,
        to: &str,
        target: &str,
        text: &str,
        now: i64,
    ) -> Result<Value, String> {
        if text.trim().is_empty() {
            return Err(l10n::text("没有要发出的文字", "There is nothing to send"));
        }
        if text.len() > TEXT_LIMIT {
            return Err(too_long());
        }
        let handoff = match to {
            "claude" => {
                lines.reaches(target)?;
                lines.reply(target, text)?;
                self.lock().for_session(target).map(|h| h.id.clone())
            }
            "chatgpt" => {
                if !lines.connected() {
                    return Err(not_connected());
                }
                lines.send(target, text)?;
                self.lock().for_conversation(target).map(|h| h.id.clone())
            }
            _ => return Err("Unknown handoff target".into()),
        };
        if let Some(id) = &handoff {
            self.change(|book| book.round(id, now));
        }
        Ok(json!({"delivered":to,"handoffId":handoff}))
    }

    /// Whether words would reach `target` now, and why not.
    pub(crate) fn route(&self, lines: &dyn Lines, to: &str, target: &str) -> Value {
        let reached = match to {
            "claude" => lines.reaches(target),
            "chatgpt" | "new-review" => {
                if lines.connected() {
                    Ok(())
                } else {
                    Err(not_connected())
                }
            }
            _ => Err("Unknown handoff target".into()),
        };
        match reached {
            Ok(()) => json!({"reachable":true,"reason":null}),
            Err(reason) => json!({"reachable":false,"reason":reason}),
        }
    }
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

/// The Claude Code session that called: the one Claude Code named
/// (`CLAUDE_CODE_SESSION_ID`) while it runs the plugin. That id goes stale
/// after /clear or a resume, so a session the plugin says runs now in the
/// same folder comes first; then the named one, if the app knows it; then
/// the folder's latest; then the named one as it is. None when nothing names
/// one.
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
    let mut here = sessions
        .iter()
        .filter(|session| {
            cwd.zip(session.cwd.as_deref())
                .is_some_and(|(cwd, theirs)| same_folder(cwd, theirs))
        })
        .collect::<Vec<_>>();
    here.sort_by_key(|session| std::cmp::Reverse(session.at));
    if let Some(live) = here.iter().find(|session| loaded.contains(&session.id)) {
        return Some(live.id.clone());
    }
    if let Some(id) = named.filter(|id| sessions.iter().any(|s| s.id == *id)) {
        return Some(id.to_owned());
    }
    here.first()
        .map(|session| session.id.clone())
        .or(named.map(str::to_owned))
}

/// The app's own lines: the ChatGPT channel and Agent HUD's Claude Code plugin.
struct AppLines<'a>(&'a tauri::AppHandle);
impl Lines for AppLines<'_> {
    fn connected(&self) -> bool {
        self.0
            .try_state::<super::chatgpt::ChatGpt>()
            .is_some_and(|chatgpt| chatgpt.connected())
    }
    fn open(&self, text: &str, project: Option<&str>) -> Result<String, String> {
        let state = self
            .0
            .try_state::<super::chatgpt::ChatGpt>()
            .ok_or("The ChatGPT channel is unavailable")?;
        let opened = state.channel()?.open(text, project)?;
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
fn start(
    app: &tauri::AppHandle,
    session: &str,
    cwd: Option<&str>,
    title: &str,
    brief: &str,
    fresh: bool,
) -> Result<Value, String> {
    let desk = app.try_state::<Desk>().ok_or_else(demo)?;
    let started = desk.start(&AppLines(app), session, cwd, title, brief, fresh, now_ms());
    republish(app);
    match started? {
        Started::Sent(handoff) => Ok(json!({
            "handoffId": handoff.id,
            "status": "sent",
            "conversation": handoff.chatgpt_conversation,
        })),
        Started::Opening { handoff, project } => {
            let id = handoff.id.clone();
            let app = app.clone();
            let brief = brief.to_owned();
            std::thread::Builder::new()
                .name("postpane-handoff".into())
                .spawn(move || {
                    if let Some(desk) = app.try_state::<Desk>() {
                        let _ = desk.open(&AppLines(&app), &id, &brief, project.as_deref(), now_ms);
                    }
                    republish(&app);
                })
                .map_err(|error| error.to_string())?;
            Ok(json!({"handoffId": handoff.id, "status": "opening", "conversation": null}))
        }
    }
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
    let brief = params["brief"].as_str().unwrap_or("");
    let cwd = params["cwd"].as_str().filter(|cwd| !cwd.is_empty());
    let loaded = app
        .try_state::<super::claude_plugin::ClaudePlugin>()
        .map(|plugin| plugin.loaded())
        .unwrap_or_default();
    let session = resolve_session(caller["sessionId"].as_str(), cwd, &loaded, sessions)
        .ok_or_else(|| {
            l10n::text(
                "认不出是哪个 Claude Code 会话在调用：请在 Claude Code 会话里调用这个工具。",
                "Could not tell which Claude Code session is calling: call this tool from a Claude Code session.",
            )
        })?;
    let mut answer = start(app, &session, cwd, title, brief, false)?;
    answer["claudeSession"] = json!(session);
    answer["message"] = json!(if answer["status"] == "sent" {
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

/// The handoff sheet's 「新建 ChatGPT 审核」: a new review of `session`.
#[tauri::command]
pub async fn handoff_start(
    app: tauri::AppHandle,
    session: String,
    cwd: Option<String>,
    title: String,
    text: String,
) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        start(&app, &session, cwd.as_deref(), &title, &text, true)
    })
    .await
    .map_err(|error| error.to_string())?
}

/// The handoff sheet's 「送进会话」: words to a Claude Code session or a
/// ChatGPT conversation.
#[tauri::command]
pub async fn handoff_forward(
    app: tauri::AppHandle,
    to: String,
    target: String,
    text: String,
) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let desk = app.try_state::<Desk>().ok_or_else(demo)?;
        let result = desk.forward(&AppLines(&app), &to, &target, &text, now_ms());
        republish(&app);
        result
    })
    .await
    .map_err(|error| error.to_string())?
}

/// The handoff sheet's way line: whether words would reach `target`.
#[tauri::command]
pub async fn handoff_route(
    app: tauri::AppHandle,
    to: String,
    target: String,
) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let desk = app.try_state::<Desk>().ok_or_else(demo)?;
        Ok(desk.route(&AppLines(&app), &to, &target))
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
        fn open(&self, text: &str, project: Option<&str>) -> Result<String, String> {
            self.sent
                .borrow_mut()
                .push(("open".into(), project.unwrap_or("").into(), text.into()));
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

    #[test]
    fn the_first_brief_opens_a_review_and_the_next_goes_into_it() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        desk.set_project("https://chatgpt.com/g/g-p-1-review/project")
            .unwrap();
        let Started::Opening { handoff, project } = desk
            .start(&lines, "s1", Some("/w"), "修登录", "改动如下", false, 1)
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
            .start(&lines, "s1", Some("/w"), "修登录", "再看看", false, 2)
            .is_err());
        assert_eq!(
            desk.open(&lines, &handoff.id, "改动如下", project.as_deref(), || 3)
                .unwrap(),
            "c-new"
        );
        let Started::Sent(sent) = desk
            .start(&lines, "s1", Some("/w"), "修登录", "第二轮", false, 4)
            .unwrap()
        else {
            panic!("the next brief goes into the same conversation");
        };
        assert_eq!(sent.id, handoff.id);
        assert_eq!(sent.rounds, 1);
        assert_eq!(
            lines.sent.borrow().last().unwrap(),
            &("send".into(), "c-new".into(), "第二轮".into())
        );
        let shown = desk.projection(5);
        assert_eq!(shown[0]["status"], "open");
        assert_eq!(shown[0]["chatgptConversation"], "c-new");
        assert_eq!(shown[0]["claudeSession"], "s1");
        // A new review asked for opens another and closes this one.
        let Started::Opening { handoff: fresh, .. } = desk
            .start(&lines, "s1", None, "修登录", "重新审", true, 6)
            .unwrap()
        else {
            panic!("a fresh start opens a conversation");
        };
        assert_ne!(fresh.id, handoff.id);
        let shown = desk.projection(7);
        assert_eq!(shown.as_array().unwrap().len(), 1);
        assert_eq!(shown[0]["id"], fresh.id.as_str());
        // Kept between runs.
        let again = Desk::new(desk.data.clone());
        assert_eq!(again.projection(7), shown);
    }

    #[test]
    fn a_review_that_cannot_open_or_reach_chatgpt_says_why() {
        let (_temp, desk) = desk();
        let offline = Fake {
            offline: true,
            ..Fake::default()
        };
        assert!(desk
            .start(&offline, "s1", None, "t", "brief", false, 1)
            .unwrap_err()
            .contains("ChatGPT"));
        assert!(desk
            .start(&offline, "s1", None, "t", " ", false, 1)
            .is_err());
        let long = "改".repeat(TEXT_LIMIT / 3 + 1);
        assert!(desk
            .start(&Fake::default(), "s1", None, "t", &long, false, 1)
            .unwrap_err()
            .contains("768"));
        assert!(desk
            .start(&offline, "../x", None, "t", "b", false, 1)
            .is_err());
        let failing = Fake {
            open_fails: true,
            ..Fake::default()
        };
        let Started::Opening { handoff, .. } = desk
            .start(&failing, "s1", None, "", "brief", false, 1)
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
        // A failed one leaves the snapshot after a day, and frees the session.
        assert_eq!(desk.projection(2 + FAILED_SHOWN_MS), json!([]));
        assert!(matches!(
            desk.start(&failing, "s1", None, "t", "again", false, 4)
                .unwrap(),
            Started::Opening { .. }
        ));
    }

    #[test]
    fn forwarding_reaches_the_right_side_and_counts_the_round() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        let Started::Opening { handoff, .. } = desk
            .start(&lines, "s1", None, "t", "brief", false, 1)
            .unwrap()
        else {
            panic!()
        };
        desk.open(&lines, &handoff.id, "brief", None, || 2).unwrap();
        let back = desk.forward(&lines, "claude", "s1", "意见", 3).unwrap();
        assert_eq!(back["handoffId"], handoff.id.as_str());
        let on = desk
            .forward(&lines, "chatgpt", "c-new", "改好了", 4)
            .unwrap();
        assert_eq!(on["delivered"], "chatgpt");
        assert_eq!(desk.projection(5)[0]["rounds"], 2);
        assert_eq!(
            lines.sent.borrow()[1..].to_vec(),
            [
                ("reply".into(), "s1".into(), "意见".into()),
                ("send".into(), "c-new".into(), "改好了".into())
            ]
        );
        // Words for a session outside any handoff still go; no round counts.
        assert_eq!(
            desk.forward(&lines, "claude", "s2", "x", 6).unwrap()["handoffId"],
            Value::Null
        );
        // A session that would not get them says why, and nothing is sent.
        let unreachable = Fake {
            unreachable: true,
            ..Fake::default()
        };
        assert_eq!(
            desk.forward(&unreachable, "claude", "s1", "x", 7)
                .unwrap_err(),
            "这个会话还没加载 Agent HUD 插件"
        );
        assert!(unreachable.sent.borrow().is_empty());
        assert_eq!(
            desk.route(&unreachable, "claude", "s1"),
            json!({"reachable":false,"reason":"这个会话还没加载 Agent HUD 插件"})
        );
        assert_eq!(
            desk.route(&lines, "chatgpt", "c-new"),
            json!({"reachable":true,"reason":null})
        );
        assert!(desk.forward(&lines, "claude", "s1", "  ", 8).is_err());
        assert!(desk.forward(&lines, "codex", "s1", "x", 8).is_err());
    }

    #[test]
    fn the_caller_is_the_session_running_now() {
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
        // The named one went stale (/clear): the one running here now.
        assert_eq!(
            resolve_session(Some("old"), Some("/w"), &loaded(&["new"]), &sessions),
            Some("new".into())
        );
        // Without the plugin, the named one the app knows.
        assert_eq!(
            resolve_session(Some("old"), Some("/w"), &loaded(&[]), &sessions),
            Some("old".into())
        );
        // Named by nobody: the folder's latest.
        assert_eq!(
            resolve_session(None, Some("/w"), &loaded(&[]), &sessions),
            Some("new".into())
        );
        // A named session the app has not listed yet is still the caller.
        assert_eq!(
            resolve_session(Some("fresh"), Some("/y"), &loaded(&[]), &sessions),
            Some("fresh".into())
        );
        assert_eq!(
            resolve_session(None, Some("/y"), &loaded(&[]), &sessions),
            None
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
