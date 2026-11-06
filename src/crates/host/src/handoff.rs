//! Relay 1c (docs/chatgpt-channel.md, 1c 接力): a Claude Code session hands
//! its work to a ChatGPT conversation for review, and words go back and forth
//! between the two. The host owns the handoffs because it holds both ways
//! out: the ChatGPT extension's channel and Agent HUD's Claude Code plugin.
//! Started by Claude (the `relay_to_chatgpt` local tool); the HUD's handoff
//! card moves it on (`handoff_act`). Each step is kept (handoffs.rs), and
//! the ChatGPT channel tells the desk when ChatGPT starts and finishes.
use crate::extension::Flight;
use agent_hud_runtime::chatgpt::handoffs::{
    self, Book, Handoff, Next, Phase, Status, Step, StepKind, Verdict,
};
use agent_hud_runtime::l10n;
use serde_json::{json, Value};
use std::{
    collections::{HashMap, HashSet},
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
    /// Leaves words for a Claude Code session and says which, to follow
    /// them (`left`).
    fn leave(&self, session: &str, text: &str) -> Result<String, String>;
    /// How words left for a session stand (`waiting`, `taken`, `started`,
    /// `refused`, `expired`, `cancelled`) with the plugin's reason; None once
    /// the plugin's files are gone.
    fn left(&self, session: &str, id: &str) -> Option<(String, Option<String>)>;
}

/// How long a launch that came to nothing stays on its row.
const LAUNCH_SHOWN_MS: i64 = 30 * 60 * 1000;
/// How long words wait for a session before the plugin drops them
/// (claude_plugin PROMPT_LIFETIME), and how long a session that took them
/// has to start its handoff before the row says it did not.
const LAUNCH_LIFETIME_MS: i64 = 60 * 60 * 1000;

/// 左滑发起 (#124): words left for a session to hand its work over, followed
/// until it takes them up, refuses them or they expire.
/// Kept in `launches.json` beside the handoffs, so words still waiting
/// across a restart are not left a second time.
#[derive(Clone, Debug, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct Launch {
    kind: String,
    /// The plugin's id for the words left.
    id: String,
    /// This swipe's own code, in its words: the session names it to
    /// `relay_to_chatgpt` (`launch`), and only that settles the swipe.
    #[serde(default)]
    code: String,
    at: i64,
    /// `queued` (waiting, or taken until the session is idle), `started`
    /// (in the session, which has yet to call `relay_to_chatgpt`), `unknown`
    /// (the words went before they were seen taken), `relayed` (the session
    /// handed its work over naming this swipe), `refused`, `expired` (never
    /// taken), `stalled` (taken, no handoff within the hour of the taking)
    /// or `lost` (unknown, no handoff within the hour).
    state: String,
    reason: Option<String>,
    /// When the plugin was seen taking the words.
    #[serde(default)]
    taken_at: Option<i64>,
    /// When it came to nothing.
    settled_at: Option<i64>,
}

impl Launch {
    /// Words on their way or being worked on: a swipe now would ask twice.
    fn pending(&self) -> bool {
        matches!(self.state.as_str(), "queued" | "started" | "unknown")
    }
}

/// A swipe's code: when, and a count so two at once differ.
fn launch_code(now: i64) -> String {
    static COUNT: std::sync::atomic::AtomicU32 = std::sync::atomic::AtomicU32::new(0);
    let count = COUNT.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    format!("L{now:x}{:02x}", count % 256)
}
fn launches_path(data: &std::path::Path) -> PathBuf {
    agent_hud_runtime::chatgpt::folder(data).join("launches.json")
}

/// What a swipe did: left words now, or found words still waiting.
#[derive(Debug, PartialEq)]
pub(crate) enum Launched {
    Queued,
    AlreadyQueued,
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
    /// Turns ChatGPT began or finished before the desk could take them: in a
    /// conversation not bound yet (a new one starts on its first words,
    /// before `opened` answers), or in one whose words are still on their
    /// way (it may answer before `send` does). Taken in order once bound or
    /// sent (`caught_up`); oldest first.
    early: Mutex<Vec<Early>>,
    /// Handoffs with words on their way now: a second sending waits, so the
    /// same words are not sent twice side by side.
    sending: Mutex<HashSet<String>>,
    /// Each session's last 左滑发起, by session.
    launches: Mutex<HashMap<String, Launch>>,
    /// How many of each handoff's steps the sidebar has flown a letter for
    /// (#171); those kept from before a restart count as flown.
    tossed: Mutex<HashMap<String, usize>>,
}

/// How many early turns are kept: those of conversations never bound (the
/// person's own chats) are dropped oldest first.
const EARLY_KEPT: usize = 16;

/// A turn the ChatGPT channel reported before the desk could take it.
struct Early {
    conversation: String,
    message: Value,
    at: i64,
}

/// A handoff's words on their way; let go when dropped.
struct Sending<'a>(&'a Desk, String);
impl Drop for Sending<'_> {
    fn drop(&mut self) {
        self.0
            .sending
            .lock()
            .unwrap_or_else(|p| p.into_inner())
            .remove(&self.1);
    }
}

impl Desk {
    /// The handoffs kept in `data`; none kept in the demo. Conversations
    /// that were opening when the app stopped count as failed, to retry.
    pub(crate) fn new(data: Option<PathBuf>) -> Self {
        let mut book = data.as_deref().map(handoffs::load).unwrap_or_default();
        // Swipes still waiting when the app stopped wait on.
        let launches: HashMap<String, Launch> = data
            .as_deref()
            .and_then(|data| std::fs::read(launches_path(data)).ok())
            .and_then(|bytes| serde_json::from_slice(&bytes).ok())
            .unwrap_or_default();
        let desk = |book: Book| Self {
            data,
            tossed: Mutex::new(
                book.list
                    .iter()
                    .map(|handoff| (handoff.id.clone(), handoff.steps.len()))
                    .collect(),
            ),
            book: Mutex::new(book),
            early: Mutex::new(vec![]),
            sending: Mutex::new(HashSet::new()),
            launches: Mutex::new(launches),
        };
        let now = now_ms();
        // Not `||`: both are to happen.
        let interrupted = book.interrupted(now, &interrupted());
        let paused = book.restarted(now, &restart_paused());
        if interrupted | paused {
            let desk = desk(book);
            desk.change(|_| ());
            return desk;
        }
        desk(book)
    }
    /// Claims `id` for sending, or says words are already on their way.
    fn claim(&self, id: &str) -> Result<Sending<'_>, String> {
        let mut sending = self.sending.lock().unwrap_or_else(|p| p.into_inner());
        if !sending.insert(id.to_owned()) {
            return Err(l10n::text(
                "上一段还在送，等它送完再试。",
                "Words are still on their way; try again once they arrive.",
            ));
        }
        Ok(Sending(self, id.to_owned()))
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
        let late = {
            let mut book = self.lock();
            book.expire(now, &timed_out()) | book.overdue(now, &no_answer(), &no_handover())
        };
        if late {
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

    /// The letters to fly on the sidebar for steps taken since the last
    /// call (#171): one per handoff that moved, for its latest move.
    pub(crate) fn tosses(&self) -> Vec<Flight> {
        let book = self.lock();
        let mut tossed = self.tossed.lock().unwrap_or_else(|p| p.into_inner());
        let mut flights = vec![];
        for handoff in &book.list {
            let seen = tossed.entry(handoff.id.clone()).or_insert(0);
            if let Some(toss) = toss(&handoff.steps, *seen) {
                flights.push(toss.flight(&handoff.id));
            }
            *seen = handoff.steps.len();
        }
        tossed.retain(|id, _| book.list.iter().any(|handoff| &handoff.id == id));
        flights
    }

    fn launches(&self) -> MutexGuard<'_, HashMap<String, Launch>> {
        self.launches.lock().unwrap_or_else(|p| p.into_inner())
    }
    /// Keeps the swipes (held, so a newer state is never overwritten).
    fn keep_launches(&self, launches: &HashMap<String, Launch>) {
        let Some(data) = &self.data else { return };
        let path = launches_path(data);
        let temporary = path.with_extension("json.tmp");
        let saved = serde_json::to_vec(launches)
            .map_err(|e| e.to_string())
            .and_then(|bytes| {
                std::fs::create_dir_all(agent_hud_runtime::chatgpt::folder(data))
                    .and_then(|()| std::fs::write(&temporary, bytes))
                    .and_then(|()| std::fs::rename(&temporary, &path))
                    .map_err(|e| e.to_string())
            });
        if let Err(error) = saved {
            eprintln!("Relay launches {}: {error}", path.display());
        }
    }
    /// `relay_to_chatgpt` came from `session` naming swipe `code`: that
    /// swipe did what it asked, whether into a new review or one open.
    /// Whether it settled one.
    pub(crate) fn launch_relayed(&self, session: &str, code: &str, now: i64) -> bool {
        let mut launches = self.launches();
        let Some(launch) = launches
            .get_mut(session)
            .filter(|l| l.pending() && !l.code.is_empty() && l.code == code)
        else {
            return false;
        };
        launch.state = "relayed".into();
        launch.settled_at = Some(now);
        launches.remove(session);
        self.keep_launches(&launches);
        true
    }
    /// The snapshot's `relayLaunches`: swipes whose words still wait for
    /// their session, or that refused or expired lately. Started ones give
    /// way to the handoff the session starts.
    pub(crate) fn launch_projection(&self, lines: &dyn Lines, now: i64) -> Value {
        let mut launches = self.launches();
        let before = launches.clone();
        for (session, launch) in launches.iter_mut() {
            follow(launch, lines, session, now);
        }
        launches.retain(|_, launch| {
            launch.pending()
                || launch.state != "relayed"
                    && launch
                        .settled_at
                        .is_some_and(|at| now - at < LAUNCH_SHOWN_MS)
        });
        if *launches != before {
            self.keep_launches(&launches);
        }
        let mut shown: Vec<Value> = launches
            .iter()
            .map(|(session, launch)| {
                json!({
                    "session": session,
                    "kind": launch.kind,
                    "at": launch.at,
                    "state": launch.state,
                    "reason": launch.reason,
                })
            })
            .collect();
        shown.sort_by(|a, b| a["session"].as_str().cmp(&b["session"].as_str()));
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
        // One start per session at a time, so two calls side by side cannot
        // each begin a handoff.
        let _starting = self.claim(&format!("session:{session}"))?;
        if self.lock().expire(now, &timed_out()) {
            self.change(|_| ());
        }
        let current = (!fresh)
            .then(|| self.lock().for_session(session).cloned())
            .flatten();
        let summary = summary.map(str::trim).filter(|text| !text.is_empty());
        if let Some(handoff) = current {
            match (handoff.status, handoff.chatgpt_conversation.clone()) {
                (Status::Open, Some(conversation)) => {
                    let sent = {
                        let _sending = self.claim(&handoff.id)?;
                        self.ask(lines, handoff, &conversation, summary, brief, now)
                    };
                    // ChatGPT may have begun, or finished, before `send` answered.
                    self.caught_up(&conversation);
                    return sent;
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

    /// Sends `brief` into the handoff's open `conversation`, once.
    fn ask(
        &self,
        lines: &dyn Lines,
        handoff: Handoff,
        conversation: &str,
        summary: Option<&str>,
        brief: &str,
        now: i64,
    ) -> Result<Started, String> {
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
        Ok(Started::Sent {
            handoff: sent,
            repeated: false,
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
        let (title, request) = self
            .lock()
            .get(id)
            .map(|h| (h.title.clone(), h.request()))
            .unwrap_or_default();
        let opened = lines.open(brief, project, &title, &request);
        self.change(|book| match &opened {
            Ok(conversation) => book.opened(id, conversation, now()),
            Err(error) => book.failed(id, error, now()),
        });
        if let Ok(conversation) = &opened {
            self.caught_up(conversation);
        }
        opened
    }

    /// A conversation just bound, or words just sent into it: the turns
    /// ChatGPT began or finished meanwhile are taken now, in order.
    fn caught_up(&self, conversation: &str) -> bool {
        let mut early = self.early.lock().unwrap_or_else(|p| p.into_inner());
        let (mine, rest) = std::mem::take(&mut *early)
            .into_iter()
            .partition::<Vec<_>, _>(|turn| turn.conversation == conversation);
        *early = rest;
        // Still holding `early`, so a turn reported now waits behind these.
        let mut changed = false;
        for turn in mine {
            changed |= self.take(&turn.message, conversation, turn.at);
        }
        changed
    }

    /// A turn starting or finishing in `conversation`, into the book.
    fn take(&self, message: &Value, conversation: &str, at: i64) -> bool {
        if message["phase"] == "start" {
            return self.change(|book| book.working(conversation, at));
        }
        let reply = message["reply"].as_str().unwrap_or("");
        let message_id = message["messageId"].as_str();
        self.change(|book| book.replied(conversation, reply, message_id, at))
    }

    /// Whether a turn in `conversation` must wait: it is bound to no handoff
    /// yet, or its handoff's words are still on their way. Turns of a bound
    /// conversation with nothing on its way are taken at once (and a reply
    /// outside a review round is dropped by the book).
    fn turn_waits(&self, conversation: &str) -> bool {
        let id = self
            .lock()
            .for_conversation(conversation)
            .map(|h| h.id.clone());
        id.is_none_or(|id| {
            self.sending
                .lock()
                .unwrap_or_else(|p| p.into_inner())
                .contains(&id)
        })
    }

    /// What the ChatGPT channel reports: a turn starting or finishing in a
    /// handoff's conversation, or a conversation opened for a handoff after
    /// its wait. Whether a handoff changed.
    pub(crate) fn observe(&self, message: &Value, now: i64) -> bool {
        let conversation = message["conversation"].as_str().unwrap_or("");
        match (message["type"].as_str(), message["phase"].as_str()) {
            (Some("turn"), Some("start" | "complete")) => {
                // Held while deciding and taking, so `caught_up` and this
                // keep the turns' order.
                let mut early = self.early.lock().unwrap_or_else(|p| p.into_inner());
                if self.turn_waits(conversation) {
                    early.push(Early {
                        conversation: conversation.to_owned(),
                        message: message.clone(),
                        at: now,
                    });
                    let extra = early.len().saturating_sub(EARLY_KEPT);
                    early.drain(..extra);
                    return false;
                }
                self.take(message, conversation, now)
            }
            (Some("opened"), _) if message["ok"] == true => {
                // Only a try that already gave up waiting: a waited-for
                // answer binds through `open`.
                let request = message["requestId"].as_str().unwrap_or("");
                let id = request.rsplit_once('~').map_or("", |(id, _)| id);
                let gave_up = self
                    .lock()
                    .get(id)
                    .is_some_and(|h| h.status == Status::Failed);
                let bound =
                    gave_up && self.change(|book| book.opened_late(request, conversation, now));
                if bound {
                    self.caught_up(conversation);
                }
                bound
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
                let _sending = self.claim(id)?;
                if self.lock().returned_already(id, &text) {
                    return Ok(Acted::Done);
                }
                lines.reaches(&handoff.claude_session)?;
                lines.reply(&handoff.claude_session, &text)?;
                self.change(|book| book.returned(id, kind, &text, false, now));
                Ok(Acted::Done)
            }
            "pause" => {
                let stopped = self.change(|book| book.stop(id, &paused(), false, now));
                if !stopped {
                    return Err(l10n::text(
                        "自动往返已经停了",
                        "The auto round trip is already off",
                    ));
                }
                Ok(Acted::Done)
            }
            "resume" => {
                if !self.change(|book| book.resume(id, now)) {
                    return Err(l10n::text(
                        "自动往返已经开着，或接力已结束",
                        "The auto round trip is on already, or the handoff ended",
                    ));
                }
                self.drive(lines, now);
                Ok(Acted::Done)
            }
            "end" => {
                // Not while words are on their way: they would land in an
                // ended handoff.
                let _sending = self.claim(id)?;
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

impl Desk {
    /// The auto round trip (#72): answers that came in while it is on are
    /// acted on — 「需修改」 goes back to Claude (tried twice), a pass ends
    /// the handoff, the last round or no verdict leaves it to the person.
    /// Whether anything changed.
    pub(crate) fn drive(&self, lines: &dyn Lines, now: i64) -> bool {
        let due = self
            .lock()
            .list
            .iter()
            .filter_map(|h| h.next().map(|next| (h.id.clone(), next)))
            .collect::<Vec<_>>();
        let mut changed = false;
        for (id, next) in due {
            changed |= match next {
                Next::Pass => self.change(|book| book.passed(&id, &passed(), now)),
                Next::Limit => self.change(|book| book.stop(&id, &at_limit(), true, now)),
                Next::NoVerdict => self.change(|book| book.stop(&id, &no_verdict(), true, now)),
                Next::Back => self.auto_back(lines, &id, now),
            };
        }
        changed
    }
    fn auto_back(&self, lines: &dyn Lines, id: &str, now: i64) -> bool {
        // A person's button sending meanwhile: theirs goes.
        let Ok(_sending) = self.claim(id) else {
            return false;
        };
        let Some(handoff) = self
            .lock()
            .get(id)
            .cloned()
            .filter(|h| h.next() == Some(Next::Back))
        else {
            return false;
        };
        let Some(reply) = handoff.last_reply().and_then(|step| step.text.clone()) else {
            return false;
        };
        let text = back_text(&handoff, &reply);
        if self.lock().returned_already(id, &text) {
            return false;
        }
        let send = || {
            lines
                .reaches(&handoff.claude_session)
                .and_then(|()| lines.reply(&handoff.claude_session, &text))
        };
        if let Err(first) = send() {
            self.change(|book| book.trouble(id, &back_retry(&first), now));
            if let Err(again) = send() {
                return self.change(|book| {
                    book.trouble(id, &retry_failed(&again), now);
                    book.stop(id, &back_failed(), true, now)
                });
            }
        }
        self.change(|book| book.returned(id, StepKind::Back, &text, true, now))
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
/// 左滑发起 (批 B, #124): what a Claude Code session is asked to do so it
/// hands its own work to ChatGPT; None for a kind that cannot start yet.
fn launch_text(kind: &str, code: &str) -> Option<String> {
    let ask = match kind {
        "review" => "请把这一轮的工作交给 ChatGPT 审核：先自己整理背景——任务名与目标、改了什么和为什么、分支和 PR 链接、改动本身（git diff，太长写摘要加关键片段）、希望重点看哪里——然后调用 relay_to_chatgpt 送出，请 ChatGPT 按严重程度列问题，最后单独一行写「结论：通过」或「结论：需修改」；summary 写一句这轮做了什么。",
        "discuss" => "请把眼下的方案交给 ChatGPT 讨论，只聊方案、不改代码：先自己整理背景——要解决的问题、已有的做法和限制、你考虑过的几种做法——然后调用 relay_to_chatgpt 送出，请 ChatGPT 比较可选做法，给出推荐和理由；summary 写一句要讨论什么。",
        _ => return None,
    };
    let what = if kind == "review" { "审核" } else { "讨论" };
    Some(format!(
        "{ask}调用 relay_to_chatgpt 时 launch 参数填「{code}」，驿窗靠它认出这次左滑已经办了。（驿窗左滑「{what}」发来）"
    ))
}

/// 左滑发起: asks the Claude Code `session` to hand its work to ChatGPT
/// (`kind`: review or discuss). Its words wait in line while it runs; it
/// then calls `relay_to_chatgpt` itself, so the handoff is its own.
/// Words still waiting for the session are not left again.
pub(crate) fn launch(
    desk: &Desk,
    lines: &dyn Lines,
    session: &str,
    kind: &str,
    now: i64,
) -> Result<Launched, String> {
    if !agent_hud_runtime::claude_plugin::valid_name(session) {
        return Err(l10n::text(
            "Claude 会话 id 不对",
            "Invalid Claude session id",
        ));
    }
    let code = launch_code(now);
    let text = launch_text(kind, &code).ok_or_else(|| {
        l10n::text(
            "这种接力还不能发起",
            "This kind of handoff cannot start yet",
        )
    })?;
    // Claude would hand its work over to nowhere.
    if !lines.connected() {
        return Err(not_connected());
    }
    // Held from the look to the leaving: two swipes side by side leave one.
    let mut launches = desk.launches();
    if let Some(waiting) = launches.get_mut(session) {
        follow(waiting, lines, session, now);
        if waiting.pending() {
            desk.keep_launches(&launches);
            return Ok(Launched::AlreadyQueued);
        }
    }
    lines.reaches(session)?;
    let id = lines.leave(session, &text)?;
    launches.insert(
        session.to_owned(),
        Launch {
            kind: kind.to_owned(),
            id,
            code,
            at: now,
            state: "queued".into(),
            reason: None,
            taken_at: None,
            settled_at: None,
        },
    );
    desk.keep_launches(&launches);
    Ok(Launched::Queued)
}

/// Reads how a launch's words stand now. Only the session's own call
/// naming the swipe (`Desk::launch_relayed`) shows it did what was asked;
/// until then words taken stay queued (the plugin submits them once the
/// session is idle) or started. Taken words whose file went (the plugin's
/// sweep drops them a minute on) keep their state; words gone before they
/// were seen taken are `unknown`, not said to be taken. Words never taken
/// expire with the hour of the swipe; words taken but never followed by a
/// handoff within the hour of the taking stall: the plugin may have stopped
/// between taking and submitting, and it does not submit again, so the same
/// words are never asked twice.
fn follow(launch: &mut Launch, lines: &dyn Lines, session: &str, now: i64) {
    if !launch.pending() {
        return;
    }
    match lines.left(session, &launch.id) {
        Some((state, reason)) => match state.as_str() {
            "taken" => {
                launch.taken_at.get_or_insert(now);
                launch.state = "queued".into();
            }
            "started" => {
                launch.taken_at.get_or_insert(now);
                launch.state = "started".into();
            }
            "refused" => {
                launch.state = "refused".into();
                launch.reason = reason;
            }
            "expired" | "cancelled" => launch.state = "expired".into(),
            _ => {}
        },
        None if launch.taken_at.is_none() => launch.state = "unknown".into(),
        None => {}
    }
    if launch.pending() {
        let late = match launch.taken_at {
            Some(taken) => (now - taken >= LAUNCH_LIFETIME_MS).then_some("stalled"),
            None if now - launch.at >= LAUNCH_LIFETIME_MS => Some(if launch.state == "unknown" {
                "lost"
            } else {
                "expired"
            }),
            None => None,
        };
        if let Some(state) = late {
            launch.state = state.into();
        }
    }
    if !launch.pending() {
        launch.settled_at = Some(now);
    }
}

fn passed() -> String {
    l10n::text("结论：通过，自动结束接力", "Passed; the handoff ended")
}
fn back_retry(error: &str) -> String {
    l10n::text(
        &format!("自动转回 Claude 失败：{error}；马上重试一次"),
        &format!("Could not send it back to Claude: {error}; trying once more"),
    )
}
fn retry_failed(error: &str) -> String {
    l10n::text(
        &format!("重试仍失败：{error}"),
        &format!("Failed again: {error}"),
    )
}
fn no_answer() -> String {
    l10n::text(
        &format!(
            "ChatGPT {} 分钟没回信，自动往返停下，交还常浩",
            handoffs::REPLY_WAIT_MS / 60_000
        ),
        "ChatGPT has not answered in 30 minutes; left to you",
    )
}
fn no_handover() -> String {
    l10n::text(
        &format!(
            "Claude {} 小时没交回复审，自动往返停下，交还常浩",
            handoffs::FIX_WAIT_MS / 3_600_000
        ),
        "Claude has not handed it over again in 2 hours; left to you",
    )
}
fn restart_paused() -> String {
    l10n::text(
        "驿窗重启，自动往返先暂停",
        "PostPane restarted; the auto round trip is paused",
    )
}
fn paused() -> String {
    l10n::text("常浩暂停", "Paused by the person")
}
fn at_limit() -> String {
    l10n::text(
        &format!(
            "已审 {} 轮仍需修改，自动往返停下，交还常浩",
            handoffs::ROUNDS
        ),
        &format!(
            "Still to fix after {} rounds; left to you",
            handoffs::ROUNDS
        ),
    )
}
fn no_verdict() -> String {
    l10n::text(
        "回信没写结论，自动往返停下，交还常浩",
        "The answer has no verdict; left to you",
    )
}
fn back_failed() -> String {
    l10n::text(
        "转回 Claude 失败两次，自动往返停下，交还常浩",
        "Could not send it back to Claude twice; left to you",
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

/// The Claude Code session that called: the one Claude Code named
/// (`CLAUDE_CODE_SESSION_ID`), never guessed from what else runs. A stale id
/// (after /clear or a resume) is kept as it is: at worst 转回 Claude then
/// says the session has no plugin, rather than sending to another session.
pub(crate) fn caller_session(caller: &Value) -> Option<String> {
    caller["sessionId"]
        .as_str()
        .filter(|id| agent_hud_runtime::claude_plugin::valid_name(id))
        .map(str::to_owned)
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
    fn leave(&self, session: &str, text: &str) -> Result<String, String> {
        let plugin = self
            .0
            .try_state::<super::claude_plugin::ClaudePlugin>()
            .ok_or_else(no_plugin)?;
        plugin
            .channel()
            .hand(session, text, std::time::SystemTime::now())
            .map_err(|refusal| {
                eprintln!("左滑发起 could not leave words: {refusal}");
                l10n::text(
                    "没能交给这个会话的 Agent HUD 插件。",
                    "The words could not be left for this session's Agent HUD plugin.",
                )
            })
    }
    fn left(&self, session: &str, id: &str) -> Option<(String, Option<String>)> {
        use agent_hud_runtime::claude_plugin::PromptState;
        let plugin = self.0.try_state::<super::claude_plugin::ClaudePlugin>()?;
        let (state, reason) = plugin
            .channel()
            .state(session, id, std::time::SystemTime::now())
            .ok()??;
        let state = match state {
            PromptState::Waiting | PromptState::CancelRequested => "waiting",
            PromptState::Taken => "taken",
            PromptState::Started => "started",
            PromptState::Refused => "refused",
            PromptState::Cancelled => "cancelled",
            PromptState::Expired => "expired",
        };
        Some((state.to_owned(), reason))
    }
}

/// The snapshot's `relayLaunches` as the app's ways out have them.
pub(crate) fn launch_projection(app: &tauri::AppHandle) -> Value {
    app.try_state::<Desk>()
        .map(|desk| desk.launch_projection(&AppLines(app), now_ms()))
        .unwrap_or_else(|| json!([]))
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

/// Which way a letter flies between the two marks on the sidebar (#171).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum Toss {
    /// The words reached ChatGPT.
    ToChatGPT,
    /// ChatGPT answered.
    ToClaude,
    /// Words for ChatGPT could not be sent: it falls halfway.
    FallsToChatGPT,
    /// ChatGPT's answer could not go back to Claude: it falls halfway.
    FallsToClaude,
}

impl Toss {
    fn flight(self, id: &str) -> Flight {
        let to_chatgpt = matches!(self, Self::ToChatGPT | Self::FallsToChatGPT);
        let (from, to) = if to_chatgpt {
            ("claude", "chatgpt")
        } else {
            ("chatgpt", "claude")
        };
        Flight {
            lane: format!("relay:{id}:{from}"),
            from: from.into(),
            to: to.into(),
            // Around the notch Claude stands on the left either way.
            from_left: to_chatgpt,
            arrives: false,
            falls: matches!(self, Self::FallsToChatGPT | Self::FallsToClaude),
        }
    }
}

/// The letter for a handoff's steps after the first `seen`: the latest step
/// that moved words decides. A failure falls on the way the words were
/// going: back to Claude after a reply, to ChatGPT otherwise; one after
/// ChatGPT already had the words (it did not answer) flies nothing.
pub(crate) fn toss(steps: &[Step], seen: usize) -> Option<Toss> {
    let moved = |kind: StepKind| matches!(kind, StepKind::Ask | StepKind::Reply | StepKind::Fail);
    let at = (seen..steps.len())
        .rev()
        .find(|&at| moved(steps[at].kind))?;
    match steps[at].kind {
        StepKind::Ask => Some(Toss::ToChatGPT),
        StepKind::Reply => Some(Toss::ToClaude),
        _ => match steps[..at].iter().rev().map(|step| step.kind).find(|kind| {
            matches!(
                kind,
                StepKind::Work | StepKind::Ask | StepKind::Reply | StepKind::Back | StepKind::Again
            )
        }) {
            Some(StepKind::Reply) => Some(Toss::FallsToClaude),
            Some(StepKind::Ask) => None,
            _ => Some(Toss::FallsToChatGPT),
        },
    }
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
        let changed = app.try_state::<Desk>().is_some_and(|desk| {
            let now = now_ms();
            // An answer that came in goes on by itself (#72).
            desk.observe(message, now) && {
                desk.drive(&AppLines(&app), now);
                true
            }
        });
        if changed {
            republish(&app);
        }
    }));
}

/// `relay_to_chatgpt`: Claude Code hands its work to ChatGPT for review.
/// Only a Claude Code session may, and only for itself (`caller_session`).
pub(crate) fn relay(app: &tauri::AppHandle, params: &Value) -> Result<Value, String> {
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
    let session = caller_session(caller).ok_or_else(|| {
        l10n::text(
            "认不出是哪个 Claude Code 会话在调用（调用里没有会话 id），没有发出。请在 Claude Code 会话里调用这个工具。",
            "Could not tell which Claude Code session is calling (the call names none); nothing was sent. Call this tool from a Claude Code session.",
        )
    })?;
    let mut answer = start(app, &session, cwd, title, summary, brief, false)?;
    // A swipe's words named here: that swipe is done (左滑发起).
    if let Some(code) = params["launch"].as_str().filter(|code| !code.is_empty()) {
        let settled = app
            .try_state::<Desk>()
            .is_some_and(|desk| desk.launch_relayed(&session, code, now_ms()));
        if settled {
            republish(app);
        }
    }
    answer["claudeSession"] = json!(session);
    answer["message"] = json!(if answer["status"] == "repeated" {
        l10n::text(
            "这段内容刚才已经送到 ChatGPT，还没回信，没有再送一次；回信会出现在驿窗侧栏。",
            "These words already reached ChatGPT and await an answer; they were not sent again. The answer shows in PostPane's sidebar.",
        )
    } else if answer["status"] == "sent" {
        l10n::text(
            "已送进这个会话对应的 ChatGPT 审核会话；回复会出现在驿窗侧栏；写「需修改」且没满 2 轮时驿窗会自动把意见转回这个会话，写「通过」就结束。",
            "Sent into this session's ChatGPT review conversation; the reply shows in PostPane's sidebar. A \"changes needed\" answer within 2 rounds comes back here by itself; a pass ends the handoff.",
        )
    } else {
        l10n::text(
            "已交给 ChatGPT 审核：新会话正在打开，回复会出现在驿窗侧栏；写「需修改」且没满 2 轮时驿窗会自动把意见转回这个会话，写「通过」就结束。",
            "Handed to ChatGPT for review: a new conversation is opening; the reply shows in PostPane's sidebar. A \"changes needed\" answer within 2 rounds comes back here by itself; a pass ends the handoff.",
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

/// The sessions panel's 左滑发起 (`launch`).
#[tauri::command]
pub async fn relay_launch(
    app: tauri::AppHandle,
    session_id: String,
    kind: String,
) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let desk = app.try_state::<Desk>().ok_or_else(demo)?;
        let launched = launch(&desk, &AppLines(&app), &session_id, &kind, now_ms())?;
        // The row says how the words stand from now on.
        republish(&app);
        Ok(json!({"queued": true, "already": launched == Launched::AlreadyQueued}))
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
        /// What happens while words are being sent.
        on_send: Option<Box<dyn Fn()>>,
        /// How left words stand, as the plugin would say; None once gone.
        left_as: RefCell<Option<(String, Option<String>)>>,
        /// Leaving words fails.
        leave_fails: std::cell::Cell<bool>,
        /// How many replies to Claude fail before one goes through.
        reply_fails: std::cell::Cell<u32>,
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
            if let Some(during) = &self.on_send {
                during();
            }
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
            if self.reply_fails.get() > 0 {
                self.reply_fails.set(self.reply_fails.get() - 1);
                return Err("会话的待发送目录写不进".into());
            }
            self.sent
                .borrow_mut()
                .push(("reply".into(), session.into(), text.into()));
            Ok(())
        }
        fn leave(&self, session: &str, text: &str) -> Result<String, String> {
            if self.leave_fails.get() {
                return Err("plugin folder not writable".into());
            }
            let mut sent = self.sent.borrow_mut();
            sent.push(("leave".into(), session.into(), text.into()));
            Ok(format!("p{}", sent.len()))
        }
        fn left(&self, _session: &str, _id: &str) -> Option<(String, Option<String>)> {
            self.left_as.borrow().clone()
        }
    }
    fn left_as(lines: &Fake, state: Option<&str>, reason: Option<&str>) {
        *lines.left_as.borrow_mut() =
            state.map(|state| (state.to_owned(), reason.map(str::to_owned)));
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
                "https://chatgpt.com/g/g-p-1-review/project|修登录|{}~0",
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
        // Words already on their way: a second sending side by side waits.
        let held = desk.claim(&handoff.id).unwrap();
        assert!(desk
            .start(&lines, "s1", Some("/w"), "修登录", None, "第三轮", false, 5)
            .is_err());
        assert_eq!(lines.sent.borrow().len(), 2, "nothing more sent");
        drop(held);
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
        assert!(
            !desk.observe(&turn("complete", reply), 4),
            "a review answered is not answered again"
        );
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

    /// The code a swipe's words carry, for `relay_to_chatgpt`'s `launch`.
    fn code_of(lines: &Fake) -> String {
        let sent = lines.sent.borrow();
        let text = &sent.iter().rev().find(|s| s.0 == "leave").unwrap().2;
        let start = text.find("「L").unwrap() + "「".len();
        let end = start + text[start..].find('」').unwrap();
        text[start..end].to_owned()
    }

    #[test]
    fn a_swipe_is_done_only_by_the_handoff_that_names_it() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        // The session already has a review open: its next round goes into it.
        opened(&desk, &lines);
        left_as(&lines, Some("started"), None);
        launch(&desk, &lines, "s1", "review", 10).unwrap();
        let code = code_of(&lines);
        assert!(code.starts_with('L'));
        // A handoff of the same session for something else settles nothing.
        desk.start(
            &lines,
            "s1",
            Some("/w"),
            "修登录",
            None,
            "别的事",
            false,
            11,
        )
        .unwrap();
        assert!(!desk.launch_relayed("s1", "L-other", 11));
        assert!(!desk.launch_relayed("s2", &code, 11), "another session's");
        assert_eq!(desk.launch_projection(&lines, 11)[0]["state"], "started");
        // The round it asked for, into the review already open, does.
        desk.start(
            &lines,
            "s1",
            Some("/w"),
            "修登录",
            None,
            "左滑要的这轮",
            false,
            12,
        )
        .unwrap();
        assert!(desk.launch_relayed("s1", &code, 12));
        assert_eq!(desk.launch_projection(&lines, 12), json!([]));
        assert!(!desk.launch_relayed("s1", &code, 13), "once");
    }

    #[test]
    fn swipes_waiting_across_a_restart_are_not_left_again() {
        let temp = tempfile::tempdir().unwrap();
        let data = temp.path().join("data");
        let lines = Fake::default();
        left_as(&lines, Some("taken"), None);
        let desk = Desk::new(Some(data.clone()));
        launch(&desk, &lines, "s1", "review", 1).unwrap();
        desk.launch_projection(&lines, 2);
        drop(desk);
        let desk = Desk::new(Some(data.clone()));
        assert_eq!(
            launch(&desk, &lines, "s1", "review", 3).unwrap(),
            Launched::AlreadyQueued
        );
        assert_eq!(
            lines
                .sent
                .borrow()
                .iter()
                .filter(|s| s.0 == "leave")
                .count(),
            1
        );
        // Its code still settles it after the restart.
        let code = code_of(&lines);
        assert!(desk.launch_relayed("s1", &code, 4));
        drop(desk);
        let desk = Desk::new(Some(data));
        assert_eq!(desk.launch_projection(&lines, 5), json!([]));
    }

    #[test]
    fn a_stall_counts_its_hour_from_when_the_words_were_taken() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        left_as(&lines, Some("waiting"), None);
        launch(&desk, &lines, "s1", "review", 0).unwrap();
        // Waiting 55 minutes, then taken.
        let taken = 55 * 60_000;
        left_as(&lines, Some("taken"), None);
        desk.launch_projection(&lines, taken);
        // The swipe's hour is up, the taking's is not.
        left_as(&lines, None, None);
        assert_eq!(
            desk.launch_projection(&lines, LAUNCH_LIFETIME_MS + 1)[0]["state"],
            "queued"
        );
        assert_eq!(
            desk.launch_projection(&lines, taken + LAUNCH_LIFETIME_MS)[0]["state"],
            "stalled"
        );
    }

    fn kinds(desk: &Desk, now: i64) -> Vec<(String, bool)> {
        desk.projection(now)[0]["steps"]
            .as_array()
            .unwrap()
            .iter()
            .map(|step| {
                (
                    step["kind"].as_str().unwrap().to_owned(),
                    step["auto"] == true,
                )
            })
            .collect()
    }
    fn replies(lines: &Fake) -> usize {
        lines
            .sent
            .borrow()
            .iter()
            .filter(|s| s.0 == "reply")
            .count()
    }

    #[test]
    fn the_auto_round_trip_goes_back_to_claude_and_ends_at_a_pass() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        let handoff = opened(&desk, &lines);
        assert!(!desk.drive(&lines, 3), "nothing before an answer");
        desk.observe(&turn("complete", "1. 要超时\n结论：需修改"), 4);
        assert!(desk.drive(&lines, 5));
        let (kind, to, text) = lines.sent.borrow().last().unwrap().clone();
        assert_eq!((kind.as_str(), to.as_str()), ("reply", "s1"));
        assert!(text.contains("要超时") && text.contains("relay_to_chatgpt"));
        assert_eq!(desk.projection(5)[0]["phase"], "returned");
        assert_eq!(kinds(&desk, 5).last().unwrap(), &("back".to_owned(), true));
        assert!(!desk.drive(&lines, 6), "sent back once");
        assert_eq!(replies(&lines), 1);
        // Claude hands round 2 over itself; ChatGPT passes it.
        desk.start(
            &lines,
            "s1",
            Some("/w"),
            "修登录",
            Some("按意见改完"),
            "第二轮",
            false,
            7,
        )
        .unwrap();
        desk.observe(
            &json!({"type":"turn","phase":"complete","conversation":"c-new","reply":"结论：通过","messageId":"m2"}),
            8,
        );
        assert!(desk.drive(&lines, 9));
        let shown = desk.projection(9);
        assert_eq!(shown[0]["phase"], "ended");
        assert_eq!(shown[0]["status"], "closed");
        assert_eq!(kinds(&desk, 9).last().unwrap(), &("end".to_owned(), true));
        assert_eq!(replies(&lines), 1, "a pass sends nothing to Claude");
        let _ = handoff;
    }

    #[test]
    fn the_auto_round_trip_stops_at_the_last_round_or_without_a_verdict() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        let handoff = opened(&desk, &lines);
        desk.observe(&turn("complete", "结论：需修改"), 4);
        desk.drive(&lines, 5);
        desk.start(
            &lines,
            "s1",
            Some("/w"),
            "修登录",
            Some("按意见改完"),
            "第二轮",
            false,
            6,
        )
        .unwrap();
        desk.observe(
            &json!({"type":"turn","phase":"complete","conversation":"c-new","reply":"还差一点\n结论：需修改","messageId":"m2"}),
            7,
        );
        assert!(desk.drive(&lines, 8));
        let shown = desk.projection(8);
        assert_eq!(shown[0]["phase"], "replied", "the person decides");
        assert_eq!(shown[0]["auto"], false);
        assert_eq!(shown[0]["halt"], at_limit());
        assert_eq!(
            replies(&lines),
            1,
            "the last answer is not sent back by itself"
        );
        // The person can still send it back.
        desk.act(&lines, &handoff.id, "back", 9).unwrap();
        assert_eq!(replies(&lines), 2);

        let (_temp, desk) = self::desk();
        let lines = Fake::default();
        opened(&desk, &lines);
        desk.observe(&turn("complete", "看了，挺好"), 4);
        assert!(desk.drive(&lines, 5));
        assert_eq!(desk.projection(5)[0]["halt"], no_verdict());
        assert_eq!(replies(&lines), 0);
    }

    #[test]
    fn words_back_to_claude_that_fail_are_tried_once_more_then_left_to_the_person() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        lines.reply_fails.set(1);
        opened(&desk, &lines);
        desk.observe(&turn("complete", "结论：需修改"), 4);
        assert!(desk.drive(&lines, 5));
        assert_eq!(replies(&lines), 1, "the second try went through");
        let steps = kinds(&desk, 5);
        assert_eq!(
            steps[steps.len() - 2..],
            [("fail".to_owned(), true), ("back".to_owned(), true)]
        );
        let shown = desk.projection(5);
        let fail = &shown[0]["steps"].as_array().unwrap()[steps.len() - 2];
        assert_eq!(fail["text"], back_retry("会话的待发送目录写不进"));

        let (_temp, desk) = self::desk();
        let lines = Fake::default();
        lines.reply_fails.set(2);
        opened(&desk, &lines);
        desk.observe(&turn("complete", "结论：需修改"), 4);
        assert!(desk.drive(&lines, 5));
        assert_eq!(replies(&lines), 0);
        let shown = desk.projection(5);
        assert_eq!(shown[0]["phase"], "replied");
        assert_eq!(shown[0]["halt"], back_failed());
        let steps = kinds(&desk, 5);
        assert_eq!(
            steps[steps.len() - 3..],
            [
                ("fail".to_owned(), true),
                ("fail".to_owned(), true),
                ("stop".to_owned(), true)
            ]
        );
    }

    #[test]
    fn the_person_pauses_and_resumes_the_auto_round_trip() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        let handoff = opened(&desk, &lines);
        desk.act(&lines, &handoff.id, "pause", 3).unwrap();
        assert_eq!(desk.projection(3)[0]["halt"], paused());
        desk.observe(&turn("complete", "结论：需修改"), 4);
        assert!(!desk.drive(&lines, 5), "paused: left to the person");
        assert_eq!(replies(&lines), 0);
        // Turned back on, the waiting answer goes back at once.
        desk.act(&lines, &handoff.id, "resume", 6).unwrap();
        assert_eq!(replies(&lines), 1);
        assert_eq!(desk.projection(6)[0]["phase"], "returned");
        assert!(
            desk.act(&lines, &handoff.id, "resume", 7).is_err(),
            "already on"
        );
    }

    #[test]
    fn a_restart_pauses_the_auto_round_trip_and_a_long_wait_stops_it() {
        let temp = tempfile::tempdir().unwrap();
        let data = temp.path().join("data");
        let lines = Fake::default();
        let desk = Desk::new(Some(data.clone()));
        opened(&desk, &lines);
        drop(desk);
        let desk = Desk::new(Some(data));
        let shown = desk.projection(3);
        assert_eq!(shown[0]["auto"], false);
        assert_eq!(shown[0]["halt"], restart_paused());

        let (_temp, desk) = self::desk();
        opened(&desk, &lines);
        let late = 2 + handoffs::REPLY_WAIT_MS + 1;
        let shown = desk.projection(late);
        assert_eq!(shown[0]["halt"], no_answer());
    }

    #[test]
    fn chatgpt_starting_before_the_conversation_is_bound_still_counts() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        let Started::Opening { handoff, .. } = desk
            .start(&lines, "s1", None, "t", None, "brief", false, 1)
            .unwrap()
        else {
            panic!()
        };
        // The first words start a turn before `opened` answers.
        assert!(!desk.observe(&turn("start", ""), 2));
        desk.open(&lines, &handoff.id, "brief", None, || 3).unwrap();
        let shown = desk.projection(4);
        assert_eq!(shown[0]["phase"], "working");
        assert_eq!(shown[0]["phaseAt"], 2);
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
        // The first try's answer coming late binds nothing; this try's does.
        assert!(!desk.observe(
            &json!({"type":"opened","requestId":format!("{}~0", handoff.id),"ok":true,"conversation":"c-old"}),
            later + 1
        ));
        assert!(desk.observe(
            &json!({"type":"opened","requestId":format!("{}~1", handoff.id),"ok":true,"conversation":"c-late"}),
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
    fn a_swipe_asks_the_claude_session_to_hand_its_own_work_over() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        left_as(&lines, Some("waiting"), None);
        assert_eq!(
            launch(&desk, &lines, "s1", "review", 1).unwrap(),
            Launched::Queued
        );
        assert_eq!(
            launch(&desk, &lines, "s2", "discuss", 1).unwrap(),
            Launched::Queued
        );
        let sent = lines.sent.borrow().clone();
        assert_eq!(sent.len(), 2);
        assert_eq!((sent[0].0.as_str(), sent[0].1.as_str()), ("leave", "s1"));
        assert!(sent[0].2.contains("relay_to_chatgpt") && sent[0].2.contains("结论：通过"));
        assert!(sent[1].2.contains("relay_to_chatgpt") && sent[1].2.contains("不改代码"));
        // Kinds not open yet, a bad id, no way out: nothing is sent.
        assert!(launch(&desk, &lines, "s3", "test", 1).is_err());
        assert!(launch(&desk, &lines, "../x", "review", 1).is_err());
        let offline = Fake {
            offline: true,
            ..Fake::default()
        };
        assert!(launch(&desk, &offline, "s3", "review", 1).is_err());
        let unreachable = Fake {
            unreachable: true,
            ..Fake::default()
        };
        assert!(launch(&desk, &unreachable, "s3", "review", 1).is_err());
        assert!(offline.sent.borrow().is_empty() && unreachable.sent.borrow().is_empty());
        assert_eq!(lines.sent.borrow().len(), 2);
    }

    #[test]
    fn a_second_swipe_while_the_words_wait_leaves_nothing_more() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        left_as(&lines, Some("waiting"), None);
        launch(&desk, &lines, "s1", "review", 1).unwrap();
        assert_eq!(
            launch(&desk, &lines, "s1", "review", 2).unwrap(),
            Launched::AlreadyQueued
        );
        // Another kind for the same session waits too: one ask at a time.
        assert_eq!(
            launch(&desk, &lines, "s1", "discuss", 2).unwrap(),
            Launched::AlreadyQueued
        );
        // Taken words wait for the session to be idle: still queued.
        left_as(&lines, Some("taken"), None);
        assert_eq!(
            launch(&desk, &lines, "s1", "review", 3).unwrap(),
            Launched::AlreadyQueued
        );
        // In the session but no handoff yet: still asked, and said so.
        left_as(&lines, Some("started"), None);
        assert_eq!(
            launch(&desk, &lines, "s1", "review", 4).unwrap(),
            Launched::AlreadyQueued
        );
        assert_eq!(desk.launch_projection(&lines, 4)[0]["state"], "started");
        assert_eq!(lines.sent.borrow().len(), 1);
        // Once the session handed its work over naming this swipe, the row
        // gives way to its handoff and a new swipe leaves words again.
        let code = code_of(&lines);
        assert!(desk.launch_relayed("s1", &code, 5));
        assert_eq!(desk.launch_projection(&lines, 5), json!([]));
        left_as(&lines, Some("waiting"), None);
        assert_eq!(
            launch(&desk, &lines, "s1", "review", 6).unwrap(),
            Launched::Queued
        );
        assert_eq!(
            lines
                .sent
                .borrow()
                .iter()
                .filter(|s| s.0 == "leave")
                .count(),
            2
        );
    }

    #[test]
    fn words_that_could_not_be_left_can_be_swiped_again() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        lines.leave_fails.set(true);
        assert!(launch(&desk, &lines, "s1", "review", 1).is_err());
        assert_eq!(desk.launch_projection(&lines, 1), json!([]));
        lines.leave_fails.set(false);
        left_as(&lines, Some("waiting"), None);
        assert_eq!(
            launch(&desk, &lines, "s1", "review", 2).unwrap(),
            Launched::Queued
        );
        // Another session is its own line.
        assert_eq!(
            launch(&desk, &lines, "s2", "review", 2).unwrap(),
            Launched::Queued
        );
    }

    #[test]
    fn words_that_come_to_nothing_say_so_on_the_row_a_while() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        left_as(&lines, Some("waiting"), None);
        launch(&desk, &lines, "s1", "review", 0).unwrap();
        left_as(&lines, Some("refused"), Some("session ended"));
        let shown = desk.launch_projection(&lines, 10);
        assert_eq!(shown[0]["state"], "refused");
        assert_eq!(shown[0]["reason"], "session ended");
        // A refusal can be swiped again at once.
        assert_eq!(
            launch(&desk, &lines, "s1", "review", 11).unwrap(),
            Launched::Queued
        );
        left_as(&lines, Some("expired"), None);
        assert_eq!(desk.launch_projection(&lines, 20)[0]["state"], "expired");
        // Shown half an hour, then gone.
        assert_eq!(
            desk.launch_projection(&lines, 20 + LAUNCH_SHOWN_MS),
            json!([])
        );
        // Words whose file went before they were seen taken: not known to
        // be taken, so not said to be; with no handoff in the hour, lost.
        left_as(&lines, Some("waiting"), None);
        launch(&desk, &lines, "s3", "review", 0).unwrap();
        desk.launch_projection(&lines, 1);
        left_as(&lines, None, None);
        let shown = desk.launch_projection(&lines, 60_000);
        assert!(shown
            .as_array()
            .unwrap()
            .iter()
            .any(|l| l["session"] == "s3" && l["state"] == "unknown"));
        // Words never taken expire with their hour.
        left_as(&lines, Some("waiting"), None);
        launch(&desk, &lines, "s2", "review", 0).unwrap();
        let shown = desk.launch_projection(&lines, LAUNCH_LIFETIME_MS);
        let state = |session: &str| {
            shown
                .as_array()
                .unwrap()
                .iter()
                .find(|l| l["session"] == session)
                .map(|l| l["state"].clone())
        };
        assert_eq!(state("s2"), Some(json!("expired")));
        assert_eq!(state("s3"), Some(json!("lost")));
        assert_eq!(
            lines
                .sent
                .borrow()
                .iter()
                .filter(|s| s.0 == "leave")
                .count(),
            4
        );
    }

    #[test]
    fn the_caller_is_only_ever_the_session_that_named_itself() {
        assert_eq!(
            caller_session(&json!({"client":"claude","sessionId":"s1"})),
            Some("s1".into())
        );
        // No id, or a malformed one: refused, never guessed from the folder.
        assert_eq!(caller_session(&json!({"client":"claude"})), None);
        assert_eq!(caller_session(&json!({"sessionId":"../x"})), None);
        assert_eq!(caller_session(&Value::Null), None);
    }

    #[test]
    fn two_starts_side_by_side_begin_one_handoff() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        let first = desk.claim("session:s1").unwrap();
        assert!(desk
            .start(&lines, "s1", None, "t", None, "brief", false, 1)
            .is_err());
        // Another session is not held up.
        assert!(desk
            .start(&lines, "s2", None, "t", None, "brief", false, 1)
            .is_ok());
        drop(first);
        assert!(matches!(
            desk.start(&lines, "s1", None, "t", None, "brief", false, 2),
            Ok(Started::Opening { .. })
        ));
        assert_eq!(desk.projection(3).as_array().unwrap().len(), 2);
    }

    #[test]
    fn ending_waits_for_words_on_their_way() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        let handoff = opened(&desk, &lines);
        let sending = desk.claim(&handoff.id).unwrap();
        assert!(desk.act(&lines, &handoff.id, "end", 3).is_err());
        assert_ne!(desk.projection(3)[0]["phase"], "ended");
        drop(sending);
        desk.act(&lines, &handoff.id, "end", 4).unwrap();
        assert_eq!(desk.projection(4)[0]["phase"], "ended");
    }

    #[test]
    fn turns_before_the_conversation_is_bound_are_taken_in_order() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        let Started::Opening { handoff, .. } = desk
            .start(&lines, "s1", None, "t", None, "brief", false, 1)
            .unwrap()
        else {
            panic!()
        };
        // ChatGPT answers in full before `opened` does.
        assert!(!desk.observe(&turn("start", ""), 2));
        assert!(!desk.observe(&turn("complete", "1. 少一项\n结论：需修改"), 3));
        desk.open(&lines, &handoff.id, "brief", None, || 4).unwrap();
        let shown = desk.projection(5);
        assert_eq!(shown[0]["phase"], "replied");
        let kinds = shown[0]["steps"]
            .as_array()
            .unwrap()
            .iter()
            .map(|step| step["kind"].as_str().unwrap().to_owned())
            .collect::<Vec<_>>();
        assert_eq!(kinds.last().map(String::as_str), Some("reply"));
        assert_eq!(
            shown[0]["steps"].as_array().unwrap().last().unwrap()["at"],
            3
        );
        // Taken once: nothing is left to take again.
        assert!(!desk.caught_up("c-new"));
    }

    #[test]
    fn turns_while_the_next_round_is_on_its_way_count_for_that_round() {
        let (_temp, desk) = desk();
        let desk: &'static Desk = Box::leak(Box::new(desk));
        let mut lines = Fake::default();
        let handoff = opened(desk, &lines);
        assert!(desk.observe(&turn("complete", "1. 少一项\n结论：需修改"), 3));
        // Round 2: ChatGPT starts, and answers, before `send` returns.
        lines.on_send = Some(Box::new(|| {
            assert!(!desk.observe(&turn("start", ""), 5));
            assert!(!desk.observe(
                &json!({"type":"turn","phase":"complete","conversation":"c-new","reply":"结论：通过","messageId":"m2"}),
                6
            ));
        }));
        let Started::Sent { repeated, .. } = desk
            .start(&lines, "s1", None, "t", None, "第 2 轮改动", false, 4)
            .unwrap()
        else {
            panic!("round 2 goes into the same conversation")
        };
        assert!(!repeated);
        let shown = desk.projection(7);
        assert_eq!(shown[0]["id"], handoff.id.as_str());
        assert_eq!(shown[0]["phase"], "replied");
        let last = shown[0]["steps"]
            .as_array()
            .unwrap()
            .last()
            .unwrap()
            .clone();
        assert_eq!(
            (last["kind"].as_str(), last["verdict"].as_str()),
            (Some("reply"), Some("pass"))
        );
        // Talk after the answer is not taken as another answer.
        lines.on_send = None;
        assert!(!desk.observe(&turn("complete", "顺便说一句"), 8));
        assert_eq!(
            desk.projection(8)[0]["steps"].as_array().unwrap().len(),
            shown[0]["steps"].as_array().unwrap().len()
        );
    }

    fn steps(kinds: &[&str]) -> Vec<Step> {
        kinds
            .iter()
            .enumerate()
            .map(|(at, kind)| serde_json::from_value(json!({"at": at, "kind": kind})).unwrap())
            .collect()
    }

    #[test]
    fn the_latest_step_that_moved_words_picks_the_letter() {
        // Nothing new, or nothing that moved words: no letter.
        assert_eq!(toss(&steps(&["work", "ask"]), 2), None);
        assert_eq!(toss(&steps(&["work", "ask", "back", "end"]), 2), None);
        assert_eq!(toss(&steps(&["work", "ask"]), 1), Some(Toss::ToChatGPT));
        assert_eq!(
            toss(&steps(&["work", "ask", "reply"]), 2),
            Some(Toss::ToClaude)
        );
        // Two moves since the last look: the latest one flies.
        assert_eq!(
            toss(&steps(&["work", "ask", "reply"]), 0),
            Some(Toss::ToClaude)
        );
        // A second round goes to ChatGPT again.
        assert_eq!(
            toss(
                &steps(&["work", "ask", "reply", "back", "again", "work", "ask"]),
                5
            ),
            Some(Toss::ToChatGPT)
        );
    }

    #[test]
    fn a_failure_falls_the_way_the_words_were_going() {
        // The review could not be opened.
        assert_eq!(
            toss(&steps(&["work", "fail"]), 1),
            Some(Toss::FallsToChatGPT)
        );
        // The answer could not go back to Claude.
        assert_eq!(
            toss(&steps(&["work", "ask", "reply", "fail"]), 3),
            Some(Toss::FallsToClaude)
        );
        // Round two could not reach ChatGPT.
        assert_eq!(
            toss(
                &steps(&["work", "ask", "reply", "back", "again", "fail"]),
                5
            ),
            Some(Toss::FallsToChatGPT)
        );
        // ChatGPT had the words and did not answer: nothing flew, nothing falls.
        assert_eq!(toss(&steps(&["work", "ask", "fail"]), 2), None);
    }

    #[test]
    fn letters_fly_once_each_way_and_not_again_after_a_restart() {
        let (temp, desk) = desk();
        let lines = Fake::default();
        let handoff = opened(&desk, &lines);
        let flights = desk.tosses();
        assert_eq!(flights.len(), 1);
        let sent = &flights[0];
        assert_eq!(
            (sent.from.as_str(), sent.to.as_str()),
            ("claude", "chatgpt")
        );
        assert!(sent.from_left && !sent.falls);
        assert_eq!(sent.lane, format!("relay:{}:claude", handoff.id));
        // Looked at again with nothing new: no letter.
        assert!(desk.tosses().is_empty());
        assert!(desk.observe(&turn("start", ""), 3));
        assert!(desk.tosses().is_empty(), "ChatGPT starting moves no words");
        assert!(desk.observe(&turn("complete", "1. 要超时\n结论：需修改"), 4));
        let back = desk.tosses();
        assert_eq!(back.len(), 1);
        assert_eq!(
            (back[0].from.as_str(), back[0].to.as_str()),
            ("chatgpt", "claude")
        );
        assert!(!back[0].from_left);
        // The steps kept from before a restart flew already.
        let again = Desk::new(Some(temp.path().join("data")));
        assert!(again.tosses().is_empty());
    }
}
