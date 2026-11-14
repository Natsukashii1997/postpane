//! Relay 1c (docs/chatgpt-channel.md, 1c 接力): a Claude Code session hands
//! its work to a ChatGPT conversation for review, and words go back and forth
//! between the two. The host owns the handoffs because it holds both ways
//! out: the ChatGPT extension's channel and Agent HUD's Claude Code plugin.
//! Started by Claude (the `relay_to_chatgpt` local tool); the HUD's handoff
//! card moves it on (`handoff_act`). Each step is kept (handoffs.rs), and
//! the ChatGPT channel tells the desk when ChatGPT starts and finishes.
use crate::extension::Flight;
use agent_hud_runtime::chatgpt::handoffs::{
    self, by_doer, Book, Delivery, Handoff, Next, Phase, Risk, Status, Step, StepKind,
};
use agent_hud_runtime::claude_plugin::Opener;

/// What Claude said about a review besides its words (#217).
#[derive(Clone, Debug, Default)]
pub(crate) struct Rule {
    /// The risk level as given, 「L0」…「L3」; checked when it starts.
    pub(crate) risk: Option<String>,
    /// The person's leave for one review past the budget, and why.
    pub(crate) extra: Option<String>,
    /// The client doing the work when it is not Claude Code: `codex` (#280).
    pub(crate) doer: Option<String>,
}
use agent_hud_runtime::l10n;
use serde_json::{json, Value};
use std::{
    collections::{HashMap, HashSet},
    path::PathBuf,
    sync::{Mutex, MutexGuard},
};
use tauri::Manager;

mod back;
mod belongs;
mod lines;
mod reread;
mod texts;
use back::back_text;
use lines::AppLines;
mod wake;
use texts::*;
use wake::{wake_failed, woke_stopped};

/// Claude Code's source id, the only client words go back into.
const CLAUDE: &str = "claude";
const CODEX: &str = "codex";
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
    /// Sends `text` into `conversation`, asked as `request`: the extension
    /// may still say it went in after the wait gave up (`Desk::observe`).
    fn send(&self, conversation: &str, text: &str, request: &str) -> Result<(), String>;
    /// Asks the extension to tell `conversation`'s newest reply again, once
    /// written (#356); it comes back, if at all, as a turn (`observe`).
    fn reread(&self, conversation: &str) -> Result<(), String>;
    /// Whether words left for a Claude Code session would reach it.
    fn reaches(&self, doer: &str, session: &str) -> Result<(), String>;
    /// Leaves words for a Claude Code session running now, under `id` (#257):
    /// words left under it before are `Unsent::Again`.
    fn reply(&self, doer: &str, session: &str, id: &str, text: &str) -> Result<(), Unsent>;
    /// Leaves words for a Claude Code session and says which, to follow
    /// them (`left`).
    fn leave(&self, session: &str, text: &str) -> Result<String, String>;
    /// Leaves words as `reply` does, also for a session not running now: they
    /// wait in its queue until it is opened (#255).
    fn queue(&self, doer: &str, session: &str, id: &str, text: &str) -> Result<(), Unsent>;
    /// How words left for a session stand (`waiting`, `taken`, `started`,
    /// `refused`, `expired`, `cancelled`) with the plugin's reason; None once
    /// the plugin's files are gone. A Codex thread's are followed by `words`
    /// in its rollout too (#283).
    fn left(
        &self,
        doer: &str,
        session: &str,
        id: &str,
        words: &str,
    ) -> Option<(String, Option<String>)>;
    /// Who began a Claude Code session's current turn, and when (#258);
    /// None when its transcript cannot tell.
    fn opener(&self, doer: &str, session: &str) -> Option<(Opener, i64)>;
    /// Whether the session ran the plugin and its Claude Code process has
    /// stopped since: Claude's desktop app reclaims idle sessions, and
    /// opening one does not run it again (L-14).
    fn stopped(&self, session: &str) -> bool;
    /// Takes back words left for a session (`leave`) that it has not taken;
    /// false once it took them, or when that cannot be told.
    fn withdraw(&self, session: &str, id: &str) -> bool;
    /// Runs Claude Code for the session in the background with `text`, as
    /// the desktop app would (its folder, model and permission mode). The
    /// run's end comes back through `Desk::woke_up` for `handoff`.
    fn wake(&self, handoff: &str, session: &str, text: &str) -> Result<(), String>;
}

/// Why words did not go to a Claude Code session.
#[derive(Debug, PartialEq)]
pub(crate) enum Unsent {
    /// Words were left under this id before: they went already (#257).
    Again,
    Failed(String),
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
    /// `codex` when the swipe was on a Codex thread (#282); none is Claude.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    doer: Option<String>,
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
fn turns_path(data: &std::path::Path) -> PathBuf {
    agent_hud_runtime::chatgpt::folder(data).join("turns.jsonl")
}
/// How big the turn log grows before it is moved to `turns.old.jsonl`.
const TURNS_KEPT: u64 = 1 << 20;

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
    /// Words being sent to ChatGPT, by handoff, until they are known to have
    /// gone in: in time, or told by the extension after the wait (#223).
    asking: Mutex<HashMap<String, Asking>>,
    /// Each session's last 左滑发起, by session.
    launches: Mutex<HashMap<String, Launch>>,
    /// How many of each handoff's steps the sidebar has flown a letter for
    /// (#171); those kept from before a restart count as flown.
    tossed: Mutex<HashMap<String, usize>>,
    /// When the extension was last asked to read each quiet handoff's
    /// conversation again (#356).
    reread_at: Mutex<HashMap<String, i64>>,
}

/// How many early turns are kept: those of conversations never bound (the
/// person's own chats) are dropped oldest first.
const EARLY_KEPT: usize = 16;

/// Words on their way into a handoff's conversation, kept until they go in.
struct Asking {
    request: String,
    summary: Option<String>,
    brief: String,
    /// They bring the evidence a 思维评审 paused for (#209).
    evidence: bool,
}

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
        // What a restart writes below comes before Core follows the
        // Language setting (#223).
        let chinese = data.as_deref().map_or_else(l10n::chinese, stored_chinese);
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
            asking: Mutex::new(HashMap::new()),
            launches: Mutex::new(launches),
            reread_at: Mutex::new(HashMap::new()),
        };
        let now = now_ms();
        // Not `||`: both are to happen.
        let interrupted = book.interrupted(now, &interrupted(chinese));
        let woke = book.restarted();
        // Reviews that passed while nothing drove them (the auto round trip
        // off) end now, as a pass coming in would (owner, 2026-11-07). Not a
        // 思维评审 one (#209): its answer has to reach Claude first, so it
        // waits, paused, for the person.
        let passed_ids = book
            .list
            .iter()
            .filter(|h| !h.thinking() && h.next() == Some(Next::Pass))
            .map(|h| h.id.clone())
            .collect::<Vec<_>>();
        let mut ended = false;
        for id in &passed_ids {
            ended |= book.passed(id, &passed(chinese), now);
        }
        if interrupted | woke | ended {
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
            book.expire(now, &timed_out())
                | book.overdue(now, &no_answer(), &no_handover(), &no_wake())
                | book.idle(now, &idle_end())
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
                flights.push(toss.flight(&handoff.id, handoff.doer.as_deref().unwrap_or(CLAUDE)));
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
    /// One line in `chatgpt/turns.jsonl` for a turn the extension reported:
    /// its conversation, phase, message id, how long the reply was and what
    /// the desk made of it (`taken`, `unused`, `early`, `caught-up`,
    /// `evicted`). Never the words themselves. A lost reply is then traced to
    /// the extension (no line) or to the desk (a line that says why).
    fn note_turn(&self, message: &Value, at: i64, outcome: &str) {
        use std::io::Write;
        let Some(data) = &self.data else { return };
        let path = turns_path(data);
        if std::fs::metadata(&path).is_ok_and(|m| m.len() > TURNS_KEPT) {
            let _ = std::fs::rename(&path, path.with_extension("old.jsonl"));
        }
        let line = json!({
            "at": at,
            "conversation": message["conversation"],
            "phase": message["phase"],
            "messageId": message["messageId"],
            "replyChars": message["reply"].as_str().map(|r| r.chars().count()),
            "outcome": outcome,
        });
        let written = std::fs::create_dir_all(agent_hud_runtime::chatgpt::folder(data))
            .and_then(|()| {
                std::fs::OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open(&path)
            })
            .and_then(|mut file| writeln!(file, "{line}"));
        if let Err(error) = written {
            eprintln!("ChatGPT turn log {}: {error}", path.display());
        }
    }

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
    /// `start_ruled` with no risk level and no leave, as the tests start.
    #[cfg(test)]
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
        let rule = Rule::default();
        self.start_ruled(
            lines, session, cwd, title, summary, brief, fresh, &rule, now,
        )
    }
    /// `start`, with a risk level and the person's leave for a review past
    /// the budget (#217). An engineering review is refused at L0, and past
    /// its budget — its pull request's earlier reviews counted — unless
    /// the person allowed one more (`extra`).
    #[allow(clippy::too_many_arguments)]
    pub(crate) fn start_ruled(
        &self,
        lines: &dyn Lines,
        session: &str,
        cwd: Option<&str>,
        title: &str,
        summary: Option<&str>,
        brief: &str,
        fresh: bool,
        rule: &Rule,
        now: i64,
    ) -> Result<Started, String> {
        let engineering = !handoffs::thinking(title);
        let risk = match rule.risk.as_deref().map(str::trim) {
            Some(text) if engineering && !text.is_empty() => {
                if text.eq_ignore_ascii_case("L0") {
                    return Err(l0_refused());
                }
                Some(Risk::parse(text).ok_or_else(|| bad_risk(text))?)
            }
            _ => None,
        };
        let extra = rule
            .extra
            .as_deref()
            .map(str::trim)
            .filter(|text| !text.is_empty() && engineering);
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
                    // The person spoke up in the session since words went
                    // back to it (#258): its rounds count from one again.
                    // Not told who began Claude's turn: they count on.
                    if handoff.spoke_up(
                        lines
                            .opener(handoff.doer.as_deref().unwrap_or(CLAUDE), session)
                            .as_ref(),
                    ) {
                        self.change(|book| book.restart_rounds(&handoff.id));
                    }
                    let sent = {
                        let _sending = self.claim(&handoff.id)?;
                        self.ask(lines, handoff, &conversation, summary, brief, extra, now)
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
        // A review of a pull request reviewed before counts on (#217).
        let pr = engineering.then(|| handoffs::pull_request(brief)).flatten();
        let carried = pr
            .as_deref()
            .and_then(|pr| self.lock().carried_for(pr))
            .map_or(0, |(_, count)| count);
        let past = carried >= risk.map_or(handoffs::ROUNDS, Risk::reviews);
        if past && extra.is_none() {
            return Err(budget_spent(carried));
        }
        let handoff = self.change(|book| {
            let handoff = book.begin(session, cwd, &title, summary, brief, now);
            if let Some(doer) = rule.doer.as_deref() {
                book.set_doer(&handoff.id, doer);
            }
            if engineering {
                book.rule(&handoff.id, risk, pr.as_deref());
            }
            if let Some(reason) = extra.filter(|_| past) {
                book.allow_extra(&handoff.id, reason, now);
            }
            book.get(&handoff.id).cloned().unwrap_or(handoff)
        });
        Ok(Started::Opening {
            handoff,
            project: self.project(),
        })
    }

    /// Sends `brief` into the handoff's open `conversation`, once.
    #[allow(clippy::too_many_arguments)]
    fn ask(
        &self,
        lines: &dyn Lines,
        handoff: Handoff,
        conversation: &str,
        summary: Option<&str>,
        brief: &str,
        extra: Option<&str>,
        now: i64,
    ) -> Result<Started, String> {
        // The same words again (a retry after a slow answer) are not sent twice.
        if self.lock().asked_already(&handoff.id, brief) {
            return Ok(Started::Sent {
                handoff,
                repeated: true,
            });
        }
        // Evidence a 思维评审 paused for (#209): it goes on by itself again.
        let evidence = self
            .lock()
            .get(&handoff.id)
            .is_some_and(Handoff::waits_for_evidence);
        // An engineering review past its budget goes only with the
        // person's leave (#217).
        let (spent, counted) = {
            let book = self.lock();
            let counted = book.pr_counted(&handoff.id);
            let spent = book
                .get(&handoff.id)
                .is_some_and(|h| !h.thinking() && counted >= h.budget());
            (!evidence && spent, counted)
        };
        if spent && extra.is_none() {
            return Err(budget_spent(counted));
        }
        if let Some(reason) = extra.filter(|_| spent) {
            self.change(|book| book.allow_extra(&handoff.id, reason, now));
        }
        // Kept until they go in: the extension may only say so after the
        // wait gave up (`observe`, #223).
        let request = format!("{}~send{now}", handoff.id);
        self.asking().insert(
            handoff.id.clone(),
            Asking {
                request: request.clone(),
                summary: summary.map(str::to_owned),
                brief: brief.to_owned(),
                evidence,
            },
        );
        lines.send(conversation, brief, &request)?;
        self.went_in(&request, now);
        let sent = self.lock().get(&handoff.id).cloned().unwrap_or(handoff);
        Ok(Started::Sent {
            handoff: sent,
            repeated: false,
        })
    }

    fn asking(&self) -> MutexGuard<'_, HashMap<String, Asking>> {
        self.asking.lock().unwrap_or_else(|p| p.into_inner())
    }
    /// Words asked as `request` went into ChatGPT: into the book once,
    /// whichever of `ask` and the extension's late word comes first.
    fn went_in(&self, request: &str, now: i64) -> bool {
        let id = request.rsplit_once('~').map_or("", |(id, _)| id);
        let asking = {
            let mut asking = self.asking();
            if !asking.get(id).is_some_and(|a| a.request == request) {
                return false;
            }
            asking.remove(id)
        };
        let Some(asking) = asking else {
            return false;
        };
        self.change(|book| {
            book.asked(id, asking.summary.as_deref(), &asking.brief, now)
                && (!asking.evidence || book.evidence_in(id, now))
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
        let opened = {
            // Held while it opens, so 结束接力 waits for it (#223).
            let _opening = self.claim(id)?;
            let (title, request) = self
                .lock()
                .get(id)
                .filter(|h| h.status == Status::Opening)
                .map(|h| (h.title.clone(), h.request()))
                .ok_or_else(|| l10n::text("这次接力已经结束", "This handoff has ended"))?;
            let opened = lines.open(brief, project, &title, &request);
            self.change(|book| match &opened {
                Ok(conversation) => book.opened(id, conversation, now()),
                Err(error) => book.failed(id, error, now()),
            });
            opened
        };
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
            let took = self.take(&turn.message, conversation, turn.at);
            let outcome = match self.outcome(took, &turn.message, conversation) {
                "taken" => "caught-up",
                other => other,
            };
            self.note_turn(&turn.message, turn.at, outcome);
            changed |= took;
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
        let prompt = message["prompt"].as_str();
        // Another turn's answer is not this review's (#356 P1-01): checked
        // under the same hold as it is taken, so no words sent in between
        // make an answer to the earlier ones count for them.
        self.change(|book| {
            belongs::fits(book, conversation, prompt)
                && book.replied(conversation, reply, message_id, at)
        })
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
                    self.note_turn(message, now, "early");
                    let extra = early.len().saturating_sub(EARLY_KEPT);
                    for turn in early.drain(..extra) {
                        self.note_turn(&turn.message, now, "evicted");
                    }
                    return false;
                }
                let took = self.take(message, conversation, now);
                self.note_turn(message, now, self.outcome(took, message, conversation));
                took
            }
            // Words in: those whose wait gave up count now (#223).
            (Some("sent"), _) if message["ok"] == true => {
                self.went_in(message["requestId"].as_str().unwrap_or(""), now)
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
                    let round = handoff.rounds_used() + 1;
                    let text = if handoff.thinking() {
                        thinking_again_text(round)
                    } else {
                        again_text(round)
                    };
                    (StepKind::Again, text)
                };
                let _sending = self.claim(id)?;
                if self.lock().returned_already(id, &text) {
                    return Ok(Acted::Done);
                }
                // The step's own id (#257): words left under it before went
                // already, and are not left twice.
                let prompt = self
                    .lock()
                    .get(id)
                    .map_or_else(|| handoff.prompt_for(kind), |h| h.prompt_for(kind));
                let (doer, session) = (
                    handoff.doer.as_deref().unwrap_or(CLAUDE),
                    &handoff.claude_session,
                );
                if let Err(Unsent::Failed(error)) = lines
                    .reaches(doer, session)
                    .map_err(Unsent::Failed)
                    .and_then(|()| lines.reply(doer, session, &prompt, &text))
                {
                    // As the auto round trip's (#223): they wait in the
                    // session's queue and go in once it is opened.
                    if let Err(Unsent::Failed(_)) = lines.queue(doer, session, &prompt, &text) {
                        return Err(error);
                    }
                    self.change(|book| {
                        book.returned(id, kind, &text, &prompt, false, now) && book.queued(id, now)
                    });
                    return Ok(Acted::Done);
                }
                self.change(|book| book.returned(id, kind, &text, &prompt, false, now));
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
                // Every round used: an answer can only stop it again (#194).
                if handoff.spent() {
                    let text = no_rounds_left(handoff.budget());
                    return Err(by_doer(&text, handoff.doer.as_deref()));
                }
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
    /// acted on, and every one goes back to Claude (tried twice) before
    /// anything else (#316: ends used to stay on the sidebar, and the
    /// session waited on unaware). 「需修改」 with rounds to go waits for
    /// Claude's changes; a pass ends the handoff; the last round, no
    /// verdict or last two lines that do not hold leave it to the person.
    /// A 思维评审 answer (#209): a pass ends it and 证据不足暂停 / 决策升级
    /// stop it. Whether anything changed.
    pub(crate) fn drive(&self, lines: &dyn Lines, now: i64) -> bool {
        let tracked = self.track(lines, now);
        let due = self
            .lock()
            .list
            .iter()
            .filter_map(|h| h.next().map(|next| (h.id.clone(), next)))
            .collect::<Vec<_>>();
        let mut changed = tracked;
        for (id, next) in due {
            changed |= self.auto_back(lines, &id, next, now);
        }
        changed
    }
    /// Drives the answers that wait to go on (#72) when nothing else did:
    /// one that came in just before a restart, or while no word from the
    /// extension followed. Only when there is one, so the sidebar's refresh
    /// can call it every time. Whether anything changed.
    pub(crate) fn catch_up(&self, lines: &dyn Lines, now: i64) -> bool {
        let waiting = self.lock().list.iter().any(|h| h.next().is_some());
        waiting && self.drive(lines, now)
    }
    /// Follows the newest words back to Claude in each handoff shown, as its
    /// session's plugin has them (#257): taken and started are kept on their
    /// step; words it gave up — refused, expired, cancelled — leave the
    /// handoff to the person at once, saying why. Whether anything changed.
    pub(crate) fn track(&self, lines: &dyn Lines, now: i64) -> bool {
        let pending = self
            .lock()
            .list
            .iter()
            .filter(|h| h.live() || now - h.updated_at < FAILED_SHOWN_MS)
            .filter_map(|h| {
                let step = h
                    .steps
                    .iter()
                    .rev()
                    .find(|step| matches!(step.kind, StepKind::Back | StepKind::Again))?;
                let delivery = step
                    .delivery
                    .filter(|d| matches!(d, Delivery::Waiting | Delivery::Taken))?;
                Some((
                    h.id.clone(),
                    (
                        h.doer.clone().unwrap_or_else(|| CLAUDE.into()),
                        h.claude_session.clone(),
                    ),
                    (step.prompt.clone()?, step.text.clone().unwrap_or_default()),
                    delivery,
                ))
            })
            .collect::<Vec<_>>();
        let mut changed = false;
        for (id, (doer, session), (prompt, words), was) in pending {
            let Some((state, reason)) = lines.left(&doer, &session, &prompt, &words) else {
                continue;
            };
            let delivery = match state.as_str() {
                "taken" => Delivery::Taken,
                "started" => Delivery::Started,
                "refused" => Delivery::Refused,
                "expired" => Delivery::Expired,
                "cancelled" => Delivery::Cancelled,
                _ => continue,
            };
            if delivery == was {
                continue;
            }
            // Given up after the handoff ended (an end's answer queued,
            // #316): the card says the session never had it.
            let ended = !self.lock().get(&id).is_some_and(Handoff::live);
            let reason = if ended {
                end_undelivered(&state)
            } else {
                undelivered(&state, reason.as_deref())
            };
            let reason = by_doer(&reason, Some(&doer));
            changed |= self.change(|book| {
                if delivery.gave_up() {
                    book.undelivered(&id, &prompt, delivery, &reason, now)
                } else {
                    book.delivery(&id, &prompt, delivery, now)
                }
            });
        }
        changed
    }
    /// Sends the answer back to Claude for `next`, then ends or stops the
    /// handoff as `next` says — only once it reached Claude or its queue,
    /// or, for an end, once it could not (#316): the card says which.
    fn auto_back(&self, lines: &dyn Lines, id: &str, next: Next, now: i64) -> bool {
        // A person's button sending meanwhile: theirs goes.
        let Ok(_sending) = self.claim(id) else {
            return false;
        };
        let Some(handoff) = self
            .lock()
            .get(id)
            .cloned()
            .filter(|h| h.next() == Some(next))
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
        let (doer, session) = (
            handoff.doer.as_deref().unwrap_or(CLAUDE),
            &handoff.claude_session,
        );
        let named = |text: String| by_doer(&text, Some(doer));
        // An end's reason keeps what the review came to, and says how its
        // answer went (#316): reached, queued, or not at all.
        let then = |book: &mut Book, how: Sent| match next {
            Next::Pass => book.passed(id, &named(passed_back(how)), now),
            Next::Close => book.passed(id, &named(thinking_closed()), now),
            Next::Settle => book.passed(id, &named(settled()), now),
            Next::Pause => book.stop(id, &named(evidence_paused()), true, now),
            Next::Escalate => book.stop(id, &named(escalated()), true, now),
            Next::Limit => book.stop(id, &named(at_limit(handoff.budget(), how)), true, now),
            Next::NoVerdict => book.stop(id, &named(no_verdict(how)), true, now),
            Next::BadTail(flaw) => book.stop(id, &named(bad_review_tail(flaw, how)), true, now),
            Next::Invalid(flaw) => book.stop(id, &named(invalid_tail(flaw, how)), true, now),
            Next::Back => true,
        };
        // Could not reach Claude: the ends this round trip added end or
        // stop all the same, saying so — a pass ends with the auto round
        // trip off too, so stopping it would leave it tried at every turn;
        // the rest stop for the person as before.
        let give_up = |book: &mut Book| match next {
            Next::Pass | Next::Limit | Next::NoVerdict | Next::BadTail(_) | Next::Invalid(_) => {
                then(book, Sent::Failed)
            }
            _ => book.stop(id, &named(back_failed()), true, now),
        };
        // The step's own id (#257): tried again, or triggered again, it
        // leaves no second copy; words left under it before went already.
        let prompt = handoff.prompt_for(StepKind::Back);
        let send = || {
            lines
                .reaches(doer, session)
                .map_err(Unsent::Failed)
                .and_then(|()| lines.reply(doer, session, &prompt, &text))
        };
        if let Err(Unsent::Failed(first)) = send() {
            // Its process stopped: nothing runs in it to take the words, so
            // Claude Code runs for it in the background (L-14). A Codex
            // thread is left to Codex's queue (#280).
            if doer == CLAUDE && lines.stopped(session) {
                return match lines.wake(id, session, &text) {
                    Ok(()) => self.change(|book| {
                        book.returned(id, StepKind::Back, &text, &prompt, true, now)
                            && book.woke(id, &woke_stopped(), now)
                            && then(book, Sent::Back)
                    }),
                    Err(error) => self.change(|book| {
                        book.trouble(id, &wake_failed(&first, &error), now);
                        give_up(book)
                    }),
                };
            }
            self.change(|book| book.trouble(id, &named(back_retry(&first)), now));
            if let Err(Unsent::Failed(again)) = send() {
                // Quiet for now (a stall, or a session Claude paused once its
                // turn was over): the words wait in its queue and go in once
                // it runs again; still waiting once it has been quiet for
                // long, Claude Code runs for it (`wake_queued`).
                if let Err(Unsent::Failed(_)) = lines.queue(doer, session, &prompt, &text) {
                    return self.change(|book| {
                        book.trouble(id, &retry_failed(&again), now);
                        give_up(book)
                    });
                }
                return self.change(|book| {
                    book.trouble(id, &queued_instead(&again), now);
                    book.returned(id, StepKind::Back, &text, &prompt, true, now)
                        && book.queued(id, now)
                        && then(book, Sent::Queued)
                });
            }
        }
        self.change(|book| {
            book.returned(id, StepKind::Back, &text, &prompt, true, now) && then(book, Sent::Back)
        })
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

/// 再审一轮: Claude hands its changes over again.
fn again_text(round: u32) -> String {
    format!(
        "请把按意见修改后的改动交回 ChatGPT 复审（第 {round} 轮）：调用 relay_to_chatgpt，brief 写这轮改了什么、对应哪几条意见、diff 或 PR 链接，最后请 ChatGPT 写「结论：通过」或「结论：需修改」；summary 写一句这轮改了什么。"
    )
}
/// 再审一轮 for a 思维评审 (#209): only what is to deepen goes, and the
/// answer ends with its way out and verdict.
fn thinking_again_text(round: u32) -> String {
    format!(
        "请把按评审意见深化后的内容交回 ChatGPT 评审（第 {round} 轮）：先逐条处理意见、更新决策记录，只针对「需深化」的项准备下一阶段送审包，再调用 relay_to_chatgpt 送出；内容没有实质变化就不要重送。请 ChatGPT 在回信最后两行依次写「评审出口：成熟退出 / 继续深化 / 证据不足暂停 / 决策升级 / 转其他路径」和「结论：通过 / 需修改 / 交常浩裁决」。summary 写一句这轮深化了什么。"
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

/// 左滑发起: asks the Claude Code `session`, or the Codex thread when `doer`
/// is Codex (#282), to hand its work to ChatGPT (`kind`: review or
/// discuss). Its words wait in line while it runs; it then calls
/// `relay_to_chatgpt` itself, so the handoff is its own.
/// Words still waiting for the session are not left again.
pub(crate) fn launch(
    desk: &Desk,
    lines: &dyn Lines,
    doer: &str,
    session: &str,
    kind: &str,
    now: i64,
) -> Result<Launched, String> {
    if !agent_hud_runtime::claude_plugin::valid_name(session) {
        let text = l10n::text("Claude 会话 id 不对", "Invalid Claude session id");
        return Err(by_doer(&text, Some(doer)));
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
    lines.reaches(doer, session)?;
    // Codex takes them into its queue under the swipe's own code (#282).
    let id = if doer == CODEX {
        match lines.queue(CODEX, session, &code, &text) {
            Ok(()) | Err(Unsent::Again) => code.clone(),
            Err(Unsent::Failed(error)) => return Err(error),
        }
    } else {
        lines.leave(session, &text)?
    };
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
            doer: (doer == CODEX).then(|| CODEX.to_owned()),
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
    let words = launch_text(&launch.kind, &launch.code).unwrap_or_default();
    match lines.left(
        launch.doer.as_deref().unwrap_or(CLAUDE),
        session,
        &launch.id,
        &words,
    ) {
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

/// Whether the Language setting kept in `data` (`settings.json`, as Core
/// keeps it) means Chinese.
fn stored_chinese(data: &std::path::Path) -> bool {
    let stored = std::fs::read(data.join("settings.json"))
        .ok()
        .and_then(|bytes| serde_json::from_slice::<Value>(&bytes).ok())
        .unwrap_or(Value::Null);
    // As `l10n::follow` reads it.
    match stored["settings"]["language"].as_str().unwrap_or("system") {
        "system" => l10n::system_chinese(),
        language => language.starts_with("zh"),
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

/// The snapshot's `handoffs`, with answers that wait to go on driven (one
/// from before a restart, owner 2026-11-14), the words back to Claude
/// followed (#257), queued ones for a session that went quiet run in the
/// background (L-14), and conversations ChatGPT went quiet in read again
/// (#356).
pub(crate) fn projection(app: &tauri::AppHandle, desk: &Desk) -> Value {
    let now = now_ms();
    let lines = AppLines(app);
    if !desk.catch_up(&lines, now) {
        desk.track(&lines, now);
    }
    desk.wake_queued(&lines, now);
    desk.reread(&lines, now);
    desk.projection(now)
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
    /// The letter between ChatGPT and the doer's mark (#282: Codex's when
    /// Codex does the work).
    fn flight(self, id: &str, doer: &str) -> Flight {
        let to_chatgpt = matches!(self, Self::ToChatGPT | Self::FallsToChatGPT);
        let (from, to) = if to_chatgpt {
            (doer, "chatgpt")
        } else {
            ("chatgpt", doer)
        };
        Flight {
            lane: format!("relay:{id}:{from}"),
            from: from.into(),
            to: to.into(),
            // Around the notch the doer stands on the left either way.
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
        let lock = service.backend.lock();
        let mut backend = lock.unwrap_or_else(std::sync::PoisonError::into_inner);
        backend.refresh_handoffs(app);
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
    rule: &Rule,
) -> Result<Value, String> {
    let desk = app.try_state::<Desk>().ok_or_else(demo)?;
    let started = desk.start_ruled(
        &AppLines(app),
        session,
        cwd,
        title,
        summary,
        brief,
        fresh,
        rule,
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

/// `relay_to_chatgpt`: Claude Code or Codex (#280) hands its work to
/// ChatGPT for review, only for its own session (`caller_session`).
pub(crate) fn relay(app: &tauri::AppHandle, params: &Value) -> Result<Value, String> {
    let caller = &params["caller"];
    let doer = match caller["client"].as_str() {
        Some(CODEX) => Some(CODEX.to_owned()),
        Some(CLAUDE) | None => None,
        Some(_) => {
            return Err(l10n::text(
                "只有 Claude Code 和 Codex 会话能把工作交给 ChatGPT 审核。",
                "Only a Claude Code or Codex session can hand its work to ChatGPT for review.",
            ))
        }
    };
    let title = params["title"].as_str().unwrap_or("").trim();
    let summary = params["summary"].as_str();
    let brief = params["brief"].as_str().unwrap_or("");
    let cwd = params["cwd"].as_str().filter(|cwd| !cwd.is_empty());
    let session = caller_session(caller).ok_or_else(|| {
        l10n::text(
            "认不出是哪个会话在调用（调用里没有会话 id），没有发出。请在 Claude Code 或 Codex 会话里调用这个工具。",
            "Could not tell which session is calling (the call names none); nothing was sent. Call this tool from a Claude Code or Codex session.",
        )
    })?;
    let rule = Rule {
        risk: params["risk"].as_str().map(str::to_owned),
        extra: params["extra"].as_str().map(str::to_owned),
        doer,
    };
    let mut answer = start(app, &session, cwd, title, summary, brief, false, &rule)?;
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
            "已送进这个会话对应的 ChatGPT 审核会话；回复会出现在驿窗侧栏；写「需修改」且审查预算没用完时（L1 1 轮，L2、L3 和不填 2 轮，同一 PR 跨会话累计）驿窗会自动把意见转回这个会话；写「通过」、预算用完或没写结论，也会把回信转回这个会话，写明是否已是终局。",
            "Sent into this session's ChatGPT review conversation; the reply shows in PostPane's sidebar. A \"changes needed\" answer within the review budget (L1 one round; L2, L3 or none named two; a pull request counted across sessions) comes back here by itself; so does a pass, a spent budget or an answer without a verdict, saying whether it is the end.",
        )
    } else {
        l10n::text(
            "已交给 ChatGPT 审核：新会话正在打开，回复会出现在驿窗侧栏；写「需修改」且审查预算没用完时（L1 1 轮，L2、L3 和不填 2 轮，同一 PR 跨会话累计）驿窗会自动把意见转回这个会话；写「通过」、预算用完或没写结论，也会把回信转回这个会话，写明是否已是终局。",
            "Handed to ChatGPT for review: a new conversation is opening; the reply shows in PostPane's sidebar. A \"changes needed\" answer within the review budget (L1 one round; L2, L3 or none named two; a pull request counted across sessions) comes back here by itself; so does a pass, a spent budget or an answer without a verdict, saying whether it is the end.",
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
    source: Option<String>,
) -> Result<Value, String> {
    // Claude Code's or, from #282, a Codex thread's row.
    let doer = match source.as_deref() {
        None | Some(CLAUDE) => CLAUDE,
        Some(CODEX) => CODEX,
        Some(_) => {
            return Err(l10n::text(
                "这个会话不能发起接力",
                "This session cannot start a handoff",
            ))
        }
    };
    tauri::async_runtime::spawn_blocking(move || {
        let desk = app.try_state::<Desk>().ok_or_else(demo)?;
        let launched = launch(&desk, &AppLines(&app), doer, &session_id, &kind, now_ms())?;
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
    use super::wake::{wake_arguments, woke_without_handover};
    use super::*;
    use agent_hud_runtime::chatgpt::handoffs::Flaw;
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
        /// What happens while a conversation is being opened.
        on_open: Option<Box<dyn Fn()>>,
        /// Sending gives up waiting for the extension.
        send_fails: std::cell::Cell<bool>,
        /// The request each sending was asked as.
        requests: RefCell<Vec<String>>,
        /// How left words stand, as the plugin would say; None once gone.
        left_as: RefCell<Option<(String, Option<String>)>>,
        /// Leaving words fails.
        leave_fails: std::cell::Cell<bool>,
        /// How many replies fail before one goes through.
        reply_fails: std::cell::Cell<u32>,
        /// Words left for Claude under each id (session, id), as the
        /// plugin's folder keeps them: the same id twice is refused (#257).
        prompts: RefCell<Vec<(String, String)>>,
        /// How words left under an id stand; words left and not set here
        /// wait, as the plugin's file says until it takes them.
        left_by: RefCell<HashMap<String, (String, Option<String>)>>,
        /// Who began the Claude session's current turn, and when (#258).
        opener: RefCell<Option<(Opener, i64)>>,
        /// The words each look at words left was asked with (#283).
        words: RefCell<Vec<String>>,
        /// The session's process stopped (L-14).
        stopped: std::cell::Cell<bool>,
        /// Queued words cannot be taken back (the session took them).
        withdraw_fails: std::cell::Cell<bool>,
        /// Running Claude Code in the background fails, and why.
        wake_fails: RefCell<Option<String>>,
        /// Passing a read-again on to the extension fails (#356).
        reread_fails: std::cell::Cell<bool>,
    }
    impl Fake {
        /// Leaves words under `id` as `ClaudeChannel::put` does.
        fn put(&self, kind: &str, session: &str, id: &str, text: &str) -> Result<(), Unsent> {
            let left = (session.to_owned(), id.to_owned());
            if self.prompts.borrow().contains(&left) {
                return Err(Unsent::Again);
            }
            self.prompts.borrow_mut().push(left);
            self.sent
                .borrow_mut()
                .push((kind.into(), session.into(), text.into()));
            Ok(())
        }
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
            shown(text);
            if let Some(during) = &self.on_open {
                during();
            }
            if self.open_fails {
                Err("timeout".into())
            } else {
                Ok("c-new".into())
            }
        }
        fn send(&self, conversation: &str, text: &str, request: &str) -> Result<(), String> {
            self.sent
                .borrow_mut()
                .push(("send".into(), conversation.into(), text.into()));
            self.requests.borrow_mut().push(request.into());
            shown(text);
            if let Some(during) = &self.on_send {
                during();
            }
            if self.send_fails.get() {
                return Err("ChatGPT 插件没能完成：timeout".into());
            }
            Ok(())
        }
        fn reread(&self, conversation: &str) -> Result<(), String> {
            self.sent
                .borrow_mut()
                .push(("reread".into(), conversation.into(), String::new()));
            if self.reread_fails.get() {
                return Err("The ChatGPT extension is not connected".into());
            }
            Ok(())
        }
        fn reaches(&self, _doer: &str, _session: &str) -> Result<(), String> {
            if self.unreachable {
                Err("这个会话还没加载 Agent HUD 插件".into())
            } else {
                Ok(())
            }
        }
        fn reply(&self, doer: &str, session: &str, id: &str, text: &str) -> Result<(), Unsent> {
            if self.reply_fails.get() > 0 {
                self.reply_fails.set(self.reply_fails.get() - 1);
                return Err(Unsent::Failed("会话的待发送目录写不进".into()));
            }
            // A Codex doer's words go through Codex's queue (#280).
            if doer == CODEX {
                return self.put("codex", session, id, text);
            }
            // As `ClaudeChannel::hand_as`: only a session checked in now.
            if self.unreachable {
                return Err(Unsent::Failed("这个会话还没加载 Agent HUD 插件".into()));
            }
            self.put("reply", session, id, text)
        }
        fn leave(&self, session: &str, text: &str) -> Result<String, String> {
            // As `ClaudeChannel::hand`: only a session checked in now (#255).
            if self.unreachable {
                return Err("这个会话还没加载 Agent HUD 插件".into());
            }
            if self.leave_fails.get() {
                return Err("plugin folder not writable".into());
            }
            let mut sent = self.sent.borrow_mut();
            sent.push(("leave".into(), session.into(), text.into()));
            Ok(format!("p{}", sent.len()))
        }
        fn queue(&self, doer: &str, session: &str, id: &str, text: &str) -> Result<(), Unsent> {
            if doer == CODEX {
                return self.put("codex", session, id, text);
            }
            if self.leave_fails.get() {
                return Err(Unsent::Failed("plugin folder not writable".into()));
            }
            self.put("queue", session, id, text)
        }
        fn left(
            &self,
            _doer: &str,
            session: &str,
            id: &str,
            words: &str,
        ) -> Option<(String, Option<String>)> {
            self.words.borrow_mut().push(words.to_owned());
            if let Some(state) = self.left_by.borrow().get(id) {
                return Some(state.clone());
            }
            let left = (session.to_owned(), id.to_owned());
            if self.prompts.borrow().contains(&left) {
                return Some(("waiting".into(), None));
            }
            self.left_as.borrow().clone()
        }
        fn stopped(&self, _session: &str) -> bool {
            self.stopped.get()
        }
        fn withdraw(&self, session: &str, id: &str) -> bool {
            self.sent
                .borrow_mut()
                .push(("withdraw".into(), session.into(), id.into()));
            if self.withdraw_fails.get() {
                return false;
            }
            left_by(self, id, "cancelled", None);
            true
        }
        fn wake(&self, handoff: &str, session: &str, text: &str) -> Result<(), String> {
            if let Some(error) = self.wake_fails.borrow().clone() {
                return Err(error);
            }
            self.sent.borrow_mut().push((
                "wake".into(),
                format!("{handoff}|{session}"),
                text.into(),
            ));
            Ok(())
        }
        fn opener(&self, _doer: &str, _session: &str) -> Option<(Opener, i64)> {
            self.opener.borrow().clone()
        }
    }
    fn left_by(lines: &Fake, id: &str, state: &str, reason: Option<&str>) {
        lines
            .left_by
            .borrow_mut()
            .insert(id.to_owned(), (state.to_owned(), reason.map(str::to_owned)));
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
        json!({"type":"turn","phase":phase,"conversation":"c-new","reply":reply,"prompt":asked()})
    }
    thread_local! {
        /// The words last sent to ChatGPT in this test, as its page shows
        /// them above the answer: each turn's prompt (#356 P1-01).
        static ASKED: RefCell<Option<String>> = const { RefCell::new(None) };
    }
    fn asked() -> Option<String> {
        ASKED.with(|asked| asked.borrow().clone())
    }
    fn shown(text: &str) {
        ASKED.with(|asked| *asked.borrow_mut() = Some(text.to_owned()));
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
        launch(&desk, &lines, CLAUDE, "s1", "review", 10).unwrap();
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
        launch(&desk, &lines, CLAUDE, "s1", "review", 1).unwrap();
        desk.launch_projection(&lines, 2);
        drop(desk);
        let desk = Desk::new(Some(data.clone()));
        assert_eq!(
            launch(&desk, &lines, CLAUDE, "s1", "review", 3).unwrap(),
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
        launch(&desk, &lines, CLAUDE, "s1", "review", 0).unwrap();
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
            &json!({"type":"turn","phase":"complete","conversation":"c-new","reply":"P2：日志少一行\nP3：命名\n审查出口：通过\n结论：通过","messageId":"m2","prompt":asked()}),
            8,
        );
        assert!(desk.drive(&lines, 9));
        let shown = desk.projection(9);
        assert_eq!(shown[0]["phase"], "ended");
        assert_eq!(shown[0]["status"], "closed");
        assert_eq!(shown[0]["halt"], Value::Null);
        assert_eq!(
            kinds(&desk, 9)[kinds(&desk, 9).len() - 2..],
            [("back".to_owned(), true), ("end".to_owned(), true)]
        );
        // The pass goes back too (#316): the session is told it is
        // the end, with the points that do not block it.
        assert_eq!(replies(&lines), 2, "a pass goes back to Claude");
        let (kind, to, text) = lines.sent.borrow().last().unwrap().clone();
        assert_eq!((kind.as_str(), to.as_str()), ("reply", "s1"));
        assert!(text.contains("审查出口：通过，结论：通过"), "{text}");
        assert!(text.contains("P2：日志少一行") && text.contains("P3：命名"));
        assert!(text.contains("这是终局") && text.contains("审查预算不再消耗"));
        assert!(text.contains("不需要再调用 relay_to_chatgpt"));
        assert!(!desk.drive(&lines, 10), "sent back once");
        assert_eq!(replies(&lines), 2);
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
            &json!({"type":"turn","phase":"complete","conversation":"c-new","reply":"还差一点\n结论：需修改","messageId":"m2","prompt":asked()}),
            7,
        );
        assert!(desk.drive(&lines, 8));
        let shown = desk.projection(8);
        assert_eq!(shown[0]["status"], "open", "the person decides");
        assert_eq!(shown[0]["auto"], false);
        assert_eq!(shown[0]["halt"], at_limit(2, Sent::Back));
        // The last answer goes back too, saying it is left to the person.
        assert_eq!(replies(&lines), 2);
        let text = last_sent(&lines).2;
        assert!(text.contains("还差一点") && text.contains("审查预算已用完"));
        assert!(text.contains("这是终局") && text.contains("交常浩决定"));
        assert!(!desk.drive(&lines, 8), "sent back once");
        // The person's button sends the same words: they went already.
        button_back_changes_nothing(&desk, &lines, &handoff.id, 9);
        // Every round used: turning it back on would do nothing, so it says
        // so instead of taking the click (#194).
        let refused = desk.act(&lines, &handoff.id, "resume", 10);
        assert_eq!(refused.err(), Some(no_rounds_left(2)));
        assert_eq!(desk.projection(10)[0]["auto"], false);

        let (_temp, desk) = self::desk();
        let lines = Fake::default();
        opened(&desk, &lines);
        desk.observe(&turn("complete", "看了，挺好"), 4);
        assert!(desk.drive(&lines, 5));
        assert_eq!(desk.projection(5)[0]["halt"], no_verdict(Sent::Back));
        assert_eq!(desk.projection(5)[0]["auto"], false);
        assert_eq!(replies(&lines), 1);
        let text = last_sent(&lines).2;
        assert!(text.contains("结论：未写") && text.contains("看了，挺好"));
        assert!(text.contains("先不要做") && text.contains("再调用 relay_to_chatgpt 送审"));
        assert!(text.contains("交常浩决定"));
        assert!(!desk.drive(&lines, 6), "sent back once");
        assert_eq!(replies(&lines), 1);
    }

    /// #316: the person's 「转回 Claude」 after an end went back by itself
    /// sends nothing more and writes nothing down: the same words, the
    /// same answer, no second step, its rounds and phase as they were.
    fn button_back_changes_nothing(desk: &Desk, lines: &Fake, id: &str, now: i64) {
        let before = desk.lock().get(id).cloned().unwrap();
        let sent = lines.sent.borrow().len();
        assert_eq!(desk.act(lines, id, "back", now), Ok(Acted::Done));
        let after = desk.lock().get(id).cloned().unwrap();
        assert_eq!(lines.sent.borrow().len(), sent, "nothing sent again");
        assert_eq!(after.steps.len(), before.steps.len(), "no second step");
        assert_eq!(
            (after.rounds, after.phase, after.halt.clone()),
            (before.rounds, before.phase, before.halt.clone())
        );
    }

    /// #316: each end left to the person goes back once, saying what Claude
    /// may do meanwhile and what not — never 「按意见处理」 beside 「等常浩」 —
    /// and the button afterwards changes nothing.
    #[test]
    fn an_end_left_to_the_person_goes_back_once_without_mixed_asks() {
        let ended = |desk: &Desk, lines: &Fake, id: &str| {
            assert!(desk.drive(lines, 5));
            let text = last_sent(lines).2;
            assert!(
                text.contains("这是终局") && text.contains("交常浩决定"),
                "{text}"
            );
            assert!(
                text.contains("现在可以做") && text.contains("先不要做"),
                "{text}"
            );
            assert!(
                !text.contains("按意见处理") && !text.contains("请先按意见"),
                "{text}"
            );
            assert!(!desk.drive(lines, 6), "sent back once");
            button_back_changes_nothing(desk, lines, id, 7);
            assert_eq!(replies(lines), 1);
        };
        // An engineering review: no verdict, and a way out that does not
        // go with its verdict.
        for reply in ["看了，挺好", "审查出口：通过\n结论：需修改"] {
            let (_temp, desk) = desk();
            let lines = Fake::default();
            let handoff = opened(&desk, &lines);
            desk.observe(&turn("complete", reply), 4);
            ended(&desk, &lines, &handoff.id);
        }
        // A 思维评审 whose last two lines do not hold.
        let (_temp, desk) = desk();
        let lines = Fake::default();
        let handoff = thinking(&desk, &lines);
        desk.observe(&turn("complete", "意见如上\n结论：通过"), 4);
        ended(&desk, &lines, &handoff.id);
        assert!(last_sent(&lines).2.contains("不要记成已定决策"));
    }

    /// #316: an end whose answer went into the queue of a quiet session
    /// says so, not that it went back; no background run takes it up; and
    /// once the plugin gives it up, the card says the session never had it,
    /// keeping why the handoff ended.
    #[test]
    fn an_end_queued_for_a_quiet_session_says_whether_it_arrived() {
        let quiet = || Fake {
            reply_fails: std::cell::Cell::new(2),
            ..Fake::default()
        };
        let later = 5 + handoffs::WAKE_AFTER_MS + 1;
        // A pass: it ends, its answer queued.
        let (_temp, desk) = desk();
        let lines = quiet();
        opened(&desk, &lines);
        desk.observe(&turn("complete", "P2：补注释\n结论：通过"), 4);
        assert!(desk.drive(&lines, 5));
        assert_eq!(sent_as(&lines, "queue").len(), 1);
        let shown = desk.projection(5);
        assert_eq!(shown[0]["status"], "closed");
        let last = |desk: &Desk, now| {
            desk.projection(now)[0]["steps"]
                .as_array()
                .unwrap()
                .last()
                .unwrap()
                .clone()
        };
        assert_eq!(last(&desk, 5)["text"], passed_back(Sent::Queued));
        lines.stopped.set(true);
        assert!(!desk.wake_queued(&lines, later), "no background run");
        assert!(sent_as(&lines, "wake").is_empty());
        let (prompt, _) = last_back(&desk, later);
        left_by(&lines, &prompt, "expired", None);
        assert!(desk.track(&lines, later));
        assert_eq!(last(&desk, later)["kind"], "fail");
        assert_eq!(last(&desk, later)["text"], end_undelivered("expired"));
        assert!(!desk.track(&lines, later + 1), "said once");

        // The last round: it stops for the person, its answer queued.
        let (_temp, desk) = self::desk();
        let lines = Fake::default();
        opened(&desk, &lines);
        desk.observe(&turn("complete", "结论：需修改"), 4);
        desk.drive(&lines, 5);
        desk.start(&lines, "s1", Some("/w"), "修登录", None, "第二轮", false, 6)
            .unwrap();
        desk.observe(
            &json!({"type":"turn","phase":"complete","conversation":"c-new","reply":"还差一点\n结论：需修改","messageId":"m2","prompt":asked()}),
            7,
        );
        lines.reply_fails.set(2);
        assert!(desk.drive(&lines, 8));
        assert_eq!(sent_as(&lines, "queue").len(), 1);
        let shown = desk.projection(8);
        assert_eq!(shown[0]["status"], "open");
        assert_eq!(shown[0]["halt"], at_limit(2, Sent::Queued));
        lines.stopped.set(true);
        let later = 8 + handoffs::WAKE_AFTER_MS + 1;
        assert!(!desk.wake_queued(&lines, later), "no background run");
        let (prompt, _) = last_back(&desk, later);
        left_by(&lines, &prompt, "expired", None);
        assert!(desk.track(&lines, later));
        let shown = desk.projection(later);
        assert_eq!(
            shown[0]["halt"],
            at_limit(2, Sent::Queued),
            "why it stopped stays"
        );
        assert_eq!(shown[0]["phase"], "replied", "the answer waits to go back");
        assert_eq!(last(&desk, later)["kind"], "fail");
        assert_eq!(last(&desk, later)["text"], undelivered("expired", None));
    }

    // #255 (L-14): the session ended once its turn was over, so its plugin
    // no longer checks in. Sending is refused twice; the words still wait in
    // its queue, which the plugin takes from when the session is opened.
    /// #280: a review Codex handed over gets ChatGPT's words back in its
    /// own thread, through Codex's queue, never Agent HUD's Claude plugin.
    #[test]
    fn words_back_to_a_codex_doer_go_into_its_thread() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        let rule = Rule {
            doer: Some(CODEX.to_owned()),
            ..Rule::default()
        };
        let Started::Opening { handoff, project } = desk
            .start_ruled(
                &lines,
                "t1",
                None,
                "修登录",
                None,
                "改动如下",
                false,
                &rule,
                1,
            )
            .unwrap()
        else {
            panic!("a first brief opens a conversation");
        };
        desk.open(&lines, &handoff.id, "改动如下", project.as_deref(), || 2)
            .unwrap();
        assert_eq!(
            desk.lock().get(&handoff.id).unwrap().doer.as_deref(),
            Some(CODEX)
        );
        desk.observe(&turn("complete", "1. 少一项\n结论：需修改"), 4);
        assert!(desk.drive(&lines, 5));
        let sent = lines.sent.borrow();
        let back = sent
            .iter()
            .find(|(kind, ..)| kind != "open" && kind != "send");
        let (kind, session, text) = back.expect("words went back");
        assert_eq!((kind.as_str(), session.as_str()), ("codex", "t1"));
        assert!(text.contains("少一项"));
    }

    /// A review Codex hands over, opened (#282), with `risk` if any.
    fn codex_opened(desk: &Desk, lines: &Fake, risk: Option<&str>) -> Handoff {
        let rule = Rule {
            doer: Some(CODEX.to_owned()),
            risk: risk.map(str::to_owned),
            ..Rule::default()
        };
        let Started::Opening { handoff, project } = desk
            .start_ruled(lines, "t1", None, "修登录", None, "改动", false, &rule, 1)
            .unwrap()
        else {
            panic!("a first brief opens a conversation");
        };
        desk.open(lines, &handoff.id, "改动", project.as_deref(), || 2)
            .unwrap();
        handoff
    }

    /// #282: the letters of a review Codex handed over fly between ChatGPT
    /// and Codex's mark, Codex standing where Claude stands.
    #[test]
    fn letters_fly_between_chatgpt_and_codex_for_a_codex_doer() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        let handoff = codex_opened(&desk, &lines, None);
        let sent = desk.tosses();
        assert_eq!(
            (sent[0].from.as_str(), sent[0].to.as_str()),
            ("codex", "chatgpt")
        );
        assert!(sent[0].from_left);
        assert_eq!(sent[0].lane, format!("relay:{}:codex", handoff.id));
        desk.observe(&turn("complete", "1. 少一项\n结论：需修改"), 4);
        let back = desk.tosses();
        assert_eq!(
            (back[0].from.as_str(), back[0].to.as_str()),
            ("chatgpt", "codex")
        );
    }

    /// #282: the timeline says Codex where a Codex review's words go back.
    #[test]
    fn a_codex_reviews_timeline_names_codex() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        let handoff = codex_opened(&desk, &lines, Some("L1"));
        desk.observe(&turn("complete", "1. 少一项\n结论：需修改"), 4);
        assert!(desk.drive(&lines, 5));
        let said = serde_json::to_string(&desk.projection(5)).unwrap();
        assert!(said.contains(&by_doer(&settled(), Some(CODEX))), "{said}");
        assert!(!said.contains("Claude"), "{said}");
        // A Claude review's words stay as they were.
        assert_eq!(by_doer(&settled(), None), settled());
        assert_eq!(
            desk.lock().get(&handoff.id).unwrap().doer.as_deref(),
            Some(CODEX)
        );
    }

    /// #282: 左滑发起 on a Codex thread leaves its words in Codex's queue
    /// under the swipe's code, and follows them there.
    #[test]
    fn a_swipe_on_a_codex_thread_goes_into_its_queue() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        assert_eq!(
            launch(&desk, &lines, CODEX, "t1", "review", 1).unwrap(),
            Launched::Queued
        );
        {
            let sent = lines.sent.borrow();
            assert_eq!(sent.len(), 1, "{sent:?}");
            assert_eq!((sent[0].0.as_str(), sent[0].1.as_str()), ("codex", "t1"));
            assert!(sent[0].2.contains("relay_to_chatgpt"));
        }
        let launches = desk.launches();
        let left = launches.get("t1").unwrap();
        assert_eq!(left.doer.as_deref(), Some(CODEX));
        assert_eq!(left.id, left.code);
        drop(launches);
        // Still waiting in the queue: the same swipe leaves nothing more.
        assert_eq!(
            launch(&desk, &lines, CODEX, "t1", "review", 2).unwrap(),
            Launched::AlreadyQueued
        );
        assert_eq!(lines.sent.borrow().len(), 1);
    }

    /// #283: words back to a Codex thread are followed by what they said,
    /// which its rollout shows a turn begun with once Codex started on them.
    #[test]
    fn words_back_to_a_codex_thread_are_followed_by_their_words() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        let handoff = codex_opened(&desk, &lines, None);
        desk.observe(&turn("complete", "1. 少一项\n结论：需修改"), 4);
        assert!(desk.drive(&lines, 5));
        let (prompt, delivery) = last_back(&desk, 5);
        assert_eq!(delivery, "waiting");
        let said = desk
            .lock()
            .get(&handoff.id)
            .unwrap()
            .steps
            .iter()
            .rev()
            .find(|s| s.kind == StepKind::Back)
            .and_then(|s| s.text.clone())
            .unwrap();
        assert!(said.contains("少一项"));
        left_by(&lines, &prompt, "started", None);
        assert!(desk.track(&lines, 6));
        assert_eq!(lines.words.borrow().last(), Some(&said));
        assert_eq!(last_back(&desk, 6).1, "started");
    }

    /// A review started without naming its doer stays Claude Code's.
    #[test]
    fn a_review_with_no_doer_named_is_claude_codes() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        let handoff = opened(&desk, &lines);
        assert_eq!(desk.lock().get(&handoff.id).unwrap().doer, None);
        desk.observe(&turn("complete", "结论：需修改"), 4);
        assert!(desk.drive(&lines, 5));
        assert_eq!(replies(&lines), 1);
    }

    #[test]
    fn words_back_to_a_claude_session_that_ended_wait_in_its_queue() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        opened(&desk, &lines);
        desk.observe(&turn("complete", "1. 少一项\n结论：需修改"), 4);
        let ended = Fake {
            unreachable: true,
            ..Fake::default()
        };
        assert!(desk.drive(&ended, 5));
        let sent = ended.sent.borrow();
        assert_eq!(sent.len(), 1, "{sent:?}");
        assert_eq!((sent[0].0.as_str(), sent[0].1.as_str()), ("queue", "s1"));
        assert!(sent[0].2.contains("少一项"));
        let shown = desk.projection(5);
        assert_eq!(shown[0]["phase"], "returned");
        assert_eq!(shown[0]["auto"], true, "still going by itself");
        assert_eq!(shown[0]["queuedAt"], 5);
        assert!(shown[0]["halt"].is_null());
        let steps = kinds(&desk, 5);
        let second = &shown[0]["steps"].as_array().unwrap()[steps.len() - 2];
        assert_eq!(
            second["text"],
            queued_instead("这个会话还没加载 Agent HUD 插件")
        );
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

        // A session Claude paused (its turn over, the plugin quiet): the
        // words wait in its queue and go in once it is opened (#72, L5 run 1).
        let (_temp, desk) = self::desk();
        let lines = Fake::default();
        lines.reply_fails.set(2);
        opened(&desk, &lines);
        desk.observe(&turn("complete", "结论：需修改"), 4);
        assert!(desk.drive(&lines, 5));
        assert_eq!(replies(&lines), 0);
        let left = lines
            .sent
            .borrow()
            .iter()
            .filter(|s| s.0 == "queue")
            .count();
        assert_eq!(left, 1, "queued for the session");
        let shown = desk.projection(5);
        assert_eq!(shown[0]["phase"], "returned");
        assert_eq!(shown[0]["auto"], true, "still going by itself");
        assert_eq!(shown[0]["queuedAt"], 5);
        let steps = kinds(&desk, 5);
        assert_eq!(
            steps[steps.len() - 3..],
            [
                ("fail".to_owned(), true),
                ("fail".to_owned(), true),
                ("back".to_owned(), true)
            ]
        );
        let shown = desk.projection(5);
        let second = &shown[0]["steps"].as_array().unwrap()[steps.len() - 2];
        assert_eq!(second["text"], queued_instead("会话的待发送目录写不进"));
        assert!(!desk.drive(&lines, 6), "queued once");
        // Claude hands the next round over: no longer waiting in the queue.
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
        assert!(desk.projection(7)[0].get("queuedAt").is_none());

        // Not even queued: left to the person.
        let (_temp, desk) = self::desk();
        let lines = Fake::default();
        lines.reply_fails.set(2);
        lines.leave_fails.set(true);
        opened(&desk, &lines);
        desk.observe(&turn("complete", "结论：需修改"), 4);
        assert!(desk.drive(&lines, 5));
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

        // Queued and never taken up within the hour: left to the person.
        let (_temp, desk) = self::desk();
        let lines = Fake::default();
        lines.reply_fails.set(2);
        opened(&desk, &lines);
        desk.observe(&turn("complete", "结论：需修改"), 4);
        desk.drive(&lines, 5);
        assert!(desk.projection(5 + handoffs::QUEUE_WAIT_MS)[0]["halt"].is_null());
        let shown = desk.projection(6 + handoffs::QUEUE_WAIT_MS);
        assert_eq!(shown[0]["halt"], no_wake());
        assert_eq!(shown[0]["phase"], "returned");
    }

    /// A 思维评审 handoff for session s1, open in c-new (#209).
    fn thinking(desk: &Desk, lines: &Fake) -> Handoff {
        let Started::Opening { handoff, project } = desk
            .start(
                lines,
                "s1",
                Some("/w"),
                "思维评审｜方案 A",
                Some("写了方案"),
                "送审包",
                false,
                1,
            )
            .unwrap()
        else {
            panic!("a first brief opens a conversation");
        };
        desk.open(lines, &handoff.id, "送审包", project.as_deref(), || 2)
            .unwrap();
        handoff
    }
    fn last_sent(lines: &Fake) -> (String, String, String) {
        lines.sent.borrow().last().unwrap().clone()
    }

    // T1
    #[test]
    fn a_thinking_review_that_settles_goes_back_to_claude_once_then_ends() {
        let reply = "1. 论证完整\n评审出口：成熟退出\n结论：通过";
        let (_temp, desk) = desk();
        let lines = Fake::default();
        thinking(&desk, &lines);
        desk.observe(&turn("complete", reply), 4);
        assert!(desk.drive(&lines, 5));
        assert_eq!(replies(&lines), 1);
        let (kind, to, text) = last_sent(&lines);
        assert_eq!((kind.as_str(), to.as_str()), ("reply", "s1"));
        assert!(text.contains(reply), "the answer in full");
        assert!(text.contains("评审出口：成熟退出，结论：通过") && text.contains("评审已收口"));
        let shown = desk.projection(5);
        assert_eq!(shown[0]["status"], "closed");
        assert_eq!(shown[0]["phase"], "ended");
        assert_eq!(
            shown[0]["steps"].as_array().unwrap().last().unwrap()["text"],
            thinking_closed()
        );
        let steps = kinds(&desk, 5);
        assert_eq!(
            steps[steps.len() - 2..],
            [("back".to_owned(), true), ("end".to_owned(), true)]
        );
        assert!(!desk.drive(&lines, 6), "sent once");
        assert_eq!(replies(&lines), 1);

        // 转其他路径 settles it too, with its own words.
        let (_temp, desk) = self::desk();
        let lines = Fake::default();
        thinking(&desk, &lines);
        desk.observe(&turn("complete", "评审出口：转其他路径\n结论：通过"), 4);
        assert!(desk.drive(&lines, 5));
        assert!(last_sent(&lines).2.contains("转其他路径"));
        assert_eq!(desk.projection(5)[0]["status"], "closed");

        // Queued for a paused session: it ends once the words wait there.
        let (_temp, desk) = self::desk();
        let lines = Fake::default();
        lines.reply_fails.set(2);
        thinking(&desk, &lines);
        desk.observe(&turn("complete", reply), 4);
        assert!(desk.drive(&lines, 5));
        let (kind, _, text) = last_sent(&lines);
        assert_eq!(kind, "queue");
        assert!(text.contains("评审已收口"));
        assert_eq!(desk.projection(5)[0]["status"], "closed");

        // Not even queued: not ended, left to the person.
        let (_temp, desk) = self::desk();
        let lines = Fake::default();
        lines.reply_fails.set(2);
        lines.leave_fails.set(true);
        thinking(&desk, &lines);
        desk.observe(&turn("complete", reply), 4);
        assert!(desk.drive(&lines, 5));
        let shown = desk.projection(5);
        assert_eq!(shown[0]["status"], "open");
        assert_eq!(shown[0]["phase"], "replied");
        assert_eq!(shown[0]["halt"], back_failed());
        assert!(!desk.drive(&lines, 6), "nothing more by itself");
        assert_eq!(desk.projection(6)[0]["status"], "open");
    }

    // T2
    #[test]
    fn a_thinking_review_quoting_an_old_pass_is_escalated_not_passed() {
        let reply = "上一轮写的是：\n结论：通过\n这一轮有分歧，要常浩定\n评审出口：决策升级\n结论：交常浩裁决";
        let (_temp, desk) = desk();
        let lines = Fake::default();
        thinking(&desk, &lines);
        desk.observe(&turn("complete", reply), 4);
        assert!(desk.drive(&lines, 5));
        assert_eq!(replies(&lines), 1);
        let text = last_sent(&lines).2;
        assert!(text.contains(reply) && text.contains("整理可选方案"));
        assert!(text.contains("不要再调用 relay_to_chatgpt"));
        let shown = desk.projection(5);
        assert_eq!(shown[0]["status"], "open", "not passed");
        assert_eq!(shown[0]["auto"], false);
        assert_eq!(shown[0]["halt"], escalated());
        let steps = shown[0]["steps"].as_array().unwrap();
        let answer = steps.iter().rev().find(|s| s["kind"] == "reply").unwrap();
        assert!(answer.get("verdict").is_none(), "no pass kept for the card");
        let steps = kinds(&desk, 5);
        assert_eq!(
            steps[steps.len() - 2..],
            [("back".to_owned(), true), ("stop".to_owned(), true)]
        );
        assert!(!desk.drive(&lines, 6));
        assert_eq!(replies(&lines), 1);
    }

    // T3
    #[test]
    fn a_thinking_review_short_of_evidence_pauses_for_it_then_goes_again() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        let handoff = thinking(&desk, &lines);
        desk.observe(
            &turn("complete", "缺数据\n评审出口：证据不足暂停\n结论：需修改"),
            4,
        );
        assert!(desk.drive(&lines, 5));
        assert_eq!(replies(&lines), 1);
        let text = last_sent(&lines).2;
        assert!(text.contains("先取证"));
        assert!(text.contains("拿到新证据前不要再调用 relay_to_chatgpt"));
        let shown = desk.projection(5);
        assert_eq!(shown[0]["status"], "open");
        assert_eq!(shown[0]["auto"], false, "not waiting for a re-review");
        assert_eq!(shown[0]["halt"], evidence_paused());
        // No re-review clock runs: hours on, it still says why it paused.
        let later = 5 + handoffs::FIX_WAIT_MS + handoffs::QUEUE_WAIT_MS;
        assert_eq!(desk.projection(later)[0]["halt"], evidence_paused());
        // Claude comes back with evidence: into the same handoff and conversation.
        let Started::Sent {
            handoff: again,
            repeated,
        } = desk
            .start(
                &lines,
                "s1",
                Some("/w"),
                "思维评审｜方案 A",
                Some("补了实验数据"),
                "新证据如下",
                false,
                later + 1,
            )
            .unwrap()
        else {
            panic!("goes into the open conversation");
        };
        assert!(!repeated);
        assert_eq!(again.id, handoff.id);
        assert_eq!(
            last_sent(&lines),
            ("send".into(), "c-new".into(), "新证据如下".into())
        );
        assert_eq!(desk.projection(later + 1)[0]["phase"], "delivered");
    }

    // Evidence brought back turns the auto round trip on again, and the
    // paused review does not count toward the rounds.
    #[test]
    fn a_thinking_review_goes_on_by_itself_once_claude_brings_the_evidence() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        let handoff = thinking(&desk, &lines);
        desk.observe(&turn("complete", "评审出口：证据不足暂停\n结论：需修改"), 4);
        desk.drive(&lines, 5);
        let evidence = |desk: &Desk, lines: &Fake, now: i64| {
            desk.start(
                lines,
                "s1",
                Some("/w"),
                "思维评审｜方案 A",
                Some("补了实验数据"),
                &format!("新证据 {now}"),
                false,
                now,
            )
            .unwrap();
        };
        evidence(&desk, &lines, 6);
        let shown = desk.projection(6);
        assert_eq!(shown[0]["auto"], true, "on again");
        assert!(shown[0]["halt"].is_null());
        assert_eq!(
            kinds(&desk, 6).last().unwrap(),
            &("resume".to_owned(), true)
        );
        let reply = "证据够了\n评审出口：成熟退出\n结论：通过";
        desk.observe(
            &json!({"type":"turn","phase":"complete","conversation":"c-new","reply":reply,"messageId":"m2","prompt":asked()}),
            7,
        );
        assert!(desk.drive(&lines, 8));
        assert_eq!(replies(&lines), 2);
        let text = last_sent(&lines).2;
        assert!(text.contains(reply) && text.contains("这次思维评审已收口"));
        assert!(!text.contains("驿窗随即结束"));
        assert_eq!(desk.projection(8)[0]["status"], "closed");
        let _ = handoff;

        // Two asks, one paused for evidence: 继续深化 still goes back by
        // itself, and the card can still turn it back on.
        let (_temp, desk) = self::desk();
        let lines = Fake::default();
        let handoff = thinking(&desk, &lines);
        desk.observe(&turn("complete", "评审出口：证据不足暂停\n结论：需修改"), 4);
        desk.drive(&lines, 5);
        evidence(&desk, &lines, 6);
        desk.observe(
            &json!({"type":"turn","phase":"complete","conversation":"c-new","reply":"评审出口：继续深化\n结论：需修改","messageId":"m2","prompt":asked()}),
            7,
        );
        assert!(desk.drive(&lines, 8));
        assert_eq!(desk.projection(8)[0]["phase"], "returned");
        assert_eq!(desk.projection(8)[0]["auto"], true);
        let used = desk.lock().get(&handoff.id).unwrap().rounds_used();
        assert_eq!(used, 1);

        // Paused by the person after the evidence pause: a new relay does
        // not override that.
        let (_temp, desk) = self::desk();
        let lines = Fake::default();
        let handoff = thinking(&desk, &lines);
        desk.observe(&turn("complete", "评审出口：证据不足暂停\n结论：需修改"), 4);
        desk.drive(&lines, 5);
        desk.act(&lines, &handoff.id, "resume", 6).unwrap();
        desk.act(&lines, &handoff.id, "pause", 7).unwrap();
        evidence(&desk, &lines, 8);
        assert_eq!(desk.projection(8)[0]["auto"], false);
    }

    // 再审一轮 asks for a 思维评审 handover, not an engineering one.
    #[test]
    fn a_thinking_review_asked_again_asks_for_its_way_out() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        let handoff = thinking(&desk, &lines);
        desk.observe(&turn("complete", "评审出口：继续深化\n结论：需修改"), 4);
        desk.act(&lines, &handoff.id, "pause", 5).unwrap();
        desk.act(&lines, &handoff.id, "again", 6).unwrap();
        let text = last_sent(&lines).2;
        assert!(text.contains("第 2 轮") && text.contains("「需深化」"));
        assert!(text.contains("评审出口：成熟退出 / 继续深化"));
        assert!(text.contains("结论：通过 / 需修改 / 交常浩裁决"));
        assert!(!text.contains("「结论：通过」或「结论：需修改」"));
    }

    // 继续深化: back with the deepening words, the clock on; at the limit, stops.
    #[test]
    fn a_thinking_review_to_deepen_goes_back_until_the_last_round() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        thinking(&desk, &lines);
        desk.observe(&turn("complete", "评审出口：继续深化\n结论：需修改"), 4);
        assert!(desk.drive(&lines, 5));
        let text = last_sent(&lines).2;
        assert!(text.contains("逐条处理") && text.contains("「需深化」"));
        assert!(text.contains("内容没有实质变化就不要重送"));
        let shown = desk.projection(5);
        assert_eq!(shown[0]["phase"], "returned");
        assert_eq!(shown[0]["auto"], true);
        desk.start(
            &lines,
            "s1",
            Some("/w"),
            "思维评审｜方案 A",
            Some("深化了一轮"),
            "第二阶段",
            false,
            6,
        )
        .unwrap();
        desk.observe(
            &json!({"type":"turn","phase":"complete","conversation":"c-new","reply":"评审出口：继续深化\n结论：需修改","messageId":"m2","prompt":asked()}),
            7,
        );
        assert!(desk.drive(&lines, 8));
        assert_eq!(desk.projection(8)[0]["halt"], at_limit(2, Sent::Back));
        assert_eq!(replies(&lines), 2, "the last round goes back too");
        let text = last_sent(&lines).2;
        assert!(text.contains("评审已用满 2 轮") && text.contains("交常浩决定"));
        assert!(!text.contains("交回 ChatGPT 评审"), "{text}");
    }

    // T8
    #[test]
    fn a_thinking_review_whose_last_two_lines_do_not_hold_goes_back_and_stops() {
        for (reply, flaw) in [
            ("看了，挺好", Flaw::NoVerdict),
            ("评审出口：成熟退出\n结论：通过\n以上。", Flaw::NoVerdict),
            ("评审出口：成熟退出\n结论：大体可以", Flaw::UnknownVerdict),
            ("评审出口：成熟退出\n结论：需修改", Flaw::Mismatch),
            ("意见如上\n结论：通过", Flaw::NoExit),
        ] {
            let (_temp, desk) = desk();
            let lines = Fake::default();
            thinking(&desk, &lines);
            desk.observe(&turn("complete", reply), 4);
            assert!(desk.drive(&lines, 5), "{reply}");
            assert_eq!(replies(&lines), 1, "{reply}");
            let text = last_sent(&lines).2;
            assert!(text.contains("驿窗认不出评审出口"), "{reply}");
            assert!(text.contains("交常浩决定"), "{reply}");
            let shown = desk.projection(5);
            assert_eq!(shown[0]["status"], "open", "{reply}");
            assert_eq!(shown[0]["phase"], "returned", "{reply}");
            assert_eq!(shown[0]["auto"], false, "{reply}");
            assert_eq!(shown[0]["halt"], invalid_tail(flaw, Sent::Back), "{reply}");
            assert!(!desk.drive(&lines, 6), "{reply}");
        }
    }

    // A 思维评审 that settled while nothing drove it is not ended unsent at
    // start: its auto round trip stays on across the restart, and the first
    // catch-up takes its answer to Claude, then ends it.
    #[test]
    fn a_thinking_review_that_settled_with_nothing_driving_it_reaches_claude_after_start() {
        let temp = tempfile::tempdir().unwrap();
        let data = temp.path().join("data");
        let mut book = handoffs::Book::default();
        let handoff = book.begin("s1", None, "思维评审|方案 A", None, "请评审", 1);
        book.opened(&handoff.id, "c1", 2);
        book.replied("c1", "评审出口：成熟退出\n结论：通过", Some("m1"), 4);
        handoffs::save(&data, &book).unwrap();
        let desk = Desk::new(Some(data));
        let shown = desk.projection(5);
        assert_eq!(shown[0]["status"], "open");
        assert_eq!(shown[0]["phase"], "replied");
        assert_eq!(shown[0]["auto"], true);
        assert!(shown[0]["halt"].is_null());
        let lines = Fake::default();
        assert!(desk.catch_up(&lines, 6));
        assert_eq!(replies(&lines), 1);
        assert_eq!(desk.projection(6)[0]["status"], "closed");
        assert!(!desk.catch_up(&lines, 7), "nothing left to drive");
        assert_eq!(replies(&lines), 1);
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
    fn a_review_that_passed_with_nothing_driving_it_ends_when_the_app_starts() {
        let temp = tempfile::tempdir().unwrap();
        let data = temp.path().join("data");
        let mut book = handoffs::Book::default();
        let handoff = book.begin("s1", None, "修登录", None, "请审核", 1);
        book.opened(&handoff.id, "c1", 2);
        assert!(book.stop(&handoff.id, "停", true, 3));
        book.replied("c1", "都改好了\n结论：通过", Some("m1"), 4);
        handoffs::save(&data, &book).unwrap();
        let desk = Desk::new(Some(data));
        let shown = desk.projection(5);
        assert_eq!(shown[0]["status"], "closed");
        assert_eq!(shown[0]["phase"], "ended");
    }

    #[test]
    fn a_restart_keeps_the_auto_round_trip_on_and_a_long_wait_stops_it() {
        let temp = tempfile::tempdir().unwrap();
        let data = temp.path().join("data");
        let lines = Fake::default();
        let desk = Desk::new(Some(data.clone()));
        opened(&desk, &lines);
        // An answer that came in just before the restart, not yet sent back.
        desk.observe(&turn("complete", "1. 要改\n结论：需修改"), 3);
        drop(desk);
        let desk = Desk::new(Some(data));
        let shown = desk.projection(4);
        assert_eq!(shown[0]["auto"], true);
        assert!(shown[0]["halt"].is_null());
        // It goes back to Claude once, and only once.
        assert!(desk.catch_up(&lines, 5));
        assert_eq!(replies(&lines), 1);
        assert!(!desk.catch_up(&lines, 6));
        assert_eq!(replies(&lines), 1);
        assert_eq!(desk.projection(6)[0]["phase"], "returned");

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
        // Nor a queue to wait in (#223).
        unreachable.leave_fails.set(true);
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
            launch(&desk, &lines, CLAUDE, "s1", "review", 1).unwrap(),
            Launched::Queued
        );
        assert_eq!(
            launch(&desk, &lines, CLAUDE, "s2", "discuss", 1).unwrap(),
            Launched::Queued
        );
        let sent = lines.sent.borrow().clone();
        assert_eq!(sent.len(), 2);
        assert_eq!((sent[0].0.as_str(), sent[0].1.as_str()), ("leave", "s1"));
        assert!(sent[0].2.contains("relay_to_chatgpt") && sent[0].2.contains("结论：通过"));
        assert!(sent[1].2.contains("relay_to_chatgpt") && sent[1].2.contains("不改代码"));
        // Kinds not open yet, a bad id, no way out: nothing is sent.
        assert!(launch(&desk, &lines, CLAUDE, "s3", "test", 1).is_err());
        assert!(launch(&desk, &lines, CLAUDE, "../x", "review", 1).is_err());
        let offline = Fake {
            offline: true,
            ..Fake::default()
        };
        assert!(launch(&desk, &offline, CLAUDE, "s3", "review", 1).is_err());
        let unreachable = Fake {
            unreachable: true,
            ..Fake::default()
        };
        assert!(launch(&desk, &unreachable, CLAUDE, "s3", "review", 1).is_err());
        assert!(offline.sent.borrow().is_empty() && unreachable.sent.borrow().is_empty());
        assert_eq!(lines.sent.borrow().len(), 2);
    }

    #[test]
    fn a_second_swipe_while_the_words_wait_leaves_nothing_more() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        left_as(&lines, Some("waiting"), None);
        launch(&desk, &lines, CLAUDE, "s1", "review", 1).unwrap();
        assert_eq!(
            launch(&desk, &lines, CLAUDE, "s1", "review", 2).unwrap(),
            Launched::AlreadyQueued
        );
        // Another kind for the same session waits too: one ask at a time.
        assert_eq!(
            launch(&desk, &lines, CLAUDE, "s1", "discuss", 2).unwrap(),
            Launched::AlreadyQueued
        );
        // Taken words wait for the session to be idle: still queued.
        left_as(&lines, Some("taken"), None);
        assert_eq!(
            launch(&desk, &lines, CLAUDE, "s1", "review", 3).unwrap(),
            Launched::AlreadyQueued
        );
        // In the session but no handoff yet: still asked, and said so.
        left_as(&lines, Some("started"), None);
        assert_eq!(
            launch(&desk, &lines, CLAUDE, "s1", "review", 4).unwrap(),
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
            launch(&desk, &lines, CLAUDE, "s1", "review", 6).unwrap(),
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
        assert!(launch(&desk, &lines, CLAUDE, "s1", "review", 1).is_err());
        assert_eq!(desk.launch_projection(&lines, 1), json!([]));
        lines.leave_fails.set(false);
        left_as(&lines, Some("waiting"), None);
        assert_eq!(
            launch(&desk, &lines, CLAUDE, "s1", "review", 2).unwrap(),
            Launched::Queued
        );
        // Another session is its own line.
        assert_eq!(
            launch(&desk, &lines, CLAUDE, "s2", "review", 2).unwrap(),
            Launched::Queued
        );
    }

    #[test]
    fn words_that_come_to_nothing_say_so_on_the_row_a_while() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        left_as(&lines, Some("waiting"), None);
        launch(&desk, &lines, CLAUDE, "s1", "review", 0).unwrap();
        left_as(&lines, Some("refused"), Some("session ended"));
        let shown = desk.launch_projection(&lines, 10);
        assert_eq!(shown[0]["state"], "refused");
        assert_eq!(shown[0]["reason"], "session ended");
        // A refusal can be swiped again at once.
        assert_eq!(
            launch(&desk, &lines, CLAUDE, "s1", "review", 11).unwrap(),
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
        launch(&desk, &lines, CLAUDE, "s3", "review", 0).unwrap();
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
        launch(&desk, &lines, CLAUDE, "s2", "review", 0).unwrap();
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
        // ChatGPT answers in full before `opened` does: the page shows
        // the brief it was opened with.
        shown("brief");
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
    fn every_turn_is_logged_with_what_became_of_it_but_not_its_words() {
        let (temp, desk) = desk();
        let lines = Fake::default();
        let Started::Opening { handoff, .. } = desk
            .start(&lines, "s1", None, "t", None, "brief", false, 1)
            .unwrap()
        else {
            panic!()
        };
        desk.observe(&turn("start", ""), 2);
        desk.open(&lines, &handoff.id, "brief", None, || 3).unwrap();
        // The empty placeholder of 2026-11-07, then the answer.
        desk.observe(&turn("complete", ""), 4);
        desk.observe(&turn("complete", "结论：通过"), 5);
        for i in 0..=EARLY_KEPT {
            desk.observe(
                &json!({"type":"turn","phase":"start","conversation":format!("own-{i}")}),
                6,
            );
        }
        let log = std::fs::read_to_string(turns_path(&temp.path().join("data"))).unwrap();
        assert!(!log.contains("结论"), "no words are logged");
        let lines: Vec<Value> = log
            .lines()
            .map(|line| serde_json::from_str(line).unwrap())
            .collect();
        let seen = |line: &Value| {
            (
                line["conversation"].as_str().unwrap().to_owned(),
                line["phase"].as_str().unwrap().to_owned(),
                line["outcome"].as_str().unwrap().to_owned(),
            )
        };
        let mine: Vec<_> = lines
            .iter()
            .filter(|l| l["conversation"] == "c-new")
            .map(seen)
            .collect();
        let row =
            |phase: &str, outcome: &str| ("c-new".to_owned(), phase.to_owned(), outcome.to_owned());
        assert_eq!(
            mine,
            [
                row("start", "early"),
                row("start", "caught-up"),
                row("complete", "unused"),
                row("complete", "taken"),
            ]
        );
        assert_eq!(lines[3]["replyChars"], 5);
        assert!(lines
            .iter()
            .any(|l| l["conversation"] == "own-0" && l["outcome"] == "evicted"));
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
                &json!({"type":"turn","phase":"complete","conversation":"c-new","reply":"结论：通过","messageId":"m2","prompt":asked()}),
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

    // #223: words that reached ChatGPT after the wait for them gave up
    // still count once the extension says so, and its answer is taken.
    #[test]
    fn words_sent_after_the_wait_gave_up_still_count() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        let handoff = opened(&desk, &lines);
        desk.observe(&turn("complete", "1. 少一项\n结论：需修改"), 3);
        desk.act(&lines, &handoff.id, "back", 3).unwrap();
        lines.send_fails.set(true);
        assert!(desk
            .start(&lines, "s1", None, "t", None, "第 2 轮改动", false, 4)
            .is_err());
        assert_eq!(desk.projection(4)[0]["phase"], "returned");
        let request = lines.requests.borrow().last().unwrap().clone();
        assert!(desk.observe(&json!({"type":"sent","requestId":request,"ok":true}), 5));
        let shown = desk.projection(5);
        assert_eq!(shown[0]["phase"], "delivered");
        assert_eq!(
            shown[0]["steps"].as_array().unwrap().last().unwrap()["kind"],
            "ask"
        );
        // Told twice, it counts once; Claude asking again sends nothing more.
        assert!(!desk.observe(&json!({"type":"sent","requestId":request,"ok":true}), 5));
        lines.send_fails.set(false);
        let Started::Sent { repeated, .. } = desk
            .start(&lines, "s1", None, "t", None, "第 2 轮改动", false, 6)
            .unwrap()
        else {
            panic!("round 2 goes into the same conversation")
        };
        assert!(repeated);
        // The answer that follows is the review's.
        assert!(desk.observe(
            &json!({"type":"turn","phase":"complete","conversation":"c-new","reply":"结论：通过","messageId":"m2","prompt":asked()}),
            7
        ));
        assert_eq!(desk.projection(7)[0]["phase"], "replied");
    }

    // #223: 转回 Claude by hand that cannot go into the session waits in its
    // queue, as the auto round trip's does.
    #[test]
    fn words_back_by_hand_that_cannot_go_in_wait_in_the_queue() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        let handoff = opened(&desk, &lines);
        desk.act(&lines, &handoff.id, "pause", 3).unwrap();
        desk.observe(&turn("complete", "1. 少一项\n结论：需修改"), 4);
        let unreachable = Fake {
            unreachable: true,
            ..Fake::default()
        };
        desk.act(&unreachable, &handoff.id, "back", 5).unwrap();
        let shown = desk.projection(5);
        assert_eq!(shown[0]["phase"], "returned");
        assert_eq!(shown[0]["queuedAt"], 5);
        {
            let sent = unreachable.sent.borrow();
            assert_eq!(sent.len(), 1);
            assert_eq!((sent[0].0.as_str(), sent[0].1.as_str()), ("queue", "s1"));
            assert!(sent[0].2.contains("少一项"));
        }
        // Clicked again, nothing more is queued.
        desk.act(&unreachable, &handoff.id, "back", 6).unwrap();
        assert_eq!(unreachable.sent.borrow().len(), 1);
        // A reply that fails is queued too.
        let (_temp, desk) = self::desk();
        let handoff = opened(&desk, &lines);
        desk.observe(&turn("complete", "结论：需修改"), 4);
        let failing = Fake::default();
        failing.reply_fails.set(1);
        desk.act(&failing, &handoff.id, "back", 5).unwrap();
        assert_eq!(desk.projection(5)[0]["queuedAt"], 5);
        assert_eq!(failing.sent.borrow()[0].0, "queue");
    }

    // #223: what a restart writes is in the language Settings name, though
    // Core has yet to follow it then.
    #[test]
    fn what_a_restart_writes_follows_the_language_setting() {
        let cases = [
            (
                "zh-CN",
                "驿窗重启时 ChatGPT 新会话还在打开",
                "结论：通过，自动结束接力",
            ),
            (
                "en",
                "PostPane restarted while the ChatGPT conversation was opening",
                "Passed; the handoff ended",
            ),
        ];
        for (language, cut_off, ended) in cases {
            let temp = tempfile::tempdir().unwrap();
            let data = temp.path().join("data");
            std::fs::create_dir_all(&data).unwrap();
            std::fs::write(
                data.join("settings.json"),
                json!({"settings":{"language":language},"providers":{}}).to_string(),
            )
            .unwrap();
            let mut book = handoffs::Book::default();
            let on = book.begin("s1", None, "修登录", None, "请审核", 1).id;
            book.opened(&on, "c1", 2);
            let opening = book.begin("s2", None, "别的", None, "请审核", 1).id;
            let passed = book.begin("s3", None, "第三个", None, "请审核", 1).id;
            book.opened(&passed, "c3", 2);
            book.stop(&passed, "停", true, 3);
            book.replied("c3", "结论：通过", Some("m1"), 4);
            handoffs::save(&data, &book).unwrap();
            let desk = Desk::new(Some(data));
            let book = desk.lock();
            assert!(book.get(&on).unwrap().auto, "a restart keeps it on");
            assert_eq!(book.get(&opening).unwrap().error.as_deref(), Some(cut_off));
            assert_eq!(
                book.get(&passed)
                    .unwrap()
                    .steps
                    .last()
                    .unwrap()
                    .text
                    .as_deref(),
                Some(ended)
            );
        }
    }

    // #223: 结束接力 while the review conversation is still opening waits
    // for it; ended before it opens, none is opened.
    #[test]
    fn ending_waits_for_the_conversation_to_open() {
        let (_temp, desk) = desk();
        let desk: &'static Desk = Box::leak(Box::new(desk));
        let mut lines = Fake::default();
        let Started::Opening { handoff, .. } = desk
            .start(&lines, "s1", None, "t", None, "brief", false, 1)
            .unwrap()
        else {
            panic!()
        };
        let id = handoff.id.clone();
        lines.on_open = Some(Box::new(move || {
            assert!(desk.act(&Fake::default(), &id, "end", 2).is_err());
        }));
        desk.open(&lines, &handoff.id, "brief", None, || 3).unwrap();
        assert_eq!(desk.projection(3)[0]["phase"], "delivered");
        desk.act(&lines, &handoff.id, "end", 4).unwrap();
        assert_eq!(desk.projection(4)[0]["phase"], "ended");
        // Ended before its opening began: nothing is opened.
        let lines = Fake::default();
        let Started::Opening { handoff, .. } = desk
            .start(&lines, "s9", None, "t", None, "brief", false, 5)
            .unwrap()
        else {
            panic!()
        };
        desk.act(&lines, &handoff.id, "end", 6).unwrap();
        assert!(desk.open(&lines, &handoff.id, "brief", None, || 7).is_err());
        assert!(lines.sent.borrow().is_empty());
    }

    const PR: &str = "PR：https://github.com/Natsukashii1997/dt-sandbox/pull/4";

    /// Starts an engineering review of `PR` from `session` at `risk`
    /// (#217); one that opens a conversation is opened.
    fn ruled(
        desk: &Desk,
        lines: &Fake,
        session: &str,
        risk: &str,
        extra: Option<&str>,
        now: i64,
    ) -> Result<Started, String> {
        let rule = Rule {
            risk: Some(risk.to_owned()),
            extra: extra.map(str::to_owned),
            doer: None,
        };
        let brief = format!("{PR}\n改动如下（{session} {now}）");
        let started = desk.start_ruled(
            lines,
            session,
            Some("/w"),
            "dt-sandbox｜SBX-8 原子写入",
            None,
            &brief,
            false,
            &rule,
            now,
        )?;
        if let Started::Opening { handoff, project } = &started {
            desk.open(lines, &handoff.id, &brief, project.as_deref(), || now)
                .unwrap();
        }
        Ok(started)
    }
    fn last_reply_to_claude(lines: &Fake) -> String {
        lines
            .sent
            .borrow()
            .iter()
            .rev()
            .find(|s| s.0 == "reply")
            .map(|s| s.2.clone())
            .unwrap_or_default()
    }

    #[test]
    fn an_engineering_review_takes_l1_to_l3_and_refuses_l0() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        assert_eq!(
            ruled(&desk, &lines, "s1", "L0", None, 1).err(),
            Some(l0_refused())
        );
        assert_eq!(
            ruled(&desk, &lines, "s1", "L4", None, 1).err(),
            Some(bad_risk("L4"))
        );
        assert!(desk.lock().list.is_empty(), "nothing began");
        // A 思维评审 takes no risk level, so none refuses it.
        let rule = Rule {
            risk: Some("L0".into()),
            extra: None,
            doer: None,
        };
        assert!(desk
            .start_ruled(
                &lines,
                "s2",
                None,
                "思维评审｜x｜y",
                None,
                "b",
                false,
                &rule,
                1
            )
            .is_ok());
        ruled(&desk, &lines, "s1", "l2", None, 1).unwrap();
        let shown = desk.projection(2);
        let ruled = shown
            .as_array()
            .unwrap()
            .iter()
            .find(|h| h["claudeSession"] == "s1")
            .unwrap();
        assert_eq!(ruled["risk"], "L2");
        assert_eq!(ruled["pr"], "natsukashii1997/dt-sandbox#4");
    }

    #[test]
    fn an_l1_revise_goes_back_to_close_without_another_review() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        ruled(&desk, &lines, "s1", "L1", None, 1).unwrap();
        desk.observe(&turn("complete", "1. 补一条 P2\n结论：需修改"), 3);
        assert!(desk.drive(&lines, 4));
        assert!(last_reply_to_claude(&lines).contains("补改未复审"));
        let shown = desk.projection(4);
        assert_eq!(shown[0]["status"], "closed", "it settled");
        assert_eq!(replies(&lines), 1);
    }

    #[test]
    fn a_review_past_its_budget_goes_only_with_the_persons_leave() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        ruled(&desk, &lines, "s1", "L2", None, 1).unwrap();
        desk.observe(&turn("complete", "1. 原子写入\n结论：需修改"), 3);
        desk.drive(&lines, 4);
        assert!(last_reply_to_claude(&lines).contains("最多 2 轮"));
        ruled(&desk, &lines, "s1", "L2", None, 5).unwrap();
        desk.observe(
            &json!({"type":"turn","phase":"complete","conversation":"c-new","reply":"还差\n结论：需修改","messageId":"m2","prompt":asked()}),
            6,
        );
        desk.drive(&lines, 7);
        assert_eq!(desk.projection(7)[0]["halt"], at_limit(2, Sent::Back));
        // A third review (#60) needs the person's leave.
        assert_eq!(
            ruled(&desk, &lines, "s1", "L2", None, 8).err(),
            Some(budget_spent(2))
        );
        let sends = lines.sent.borrow().len();
        let Started::Sent { handoff, .. } =
            ruled(&desk, &lines, "s1", "L2", Some("常浩要求再审一次"), 9).unwrap()
        else {
            panic!("it goes into the open conversation");
        };
        assert_eq!(lines.sent.borrow().len(), sends + 1);
        assert_eq!((handoff.extra, handoff.auto), (1, true));
    }

    #[test]
    fn a_follow_up_from_another_session_counts_on_from_the_first() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        ruled(&desk, &lines, "s1", "L2", None, 1).unwrap();
        desk.observe(&turn("complete", "1. 原子写入\n结论：需修改"), 3);
        // Round 2 from another Claude session (SBX-8): a new handoff that
        // carries round 1.
        let Started::Opening { handoff, .. } = ruled(&desk, &lines, "s2", "L2", None, 4).unwrap()
        else {
            panic!("another session opens its own");
        };
        assert_eq!(handoff.carried, 1);
        desk.observe(
            &json!({"type":"turn","phase":"complete","conversation":"c-new","reply":"还差\n结论：需修改","messageId":"m2","prompt":asked()}),
            5,
        );
        desk.drive(&lines, 6);
        let id = handoff.id.clone();
        let kept = desk.lock().get(&id).cloned().unwrap();
        assert_eq!(kept.halt.as_deref(), Some(at_limit(2, Sent::Back).as_str()));
        // The first session going on with its own handoff sees round 2.
        assert_eq!(
            ruled(&desk, &lines, "s1", "L2", None, 7).err(),
            Some(budget_spent(2))
        );
        // A third session gets nothing more without leave.
        assert_eq!(
            ruled(&desk, &lines, "s3", "L2", None, 7).err(),
            Some(budget_spent(2))
        );
        assert!(ruled(&desk, &lines, "s3", "L2", Some("常浩授权"), 8).is_ok());
    }

    #[test]
    fn an_engineering_review_short_of_evidence_pauses_then_goes_again() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        ruled(&desk, &lines, "s1", "L1", None, 1).unwrap();
        desk.observe(
            &turn(
                "complete",
                "缺复现日志\n审查出口：证据不足暂停\n结论：需修改",
            ),
            3,
        );
        assert!(desk.drive(&lines, 4));
        assert!(last_reply_to_claude(&lines).contains("证据不足"));
        assert_eq!(desk.projection(4)[0]["auto"], false);
        // The evidence goes without leave, and the auto round trip is on again.
        let Started::Sent { handoff, .. } = ruled(&desk, &lines, "s1", "L1", None, 5).unwrap()
        else {
            panic!("it goes into the open conversation");
        };
        assert!(handoff.auto);
        assert_eq!(handoff.counted(), 0, "the paused review is not counted");
        // A way out that does not go with its verdict stops it.
        desk.observe(
            &json!({"type":"turn","phase":"complete","conversation":"c-new","reply":"审查出口：通过\n结论：需修改","messageId":"m2","prompt":asked()}),
            6,
        );
        assert!(desk.drive(&lines, 7));
        assert_eq!(
            desk.projection(7)[0]["halt"],
            bad_review_tail(Flaw::Mismatch, Sent::Back)
        );
        let text = last_reply_to_claude(&lines);
        assert!(text.contains("审查出口与结论对不上") && text.contains("交常浩决定"));
    }

    /// #316: a pass goes back even with the auto round trip off (it
    /// ends the handoff all the same), and into a Codex thread for Codex.
    #[test]
    fn a_pass_goes_back_with_the_auto_round_trip_off_and_to_codex() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        let handoff = opened(&desk, &lines);
        desk.act(&lines, &handoff.id, "pause", 3).unwrap();
        desk.observe(&turn("complete", "P2：补注释\n结论：通过"), 4);
        assert!(desk.drive(&lines, 5));
        assert_eq!(desk.projection(5)[0]["status"], "closed");
        assert_eq!(replies(&lines), 1);
        assert!(last_sent(&lines).2.contains("P2：补注释"));

        let (_temp, desk) = self::desk();
        let lines = Fake::default();
        codex_opened(&desk, &lines, Some("L2"));
        desk.observe(&turn("complete", "审查出口：通过\n结论：通过"), 4);
        assert!(desk.drive(&lines, 5));
        let (kind, _, text) = last_sent(&lines);
        assert_eq!(kind, "codex");
        assert!(text.contains("这是终局"));
        assert_eq!(desk.projection(5)[0]["status"], "closed");
    }

    /// A pass that cannot reach Claude still ends, saying so, and is not
    /// tried again at the next turn.
    #[test]
    fn a_pass_that_cannot_go_back_ends_all_the_same() {
        let (_temp, desk) = desk();
        let lines = Fake {
            unreachable: true,
            leave_fails: std::cell::Cell::new(true),
            ..Fake::default()
        };
        opened(&desk, &lines);
        desk.observe(&turn("complete", "结论：通过"), 4);
        assert!(desk.drive(&lines, 5));
        let shown = desk.projection(5);
        assert_eq!(shown[0]["status"], "closed");
        let ended = shown[0]["steps"]
            .as_array()
            .unwrap()
            .last()
            .unwrap()
            .clone();
        assert_eq!(ended["text"], passed_back(Sent::Failed));
        assert!(!desk.drive(&lines, 6), "not tried again");
    }

    /// The newest step's id and delivery as the card has them.
    fn last_back(desk: &Desk, now: i64) -> (String, String) {
        let shown = desk.projection(now);
        let step = shown[0]["steps"]
            .as_array()
            .unwrap()
            .iter()
            .rev()
            .find(|step| step["kind"] == "back" || step["kind"] == "again")
            .unwrap()
            .clone();
        (
            step["prompt"].as_str().unwrap_or("").to_owned(),
            step["delivery"].as_str().unwrap_or("").to_owned(),
        )
    }

    /// #257: a step back to Claude goes under its own id, so triggered again
    /// — by the person, by the auto round trip, or after a restart that lost
    /// the record of it — it leaves no second copy.
    #[test]
    fn a_step_back_to_claude_leaves_one_copy_under_its_own_id() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        let handoff = opened(&desk, &lines);
        desk.observe(&turn("complete", "1. 要超时\n结论：需修改"), 4);
        assert!(desk.drive(&lines, 5));
        let (prompt, delivery) = last_back(&desk, 5);
        assert!(prompt.starts_with(&handoff.id), "{prompt}");
        assert_eq!(delivery, "waiting");
        assert_eq!(
            lines.prompts.borrow().as_slice(),
            [("s1".to_owned(), prompt.clone())]
        );
        desk.act(&lines, &handoff.id, "back", 6).unwrap();
        assert!(!desk.drive(&lines, 6));
        assert_eq!(replies(&lines), 1);

        // Words left before the record of them was kept (the app stopped
        // in between): the same step again finds them there and counts them
        // as sent, leaving nothing more.
        let (_temp, desk) = self::desk();
        let lines = Fake::default();
        let handoff = opened(&desk, &lines);
        desk.observe(&turn("complete", "1. 要超时\n结论：需修改"), 4);
        let prompt = desk
            .lock()
            .get(&handoff.id)
            .unwrap()
            .prompt_for(StepKind::Back);
        lines
            .prompts
            .borrow_mut()
            .push(("s1".to_owned(), prompt.clone()));
        desk.act(&lines, &handoff.id, "back", 5).unwrap();
        assert!(lines.sent.borrow().iter().all(|s| s.0 == "open"));
        assert_eq!(desk.projection(5)[0]["phase"], "returned");
        assert_eq!(last_back(&desk, 5).0, prompt);
    }

    /// #257: words back are followed as the plugin has them — waiting,
    /// taken, started — and the card's data says which; queued words taken
    /// no longer wait in the queue.
    #[test]
    fn words_back_to_claude_are_followed_until_its_turn_on_them_starts() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        opened(&desk, &lines);
        desk.observe(&turn("complete", "1. 少一项\n结论：需修改"), 4);
        let ended = Fake {
            unreachable: true,
            ..Fake::default()
        };
        assert!(desk.drive(&ended, 5));
        assert_eq!(desk.projection(5)[0]["queuedAt"], 5);
        let (prompt, delivery) = last_back(&desk, 5);
        assert_eq!(delivery, "waiting");
        assert!(!desk.track(&ended, 6), "still waiting");
        left_by(&ended, &prompt, "taken", None);
        assert!(desk.track(&ended, 7));
        assert_eq!(last_back(&desk, 7).1, "taken");
        let shown = desk.projection(7);
        assert!(shown[0]["queuedAt"].is_null(), "no longer queued");
        assert_eq!(shown[0]["phaseAt"], 7, "the wait for changes begins");
        left_by(&ended, &prompt, "started", None);
        assert!(desk.track(&ended, 8));
        assert_eq!(last_back(&desk, 8).1, "started");
        // The plugin's file gone a minute after: it stays started.
        ended.left_by.borrow_mut().clear();
        ended.prompts.borrow_mut().clear();
        assert!(!desk.track(&ended, 70_000));
        assert_eq!(last_back(&desk, 70_000).1, "started");
        assert_eq!(desk.projection(70_000)[0]["auto"], true);
    }

    /// #257: words the plugin gave up (expired, refused) leave the handoff
    /// to the person at once, saying why, not an hour on; sent again by
    /// hand, they go under a new id.
    #[test]
    fn words_back_the_plugin_gave_up_are_left_to_the_person_at_once() {
        let (_temp, desk) = desk();
        let lines = Fake {
            unreachable: true,
            ..Fake::default()
        };
        let handoff = opened(&desk, &Fake::default());
        desk.observe(&turn("complete", "1. 少一项\n结论：需修改"), 4);
        desk.drive(&lines, 5);
        let (prompt, _) = last_back(&desk, 5);
        left_by(&lines, &prompt, "expired", None);
        assert!(desk.track(&lines, 10));
        let shown = desk.projection(10);
        assert_eq!(shown[0]["phase"], "replied", "the answer waits again");
        assert_eq!(shown[0]["auto"], false);
        assert_eq!(shown[0]["halt"], undelivered("expired", None));
        assert!(shown[0]["queuedAt"].is_null());
        assert_eq!(last_back(&desk, 10).1, "expired");
        assert!(!desk.track(&lines, 11), "once");
        desk.act(&lines, &handoff.id, "back", 12).unwrap();
        let queued = lines
            .sent
            .borrow()
            .iter()
            .filter(|s| s.0 == "queue")
            .count();
        assert_eq!(queued, 2, "sent again");
        assert_eq!(
            last_back(&desk, 12),
            (format!("{prompt}-1"), "waiting".into())
        );

        // Refused: the plugin's reason is on the card.
        let (_temp, desk) = self::desk();
        let lines = Fake::default();
        opened(&desk, &lines);
        desk.observe(&turn("complete", "1. 少一项\n结论：需修改"), 4);
        desk.drive(&lines, 5);
        let (prompt, _) = last_back(&desk, 5);
        left_by(&lines, &prompt, "refused", Some("busy"));
        assert!(desk.track(&lines, 6));
        let shown = desk.projection(6);
        assert_eq!(shown[0]["halt"], undelivered("refused", Some("busy")));
        assert_eq!(last_back(&desk, 6).1, "refused");
    }

    /// #258: the person spoke up in the Claude session since words went
    /// back, and Claude handed over again: the auto rounds count from one,
    /// so the answer goes back by itself. Words of PostPane's own alone
    /// stop at the last round as before.
    #[test]
    fn the_rounds_count_from_one_once_the_person_spoke_up_in_claude() {
        let round_two = |opener: fn(&str) -> Opener| {
            let (temp, desk) = self::desk();
            let lines = Fake::default();
            opened(&desk, &lines);
            desk.observe(&turn("complete", "1. 要超时\n结论：需修改"), 4);
            desk.drive(&lines, 5);
            let back = lines.sent.borrow().last().unwrap().2.clone();
            *lines.opener.borrow_mut() = Some((opener(&back), 6));
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
                &json!({"type":"turn","phase":"complete","conversation":"c-new","reply":"1. 还差一点\n结论：需修改","messageId":"m2","prompt":asked()}),
                8,
            );
            desk.drive(&lines, 9);
            (temp, desk, lines)
        };
        // PostPane's words began Claude's turn: the last round, it stops.
        let (_temp, desk, lines) = round_two(|back| Opener::Plugin(back.to_owned()));
        let shown = desk.projection(9);
        assert_eq!(shown[0]["halt"], at_limit(2, Sent::Back));
        assert!(shown[0]["roundsFrom"].is_null());
        // It goes back as the end, left to the person (#316).
        assert_eq!(replies(&lines), 2);
        assert!(last_sent(&lines).2.contains("审查预算已用完"));
        // The person's own words began it: round one again, back it goes.
        let (_temp, desk, lines) = round_two(|_| Opener::Person);
        let shown = desk.projection(9);
        assert!(shown[0]["halt"].is_null(), "{}", shown[0]["halt"]);
        assert_eq!(shown[0]["phase"], "returned");
        assert_eq!(shown[0]["roundsFrom"], 4);
        assert_eq!(replies(&lines), 2);
        // Not told who began it: as before, it stops.
        let (_temp, desk, _lines) = {
            let (temp, desk) = self::desk();
            let lines = Fake::default();
            opened(&desk, &lines);
            desk.observe(&turn("complete", "1. 要超时\n结论：需修改"), 4);
            desk.drive(&lines, 5);
            desk.start(&lines, "s1", Some("/w"), "修登录", None, "第二轮", false, 7)
                .unwrap();
            desk.observe(
                &json!({"type":"turn","phase":"complete","conversation":"c-new","reply":"结论：需修改","messageId":"m2","prompt":asked()}),
                8,
            );
            desk.drive(&lines, 9);
            (temp, desk, lines)
        };
        assert_eq!(desk.projection(9)[0]["halt"], at_limit(2, Sent::Back));
    }

    fn sent_as(lines: &Fake, kind: &str) -> Vec<(String, String)> {
        lines
            .sent
            .borrow()
            .iter()
            .filter(|s| s.0 == kind)
            .map(|s| (s.1.clone(), s.2.clone()))
            .collect()
    }

    #[test]
    fn a_session_whose_process_stopped_is_run_in_the_background_with_the_answer() {
        let (_temp, desk) = desk();
        let lines = Fake {
            unreachable: true,
            ..Fake::default()
        };
        lines.stopped.set(true);
        let handoff = opened(&desk, &lines);
        desk.observe(&turn("complete", "1. 补测试\n结论：需修改"), 4);
        assert!(desk.drive(&lines, 5));
        assert_eq!(replies(&lines), 0);
        assert!(
            sent_as(&lines, "queue").is_empty(),
            "not queued: nothing runs to take it"
        );
        let woke = sent_as(&lines, "wake");
        assert_eq!(woke.len(), 1);
        assert_eq!(woke[0].0, format!("{}|s1", handoff.id));
        assert!(woke[0].1.contains("补测试") && woke[0].1.contains("relay_to_chatgpt"));
        let steps = kinds(&desk, 5);
        assert_eq!(
            steps[steps.len() - 2..],
            [("back".to_owned(), true), ("wake".to_owned(), true)]
        );
        let shown = desk.projection(5);
        assert_eq!(shown[0]["phase"], "returned");
        assert_eq!(shown[0]["auto"], true);
        assert_eq!(shown[0]["wakingSince"], 5);
        let steps_shown = shown[0]["steps"].as_array().unwrap();
        assert_eq!(steps_shown.last().unwrap()["text"], woke_stopped());
        // The run has the words: nothing waits with the plugin to follow.
        assert_eq!(last_back(&desk, 5).1, "started");
        assert!(!desk.track(&lines, 6));
        assert!(!desk.drive(&lines, 6), "run once");

        // The run ended and Claude handed the next round over: nothing to do.
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
        assert!(!desk.woke_up(&handoff.id, Ok(()), 8));
        assert!(desk.projection(8)[0].get("wakingSince").is_none());
    }

    #[test]
    fn a_background_run_that_cannot_start_or_ends_without_a_handover_is_left_to_the_person() {
        let (_temp, desk) = desk();
        let lines = Fake {
            unreachable: true,
            ..Fake::default()
        };
        lines.stopped.set(true);
        *lines.wake_fails.borrow_mut() = Some("权限模式是 default".into());
        opened(&desk, &lines);
        desk.observe(&turn("complete", "结论：需修改"), 4);
        assert!(desk.drive(&lines, 5));
        let shown = desk.projection(5);
        assert_eq!(shown[0]["auto"], false);
        assert_eq!(shown[0]["halt"], back_failed());
        let steps = kinds(&desk, 5);
        assert_eq!(
            steps[steps.len() - 2..],
            [("fail".to_owned(), true), ("stop".to_owned(), true)]
        );
        let fail = &shown[0]["steps"].as_array().unwrap()[steps.len() - 2];
        assert!(fail["text"]
            .as_str()
            .unwrap()
            .contains("权限模式是 default"));

        // It ran, but ended with Claude still on it: no handover came.
        let (_temp, desk) = self::desk();
        let lines = Fake {
            unreachable: true,
            ..Fake::default()
        };
        lines.stopped.set(true);
        let handoff = opened(&desk, &lines);
        desk.observe(&turn("complete", "结论：需修改"), 4);
        desk.drive(&lines, 5);
        assert!(desk.woke_up(&handoff.id, Err("exit 1".into()), 9));
        let shown = desk.projection(9);
        assert_eq!(shown[0]["auto"], false);
        assert!(shown[0].get("wakingSince").is_none());
        let steps = shown[0]["steps"].as_array().unwrap();
        assert_eq!(
            steps[steps.len() - 2]["text"],
            woke_without_handover(Some("exit 1"))
        );
        assert!(!desk.woke_up(&handoff.id, Ok(()), 10), "once");
    }

    #[test]
    fn queued_words_for_a_session_that_stays_quiet_are_taken_back_and_run_in_the_background() {
        let wake_at = 5 + handoffs::WAKE_AFTER_MS;
        let queued = || {
            let (temp, desk) = self::desk();
            let lines = Fake::default();
            lines.reply_fails.set(2);
            let handoff = opened(&desk, &lines);
            desk.observe(&turn("complete", "结论：需修改"), 4);
            assert!(desk.drive(&lines, 5));
            assert_eq!(desk.projection(5)[0]["queuedAt"], 5);
            (temp, desk, lines, handoff)
        };

        // Quiet, but not for long yet: it waits.
        let (_temp, desk, lines, handoff) = queued();
        lines.stopped.set(true);
        assert!(!desk.wake_queued(&lines, wake_at - 1));
        assert!(sent_as(&lines, "wake").is_empty());
        // Long enough: the queued words are taken back and Claude runs.
        let (prompt, delivery) = last_back(&desk, 5);
        assert_eq!(delivery, "waiting");
        assert_eq!(sent_as(&lines, "queue").len(), 1);
        assert!(desk.wake_queued(&lines, wake_at));
        assert_eq!(sent_as(&lines, "withdraw"), [("s1".to_owned(), prompt)]);
        let woke = sent_as(&lines, "wake");
        assert_eq!(woke.len(), 1);
        assert_eq!(woke[0].0, format!("{}|s1", handoff.id));
        let shown = desk.projection(wake_at);
        assert!(shown[0].get("queuedAt").is_none());
        assert_eq!(shown[0]["wakingSince"], wake_at);
        let steps = kinds(&desk, wake_at);
        assert_eq!(steps.last().unwrap(), &("wake".to_owned(), true));
        let backs = steps.iter().filter(|s| s.0 == "back").count();
        assert_eq!(backs, 1, "the words went back once");
        // Taken back, the plugin says cancelled: the run has them, so that
        // does not leave the handoff to the person (#257).
        assert_eq!(last_back(&desk, wake_at).1, "started");
        assert!(!desk.track(&lines, wake_at + 1));
        assert_eq!(desk.projection(wake_at + 1)[0]["auto"], true);
        assert!(!desk.wake_queued(&lines, wake_at + 1), "run once");

        // The session took the words meanwhile: `track` follows them, no run.
        let (_temp, desk, lines, _) = queued();
        lines.stopped.set(true);
        left_by(&lines, &last_back(&desk, 5).0, "taken", None);
        assert!(!desk.wake_queued(&lines, wake_at));
        assert!(sent_as(&lines, "withdraw").is_empty());
        assert!(sent_as(&lines, "wake").is_empty());

        // Never seen stopped (it may run without the plugin): it keeps waiting.
        let (_temp, desk, lines, _) = queued();
        assert!(!desk.wake_queued(&lines, wake_at));
        assert_eq!(desk.projection(wake_at)[0]["queuedAt"], 5);

        // The words could not be taken back: no second copy runs.
        let (_temp, desk, lines, _) = queued();
        lines.stopped.set(true);
        lines.withdraw_fails.set(true);
        assert!(!desk.wake_queued(&lines, wake_at));
        assert!(sent_as(&lines, "wake").is_empty());

        // Taken back, but the run cannot start: the answer waits for the
        // person, who can send it again.
        let (_temp, desk, lines, _) = queued();
        lines.stopped.set(true);
        *lines.wake_fails.borrow_mut() = Some("找不到会话记录".into());
        assert!(desk.wake_queued(&lines, wake_at));
        let shown = desk.projection(wake_at);
        assert_eq!(shown[0]["auto"], false);
        assert_eq!(shown[0]["phase"], "replied");
        assert!(shown[0].get("queuedAt").is_none());
        assert_eq!(last_back(&desk, wake_at).1, "cancelled");
        assert!(shown[0]["halt"]
            .as_str()
            .unwrap()
            .contains("找不到会话记录"));
    }

    #[test]
    fn the_background_run_takes_the_sessions_own_mode_model_and_effort() {
        let record = json!({"permissionMode":"auto","model":"claude-opus-5-5","effort":"high"});
        assert_eq!(
            wake_arguments("s1", &record, "意见").unwrap(),
            [
                "-p",
                "--resume",
                "s1",
                "--permission-mode",
                "auto",
                "--model",
                "claude-opus-5-5",
                "--effort",
                "high",
                "意见"
            ]
        );
        assert_eq!(
            wake_arguments("s1", &json!({"permissionMode":"acceptEdits"}), "意见").unwrap(),
            [
                "-p",
                "--resume",
                "s1",
                "--permission-mode",
                "acceptEdits",
                "意见"
            ]
        );
        // Nobody is there to allow a tool.
        for mode in [json!("default"), json!("plan"), Value::Null] {
            assert!(wake_arguments("s1", &json!({"permissionMode": mode}), "意见").is_err());
        }
    }

    /// #175 with #280: only a Claude Code session runs in the background; a
    /// Codex thread that cannot take the words now keeps them in its queue.
    #[test]
    fn a_codex_doer_is_never_run_as_a_claude_session() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        lines.stopped.set(true);
        lines.reply_fails.set(2);
        let rule = Rule {
            doer: Some(CODEX.to_owned()),
            ..Rule::default()
        };
        let Started::Opening { handoff, project } = desk
            .start_ruled(
                &lines,
                "t1",
                None,
                "修登录",
                None,
                "改动如下",
                false,
                &rule,
                1,
            )
            .unwrap()
        else {
            panic!("a first brief opens a conversation");
        };
        desk.open(&lines, &handoff.id, "改动如下", project.as_deref(), || 2)
            .unwrap();
        desk.observe(&turn("complete", "1. 少一项\n结论：需修改"), 4);
        assert!(desk.drive(&lines, 5));
        assert!(sent_as(&lines, "wake").is_empty());
        assert_eq!(sent_as(&lines, "codex").len(), 1, "queued for Codex");
        assert_eq!(desk.projection(5)[0]["queuedAt"], 5);
        let later = 5 + handoffs::WAKE_AFTER_MS;
        assert!(!desk.wake_queued(&lines, later));
        assert!(sent_as(&lines, "withdraw").is_empty());
        assert!(sent_as(&lines, "wake").is_empty());
    }

    // #356: a finished turn whose word was lost leaves the handoff waiting;
    // the conversation is read again after three quiet minutes, every two.
    #[test]
    fn a_quiet_review_is_read_again_and_its_answer_taken_once() {
        use super::reread::{AGAIN_MS, QUIET_MS};
        let (temp, desk) = desk();
        let lines = Fake::default();
        let handoff = opened(&desk, &lines);
        let at = desk.lock().get(&handoff.id).unwrap().phase_at;
        assert_eq!(desk.reread(&lines, at + QUIET_MS - 1), 0, "not quiet yet");
        assert_eq!(desk.reread(&lines, at + QUIET_MS), 1);
        assert_eq!(
            lines.sent.borrow().last().unwrap(),
            &("reread".into(), "c-new".into(), String::new())
        );
        let first = at + QUIET_MS;
        assert_eq!(desk.reread(&lines, first + AGAIN_MS - 1), 0, "asked lately");
        assert_eq!(desk.reread(&lines, first + AGAIN_MS), 1);
        // The app started again: what the last one asked is not kept, and
        // the phase began before, so the conversation is read at once.
        let restarted = Desk::new(Some(temp.path().join("data")));
        assert_eq!(restarted.reread(&lines, first + AGAIN_MS + 1), 1);
        // ChatGPT starts: three minutes from now on.
        let started = first + AGAIN_MS + 2;
        assert!(desk.observe(&turn("start", ""), started));
        assert_eq!(desk.reread(&lines, started + QUIET_MS - 1), 0);
        assert_eq!(desk.reread(&lines, started + QUIET_MS), 1);
        // The answer told again is taken, once by its message id.
        let told = json!({"type":"turn","phase":"complete","conversation":"c-new",
            "reply":"1. 少一项\n结论：需修改","messageId":"m9","reread":true,"prompt":asked()});
        let answered = started + QUIET_MS + 1;
        assert!(desk.observe(&told, answered));
        assert!(!desk.observe(&told, answered + 1), "the same answer twice");
        let book = desk.lock();
        let kept = book.get(&handoff.id).unwrap();
        assert_eq!(kept.phase, Phase::Replied);
        let replies = kept.steps.iter().filter(|s| s.kind == StepKind::Reply);
        assert_eq!(replies.count(), 1);
        drop(book);
        // Answered: nothing to read again.
        let quiet = answered + QUIET_MS + AGAIN_MS;
        let asked = sent_as(&lines, "reread").len();
        assert_eq!(desk.reread(&lines, quiet), 0);
        assert_eq!(sent_as(&lines, "reread").len(), asked);
    }

    // #356: with no extension connected there is no one to ask.
    #[test]
    fn a_quiet_review_is_not_read_again_without_the_extension() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        let handoff = opened(&desk, &lines);
        let at = desk.lock().get(&handoff.id).unwrap().phase_at;
        let offline = Fake {
            offline: true,
            ..Fake::default()
        };
        let late = at + super::reread::QUIET_MS;
        assert_eq!(desk.reread(&offline, late), 0);
        assert!(sent_as(&offline, "reread").is_empty());
        // Once connected it is asked at once: the miss did not count.
        assert_eq!(desk.reread(&lines, late + 1), 1);
    }

    // #356 P1-01: the review's answer went unreported and the person chatted
    // on in the same conversation; their own turn's answer is not the
    // review's, nor one whose prompt could not be read. The review's answer,
    // read again, still counts.
    #[test]
    fn another_prompts_answer_is_not_taken_as_the_review() {
        let (temp, desk) = desk();
        let lines = Fake::default();
        let handoff = opened(&desk, &lines);
        let review = asked();
        let theirs = json!({"type":"turn","phase":"complete","conversation":"c-new",
            "prompt":"顺便问一下，周末天气怎么样？","reply":"晴。","messageId":"a4"});
        assert!(!desk.observe(&theirs, 3));
        let unread = json!({"type":"turn","phase":"complete","conversation":"c-new",
            "prompt":null,"reply":"1. 少一项\n结论：需修改","messageId":"a5"});
        assert!(!desk.observe(&unread, 4));
        assert_eq!(
            desk.lock().get(&handoff.id).unwrap().phase,
            Phase::Delivered
        );
        let log = std::fs::read_to_string(turns_path(&temp.path().join("data"))).unwrap();
        assert_eq!(log.matches("\"outcome\":\"unmatched\"").count(), 2);
        let ours = json!({"type":"turn","phase":"complete","conversation":"c-new",
            "prompt":review,"reply":"1. 少一项\n结论：需修改","messageId":"a3","reread":true});
        assert!(desk.observe(&ours, 5));
        assert_eq!(desk.lock().get(&handoff.id).unwrap().phase, Phase::Replied);
    }

    // #356 P1-01 (round 2): the words are held to as far as they are kept,
    // not their first hundred characters: a prompt of the person's own that
    // starts like them is not the review's, a long brief still is.
    #[test]
    fn a_prompt_counts_only_as_the_whole_words_kept() {
        let complete = |prompt: &str, id: &str| {
            json!({"type":"turn","phase":"complete","conversation":"c-new",
                "prompt":prompt,"reply":"1. 少一项\n结论：需修改","messageId":id})
        };
        let open = |desk: &Desk, lines: &Fake, brief: &str| {
            let Started::Opening { handoff, .. } = desk
                .start(lines, "s1", Some("/w"), "t", None, brief, false, 1)
                .unwrap()
            else {
                panic!("a first brief opens a conversation")
            };
            desk.open(lines, &handoff.id, brief, None, || 2).unwrap();
            handoff
        };
        let phase = |desk: &Desk, id: &str| desk.lock().get(id).unwrap().phase;
        // Short words: the same start and more after is another prompt.
        let (_one, first) = desk();
        let lines = Fake::default();
        let short = open(&first, &lines, "检查这个 PR");
        assert!(!first.observe(&complete("检查这个 PR，顺便看看命名", "a4"), 3));
        assert!(
            first.observe(&complete("检查 这个PR", "a3"), 4),
            "spaces aside"
        );
        assert_eq!(phase(&first, &short.id), Phase::Replied);
        // Long words sharing their first hundred characters and more.
        let common = "共同的开头".repeat(30);
        let (_two, second) = desk();
        let lines = Fake::default();
        let shared = open(&second, &lines, &format!("{common}\n只看 A"));
        assert!(!second.observe(&complete(&format!("{common}\n只看 B"), "b4"), 3));
        assert_eq!(phase(&second, &shared.id), Phase::Delivered);
        // Words past what a step keeps: held to the kept start.
        let long = format!("{}\n末尾这段不在摘录里", "长".repeat(700));
        let (_three, third) = desk();
        let lines = Fake::default();
        let cut = open(&third, &lines, &long);
        assert!(!third.observe(&complete(&"长".repeat(500), "c4"), 3));
        assert!(third.observe(&complete(&long, "c3"), 4));
        assert_eq!(phase(&third, &cut.id), Phase::Replied);
    }

    // A brief naming code: the page draws `Desk::open` as code, so the prompt
    // it reports has no backticks. Still the review's; another prompt is not.
    #[test]
    fn a_prompt_drawn_without_its_inline_code_marks_is_still_the_review() {
        let complete = |prompt: &str, id: &str| {
            json!({"type":"turn","phase":"complete","conversation":"c-new",
                "prompt":prompt,"reply":"1. 少一项\n结论：需修改","messageId":id})
        };
        let open = |desk: &Desk, lines: &Fake, brief: &str| {
            let Started::Opening { handoff, .. } = desk
                .start(lines, "s1", Some("/w"), "t", None, brief, false, 1)
                .unwrap()
            else {
                panic!("a first brief opens a conversation")
            };
            desk.open(lines, &handoff.id, brief, None, || 2).unwrap();
            handoff
        };
        let phase = |desk: &Desk, id: &str| desk.lock().get(id).unwrap().phase;
        // Short words, kept in full.
        let (_one, first) = desk();
        let lines = Fake::default();
        let short = open(&first, &lines, "看 `Desk::open` 当场失败那条");
        assert!(!first.observe(&complete("看 Desk::open 当场失败那条，顺便看命名", "a4"), 3));
        assert!(first.observe(&complete("看 Desk::open 当场失败那条", "a3"), 4));
        assert_eq!(phase(&first, &short.id), Phase::Replied);
        // Long words, held to the kept start.
        let long = format!("{}\n末尾这段不在摘录里", "改了 `Book::expire`。".repeat(60));
        let (_two, second) = desk();
        let lines = Fake::default();
        let cut = open(&second, &lines, &long);
        assert!(second.observe(&complete(&long.replace('`', ""), "b3"), 3));
        assert_eq!(phase(&second, &cut.id), Phase::Replied);
    }

    // #356 P2-04: a handoff with no words kept cannot be held to them; its
    // conversation's turns are not taken.
    #[test]
    fn a_handoff_with_no_words_kept_takes_no_answer() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        let handoff = opened(&desk, &lines);
        desk.lock()
            .list
            .iter_mut()
            .for_each(|h| h.steps.retain(|step| step.kind != StepKind::Ask));
        assert!(!desk.observe(&turn("complete", "1. 少一项\n结论：需修改"), 3));
        assert_eq!(
            desk.lock().get(&handoff.id).unwrap().phase,
            Phase::Delivered
        );
    }

    // #356 P2-03: connected when checked, the read did not get through; it
    // is tried again in seconds, not after the two minutes of one that did.
    #[test]
    fn a_read_again_that_did_not_get_through_is_tried_again_soon() {
        use super::reread::{AGAIN_MS, QUIET_MS, RETRY_MS};
        let (_temp, desk) = desk();
        let lines = Fake::default();
        let handoff = opened(&desk, &lines);
        let late = desk.lock().get(&handoff.id).unwrap().phase_at + QUIET_MS;
        lines.reread_fails.set(true);
        assert_eq!(desk.reread(&lines, late), 0);
        assert_eq!(
            desk.reread(&lines, late + RETRY_MS - 1),
            0,
            "not every refresh"
        );
        lines.reread_fails.set(false);
        assert_eq!(desk.reread(&lines, late + RETRY_MS), 1);
        assert_eq!(desk.reread(&lines, late + RETRY_MS + AGAIN_MS - 1), 0);
        assert_eq!(
            sent_as(&lines, "reread").len(),
            2,
            "one failed try, one passed on"
        );
    }
}
