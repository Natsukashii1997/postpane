//! What the handoff tests share: `Fake`, the lines that write down what was
//! sent and answer as told, and the helpers that open a desk and a review.
//! The tests themselves are in `tests/`, a file to a subject.
mod asked_id;
mod back_early;
mod background_run;
mod book_states;
mod codex;
mod driver;
mod ended_tabs;
mod find_tell;
mod finding;
mod held_back;
mod letters;
mod mend_late;
mod mend_unsent;
mod not_pressed;
mod opening;
mod page_changed;
mod read_again;
mod review_gate;
mod round_trip;
mod swipes;
mod thinking;
mod told;
mod undrawn;
mod unreadable_prompt;
mod unsure;
mod words_back;
mod writing;

use super::notice::{not_told, told as told_back, told_queued};
use super::wake::woke_without_handover;
use super::*;
use crate::claude_wake::wake_arguments;
use crate::handoff::book::Flaw;
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
    on_reply: Option<Box<dyn Fn()>>,
    /// What happens while a conversation is being opened.
    on_open: Option<Box<dyn Fn()>>,
    /// What happens while who began the session's turn is read.
    on_opener: Option<Box<dyn Fn()>>,
    /// Sending gives up waiting for the extension.
    send_fails: std::cell::Cell<bool>,
    /// The extension says send was never pressed (#466).
    send_unpressed: std::cell::Cell<bool>,
    /// The prompt id the page shows words went in as (#410); none by default.
    asked_as: RefCell<Option<String>>,
    /// The request each sending was asked as.
    requests: RefCell<Vec<String>>,
    /// The prompt each look for words was to look past (#509 round 1 P1-01).
    afters: RefCell<Vec<Option<String>>>,
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
    /// Whose turns were asked about: `doer|session`.
    opener_asked: RefCell<Vec<String>>,
    /// The words each look at words left was asked with (#283).
    words: RefCell<Vec<String>>,
    /// The session's process stopped (L-14).
    stopped: std::cell::Cell<bool>,
    /// Queued words cannot be taken back (the session took them).
    withdraw_fails: std::cell::Cell<bool>,
    /// Running Claude Code in the background fails, and why.
    wake_fails: RefCell<Option<String>>,
    /// Pull requests' current commits, as GitHub would say (#347).
    heads: RefCell<HashMap<String, Result<String, String>>>,
    /// Passing a read-again on to the extension fails (#356).
    reread_fails: std::cell::Cell<bool>,
    /// Passing a look on to the extension fails (#524).
    find_fails: std::cell::Cell<bool>,
    /// What the extension was told ended each time (#542).
    told_ended: RefCell<Vec<agent_hud_runtime::chatgpt::Ended>>,
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
    ) -> Result<(String, Option<String>), String> {
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
            Ok(("c-new".into(), self.asked_as.borrow().clone()))
        }
    }
    fn send(
        &self,
        conversation: &str,
        text: &str,
        request: &str,
    ) -> Result<Option<String>, SendFailed> {
        self.sent
            .borrow_mut()
            .push(("send".into(), conversation.into(), text.into()));
        self.requests.borrow_mut().push(request.into());
        // Send never pressed: the words are not on the page.
        if self.send_unpressed.get() {
            let error = "ChatGPT 插件没能完成：busy".to_owned();
            return Err(SendFailed::NotPressed(error));
        }
        shown(text);
        if let Some(during) = &self.on_send {
            during();
        }
        if self.send_fails.get() {
            let error = "ChatGPT 插件没能完成：timeout".to_owned();
            return Err(SendFailed::Unsure(error));
        }
        Ok(self.asked_as.borrow().clone())
    }
    fn ended(&self, ended: &agent_hud_runtime::chatgpt::Ended) {
        self.told_ended.borrow_mut().push(ended.clone());
    }
    fn find(&self, conversation: &str, request: &str, after: Option<&str>) -> Result<(), String> {
        self.sent
            .borrow_mut()
            .push(("find".into(), conversation.into(), request.into()));
        self.afters.borrow_mut().push(after.map(str::to_owned));
        if self.find_fails.get() {
            return Err("The ChatGPT extension is not connected".into());
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
        if let Some(during) = &self.on_reply {
            during();
        }
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
    fn pr_head(&self, pr: &str) -> Result<String, String> {
        self.heads
            .borrow()
            .get(pr)
            .cloned()
            .unwrap_or(Err("未设置".into()))
    }
    fn wake(&self, handoff: &str, session: &str, text: &str) -> Result<(), String> {
        if let Some(error) = self.wake_fails.borrow().clone() {
            return Err(error);
        }
        self.sent
            .borrow_mut()
            .push(("wake".into(), format!("{handoff}|{session}"), text.into()));
        Ok(())
    }
    fn opener(&self, doer: &str, session: &str) -> Option<(Opener, i64)> {
        if let Some(during) = &self.on_opener {
            during();
        }
        self.opener_asked
            .borrow_mut()
            .push(format!("{doer}|{session}"));
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
    *lines.left_as.borrow_mut() = state.map(|state| (state.to_owned(), reason.map(str::to_owned)));
}

/// A desk with a cap of `limit` reviews.
fn desk_of(limit: u32) -> (tempfile::TempDir, Desk) {
    let (temp, desk) = desk();
    book::set_review_limit(&temp.path().join("data"), limit).unwrap();
    (temp, desk)
}

fn desk() -> (tempfile::TempDir, Desk) {
    let temp = tempfile::tempdir().unwrap();
    let data = temp.path().join("data");
    // The cap these tests were written for: two reviews (#347 made it a setting).
    book::set_review_limit(&data, 2).unwrap();
    let mut desk = Desk::new(Some(data));
    // The tests' clocks start near 0: trouble from then is not old (#318).
    desk.since = 0;
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

/// Told by the one tab the conversation is open in, as the extension says
/// which (#507 round 5).
fn turn(phase: &str, reply: &str) -> Value {
    json!({"type":"turn","phase":phase,"conversation":"c-new","reply":reply,"prompt":asked(),"tab":1})
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

/// An answer whose last lines do not hold: PostPane asks ChatGPT once
/// to mend them (#347, not counted), and it answers `again`.
fn mend(desk: &Desk, lines: &Fake, again: &str, at: i64) {
    assert!(desk.drive(lines, at));
    let (kind, _, text) = lines.sent.borrow().last().unwrap().clone();
    assert_eq!(kind, "send");
    assert!(text.contains("驿窗自动发送"), "{text}");
    assert!(!desk.drive(lines, at), "asked once");
    desk.observe(&turn("complete", again), at);
}

/// The code a swipe's words carry, for `relay_to_chatgpt`'s `launch`.
fn code_of(lines: &Fake) -> String {
    let sent = lines.sent.borrow();
    let text = &sent.iter().rev().find(|s| s.0 == "leave").unwrap().2;
    let start = text.find("「L").unwrap() + "「".len();
    let end = start + text[start..].find('」').unwrap();
    text[start..end].to_owned()
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

fn steps(kinds: &[&str]) -> Vec<Step> {
    kinds
        .iter()
        .enumerate()
        .map(|(at, kind)| serde_json::from_value(json!({"at": at, "kind": kind})).unwrap())
        .collect()
}

const PR: &str = "PR：https://github.com/Natsukashii1997/dt-sandbox/pull/4";

/// The commit those reviews are of (#347), and their pull request's still.
const HEAD: &str = "0123456789abcdef0123456789abcdef01234567";

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
        ..Rule::default()
    };
    lines
        .heads
        .borrow_mut()
        .insert("natsukashii1997/dt-sandbox#4".into(), Ok(HEAD.into()));
    let brief = format!("{PR}\nhead_sha {HEAD}\n改动如下（{session} {now}）");
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

const PR_KEY: &str = "natsukashii1997/dt-sandbox#4";

const MOVED: &str = "fedcba9876543210fedcba9876543210fedcba98";

const PASS: &str = "全部关闭\n受审版本：0123456\n未决：P0 0，P1 0\n审查出口：通过\n结论：通过";

const FIX: &str = "1. 还差\n受审版本：0123456\n审查出口：返修\n结论：需修改";

fn engineering(
    desk: &Desk,
    lines: &Fake,
    session: &str,
    cwd: &str,
    brief: &str,
    now: i64,
) -> Result<Started, String> {
    let rule = Rule {
        risk: Some("L2".into()),
        ..Rule::default()
    };
    let started = desk.start_ruled(
        lines,
        session,
        Some(cwd),
        "修登录",
        None,
        brief,
        false,
        &rule,
        now,
    )?;
    if let Started::Opening { handoff, project } = &started {
        desk.open(lines, &handoff.id, brief, project.as_deref(), || now)
            .unwrap();
    }
    Ok(started)
}

fn status(desk: &Desk, now: i64) -> (String, Option<String>) {
    let shown = desk.projection(now);
    let last = shown.as_array().unwrap().last().unwrap().clone();
    (
        last["status"].as_str().unwrap().to_owned(),
        last["notice"].as_str().map(str::to_owned),
    )
}

fn reply_as(prompt: Option<String>, reply: &str, message: &str) -> Value {
    json!({"type":"turn","phase":"complete","conversation":"c-new","prompt":prompt,"reply":reply,"messageId":message})
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

fn sent_as(lines: &Fake, kind: &str) -> Vec<(String, String)> {
    lines
        .sent
        .borrow()
        .iter()
        .filter(|s| s.0 == kind)
        .map(|s| (s.1.clone(), s.2.clone()))
        .collect()
}

/// The newest step's words as the card has them.
fn last_step_text(desk: &Desk, now: i64) -> String {
    desk.projection(now)[0]["steps"]
        .as_array()
        .unwrap()
        .last()
        .unwrap()["text"]
        .as_str()
        .unwrap_or("")
        .to_owned()
}

/// A pass in the review gate's last lines (#347), with no pull request.
const GATE_PASS: &str = "1. 都好\n审查出口：通过\n结论：通过";

/// Lines whose words back hold until let go: what else happens while a
/// session is being told of trouble (review of #318, P2-03).
struct Held {
    entered: std::sync::mpsc::Sender<()>,
    go: std::sync::mpsc::Receiver<()>,
}

impl Lines for Held {
    fn connected(&self) -> bool {
        true
    }
    fn pr_head(&self, _pr: &str) -> Result<String, String> {
        Err("not read here".into())
    }
    fn open(
        &self,
        _: &str,
        _: Option<&str>,
        _: &str,
        _: &str,
    ) -> Result<(String, Option<String>), String> {
        Err("not here".into())
    }
    fn send(&self, _: &str, _: &str, _: &str) -> Result<Option<String>, SendFailed> {
        Err(SendFailed::Unsure("not here".into()))
    }
    fn find(&self, _: &str, _: &str, _: Option<&str>) -> Result<(), String> {
        Ok(())
    }
    fn reread(&self, _: &str) -> Result<(), String> {
        Ok(())
    }
    fn reaches(&self, _: &str, _: &str) -> Result<(), String> {
        Ok(())
    }
    fn reply(&self, _: &str, _: &str, _: &str, _: &str) -> Result<(), Unsent> {
        self.entered.send(()).unwrap();
        self.go.recv().unwrap();
        Ok(())
    }
    fn leave(&self, _: &str, _: &str) -> Result<String, String> {
        Err("not here".into())
    }
    fn queue(&self, _: &str, _: &str, _: &str, _: &str) -> Result<(), Unsent> {
        Err(Unsent::Failed("not here".into()))
    }
    fn left(&self, _: &str, _: &str, _: &str, _: &str) -> Option<(String, Option<String>)> {
        None
    }
    fn opener(&self, _: &str, _: &str) -> Option<(Opener, i64)> {
        None
    }
    fn stopped(&self, _: &str) -> bool {
        false
    }
    fn withdraw(&self, _: &str, _: &str) -> bool {
        false
    }
    fn wake(&self, _: &str, _: &str, _: &str) -> Result<(), String> {
        Err("not here".into())
    }
}

/// Tells `id`'s trouble with words back held; while they are, `meanwhile`
/// runs on its own thread, and `during` reads the desk: what it read,
/// and whether `meanwhile` changed anything once all is done.
fn while_told<T: Send>(
    desk: &Desk,
    now: i64,
    meanwhile: impl FnOnce() -> bool + Send,
    during: impl FnOnce() -> T,
) -> (T, bool) {
    let (id, at, trouble) = desk.lock().untold(0).remove(0);
    let (entered, held) = std::sync::mpsc::channel();
    let (go, wait) = std::sync::mpsc::channel();
    std::thread::scope(|scope| {
        let telling = scope.spawn(move || {
            let lines = Held { entered, go: wait };
            desk.tell_one(&lines, &id, at, &trouble, now)
        });
        held.recv().unwrap();
        let other = scope.spawn(meanwhile);
        std::thread::sleep(std::time::Duration::from_millis(100));
        let read = during();
        // Let go before asserting: a failed assert must not leave it held.
        go.send(()).unwrap();
        assert!(telling.join().unwrap(), "told");
        (read, other.join().unwrap())
    })
}
