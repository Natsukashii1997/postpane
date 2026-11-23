//! Relay 1c (docs/chatgpt-channel.md, 1c 接力): a Claude Code session hands
//! its work to a ChatGPT conversation for review, and words go back and forth
//! between the two. The host owns the handoffs because it holds both ways
//! out: the ChatGPT extension's channel and Agent HUD's Claude Code plugin.
//! Started by Claude (the `relay_to_chatgpt` local tool); the HUD's handoff
//! card moves it on (`handoff_act`). Each step is kept (book.rs), and
//! the ChatGPT channel tells the desk when ChatGPT starts and finishes.
use crate::extension::Flight;
use crate::handoff::book::{
    by_doer, Book, Delivery, Handoff, Next, Notice, Phase, Risk, Status, Step, StepKind,
};
use agent_hud_runtime::chatgpt::SendFailed;
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
    /// The review chain it goes on with, when named (#347).
    pub(crate) chain: Option<String>,
    /// The commit under review, when named; else the brief's (#347).
    pub(crate) head: Option<String>,
}
use agent_hud_runtime::l10n;
use serde_json::{json, Value};
use std::{
    collections::{HashMap, HashSet},
    path::PathBuf,
    sync::{Condvar, Mutex, MutexGuard},
};
use tauri::Manager;

#[path = "handoff/sending/desk_asking.rs"]
mod asking;
#[path = "handoff/back/desk.rs"]
mod back;
#[path = "handoff/answers/desk_belongs.rs"]
mod belongs;
pub(crate) mod book;
#[path = "handoff/answers/desk_driver.rs"]
mod driver;
#[path = "handoff/gate/desk.rs"]
mod gate;
#[path = "handoff/gate/desk_guard.rs"]
mod guard;
#[path = "handoff/back/desk_held.rs"]
mod held;
#[path = "handoff/sending/desk_lines.rs"]
mod lines;
#[path = "handoff/notice/desk.rs"]
mod notice;
#[path = "handoff/answers/desk_reread.rs"]
mod reread;
pub mod settings;
#[path = "handoff/back/desk_texts.rs"]
mod texts;
#[path = "handoff/answers/desk_undrawn.rs"]
mod undrawn;
use back::back_text;
use lines::AppLines;
#[path = "handoff/back/desk_wake.rs"]
mod wake;
use texts::*;
use wake::{wake_failed, woke_stopped};

/// Claude Code's source id: the doer of a handoff that names none. Words go
/// back into a Claude session or a Codex thread (#280).
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
    /// `title` and asked as `request`: its id, and ChatGPT's id of the
    /// prompt the words went in as when the page showed it (#410).
    fn open(
        &self,
        text: &str,
        project: Option<&str>,
        title: &str,
        request: &str,
    ) -> Result<(String, Option<String>), String>;
    /// Sends `text` into `conversation`, asked as `request`: the prompt it
    /// went in as, as for `open`. The extension may still say it went in
    /// after the wait gave up (`Desk::observe`).
    fn send(
        &self,
        conversation: &str,
        text: &str,
        request: &str,
    ) -> Result<Option<String>, SendFailed>;
    /// Asks the extension to tell `conversation`'s newest reply again, once
    /// written (#356); it comes back, if at all, as a turn (`observe`).
    fn reread(&self, conversation: &str) -> Result<(), String>;
    /// Asks whether the words sent as `request` are in `conversation` (#509).
    fn find(&self, conversation: &str, request: &str, after: Option<&str>) -> Result<(), String>;
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
    /// A pull request's current commit, 「owner/repo#n」 (#347).
    fn pr_head(&self, pr: &str) -> Result<String, String>;
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
const LAUNCH_LIFETIME_MS: i64 =
    agent_hud_runtime::claude_plugin::PROMPT_LIFETIME.as_millis() as i64;

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
    reread_at: Mutex<HashMap<String, (i64, u32)>>,
    /// How many reads in a row found each handoff's answer undrawn (#457).
    undrawn: Mutex<HashMap<String, u32>>,
    /// When the notices began (`notices_since`): trouble from before is not
    /// told of (#318), so an upgrade tells no session of an old one.
    since: i64,
    /// How many sessions are being told of trouble now (#318): the book's
    /// other changes wait till they are (`quiet`), so what a notice checked
    /// still holds when it arrives (review P2-03).
    telling: Mutex<usize>,
    told_out: Condvar,
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
    /// The cap, commit and pull request they go with: kept once they go
    /// in, not before (L3 P2-08).
    anchor: Anchor,
}

/// What a review is asked against (#347): the cap as set, the commit and
/// the pull request.
#[derive(Clone, Default)]
struct Anchor {
    limit: u32,
    head: Option<String>,
    pr: Option<String>,
}

impl Anchor {
    fn set(&self, book: &mut Book, id: &str) {
        book.set_limit(id, self.limit);
        book.set_head(id, self.head.as_deref());
        if let Some(pr) = &self.pr {
            book.set_pr(id, pr);
        }
    }
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
        let mut book = data.as_deref().map(book::load).unwrap_or_default();
        // What a restart writes below comes before Core follows the
        // Language setting (#223).
        let chinese = data.as_deref().map_or_else(l10n::chinese, stored_chinese);
        // Swipes still waiting when the app stopped wait on.
        let launches: HashMap<String, Launch> = data
            .as_deref()
            .and_then(|data| std::fs::read(launches_path(data)).ok())
            .and_then(|bytes| serde_json::from_slice(&bytes).ok())
            .unwrap_or_default();
        let now = now_ms();
        let since = data
            .as_deref()
            .map_or(now, |data| book::notices_since(data, now));
        let desk = |book: Book| Self {
            data,
            since,
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
            undrawn: Mutex::new(HashMap::new()),
            telling: Mutex::new(0),
            told_out: Condvar::new(),
        };
        // Not `||`: both are to happen.
        let interrupted = book.interrupted(now, &interrupted(chinese));
        let woke = book.restarted();
        // Open ones from before the review gate move over, counts kept (#347).
        let adopted = book.adopt(now);
        // Reviews sent and not known to have gone in (L3 P1-10).
        let unconfirmed = book.pending_at_restart(&guard::pending_at_restart(chinese), now);
        // Reviews that passed while nothing drove them (the auto round trip
        // off) end now, as a pass coming in would (owner, 2026-11-07). Not a
        // 思维评审 one (#209): its answer has to reach Claude first, so it
        // waits, paused, for the person.
        let passed_ids = book
            .list
            .iter()
            // One whose commit is to be checked against its pull request
            // waits for the round trip, which checks it first (#347).
            .filter(|h| !h.thinking() && h.next() == Some(Next::Pass))
            .filter(|h| h.pr.is_none() && h.gate.head.is_none() && !h.unsure())
            .map(|h| h.id.clone())
            .collect::<Vec<_>>();
        let mut ended = false;
        for id in &passed_ids {
            book.note(id, Notice::Passed, now);
            ended |= book.passed(id, &passed(chinese), now);
        }
        if interrupted | woke | ended | adopted | unconfirmed {
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
        let _quiet = self.quiet();
        let mut book = self.lock();
        let result = change(&mut book);
        if let Some(data) = &self.data {
            book::slim_kept(data, &mut book);
            if let Err(error) = book::save(data, &book) {
                agent_hud_runtime::note!("{error}");
            }
        }
        result
    }
    /// Waits till no session is being told of trouble (#318); held while
    /// the book changes.
    fn quiet(&self) -> MutexGuard<'_, usize> {
        let telling = self.telling.lock().unwrap_or_else(|p| p.into_inner());
        self.told_out
            .wait_while(telling, |telling| *telling > 0)
            .unwrap_or_else(|p| p.into_inner())
    }
    /// The ChatGPT project new review conversations open in.
    pub(crate) fn project(&self) -> Option<String> {
        self.data.as_deref().and_then(book::project)
    }
    pub(crate) fn set_project(&self, text: &str) -> Result<Option<String>, String> {
        let data = self.data.as_deref().ok_or_else(demo)?;
        book::set_project(data, text)
    }
    /// The snapshot's `handoffs`: the live ones and those that failed or
    /// ended lately, without their briefs.
    pub(crate) fn projection(&self, now: i64) -> Value {
        self.late(now);
        let book = self.lock();
        let shown = book
            .list
            .iter()
            .filter(|handoff| book.in_sight(handoff, now, FAILED_SHOWN_MS))
            .map(Handoff::shown)
            .collect::<Vec<_>>();
        json!(shown)
    }

    /// Openings that took too long fail, and auto round trips waited on too
    /// long stop. Whether any did.
    fn late(&self, now: i64) -> bool {
        let late = {
            let _quiet = self.quiet();
            let mut book = self.lock();
            book.expire(now, &timed_out())
                | book.overdue(now, &no_answer(), &no_wake())
                | book.idle(now, &idle_end())
        };
        if late {
            self.change(|_| ());
        }
        late
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
    /// the extension (no line) or to the desk (a line that says why); what
    /// each read again found is there too (`heard_reread`, #457).
    fn note_turn(&self, message: &Value, at: i64, outcome: &str) {
        self.append_turn(&json!({
            "at": at,
            "conversation": message["conversation"],
            "phase": message["phase"],
            "messageId": message["messageId"],
            "replyChars": message["reply"].as_str().map(|r| r.chars().count()),
            "outcome": outcome,
        }));
    }
    /// Adds `line` to `chatgpt/turns.jsonl`, moved aside once it grew too big.
    fn append_turn(&self, line: &Value) {
        use std::io::Write;
        let Some(data) = &self.data else { return };
        let path = turns_path(data);
        if std::fs::metadata(&path).is_ok_and(|m| m.len() > TURNS_KEPT) {
            let _ = std::fs::rename(&path, path.with_extension("old.jsonl"));
        }
        let written = std::fs::create_dir_all(agent_hud_runtime::chatgpt::folder(data))
            .and_then(|()| {
                std::fs::OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open(&path)
            })
            .and_then(|mut file| writeln!(file, "{line}"));
        if let Err(error) = written {
            agent_hud_runtime::note!("ChatGPT turn log {}: {error}", path.display());
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
            agent_hud_runtime::note!("Relay launches {}: {error}", path.display());
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
        let engineering = !book::thinking(title);
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
            .filter(|text| !text.is_empty());
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
        let expired = {
            let _quiet = self.quiet();
            self.lock().expire(now, &timed_out())
        };
        if expired {
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
                        self.ask(
                            lines,
                            handoff,
                            &conversation,
                            summary,
                            brief,
                            extra,
                            rule,
                            now,
                        )
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
        // A review of a pull request, or a review chain, reviewed before
        // counts on (#217, #347); a chain named must be known.
        let pr = engineering.then(|| book::pull_request(brief)).flatten();
        let chain = rule
            .chain
            .as_deref()
            .map(str::trim)
            .filter(|c| !c.is_empty() && engineering);
        if let Some(chain) = chain.filter(|c| self.lock().chain_last(c).is_none()) {
            return Err(gate::chain_unknown(chain));
        }
        let earlier = self.lock().earlier("", pr.as_deref(), chain);
        // Its chain's handoff still with ChatGPT: that answer would come
        // uncounted once this one took over (P1-04).
        if let Some(e) = &earlier {
            if self.lock().get(&e.id).is_some_and(Handoff::in_flight) {
                return Err(guard::chain_busy(&e.chain, &e.id));
            }
        }
        let carried = earlier.as_ref().map_or(0, |earlier| earlier.period);
        let limit = self.review_limit();
        let past = carried >= limit;
        if past && extra.is_none() {
            return Err(budget_spent(carried));
        }
        // Leave past the cap goes only with words from outside the agent,
        // since the chain last went back (#347 P1-06).
        let turn = || lines.opener(rule.doer.as_deref().unwrap_or(CLAUDE), session);
        if let Some(earlier) = earlier.as_ref().filter(|_| past) {
            if !self.lock().leave_spoken(&earlier.id, turn().as_ref()) {
                return Err(leave_unheard());
            }
        }
        // A cap reached here and not settled: no new review of its kind here
        // without the person's word, whatever chain it names (P1-08; a 思维
        // 评审 too, round 4 P1-13).
        if !past {
            let top = self
                .lock()
                .unsettled_top(session, cwd, !engineering)
                .and_then(|t| {
                    let other = earlier.as_ref().is_none_or(|e| e.id != t.id);
                    let named = t.gate.chain.clone().unwrap_or_else(|| t.title.clone());
                    other.then(|| (t.id.clone(), named))
                });
            if let Some((top, chain)) = top {
                if !self.lock().leave_spoken(&top, turn().as_ref()) {
                    return Err(guard::top_unsettled(&chain));
                }
            }
        }
        let head = self.head(rule, brief);
        if engineering {
            Self::head_needed(pr.as_deref(), head.as_deref())?;
        }
        let handoff = self.change(|book| {
            let handoff = book.begin(session, cwd, &title, summary, brief, now);
            if let Some(doer) = rule.doer.as_deref() {
                book.set_doer(&handoff.id, doer);
            }
            if engineering {
                book.rule(&handoff.id, risk, pr.as_deref(), chain);
                book.set_head(&handoff.id, head.as_deref());
            }
            book.set_limit(&handoff.id, limit);
            if let Some(reason) = extra.filter(|_| past) {
                book.allow_extra(&handoff.id, reason, now);
            }
            // Which round it is, and the chain's newest problem ledger (#347).
            let carry = self.carry(book, &handoff.id);
            book.extend_brief(&handoff.id, &carry);
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
        rule: &Rule,
        now: i64,
    ) -> Result<Started, String> {
        // The cap and the commit as set now (#347).
        let head = self.head(rule, brief);
        // The pull request this brief names, else the one bound before:
        // one named now binds the handoff to it, and goes with its commit
        // (P1-02).
        let pr = (!handoff.thinking())
            .then(|| book::pull_request(brief).or_else(|| handoff.pr.clone()))
            .flatten();
        if !handoff.thinking() {
            Self::head_needed(pr.as_deref(), head.as_deref())?;
        }
        let limit = self.review_limit();
        // Checked and noted as they would go; kept only once they go in
        // (L3 P2-08): a refusal or a send that fails leaves the handoff's.
        let anchor = Anchor { limit, head, pr };
        let ahead = || {
            let mut book = self.lock().clone();
            anchor.set(&mut book, &handoff.id);
            book
        };
        // The same words again (a retry after a slow answer) are not sent
        // twice; they went with PostPane's note (#347).
        let noted = format!("{brief}{}", self.carry(&ahead(), &handoff.id));
        if self.lock().asked_already(&handoff.id, &noted) {
            return Ok(Started::Sent {
                handoff,
                repeated: true,
            });
        }
        // Words never known to have gone in (L3 P1-10): the same words again
        // are not sent twice, and no others go while they wait.
        let unanswered = self
            .lock()
            .get(&handoff.id)
            .and_then(|h| h.unanswered().map(|p| p.same(&noted)));
        if unanswered == Some(true) {
            return Ok(Started::Sent {
                handoff,
                repeated: true,
            });
        }
        // Its review with ChatGPT still, or another answer being written.
        self.unheld(lines, &handoff.id, conversation, now)?;
        // Evidence a 思维评审 paused for (#209): it goes on by itself again.
        let evidence = self
            .lock()
            .get(&handoff.id)
            .is_some_and(Handoff::waits_for_evidence);
        // An engineering review past its budget goes only with the
        // person's leave (#217).
        let (spent, counted) = {
            let book = ahead();
            let counted = book.pr_counted(&handoff.id);
            // A 思维评审 too (Fable review #9): one cap, kept by PostPane.
            let spent = book.get(&handoff.id).is_some_and(|h| counted >= h.budget());
            // Evidence a review paused for goes on by itself, yet never past
            // the cap as set now (P2-06).
            (spent, counted)
        };
        if spent && extra.is_none() {
            return Err(budget_spent(counted));
        }
        // Leave goes only with words from outside the agent (#347 P1-06);
        // they may have begun the count again already (#258), and the
        // leave still goes on the card and turns the round trip back on.
        let heard = extra.is_some() && {
            let doer = handoff.doer.as_deref().unwrap_or(CLAUDE);
            let turn = lines.opener(doer, &handoff.claude_session);
            self.lock().leave_spoken(&handoff.id, turn.as_ref())
        };
        if spent && !heard {
            return Err(leave_unheard());
        }
        if let Some(reason) = extra.filter(|_| heard) {
            self.change(|book| book.allow_extra(&handoff.id, reason, now));
        }
        // Which round it is, and the newest problem ledger (#347).
        let brief = &format!("{brief}{}", self.carry(&ahead(), &handoff.id));
        // Kept until they go in: the extension may only say so after the
        // wait gave up (`observe`, #223).
        let request = format!("{}~send{now}", handoff.id);
        // Named by its request, so an earlier round's words never pass for
        // these (round 4 P1-11).
        let sent = &book::tagged(&request, brief);
        // Kept, on disk, before it goes, so a restart before word of it
        // cannot let an answer pass (L3 P1-10): not kept, not sent; nor
        // when the handoff ended meanwhile (round 5 P1-18).
        let kept = self.change_kept(|book| {
            book.ask_pending(
                &handoff.id,
                book::Pending {
                    request: request.clone(),
                    pr: anchor.pr.clone(),
                    head: anchor.head.clone(),
                    limit: anchor.limit,
                    words: Some(sent.to_owned()),
                    ..Default::default()
                },
            )
        })?;
        if !kept {
            return Err(guard::moved_meanwhile());
        }
        self.asking().insert(
            handoff.id.clone(),
            Asking {
                request: request.clone(),
                summary: summary.map(str::to_owned),
                brief: sent.to_owned(),
                evidence,
                anchor: anchor.clone(),
            },
        );
        let asked_id = match lines.send(conversation, sent, &request) {
            Ok(asked_id) => asked_id,
            // Send never pressed (#466): they are not there, and may go again.
            Err(SendFailed::NotPressed(error)) => {
                return Err(self.not_sent(&handoff.id, &request, &error, now));
            }
            // Never known to have gone in: the round trip stops on it, and
            // its answer, if one comes, cannot pass (L3 P1-10). The caller
            // hears it now, so no notice besides.
            Err(SendFailed::Unsure(error)) => {
                self.change(|book| {
                    book.unconfirmed(&handoff.id, &guard::send_unconfirmed(), false, now)
                });
                return Err(guard::sent_unknown(&error));
            }
        };
        self.went_in(&request, now, asked_id.as_deref());
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
        let opened = {
            // Held while it opens, so 结束接力 waits for it (#223).
            let _opening = self.claim(id)?;
            let (title, request, kept) = self
                .lock()
                .get(id)
                .filter(|h| h.status == Status::Opening)
                .map(|h| (h.title.clone(), h.request(), h.brief.clone()))
                .ok_or_else(|| l10n::text("这次接力已经结束", "This handoff has ended"))?;
            // The words as kept: with PostPane's note on a chain's round
            // (#347), the same words its 「ask」 step records and an answer
            // is held to (#356).
            let brief = kept.as_deref().unwrap_or(brief);
            let opened = lines.open(brief, project, &title, &request);
            self.change(|book| match &opened {
                Ok((conversation, asked_id)) => {
                    book.opened(id, conversation, now()) | book.asked_as(id, asked_id.as_deref())
                }
                Err(error) => book.failed(id, error, now()),
            });
            opened.map(|(conversation, _)| conversation)
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
        let (prompt, prompt_id) = (message["prompt"].as_str(), message["promptId"].as_str());
        let id = self
            .lock()
            .for_conversation(conversation)
            .map(|h| h.id.clone());
        // Another turn's answer is not this review's (#356 P1-01): checked
        // under the same hold as it is taken, so no words sent in between
        // make an answer to the earlier ones count for them. Every answer
        // kept in full (#347), in the same change as it is booked: nothing
        // cuts it between (L3 P2-10).
        self.change(|book| {
            if !belongs::fits(book, conversation, prompt, prompt_id) {
                return false;
            }
            let took = book.replied(conversation, reply, message_id, at);
            if let Some(id) = id.filter(|_| took) {
                self.keep_answer(book, &id, reply);
            }
            took
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
                self.lock().heard_writing(conversation, message, now);
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
                let request = message["requestId"].as_str().unwrap_or("");
                self.went_in(request, now, message["promptId"].as_str())
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
                let asked_id = message["promptId"].as_str();
                let bound = gave_up
                    && self.change(|book| {
                        book.opened_late(request, conversation, now) && {
                            book.asked_as(id, asked_id);
                            true
                        }
                    });
                if bound {
                    self.caught_up(conversation);
                }
                bound
            }
            (Some("reread"), _) => self.heard_reread(message, now),
            (Some("found"), _) => self.heard_found(message, now),
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
                // A pass goes back as the auto round trip sends it: checked
                // against the pull request's commit, and ended only when it
                // holds (P1-09).
                if action == "back" && handoff.next() == Some(Next::Pass) {
                    // Done, or done meanwhile by another way; else say it
                    // did not go (L3 P2-09).
                    let still = || self.lock().get(id).and_then(Handoff::next) == Some(Next::Pass);
                    return if self.auto_back(lines, id, Next::Pass, now) || !still() {
                        Ok(Acted::Done)
                    } else {
                        Err(guard::back_not_done())
                    };
                }
                let (kind, text) = if action == "back" {
                    let reply = handoff
                        .last_reply()
                        .and_then(|step| step.text.clone())
                        .ok_or_else(|| {
                            l10n::text("ChatGPT 还没回信", "ChatGPT has not answered yet")
                        })?;
                    (
                        StepKind::Back,
                        self.back_words(lines, &handoff, &reply, false).0,
                    )
                } else {
                    let round = handoff.counted() + 1;
                    let text = if handoff.thinking() {
                        thinking_again_text(round)
                    } else {
                        again_text(round)
                    };
                    (StepKind::Again, text)
                };
                self.hand_back(lines, &handoff, kind, &text, false, now)?;
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
            changed |= if next == Next::Format {
                self.ask_format(lines, &id, now)
            } else {
                self.auto_back(lines, &id, next, now)
            };
        }
        let held = self
            .lock()
            .list
            .iter()
            .filter(|h| h.held_answer())
            .map(|h| h.id.clone())
            .collect::<Vec<_>>();
        for id in held {
            changed |= self.hand_held(lines, &id, now);
        }
        changed
    }
    /// Drives the answers that wait to go on (#72) when nothing else did:
    /// one that came in just before a restart, or while no word from the
    /// extension followed. Only when there is one, so the sidebar's refresh
    /// can call it every time. Whether anything changed.
    pub(crate) fn catch_up(&self, lines: &dyn Lines, now: i64) -> bool {
        let waiting = self
            .lock()
            .list
            .iter()
            .any(|h| h.next().is_some() || h.held_answer());
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
        // A pass holds only while the commit reviewed is the pull
        // request's still (#347): else it goes back and stops.
        let (text, blocked) = self.back_words(lines, &handoff, &reply, false);
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
        let then = |book: &mut Book, how: Sent| match (next, &blocked) {
            // Set right by the current commit sent again: it goes on.
            (_, Some(held)) if held.resend => true,
            (_, Some(held)) => book.stop(id, &named(gate::stale(&held.why, how)), true, now),
            (Next::Pass | Next::Close, _) => {
                book.note(id, Notice::Passed, now);
                let pass = next == Next::Pass;
                let words = if pass {
                    passed_back(how)
                } else {
                    thinking_closed()
                };
                book.passed(id, &named(words), now)
            }
            // Another commit than the one sent: the current one sent again
            // goes on (Fable review #8).
            (Next::Stale, _) => true,
            (Next::Pause, _) => book.stop(id, &named(evidence_paused()), true, now),
            (Next::Escalate, _) => book.stop(id, &named(escalated()), true, now),
            (Next::Limit, _) => {
                book.note(id, Notice::Top, now);
                book.stop(id, &named(at_limit(handoff.budget(), how)), true, now)
            }
            (Next::NoVerdict, _) => book.stop(id, &named(no_verdict(how)), true, now),
            (Next::BadTail(flaw), _) => {
                book.stop(id, &named(bad_review_tail(flaw, how)), true, now)
            }
            (Next::Invalid(flaw), _) => book.stop(id, &named(invalid_tail(flaw, how)), true, now),
            (Next::Back | Next::Format, _) => true,
        };
        // Could not reach Claude: the ends this round trip added end or
        // stop all the same, saying so — a pass ends with the auto round
        // trip off too, so stopping it would leave it tried at every turn;
        // the rest stop for the person as before.
        let goes_on = blocked.as_ref().is_some_and(|held| held.resend);
        let give_up = |book: &mut Book| match next {
            _ if goes_on => book.stop(id, &named(back_failed()), true, now),
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
        "请把按意见修改后的改动交回 ChatGPT 复审（第 {round} 轮）：调用 relay_to_chatgpt，brief 写这轮改了什么、对应哪几条意见、diff 或 PR 链接，head 填改完的提交，{REVIEW_TAIL}；summary 写一句这轮改了什么。"
    )
}
/// What an engineering review's answer is asked to end with, as the
/// relay tool says (#347): its ledger and four last lines.
const REVIEW_TAIL: &str = "请 ChatGPT 按严重程度列问题、给出「## 问题台账」，回信最后四行依次写「受审版本：<SHA>」「未决：P0 n，P1 n」「审查出口：通过 / 返修 / 证据不足暂停 / 决策升级」「结论：通过 / 需修改」";
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
        "review" => "请把这一轮的工作交给 ChatGPT 审核：先自己整理背景——任务名与目标、改了什么和为什么、分支和 PR 链接、改动本身（git diff，太长写摘要加关键片段）、希望重点看哪里——然后调用 relay_to_chatgpt 送出（有 PR 时 head 填受审提交），按工具说明请 ChatGPT 按严重程度列问题、给出「## 问题台账」，回信最后四行依次写「受审版本」「未决」「审查出口」「结论」；summary 写一句这轮做了什么。",
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
/// background (L-14), conversations ChatGPT went quiet in read again
/// (#356), and sessions told of trouble before any answer (#318).
pub(crate) fn projection(app: &tauri::AppHandle, desk: &Desk) -> Value {
    let now = now_ms();
    let lines = AppLines(app);
    if !desk.catch_up(&lines, now) {
        desk.track(&lines, now);
    }
    desk.wake_queued(&lines, now);
    desk.reread(&lines, now);
    desk.tell(&lines, now);
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
    let (heard, driven, shown) = (app.clone(), app.clone(), app.clone());
    channel.listen(std::sync::Arc::new(driver::hearing(
        move |message| {
            let desk = heard.try_state::<Desk>();
            desk.is_some_and(|desk| desk.observe(message, now_ms()))
        },
        // An answer that came in goes on by itself (#72).
        move || {
            if let Some(desk) = driven.try_state::<Desk>() {
                desk.drive(&AppLines(&driven), now_ms());
            }
        },
        move || republish(&shown),
    )));
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
        chain: params["chain"].as_str().map(str::to_owned),
        head: params["head"].as_str().map(str::to_owned),
    };
    // Sent or refused alike, the extension may not be this app's (#493).
    let note = super::chatgpt::version_note(app);
    let note = note.as_deref();
    let mut answer = start(app, &session, cwd, title, summary, brief, false, &rule)
        .map_err(|error| super::chatgpt::noted(&error, note))?;
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
    // The review chain it counts on (#347): name it when going on with the
    // same acceptance goal from another pull request or session.
    let chain = answer["handoffId"]
        .as_str()
        .and_then(|id| app.try_state::<Desk>()?.lock().get(id)?.gate.chain.clone());
    answer["chain"] = json!(chain);
    // Paused by the person still: its answer comes back all the same (#410).
    let paused = answer["handoffId"]
        .as_str()
        .and_then(|id| Some(app.try_state::<Desk>()?.lock().get(id)?.paused_by_person()))
        .unwrap_or(false);
    let gate = held::relay_gate(paused);
    answer["message"] = json!(if answer["status"] == "repeated" {
        l10n::text(
            "这段内容刚才已经送到 ChatGPT，还没回信，没有再送一次；回信会出现在驿窗侧栏。",
            "These words already reached ChatGPT and await an answer; they were not sent again. The answer shows in PostPane's sidebar.",
        )
    } else if answer["status"] == "sent" {
        format!(
            "{}{gate}",
            l10n::text(
                "已送进这个会话对应的 ChatGPT 审核会话。",
                "Sent into this session's ChatGPT review conversation. "
            )
        )
    } else {
        format!(
            "{}{gate}",
            l10n::text(
                "已交给 ChatGPT 审核：新会话正在打开。",
                "Handed to ChatGPT for review: a new conversation is opening. "
            )
        )
    });
    let message = super::chatgpt::noted(answer["message"].as_str().unwrap_or(""), note);
    answer["message"] = json!(message);
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

#[cfg(test)]
mod tests;
