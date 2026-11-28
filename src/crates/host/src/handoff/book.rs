//! Handoffs (relay 1c, docs/chatgpt-channel.md): a Claude Code session and the
//! ChatGPT conversation that reviews its work, bound together so words go
//! back and forth between the two. Kept in `<data>/chatgpt/handoffs.json`,
//! with the ChatGPT project new review conversations open in
//! (`<data>/chatgpt/config.json`).
use agent_hud_agents::chatgpt as agent;
use agent_hud_runtime::chatgpt::files::{config_path, read_small, set_config};
use agent_hud_runtime::chatgpt::{folder, write_private};
use agent_hud_runtime::l10n;
use serde::{Deserialize, Serialize};
#[path = "answers/book_asked.rs"]
mod asked;
#[path = "back/book_held.rs"]
mod held;
#[path = "back/book_idle.rs"]
mod idle;
#[path = "back/book_wake.rs"]
mod wake;
use std::{
    fs,
    path::{Path, PathBuf},
};
#[path = "gate/book_chain.rs"]
mod chain;
#[path = "sending/book_doer.rs"]
mod doer;
#[path = "book_end.rs"]
mod ending;
#[path = "gate/book.rs"]
mod gate;
#[path = "gate/book_io.rs"]
mod gate_io;
#[path = "gate/book_guard.rs"]
mod guard;
#[path = "gate/book_leave.rs"]
mod leave;
pub use leave::{correction_head, notice_head, SWIPE_SAID};
#[path = "notice/book.rs"]
mod notice;
#[path = "gate/book_pull_request.rs"]
mod pull_request;
#[path = "sending/book_unsure.rs"]
mod unsure;
#[cfg(test)]
pub use chain::chain_id;
pub use doer::{by_doer, codex_began, codex_turn};
pub use gate::{Gate, Notice, LIMIT, LIMIT_MAX};
pub use gate_io::{
    archive, archived, head_in, review_limit, same_commit, set_review_limit, slim_kept,
};
#[cfg(test)]
pub use gate_io::{ledger, reviewed_commit};
pub use idle::IDLE_END_MS;
pub use notice::{notices_since, taken_over, Cause, Trouble};
pub use pull_request::pull_request;
pub use unsure::{tagged, untagged, Pending, FIND_MOST};
#[cfg(test)]
pub use unsure::{FIND_AFTER_MS, FIND_EVERY_MS, MEND_AGAIN_MS};
pub use wake::WAKE_AFTER_MS;

/// How many handoffs are kept, newest first.
pub const KEEP: usize = 200;
/// How long a review conversation may take to open before it counts as
/// failed: the channel's own wait (90 s) and some slack.
pub const OPEN_TIMEOUT_MS: i64 = 120_000;
/// How long the auto round trip waits for ChatGPT's answer before it hands
/// the handoff back to the person (#72).
pub const REPLY_WAIT_MS: i64 = 30 * 60 * 1000;
/// How long it waits for Claude to hand its changes over again.
pub const FIX_WAIT_MS: i64 = 2 * 60 * 60 * 1000;
/// How long words queued for a paused Claude session wait to be taken up
/// (the plugin's own lifetime for words left).
pub const QUEUE_WAIT_MS: i64 = agent_hud_runtime::claude_plugin::PROMPT_LIFETIME.as_millis() as i64;
/// The longest excerpt a step keeps of what was said.
pub const EXCERPT: usize = 600;
/// The longest reply kept in full (the newest only), to forward it back.
const REPLY_KEPT: usize = 64 * 1024;
/// How many handoffs keep their brief for a retry.
const BRIEFS_KEPT: usize = 3;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Status {
    /// The review conversation is being opened.
    Opening,
    /// Bound to its conversation; words go back and forth.
    Open,
    /// The conversation could not be opened (`error` says why).
    Failed,
    /// Ended by the person, or a newer review of the same session took its place.
    Closed,
}

/// Where a handoff stands, as its card shows it.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Phase {
    /// Words are on their way to ChatGPT (a conversation opening).
    Sending,
    /// ChatGPT has them and has not started.
    #[default]
    Delivered,
    /// ChatGPT is answering.
    Working,
    /// ChatGPT answered: the person decides.
    Replied,
    /// Sent back to Claude, which works on it.
    Returned,
    Ended,
    Failed,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Verdict {
    /// 「结论：通过」
    Pass,
    /// 「结论：需修改」
    Revise,
}

/// An engineering review's risk level (#217, agent-kit review contract): what the
/// review asks for, not how many it gets (#347). L0 is not sent at all.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Risk {
    L1,
    L2,
    L3,
}

impl Risk {
    /// 「L1」「l2」…; None for anything else, L0 included.
    pub fn parse(text: &str) -> Option<Self> {
        match text.trim().to_ascii_uppercase().as_str() {
            "L1" => Some(Self::L1),
            "L2" => Some(Self::L2),
            "L3" => Some(Self::L3),
            _ => None,
        }
    }
}

/// An engineering answer's way out (#217), its optional 「审查出口」.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Review {
    /// 通过 ↔ 通过
    Pass,
    /// 返修 ↔ 需修改
    Fix,
    /// 证据不足暂停 ↔ 需修改
    NeedEvidence,
    /// 决策升级 ↔ 需修改
    Escalate,
}

/// What happened, and who did it: `work` Claude, `reply` ChatGPT, the rest PostPane.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum StepKind {
    /// Claude finished a round of work and handed it over.
    Work,
    /// PostPane sent it to ChatGPT, which confirmed it arrived.
    Ask,
    /// ChatGPT answered.
    Reply,
    /// PostPane sent ChatGPT's answer back to Claude.
    Back,
    /// PostPane asked Claude to hand its changes over for another review.
    Again,
    /// The words could not be sent (`text` says why).
    Fail,
    /// The person ended the handoff, or a pass ended it (`auto`).
    End,
    /// The auto round trip stopped (`text` says why) and left it to the person.
    Stop,
    /// The person turned the auto round trip back on.
    Resume,
    /// The Claude session's process had stopped, so PostPane ran Claude Code
    /// for it in the background with the words back (`text` says why, L-14).
    Wake,
    /// PostPane asked ChatGPT to mend only its answer's last lines (#347).
    Format,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Step {
    pub at: i64,
    pub kind: StepKind,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
    /// A reply's points, as it numbered them.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub points: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub verdict: Option<Verdict>,
    /// What was sent, hashed: the same words are not sent twice in a row.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub key: Option<String>,
    /// Done by the auto round trip, not by the person (#72).
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub auto: bool,
    /// Ended by an agent on its own, not at the person's word (#587):
    /// settles no cap, as an end by PostPane.
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub agent: bool,
    /// Words back to Claude (`back`, `again`, #257): the id they were left
    /// under for the session's plugin, the same each time the step is tried.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt: Option<String>,
    /// How those words stand with the plugin (#257).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub delivery: Option<Delivery>,
    /// Trouble before any answer, for the session to be told of (#318).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cause: Option<Cause>,
    /// ChatGPT's id of the prompt words went in as (`ask`, `format`, #410).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub asked_id: Option<String>,
}

/// How words back to Claude stand with its session's plugin (#257).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Delivery {
    /// Left for the session; the plugin has not taken them.
    Waiting,
    /// Taken by the plugin, which submits them once the session is idle.
    Taken,
    /// Submitted: the session's turn on them began.
    Started,
    Refused,
    /// Not taken within the plugin's hour.
    Expired,
    Cancelled,
}
impl Delivery {
    /// The plugin gave the words up: they never reached the session.
    pub fn gave_up(self) -> bool {
        matches!(self, Self::Refused | Self::Expired | Self::Cancelled)
    }
}

impl Step {
    fn new(at: i64, kind: StepKind, text: Option<&str>) -> Self {
        Self {
            at,
            kind,
            text: text
                .map(str::trim)
                .filter(|text| !text.is_empty())
                .map(|text| excerpt(text, EXCERPT)),
            points: vec![],
            verdict: None,
            key: None,
            auto: false,
            agent: false,
            prompt: None,
            delivery: None,
            cause: None,
            asked_id: None,
        }
    }
    fn by_auto(mut self) -> Self {
        self.auto = true;
        self
    }
    fn keyed(mut self, key: &str) -> Self {
        self.key = Some(key.to_owned());
        self
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Handoff {
    pub id: String,
    /// The task's name, which the review conversation is about.
    pub title: String,
    /// The Claude Code session doing the work, or the Codex thread (#280).
    pub claude_session: String,
    /// `codex` when Codex does the work; none is Claude Code (#280).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub doer: Option<String>,
    #[serde(default)]
    pub cwd: Option<String>,
    /// The ChatGPT conversation reviewing it, once open.
    #[serde(default)]
    pub chatgpt_conversation: Option<String>,
    pub status: Status,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    /// How many times words went either way after the first.
    #[serde(default)]
    pub rounds: u32,
    #[serde(default)]
    pub phase: Phase,
    /// When the phase began.
    #[serde(default)]
    pub phase_at: i64,
    /// What happened, oldest first.
    #[serde(default)]
    pub steps: Vec<Step>,
    /// The words a conversation opens with, kept until it opens so a failed
    /// open can be retried. Never in the snapshot.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub brief: Option<String>,
    /// How many times its conversation was asked to open: each try has its
    /// own request (`request`), so an old try's late answer binds nothing.
    #[serde(default)]
    pub attempt: u32,
    /// The auto round trip (#72) is on: a 「需修改」 answer goes back to
    /// Claude by itself, a pass goes back and ends it, at most `ROUNDS` reviews.
    #[serde(default)]
    pub auto: bool,
    /// Why the auto round trip stopped, while it is off.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub halt: Option<String>,
    /// When ChatGPT's answer was queued for a Claude session that could not
    /// take it then (paused once its turn was over): it goes in once the
    /// session is opened. Cleared when Claude hands over again.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub queued_at: Option<i64>,
    /// An engineering review's risk level, when Claude named one (#217).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub risk: Option<Risk>,
    /// The pull request under review, 「owner/repo#n」 (#217): reviews of it
    /// count on across handoffs.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub pr: Option<String>,
    /// Reviews of the same pull request in earlier handoffs (#217).
    #[serde(default, skip_serializing_if = "is_zero")]
    pub carried: u32,
    /// Reviews past the budget the person allowed, one each time (#217).
    #[serde(default, skip_serializing_if = "is_zero")]
    pub extra: u32,
    /// The step its rounds count from (#258): where the person spoke up and
    /// Claude handed over again; earlier reviews, carried ones too, no
    /// longer count.
    #[serde(default, skip_serializing_if = "is_nought")]
    pub rounds_from: usize,
    /// Since when Claude Code runs in the background for the session with
    /// the words back (`Wake`), until it ends.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub waking_since: Option<i64>,
    /// The review gate's own (#347): cap, chain, commit, notice.
    #[serde(default, flatten)]
    pub gate: Gate,
    /// The steps whose trouble the session was told of (#318), by index.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub told: Vec<usize>,
}

fn is_zero(n: &u32) -> bool {
    *n == 0
}
fn is_nought(n: &usize) -> bool {
    *n == 0
}

/// What the auto round trip does with an answer that came in. Every one
/// goes back to Claude first (#316), the ends too.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Next {
    /// 「需修改」 with rounds to go: back to Claude.
    Back,
    /// 「结论：通过」: back to Claude, then the handoff ends.
    Pass,
    /// No pass by the last review the person's leave gives (#347): back to
    /// Claude, then the person steps in.
    Limit,
    /// No verdict written: back to Claude, then the person decides.
    NoVerdict,
    /// 思维评审 (#209) 成熟退出 / 转其他路径: back to Claude, then the handoff ends.
    Close,
    /// 思维评审 证据不足暂停: back to Claude, then the auto round trip stops.
    Pause,
    /// 思维评审 决策升级: back to Claude, then the person decides.
    Escalate,
    /// 思维评审 whose last two lines do not hold: back to Claude, then the
    /// person decides.
    Invalid(Flaw),
    /// The answer's last lines do not hold, and were not mended yet
    /// (#347): PostPane asks ChatGPT once to mend them.
    Format,
    /// A pass of another commit than the one under review (#347): back to
    /// Claude, then the auto round trip stops.
    Stale,
    /// An engineering answer whose 「审查出口」 does not go with its
    /// verdict (#217): back to Claude, then the person decides.
    BadTail(Flaw),
}

/// A 思维评审 answer's way out, its 「评审出口」 (#209).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Exit {
    /// 成熟退出 ↔ 通过
    Mature,
    /// 转其他路径 ↔ 通过
    OtherPath,
    /// 继续深化 ↔ 需修改
    Deepen,
    /// 证据不足暂停 ↔ 需修改
    NeedEvidence,
    /// 决策升级 ↔ 交常浩裁决
    Escalate,
}

impl Exit {
    /// The verdict it goes with; none for 交常浩裁决.
    pub fn verdict(self) -> Option<Verdict> {
        match self {
            Self::Mature | Self::OtherPath => Some(Verdict::Pass),
            Self::Deepen | Self::NeedEvidence => Some(Verdict::Revise),
            Self::Escalate => None,
        }
    }
}

/// Why a 思维评审 answer's last two lines do not hold.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Flaw {
    /// The last line is not 「结论：…」.
    NoVerdict,
    /// 「结论：」 with none of 通过 / 需修改 / 交常浩裁决.
    UnknownVerdict,
    /// The line before is not 「评审出口：…」.
    NoExit,
    /// 「评审出口：」 with none of the five.
    UnknownExit,
    /// The way out and the verdict do not go together.
    Mismatch,
    /// A pass with no 「受审版本」 line, when a commit is under review (#347).
    NoVersion,
}

impl Handoff {
    /// Opening or open: the handoff a session or conversation belongs to.
    pub fn live(&self) -> bool {
        matches!(self.status, Status::Opening | Status::Open)
    }
    /// The request its conversation is opened under, this try's.
    pub fn request(&self) -> String {
        format!("{}~{}", self.id, self.attempt)
    }
    /// How many reviews were asked for, since its rounds last began (#258).
    #[cfg(test)]
    pub fn reviews(&self) -> u32 {
        self.chain()
            .iter()
            .filter(|step| step.kind == StepKind::Ask)
            .count() as u32
    }
    /// The steps its rounds count over: all, or those since the person
    /// spoke up (#258).
    #[cfg(test)]
    fn chain(&self) -> &[Step] {
        &self.steps[self.rounds_from.min(self.steps.len())..]
    }
    /// The newest reply, in full when it was kept so.
    pub fn last_reply(&self) -> Option<&Step> {
        self.steps
            .iter()
            .rev()
            .find(|step| step.kind == StepKind::Reply)
    }
    /// As the snapshot shows it: no brief, excerpts only, and not the words
    /// of a review or an ask to mend on their way (#409).
    pub fn shown(&self) -> Self {
        let mut shown = self.clone();
        shown.brief = None;
        for pending in [&mut shown.gate.pending, &mut shown.gate.mending]
            .into_iter()
            .flatten()
        {
            (pending.words, pending.key) = (None, String::new());
        }
        for step in &mut shown.steps {
            // An answer's key is its ChatGPT message id, which its receipt
            // names too (#411 L2 P2-01); the others are what was sent, hashed.
            if step.kind != StepKind::Reply {
                step.key = None;
            }
            if let Some(text) = &mut step.text {
                if text.chars().count() > EXCERPT {
                    *text = excerpt(text, EXCERPT);
                }
            }
        }
        shown
    }
    fn enter(&mut self, phase: Phase, now: i64) {
        self.phase = phase;
        self.phase_at = now;
        self.updated_at = now;
    }
    /// What is to happen now to an answer that waits, if anything: a pass
    /// ends the handoff whether or not the auto round trip is on (owner,
    /// 2026-11-07: a passed review left open kept Claude's 「回」 seal up);
    /// the rest only while it is on. A 思维评审 (#209): nothing by itself
    /// while it is off — not even a pass, which must reach Claude first.
    pub fn next(&self) -> Option<Next> {
        if !self.live() || self.phase != Phase::Replied {
            return None;
        }
        let outcome = self.outcome();
        (self.auto || (outcome == Next::Pass && !self.thinking())).then_some(outcome)
    }
    /// What the newest answer comes to, on or off: what the auto round trip
    /// does with it, and what words back to Claude say of it, by hand too
    /// (#316: the same words either way, so they go once). The review gate
    /// decides (#347, `gate/book.rs`).
    pub fn outcome(&self) -> Next {
        self.decide()
    }
    /// A 思维评审 paused for evidence (#209): its answer, 证据不足暂停, went
    /// back to Claude and the auto round trip stopped itself after it — not
    /// paused since by the person.
    pub fn waits_for_evidence(&self) -> bool {
        let reply = self.last_reply().and_then(|step| step.text.as_deref());
        let paused = |reply: &str| {
            if self.thinking() {
                exit(reply) == Ok(Exit::NeedEvidence)
            } else {
                review_exit(reply) == Ok(Some(Review::NeedEvidence))
            }
        };
        self.live()
            && !self.auto
            && self.phase == Phase::Returned
            && reply.is_some_and(paused)
            && self.stopped_by_itself()
    }
    /// A 思维评审 handoff (#209): its title begins 「思维评审｜」.
    pub fn thinking(&self) -> bool {
        thinking(&self.title)
    }
    /// The id words back to Claude for the newest answer go under (#257),
    /// `kind` `back` or `again`: one per answer and kind, the same however
    /// often it is tried, and a new one only once the plugin gave the last
    /// try up.
    pub fn prompt_for(&self, kind: StepKind) -> String {
        let answer = self
            .steps
            .iter()
            .rposition(|step| step.kind == StepKind::Reply)
            .unwrap_or(0);
        let letter = if kind == StepKind::Again { 'a' } else { 'b' };
        let base = format!("{}-{letter}{answer}", self.id);
        let tries = self
            .steps
            .iter()
            .filter(|step| {
                step.prompt.as_deref().is_some_and(|prompt| {
                    prompt == base
                        || prompt
                            .strip_prefix(&base)
                            .is_some_and(|rest| rest.starts_with('-'))
                })
            })
            .collect::<Vec<_>>();
        match tries.last() {
            None => base,
            Some(step) if !step.delivery.is_some_and(Delivery::gave_up) => {
                step.prompt.clone().unwrap_or(base)
            }
            Some(_) => format!("{base}-{}", tries.len()),
        }
    }
    /// Whether `text` went back to Claude in this handoff (#258), a label
    /// the delivery may put before it left out (as `codex_began` does).
    fn sent_back(&self, text: &str) -> bool {
        let keys = [key(text), key(unlabelled(text))];
        self.steps.iter().any(|step| {
            matches!(step.kind, StepKind::Back | StepKind::Again)
                && step.key.as_ref().is_some_and(|k| keys.contains(k))
        })
    }
    /// Whether the person spoke up since words last went back to Claude
    /// (#258): Claude's current turn (`turn`: who began it and when) began
    /// after them, with the person's own words rather than PostPane's. Not
    /// when it cannot be told, nor once Claude handed over again since.
    pub fn spoke_up(&self, turn: Option<&(agent_hud_runtime::claude_plugin::Opener, i64)>) -> bool {
        use agent_hud_runtime::claude_plugin::Opener;
        let Some((opener, at)) = turn else {
            return false;
        };
        let last = self
            .steps
            .iter()
            .rev()
            .find(|step| matches!(step.kind, StepKind::Ask | StepKind::Back | StepKind::Again));
        let Some(last) = last.filter(|step| step.kind != StepKind::Ask) else {
            return false;
        };
        *at > last.at
            && match opener {
                Opener::Person => true,
                Opener::Plugin(text) => !self.sent_back(text),
            }
    }
    /// Whether the newest step of `kinds` sent these same words.
    fn just_sent(&self, kinds: &[StepKind], key: &str) -> bool {
        self.steps
            .iter()
            .rev()
            .find(|step| kinds.contains(&step.kind) || step.kind == StepKind::Reply)
            .is_some_and(|step| kinds.contains(&step.kind) && step.key.as_deref() == Some(key))
    }
}

/// The handoffs, oldest first.
#[derive(Clone, Debug, Default, PartialEq)]
pub struct Book {
    pub list: Vec<Handoff>,
}
impl Book {
    pub fn get(&self, id: &str) -> Option<&Handoff> {
        self.list.iter().find(|handoff| handoff.id == id)
    }
    /// The live handoff `session` belongs to.
    pub fn for_session(&self, session: &str) -> Option<&Handoff> {
        self.list
            .iter()
            .rev()
            .find(|handoff| handoff.live() && handoff.claude_session == session)
    }
    /// The live handoff `conversation` belongs to.
    pub fn for_conversation(&self, conversation: &str) -> Option<&Handoff> {
        self.list.iter().rev().find(|handoff| {
            handoff.live() && handoff.chatgpt_conversation.as_deref() == Some(conversation)
        })
    }
    fn get_mut(&mut self, id: &str) -> Option<&mut Handoff> {
        self.list.iter_mut().find(|handoff| handoff.id == id)
    }
    fn live_mut(&mut self, id: &str) -> Option<&mut Handoff> {
        self.get_mut(id).filter(|handoff| handoff.live())
    }
    fn conversation_mut(&mut self, conversation: &str) -> Option<&mut Handoff> {
        self.list.iter_mut().rev().find(|handoff| {
            handoff.live() && handoff.chatgpt_conversation.as_deref() == Some(conversation)
        })
    }
    /// A new handoff for `session`, opening with `brief`; one the session
    /// had before is closed, so a session belongs to one handoff at a time.
    /// `summary` says what Claude did, for the first step.
    pub fn begin(
        &mut self,
        session: &str,
        cwd: Option<&str>,
        title: &str,
        summary: Option<&str>,
        brief: &str,
        now: i64,
    ) -> Handoff {
        for handoff in &mut self.list {
            if handoff.live() && handoff.claude_session == session {
                handoff.status = Status::Closed;
                handoff.updated_at = now;
            }
        }
        let title = title.trim();
        let handoff = Handoff {
            id: new_id(now),
            title: title.to_owned(),
            claude_session: session.to_owned(),
            doer: None,
            cwd: cwd.filter(|cwd| !cwd.is_empty()).map(str::to_owned),
            chatgpt_conversation: None,
            status: Status::Opening,
            error: None,
            created_at: now,
            updated_at: now,
            rounds: 0,
            phase: Phase::Sending,
            phase_at: now,
            steps: vec![Step::new(
                now,
                StepKind::Work,
                Some(summary.unwrap_or(title)),
            )],
            brief: Some(brief.to_owned()),
            attempt: 0,
            auto: true,
            halt: None,
            queued_at: None,
            risk: None,
            pr: None,
            carried: 0,
            extra: 0,
            rounds_from: 0,
            waking_since: None,
            gate: Gate::default(),
            told: vec![],
        };
        self.list.push(handoff.clone());
        self.trim();
        handoff
    }
    /// The review conversation opened (late, too, after a timeout): the
    /// handoff is bound to it, and any other handoff that held it lets it go.
    pub fn opened(&mut self, id: &str, conversation: &str, now: i64) -> bool {
        // A failed one binds late only while its session has no newer
        // handoff, live or not.
        let waiting = self.get(id).is_some_and(|handoff| {
            handoff.status == Status::Opening
                || (handoff.status == Status::Failed
                    && handoff.brief.is_some()
                    && !self.superseded(id))
        });
        if !waiting {
            return false;
        }
        self.take_over(id, conversation, now);
        let handoff = self.get_mut(id).expect("checked above");
        let brief = handoff.brief.take().unwrap_or_default();
        handoff.chatgpt_conversation = Some(conversation.to_owned());
        handoff.status = Status::Open;
        handoff.error = None;
        handoff
            .steps
            .push(Step::new(now, StepKind::Ask, Some(&brief)).keyed(&key(&brief)));
        handoff.enter(Phase::Delivered, now);
        true
    }
    /// Whether the session of `id` began another handoff after it.
    pub fn superseded(&self, id: &str) -> bool {
        let Some(at) = self.list.iter().position(|h| h.id == id) else {
            return false;
        };
        let session = &self.list[at].claude_session;
        self.list[at + 1..]
            .iter()
            .any(|h| &h.claude_session == session)
    }
    /// A conversation opened for `request` (`Handoff::request`), whenever
    /// the answer came: bound only if it is the handoff's current try.
    pub fn opened_late(&mut self, request: &str, conversation: &str, now: i64) -> bool {
        let Some((id, attempt)) = request.rsplit_once('~') else {
            return false;
        };
        let current = self
            .get(id)
            .is_some_and(|h| h.chatgpt_conversation.is_none() && h.attempt.to_string() == attempt);
        current && self.opened(id, conversation, now)
    }
    /// The review conversation could not be opened; the brief stays for a retry.
    pub fn failed(&mut self, id: &str, error: &str, now: i64) -> bool {
        let Some(handoff) = self.get_mut(id).filter(|h| h.status == Status::Opening) else {
            return false;
        };
        handoff.status = Status::Failed;
        handoff.error = Some(error.to_owned());
        let step = Step::new(now, StepKind::Fail, Some(error));
        handoff.steps.push(step.caused(Cause::NotOpened));
        handoff.enter(Phase::Failed, now);
        true
    }
    /// A failed open tried again: opening, with its brief; not while its session has a live or newer one (F-01).
    pub fn retry(&mut self, id: &str, now: i64) -> Option<String> {
        if self.get(id)?.status != Status::Failed {
            return None;
        }
        let session = self.get(id)?.claude_session.clone();
        if self.for_session(&session).is_some() || self.superseded(id) {
            return None;
        }
        let handoff = self.get_mut(id)?;
        let brief = handoff.brief.clone()?;
        handoff.attempt += 1;
        handoff.status = Status::Opening;
        handoff.error = None;
        handoff.enter(Phase::Sending, now);
        Some(brief)
    }
    /// Openings that took too long count as failed (`error`).
    pub fn expire(&mut self, now: i64, error: &str) -> bool {
        let late = self
            .list
            .iter()
            .filter(|h| {
                h.status == Status::Opening && now - h.phase_at.max(h.created_at) > OPEN_TIMEOUT_MS
            })
            .map(|h| h.id.clone())
            .collect::<Vec<_>>();
        for id in &late {
            self.failed(id, error, now);
        }
        !late.is_empty()
    }
    /// Openings no one waits for any more (the app was restarted) count as failed.
    pub fn interrupted(&mut self, now: i64, error: &str) -> bool {
        let opening = self
            .list
            .iter()
            .filter(|h| h.status == Status::Opening)
            .map(|h| h.id.clone())
            .collect::<Vec<_>>();
        for id in &opening {
            self.failed(id, error, now);
        }
        !opening.is_empty()
    }
    /// Whether `text` was just sent to ChatGPT for this handoff and not yet answered.
    pub fn asked_already(&self, id: &str, text: &str) -> bool {
        self.get(id)
            .is_some_and(|h| h.just_sent(&[StepKind::Ask], &key(text)))
    }
    /// Whether `text` was just sent back to Claude for this handoff, and
    /// its plugin did not give it up (#257).
    pub fn returned_already(&self, id: &str, text: &str) -> bool {
        self.get(id).is_some_and(|h| {
            h.just_sent(&[StepKind::Back, StepKind::Again], &key(text))
                && !h
                    .steps
                    .iter()
                    .rev()
                    .find(|step| matches!(step.kind, StepKind::Back | StepKind::Again))
                    .and_then(|step| step.delivery)
                    .is_some_and(Delivery::gave_up)
        })
    }
    /// Words reached the handoff's ChatGPT conversation: Claude's work
    /// (`summary`, when it handed some over) and the words themselves.
    pub fn asked(&mut self, id: &str, summary: Option<&str>, text: &str, now: i64) -> bool {
        let Some(handoff) = self.live_mut(id) else {
            return false;
        };
        handoff.resume_for_ask(now);
        if let Some(summary) = summary {
            handoff
                .steps
                .push(Step::new(now, StepKind::Work, Some(summary)));
        }
        handoff
            .steps
            .push(Step::new(now, StepKind::Ask, Some(text)).keyed(&key(untagged(text))));
        handoff.queued_at = None;
        handoff.waking_since = None;
        handoff.rounds += 1;
        handoff.enter(Phase::Delivered, now);
        true
    }
    /// ChatGPT began answering in `conversation`.
    pub fn working(&mut self, conversation: &str, now: i64) -> bool {
        let Some(handoff) = self.conversation_mut(conversation) else {
            return false;
        };
        if !matches!(handoff.phase, Phase::Delivered | Phase::Sending) {
            return false;
        }
        handoff.enter(Phase::Working, now);
        true
    }
    /// ChatGPT answered in `conversation` while a review was asked for: its
    /// points and verdict are kept, and the answer in full until a newer one
    /// comes. The same message (`message`, its id) is taken once; other
    /// turns of the conversation (the person chatting on) are not the review.
    pub fn replied(
        &mut self,
        conversation: &str,
        reply: &str,
        message: Option<&str>,
        now: i64,
    ) -> bool {
        let Some(handoff) = self.conversation_mut(conversation) else {
            return false;
        };
        // Words never known to have gone in (L3 P1-10) may have: their
        // answer counts once, and cannot pass.
        if reply.trim().is_empty()
            || !(matches!(
                handoff.phase,
                Phase::Sending | Phase::Delivered | Phase::Working
            ) || handoff.unanswered().is_some())
        {
            return false;
        }
        let message = message.filter(|id| !id.is_empty());
        if message.is_some_and(|id| {
            handoff
                .steps
                .iter()
                .any(|step| step.kind == StepKind::Reply && step.key.as_deref() == Some(id))
        }) {
            return false;
        }
        handoff.answer_pending(now);
        // One being mended (#347) stays whole: it goes back with the mending.
        let keep = handoff
            .steps
            .iter()
            .rev()
            .find(|s| matches!(s.kind, StepKind::Ask | StepKind::Format))
            .filter(|s| s.kind == StepKind::Format)
            .and_then(|_| {
                handoff
                    .steps
                    .iter()
                    .rposition(|s| s.kind == StepKind::Reply)
            });
        for (at, step) in handoff.steps.iter_mut().enumerate() {
            if step.kind == StepKind::Reply && Some(at) != keep {
                if let Some(text) = &mut step.text {
                    *text = excerpt(text, EXCERPT);
                }
            }
        }
        let (points, mut verdict) = review(reply);
        // A 思维评审 answer's verdict is its last line or none (#209).
        if handoff.thinking() {
            verdict = exit(reply).ok().and_then(Exit::verdict);
        }
        handoff.steps.push(Step {
            at: now,
            kind: StepKind::Reply,
            text: Some(excerpt(reply.trim(), REPLY_KEPT)),
            points,
            verdict,
            key: message.map(str::to_owned),
            ..Step::new(now, StepKind::Reply, None)
        });
        handoff.enter(Phase::Replied, now);
        true
    }
    /// Words went back to Claude: ChatGPT's answer (`back`) or the ask to
    /// hand over again (`again`), left under `prompt` for its plugin (#257).
    pub fn returned(
        &mut self,
        id: &str,
        kind: StepKind,
        text: &str,
        prompt: &str,
        auto: bool,
        now: i64,
    ) -> bool {
        let Some(handoff) = self.live_mut(id) else {
            return false;
        };
        let mut step = Step::new(now, kind, Some(text)).keyed(&key(text));
        step.prompt = Some(prompt.to_owned());
        step.delivery = Some(Delivery::Waiting);
        handoff.steps.push(if auto { step.by_auto() } else { step });
        handoff.rounds += 1;
        handoff.enter(Phase::Returned, now);
        true
    }
    /// The person ended the handoff.
    pub fn end(&mut self, id: &str, now: i64) -> bool {
        self.end_said(id, None, now)
    }
    /// A pass ended the handoff, by the auto round trip.
    pub fn passed(&mut self, id: &str, text: &str, now: i64) -> bool {
        let Some(handoff) = self.live_mut(id) else {
            return false;
        };
        handoff.status = Status::Closed;
        handoff.brief = None;
        handoff
            .steps
            .push(Step::new(now, StepKind::End, Some(text)).by_auto());
        handoff.enter(Phase::Ended, now);
        true
    }
    /// The words back went into the Claude session's queue, not to it.
    pub fn queued(&mut self, id: &str, now: i64) -> bool {
        let Some(handoff) = self.live_mut(id) else {
            return false;
        };
        handoff.queued_at = Some(now);
        true
    }
    /// How the words back left under `prompt` stand with the plugin now
    /// (#257), taken or started. Queued words taken: the wait for Claude's
    /// changes begins then, not when they were queued. Whether it changed.
    pub fn delivery(&mut self, id: &str, prompt: &str, delivery: Delivery, now: i64) -> bool {
        let Some(handoff) = self.get_mut(id) else {
            return false;
        };
        let Some(step) = handoff
            .steps
            .iter_mut()
            .rev()
            .find(|step| step.prompt.as_deref() == Some(prompt))
            .filter(|step| step.delivery != Some(delivery))
        else {
            return false;
        };
        step.delivery = Some(delivery);
        if handoff.queued_at.take().is_some() {
            handoff.phase_at = now;
        }
        handoff.updated_at = now;
        true
    }
    /// The plugin gave up the words back left under `prompt` (#257): they
    /// never reached Claude. While they were the newest, the person has the
    /// handoff at once (`reason` says why): an answer waits again to go
    /// back, and the auto round trip stops.
    pub fn undelivered(
        &mut self,
        id: &str,
        prompt: &str,
        delivery: Delivery,
        reason: &str,
        now: i64,
    ) -> bool {
        let Some(handoff) = self.get_mut(id) else {
            return false;
        };
        let newest = handoff
            .steps
            .iter()
            .rposition(|step| matches!(step.kind, StepKind::Back | StepKind::Again));
        let Some(at) = handoff
            .steps
            .iter()
            .rposition(|step| step.prompt.as_deref() == Some(prompt))
            .filter(|at| handoff.steps[*at].delivery != Some(delivery))
        else {
            return false;
        };
        let step = &mut handoff.steps[at];
        step.delivery = Some(delivery);
        let back = step.kind == StepKind::Back;
        handoff.updated_at = now;
        if newest != Some(at) {
            return true;
        }
        // Ended with them on their way (#316): it says they never arrived.
        if !handoff.live() {
            handoff
                .steps
                .push(Step::new(now, StepKind::Fail, Some(reason)).by_auto());
            return true;
        }
        handoff.queued_at = None;
        if back && handoff.phase == Phase::Returned {
            handoff.enter(Phase::Replied, now);
        }
        if !self.stop(id, reason, true, now) {
            if let Some(handoff) = self.live_mut(id) {
                handoff
                    .steps
                    .push(Step::new(now, StepKind::Fail, Some(reason)));
            }
        }
        true
    }
    /// The person spoke up since words last went back to Claude, which
    /// hands over again (#258): its rounds count from one again.
    pub fn restart_rounds(&mut self, id: &str) -> bool {
        let Some(handoff) = self.live_mut(id) else {
            return false;
        };
        handoff.rounds_from = handoff.steps.len();
        true
    }
    /// The auto round trip met an error (`text`: what failed and what it did
    /// about it); the phase stays.
    pub fn trouble(&mut self, id: &str, text: &str, now: i64) -> bool {
        let Some(handoff) = self.live_mut(id) else {
            return false;
        };
        handoff
            .steps
            .push(Step::new(now, StepKind::Fail, Some(text)).by_auto());
        handoff.updated_at = now;
        true
    }
    /// The auto round trip stops for `reason`; the person carries on. `auto`
    /// when it stopped itself, not paused by the person.
    pub fn stop(&mut self, id: &str, reason: &str, auto: bool, now: i64) -> bool {
        let Some(handoff) = self.live_mut(id).filter(|h| h.auto) else {
            return false;
        };
        handoff.auto = false;
        handoff.halt = Some(reason.to_owned());
        let step = Step::new(now, StepKind::Stop, Some(reason));
        handoff.steps.push(if auto { step.by_auto() } else { step });
        handoff.updated_at = now;
        true
    }
    /// Claude came back with evidence to a review paused for it (a 思维评审,
    /// #209; an engineering 「证据不足暂停」, #217): the auto round trip is on
    /// again, and that paused review does not count toward its rounds.
    pub fn evidence_in(&mut self, id: &str, now: i64) -> bool {
        let Some(handoff) = self.live_mut(id).filter(|h| !h.auto) else {
            return false;
        };
        handoff.auto = true;
        handoff.halt = None;
        handoff
            .steps
            .push(Step::new(now, StepKind::Resume, None).by_auto());
        handoff.updated_at = now;
        true
    }
    /// The person turns the auto round trip back on. Its waits start afresh
    /// (#223): counted from before, `overdue` would stop it again at once.
    pub fn resume(&mut self, id: &str, now: i64) -> bool {
        let Some(handoff) = self.live_mut(id).filter(|h| !h.auto) else {
            return false;
        };
        handoff.auto = true;
        handoff.halt = None;
        handoff.phase_at = now;
        if handoff.queued_at.is_some() {
            handoff.queued_at = Some(now);
        }
        handoff.steps.push(Step::new(now, StepKind::Resume, None));
        handoff.updated_at = now;
        true
    }
    /// Auto round trips waiting too long stop: ChatGPT not answering, by
    /// what it was last seen doing (`Handoff::waited_out`), words queued for
    /// a session not taken within `QUEUE_WAIT_MS` (`no_wake`). Not one back with Claude (owner,
    /// 2026-11-22, #507): two hours stopped it, all 7 times with the session
    /// still mending; one never handed over again ends in a day (`idle`).
    pub fn overdue(&mut self, now: i64, no_answer: &str, no_wake: &str) -> bool {
        let late = self
            .list
            .iter()
            .filter(|h| h.auto && h.status == Status::Open)
            .filter_map(|h| match h.phase {
                Phase::Delivered | Phase::Working => {
                    h.waited_out(now, no_answer).map(|why| (h.id.clone(), why))
                }
                Phase::Returned if h.queued_at.is_some_and(|at| now - at > QUEUE_WAIT_MS) => {
                    Some((h.id.clone(), no_wake.to_owned()))
                }
                _ => None,
            })
            .collect::<Vec<_>>();
        for (id, reason) in &late {
            if self.stop(id, reason, true, now) && reason != no_wake {
                self.caused_last(id, Cause::NoAnswer);
            }
        }
        !late.is_empty()
    }
    /// The app started again. Auto round trips stay as they were (owner,
    /// 2026-11-14: they used to pause, and the person turned each back on):
    /// an answer goes back only from 「回信已到」 and once, as its step
    /// records it, so a restart does not send it twice. A background run
    /// from before is no longer followed.
    pub fn restarted(&mut self) -> bool {
        self.forget_runs()
    }
    /// Words went across once more.
    #[cfg(test)]
    pub fn round(&mut self, id: &str, now: i64) -> bool {
        let Some(handoff) = self.get_mut(id).filter(|h| h.live()) else {
            return false;
        };
        handoff.rounds += 1;
        handoff.updated_at = now;
        true
    }
    /// Reviews counted against handoff `id`'s cap, its chain's newer
    /// handoffs included (#217): a session going on with its own handoff
    /// after another session reviewed the same chain sees those too.
    pub fn pr_counted(&self, id: &str) -> u32 {
        let Some(handoff) = self.get(id) else {
            return 0;
        };
        let newest = self.earlier(id, handoff.pr.as_deref(), handoff.gate.chain.as_deref());
        handoff.counted().max(newest.map_or(0, |e| e.period))
    }
    /// Sets a new engineering handoff's risk level, pull request and review
    /// chain (#217, #347): `chain` named, or the pull request's earlier
    /// one; their reviews count on, and its first step says so.
    pub fn rule(
        &mut self,
        id: &str,
        risk: Option<Risk>,
        pr: Option<&str>,
        chain: Option<&str>,
    ) -> bool {
        let earlier = self.earlier(id, pr, chain);
        if self.get(id).is_none_or(Handoff::thinking) {
            return false;
        }
        if let Some(e) = &earlier {
            self.close_others(&e.chain, id);
        }
        let Some(handoff) = self.live_mut(id) else {
            return false;
        };
        handoff.risk = risk;
        handoff.pr = pr.map(str::to_owned);
        let joined = earlier
            .as_ref()
            .map_or_else(|| chain::chain_id(id), |e| e.chain.clone());
        handoff.gate.chain = Some(joined.clone());
        let mut notes = vec![];
        if let Some(risk) = risk {
            notes.push(format!("{risk:?}"));
        }
        if let Some(e) = earlier.filter(|e| e.total > 0) {
            handoff.carried = e.period;
            handoff.gate.chain_carried = e.total;
            notes.push(l10n::text(
                &format!("续审 · 原单 {} · 审查链 {joined} 已审 {} 次", e.id, e.total),
                &format!(
                    "Follow-up · first handoff {} · chain {joined}, {} reviewed",
                    e.id, e.total
                ),
            ));
        }
        if let Some(first) = handoff.steps.first_mut().filter(|_| !notes.is_empty()) {
            let text = first.text.take().unwrap_or_default();
            notes.push(text);
            first.text = Some(notes.join(" · "));
        }
        true
    }
    /// The person allowed one review past the budget (#217): `reason` says
    /// who allowed it and why; the auto round trip is on again for it, its
    /// waits starting afresh as on 「继续自动」 (#223).
    pub fn allow_extra(&mut self, id: &str, reason: &str, now: i64) -> bool {
        let Some(handoff) = self.live_mut(id) else {
            return false;
        };
        // A new leave (#347): its reviews count from one again.
        handoff.extra += 1;
        handoff.rounds_from = handoff.steps.len();
        handoff.auto = true;
        handoff.halt = None;
        handoff.phase_at = now;
        if handoff.queued_at.is_some() {
            handoff.queued_at = Some(now);
        }
        let text = l10n::text(
            &format!("专项续审：{}", reason.trim()),
            &format!("Extra review: {}", reason.trim()),
        );
        handoff
            .steps
            .push(Step::new(now, StepKind::Work, Some(&text)));
        handoff.updated_at = now;
        true
    }
    /// Keeps the newest `KEEP`, and the briefs of the newest few; ended
    /// handoffs' answers are cut where they are kept whole (`slim_kept`).
    fn trim(&mut self) {
        if self.list.len() > KEEP {
            let extra = self.list.len() - KEEP;
            self.list.drain(..extra);
        }
        let mut briefs = 0;
        for handoff in self.list.iter_mut().rev() {
            if handoff.brief.is_some() {
                briefs += 1;
                if briefs > BRIEFS_KEPT && handoff.status != Status::Opening {
                    handoff.brief = None;
                }
            }
        }
    }
}

/// `text` cut to `limit` characters, with an ellipsis when cut.
fn excerpt(text: &str, limit: usize) -> String {
    if text.chars().count() <= limit {
        return text.to_owned();
    }
    let mut cut = text.chars().take(limit).collect::<String>();
    cut.push('…');
    cut
}

/// Words' fingerprint, so the same words are not sent twice in a row.
/// `text` without a delivery label before it (「[Agent HUD · …]」 and a
/// blank line). Not the phone's: words under it are the person's own.
fn unlabelled(text: &str) -> &str {
    let text = text.trim_start();
    match text.split_once("]\n\n") {
        Some((label, rest))
            if label.starts_with("[Agent HUD · ")
                && !label.contains('\n')
                && !text.starts_with("[Agent HUD · iPhone]") =>
        {
            rest
        }
        _ => text,
    }
}

fn key(text: &str) -> String {
    use std::hash::{Hash, Hasher};
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    text.trim().hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}

/// A review's numbered points and its verdict (「结论：通过 / 需修改」).
pub fn review(reply: &str) -> (Vec<String>, Option<Verdict>) {
    let clean = |text: &str| {
        text.replace("**", "")
            .replace("__", "")
            .trim()
            .trim_end_matches(['；', ';'])
            .to_owned()
    };
    let mut verdict = None;
    for line in reply.lines().rev() {
        let line = clean(line);
        let lowered = line.to_lowercase();
        let after = ["结论：", "结论:", "verdict:"]
            .iter()
            .find_map(|label| lowered.find(label).map(|at| &lowered[at + label.len()..]));
        if let Some(after) = after {
            verdict = if after.contains("需修改")
                || after.contains("需要修改")
                || after.contains("changes")
                || after.contains("revise")
            {
                Some(Verdict::Revise)
            } else if after.contains("通过") || after.contains("pass") || after.contains("approve")
            {
                Some(Verdict::Pass)
            } else {
                None
            };
            if verdict.is_some() {
                break;
            }
        }
    }
    let item = |line: &str, numbered: bool| -> Option<String> {
        let indent = line.len() - line.trim_start().len();
        if indent > 3 {
            return None;
        }
        let line = line.trim_start();
        let rest = if numbered {
            let digits = line.bytes().take_while(u8::is_ascii_digit).count();
            if digits == 0 || digits > 2 {
                return None;
            }
            let rest = &line[digits..];
            ['.', '、', ')', '）']
                .iter()
                .find_map(|mark| rest.strip_prefix(*mark))?
        } else {
            ["- ", "* ", "• "]
                .iter()
                .find_map(|mark| line.strip_prefix(mark))?
        };
        let text = clean(rest);
        (!text.is_empty() && !text.starts_with("结论")).then(|| excerpt(&text, 200))
    };
    let mut points = reply
        .lines()
        .filter_map(|line| item(line, true))
        .take(12)
        .collect::<Vec<_>>();
    if points.is_empty() {
        points = reply
            .lines()
            .filter_map(|line| item(line, false))
            .take(12)
            .collect();
    }
    (points, verdict)
}

/// A 思维评审 answer's way out (#209), from its last two lines only: the
/// last 「结论：通过 / 需修改 / 交常浩裁决」, the one before 「评审出口：…」,
/// the two going together. Nothing higher up counts, not even an earlier
/// 「结论：」.
pub fn exit(reply: &str) -> Result<Exit, Flaw> {
    let mut lines = reply
        .lines()
        .rev()
        .map(|line| line.replace("**", "").replace("__", ""))
        .map(|line| line.trim().to_owned())
        .filter(|line| !line.is_empty());
    let value = |line: Option<String>, label: &str| -> Option<String> {
        let line = line?;
        let rest = [format!("{label}："), format!("{label}:")]
            .iter()
            .find_map(|label| line.strip_prefix(label.as_str()).map(str::to_owned))?;
        Some(
            rest.trim()
                .trim_end_matches(['；', ';', '。', '.'])
                .trim()
                .to_owned(),
        )
    };
    let verdict = value(lines.next(), "结论").ok_or(Flaw::NoVerdict)?;
    let verdict = match verdict.as_str() {
        "通过" => Some(Verdict::Pass),
        "需修改" => Some(Verdict::Revise),
        "交常浩裁决" => None,
        _ => return Err(Flaw::UnknownVerdict),
    };
    let way = match value(lines.next(), "评审出口")
        .ok_or(Flaw::NoExit)?
        .as_str()
    {
        "成熟退出" => Exit::Mature,
        "转其他路径" => Exit::OtherPath,
        "继续深化" => Exit::Deepen,
        "证据不足暂停" => Exit::NeedEvidence,
        "决策升级" => Exit::Escalate,
        _ => return Err(Flaw::UnknownExit),
    };
    if way.verdict() != verdict {
        return Err(Flaw::Mismatch);
    }
    Ok(way)
}

/// A 思维评审 handoff's title (#209): it begins 「思维评审｜」.
pub fn thinking(title: &str) -> bool {
    let title = title.trim_start();
    title.starts_with("思维评审｜") || title.starts_with("思维评审|")
}

/// An engineering answer's way out (#217), from its last two lines: when
/// the one before the verdict is 「审查出口：通过 / 返修 / 证据不足暂停 /
/// 决策升级」, the last must be the verdict that goes with it (通过 with
/// 通过, the rest with 需修改). None when there is no such line: the
/// verdict alone counts, as before.
pub fn review_exit(reply: &str) -> Result<Option<Review>, Flaw> {
    let mut lines = reply
        .lines()
        .rev()
        .map(|line| line.replace("**", "").replace("__", ""))
        .map(|line| line.trim().to_owned())
        .filter(|line| !line.is_empty());
    let value = |line: &str, label: &str| -> Option<String> {
        let rest = [format!("{label}："), format!("{label}:")]
            .iter()
            .find_map(|label| line.strip_prefix(label.as_str()).map(str::to_owned))?;
        Some(
            rest.trim()
                .trim_end_matches(['；', ';', '。', '.'])
                .trim()
                .to_owned(),
        )
    };
    let last = lines.next().unwrap_or_default();
    let Some(way) = lines.next().and_then(|line| value(&line, "审查出口")) else {
        return Ok(None);
    };
    let way = match way.as_str() {
        "通过" => Review::Pass,
        "返修" => Review::Fix,
        "证据不足暂停" => Review::NeedEvidence,
        "决策升级" => Review::Escalate,
        _ => return Err(Flaw::UnknownExit),
    };
    let verdict = match value(&last, "结论").ok_or(Flaw::NoVerdict)?.as_str() {
        "通过" => Verdict::Pass,
        "需修改" => Verdict::Revise,
        _ => return Err(Flaw::UnknownVerdict),
    };
    let goes = if way == Review::Pass {
        Verdict::Pass
    } else {
        Verdict::Revise
    };
    if verdict != goes {
        return Err(Flaw::Mismatch);
    }
    Ok(Some(way))
}

fn new_id(now: i64) -> String {
    use std::sync::atomic::{AtomicU32, Ordering};
    static SEQUENCE: AtomicU32 = AtomicU32::new(0);
    let sequence = SEQUENCE.fetch_add(1, Ordering::Relaxed) & 0xff;
    format!("h{:x}{sequence:02x}", now.max(0))
}

fn handoffs_path(data: &Path) -> PathBuf {
    folder(data).join("handoffs.json")
}

/// The handoffs kept; none when there are none or they cannot be read.
pub fn load(data: &Path) -> Book {
    // Unlike project config, saved replies can take the kept history past 4 MiB.
    // Read every regular file save can write, without a smaller byte limit.
    let path = handoffs_path(data);
    let read = fs::symlink_metadata(&path)
        .ok()
        .filter(|metadata| metadata.is_file())
        .and_then(|_| fs::read(&path).ok())
        .and_then(|bytes| serde_json::from_slice::<Vec<Handoff>>(&bytes).ok());
    // Kept but unreadable (#347): set aside, never written over as empty.
    if read.is_none() && path.exists() {
        gate_io::set_aside(&path);
    }
    let mut list = read.unwrap_or_default();
    list.retain(|handoff| {
        agent_hud_runtime::claude_plugin::valid_name(&handoff.claude_session)
            && handoff
                .chatgpt_conversation
                .as_deref()
                .is_none_or(agent::conversation_id)
    });
    let mut book = Book { list };
    book.trim();
    slim_kept(data, &mut book);
    book
}
/// Replaces the kept handoffs, privately and at once.
pub fn save(data: &Path, book: &Book) -> Result<(), String> {
    let bytes = serde_json::to_vec_pretty(&book.list).map_err(|_| "Handoffs unavailable")?;
    write_private(data, "handoffs", &bytes, &handoffs_path(data))
        .map_err(|_| "The handoffs could not be saved".into())
}

/// The ChatGPT project page new review conversations open in, when one is set.
pub fn project(data: &Path) -> Option<String> {
    let bytes = read_small(&config_path(data))?;
    let config: serde_json::Value = serde_json::from_slice(&bytes).ok()?;
    config["project"]
        .as_str()
        .and_then(|url| project_url(url).ok().flatten())
}
/// Sets (or, with an empty text, clears) the project; the saved address.
pub fn set_project(data: &Path, text: &str) -> Result<Option<String>, String> {
    let project = project_url(text)?;
    // The other settings, the review cap among them (#347), stay.
    set_config(data, "project", serde_json::json!(project))
        .map_err(|_| l10n::text("项目没能保存", "The project could not be saved"))?;
    Ok(project)
}
/// A ChatGPT project page's address (`https://chatgpt.com/g/<id>/project`),
/// as pasted: None for an empty text.
pub fn project_url(text: &str) -> Result<Option<String>, String> {
    let text = text.trim();
    if text.is_empty() {
        return Ok(None);
    }
    let refused = || {
        l10n::text(
            "要填 ChatGPT 项目页的网址，形如 https://chatgpt.com/g/…/project",
            "Paste a ChatGPT project page address, like https://chatgpt.com/g/…/project",
        )
    };
    let address = text.split(['?', '#']).next().unwrap_or("");
    let address = address.strip_suffix('/').unwrap_or(address);
    let id = address
        .strip_prefix("https://chatgpt.com/g/")
        .and_then(|rest| rest.strip_suffix("/project"))
        .ok_or_else(refused)?;
    let valid = !id.is_empty()
        && id.len() <= 200
        && id
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_' | b'%'));
    if !valid {
        return Err(refused());
    }
    Ok(Some(format!("https://chatgpt.com/g/{id}/project")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_session_and_a_conversation_belong_to_one_live_handoff() {
        let mut book = Book::default();
        let first = book.begin("s1", Some("/w"), " 修登录 ", None, "brief", 10);
        assert_eq!(first.status, Status::Opening);
        assert_eq!(first.title, "修登录");
        assert_eq!(book.for_session("s1").unwrap().id, first.id);
        assert!(book.opened(&first.id, "c1", 11));
        assert!(
            !book.opened(&first.id, "c2", 12),
            "only an opening one opens"
        );
        assert_eq!(book.for_conversation("c1").unwrap().id, first.id);
        assert!(book.round(&first.id, 13));
        assert_eq!(book.get(&first.id).unwrap().rounds, 1);
        assert_eq!(book.get(&first.id).unwrap().phase, Phase::Delivered);
        assert!(
            book.get(&first.id).unwrap().brief.is_none(),
            "an open one drops its brief"
        );
        // A new review of the same session closes the one before.
        let second = book.begin("s1", Some("/w"), "修登录", None, "brief", 20);
        assert_ne!(second.id, first.id);
        assert_eq!(book.get(&first.id).unwrap().status, Status::Closed);
        assert!(book.for_conversation("c1").is_none());
        assert!(!book.round(&first.id, 21));
        assert_eq!(book.for_session("s1").unwrap().id, second.id);
        // Another session's handoff that ends up with the same conversation
        // takes it from the one before.
        let other = book.begin("s2", None, "别的", None, "brief", 30);
        assert!(book.opened(&second.id, "c9", 31));
        assert!(book.opened(&other.id, "c9", 32));
        assert_eq!(book.get(&second.id).unwrap().status, Status::Closed);
        assert_eq!(book.for_conversation("c9").unwrap().id, other.id);
    }

    #[test]
    fn a_review_that_did_not_open_says_why_and_frees_the_session() {
        let mut book = Book::default();
        let handoff = book.begin("s1", None, "t", None, "brief", 1);
        assert!(book.failed(&handoff.id, "timeout", 2));
        let failed = book.get(&handoff.id).unwrap();
        assert_eq!(failed.status, Status::Failed);
        assert_eq!(failed.error.as_deref(), Some("timeout"));
        assert!(book.for_session("s1").is_none());
        assert!(!book.failed(&handoff.id, "again", 3));
    }

    #[test]
    fn handoffs_are_kept_between_runs_newest_two_hundred() {
        let temp = tempfile::tempdir().unwrap();
        let data = temp.path().join("data");
        assert!(load(&data).list.is_empty());
        let mut book = Book::default();
        for at in 0..(KEEP as i64 + 5) {
            book.begin(&format!("s{at}"), None, "t", None, "brief", at);
        }
        assert_eq!(book.list.len(), KEEP);
        assert_eq!(book.list[0].claude_session, "s5");
        let last = book.list.last().unwrap().id.clone();
        assert!(book.opened(&last, "c-1", 999));
        save(&data, &book).unwrap();
        assert_eq!(load(&data), book);
        // A handoff naming a session or conversation that cannot be one is dropped.
        let mut forged = book.clone();
        forged.list[0].claude_session = "../x".into();
        save(&data, &forged).unwrap();
        assert_eq!(load(&data).list.len(), KEEP - 1);
    }

    #[test]
    fn saved_long_replies_survive_restart_and_the_next_save() {
        let temp = tempfile::tempdir().unwrap();
        for (name, character) in [
            ("ascii", "a"),
            ("chinese", "测"),
            ("emoji", "🦀"),
            ("escaped", "\0"),
        ] {
            let data = temp.path().join(name);
            let reply = character.repeat(REPLY_KEPT);
            let mut book = Book::default();
            for at in 0..24 {
                let handoff = book.begin(&format!("s{at}"), None, "t", None, "brief", at);
                let conversation = format!("c-{at}");
                assert!(book.opened(&handoff.id, &conversation, 24));
                assert!(book.replied(&conversation, &reply, Some("m1"), 25));
            }
            save(&data, &book).unwrap();
            let bytes = fs::metadata(handoffs_path(&data)).unwrap().len();
            assert_eq!(bytes > 4 * 1024 * 1024, name != "ascii", "{name}");
            let mut restarted = load(&data);
            println!(
                "{name}: saved=24 bytes={bytes} loaded={}",
                restarted.list.len()
            );
            assert_eq!(
                restarted.list.len(),
                24,
                "{name}: all saved handoffs reload"
            );
            assert!(restarted == book, "{name}: replies and state reload intact");
            let next = restarted.begin("next", None, "next", None, "brief", 26);
            save(&data, &restarted).unwrap();
            let saved_again = load(&data);
            assert_eq!(
                saved_again.list.len(),
                25,
                "{name}: the new handoff is saved"
            );
            assert_eq!(saved_again.get(&next.id), Some(&next));
            assert!(
                saved_again.list[..24] == book.list,
                "{name}: the next save keeps the history"
            );
        }
    }

    #[test]
    fn the_project_is_a_chatgpt_project_page() {
        let temp = tempfile::tempdir().unwrap();
        let data = temp.path().join("data");
        assert_eq!(project(&data), None);
        let page = "https://chatgpt.com/g/g-p-0123abcd-review/project";
        assert_eq!(project_url(page).unwrap().as_deref(), Some(page));
        assert_eq!(
            project_url(&format!("  {page}/?tab=chats#x "))
                .unwrap()
                .as_deref(),
            Some(page)
        );
        assert_eq!(project_url("  ").unwrap(), None);
        for wrong in [
            "http://chatgpt.com/g/g-p-1/project",
            "https://chatgpt.com/c/68a1",
            "https://chatgpt.com/g//project",
            "https://chatgpt.com/g/a/b/project",
            "https://evil.example/g/g-p-1/project",
            "https://chatgpt.com.evil.example/g/g-p-1/project",
        ] {
            assert!(project_url(wrong).is_err(), "{wrong}");
        }
        assert_eq!(set_project(&data, page).unwrap().as_deref(), Some(page));
        assert_eq!(project(&data).as_deref(), Some(page));
        assert!(set_project(&data, "https://chatgpt.com/c/1").is_err());
        assert_eq!(project(&data).as_deref(), Some(page), "a refusal keeps it");
        assert_eq!(set_project(&data, "").unwrap(), None);
        assert_eq!(project(&data), None);
    }

    #[test]
    fn each_step_is_kept_with_who_did_what_and_the_verdict() {
        let mut book = Book::default();
        let handoff = book.begin(
            "s1",
            None,
            "修登录",
            Some("改了 6 个文件 · 测试全过"),
            "请审核",
            1,
        );
        assert_eq!(handoff.phase, Phase::Sending);
        assert!(book.opened(&handoff.id, "c1", 2));
        assert!(
            book.asked_already(&handoff.id, " 请审核 "),
            "the same words are not sent again"
        );
        assert!(book.working("c1", 3));
        assert_eq!(book.get(&handoff.id).unwrap().phase, Phase::Working);
        let reply = "看了改动：\n\n1. **会话认不准**时不该猜；\n2. opening 要超时\n   - 子项不算\n3) 区分送到和审完\n\n结论：需修改";
        assert!(book.replied("c1", reply, Some("m1"), 4));
        assert!(
            !book.replied("c1", reply, Some("m1"), 4),
            "the same message once"
        );
        let kept = book.get(&handoff.id).unwrap();
        assert_eq!(kept.phase, Phase::Replied);
        let last = kept.last_reply().unwrap();
        assert_eq!(
            last.points,
            ["会话认不准时不该猜", "opening 要超时", "区分送到和审完"]
        );
        assert_eq!(last.verdict, Some(Verdict::Revise));
        assert_eq!(last.text.as_deref(), Some(reply.trim()));
        assert!(
            !book.asked_already(&handoff.id, "请审核"),
            "answered: it may go again"
        );
        assert!(
            !book.replied("c1", "随便聊聊", Some("m2"), 5),
            "answered: further chat is not the review"
        );
        assert!(book.returned(&handoff.id, StepKind::Back, "意见", "p", false, 5));
        assert!(book.returned_already(&handoff.id, "意见"));
        assert_eq!(book.get(&handoff.id).unwrap().phase, Phase::Returned);
        assert!(book.asked(&handoff.id, Some("按意见改完"), "第二轮", 6));
        let kept = book.get(&handoff.id).unwrap();
        assert_eq!(kept.reviews(), 2);
        let kinds = kept.steps.iter().map(|step| step.kind).collect::<Vec<_>>();
        assert_eq!(
            kinds,
            [
                StepKind::Work,
                StepKind::Ask,
                StepKind::Reply,
                StepKind::Back,
                StepKind::Work,
                StepKind::Ask
            ]
        );
        assert_eq!(
            kept.steps[0].text.as_deref(),
            Some("改了 6 个文件 · 测试全过")
        );
        // The snapshot carries neither the brief nor what was sent hashed;
        // an answer keeps its ChatGPT message id, which its receipt names
        // too (#411 L2 P2-01).
        let shown = kept.shown();
        assert!(shown
            .steps
            .iter()
            .all(|step| step.kind == StepKind::Reply || step.key.is_none()));
        let answer = shown
            .steps
            .iter()
            .find(|step| step.kind == StepKind::Reply)
            .unwrap();
        assert_eq!(answer.key.as_deref(), Some("m1"));
        // Nor the words of a review on its way, or of an ask to mend (#409).
        let mut sending = kept.clone();
        let words = || unsure::Pending {
            request: "r1".into(),
            words: Some("送审原文".into()),
            key: "k1".into(),
            ..unsure::Pending::default()
        };
        (sending.gate.pending, sending.gate.mending) = (Some(words()), Some(words()));
        let shown = sending.shown().gate;
        for pending in [shown.pending.unwrap(), shown.mending.unwrap()] {
            assert_eq!(
                (
                    pending.request.as_str(),
                    pending.words,
                    pending.key.as_str()
                ),
                ("r1", None, "")
            );
        }
        assert!(book.end(&handoff.id, 7));
        let ended = book.get(&handoff.id).unwrap();
        assert_eq!((ended.status, ended.phase), (Status::Closed, Phase::Ended));
        assert!(book.for_conversation("c1").is_none());
    }

    /// An open handoff, its first review asked at 3.
    fn asked_once(book: &mut Book) -> String {
        let handoff = book.begin("s1", None, "修登录", None, "请审核", 1);
        book.opened(&handoff.id, "c1", 2);
        handoff.id
    }

    #[test]
    fn a_pass_ends_the_handoff_even_with_the_auto_round_trip_off() {
        // Owner, 2026-11-07: a passed review left open kept the 「回」 seal up.
        let mut book = Book::default();
        let id = asked_once(&mut book);
        assert!(book.stop(&id, "驿窗重启，自动往返先暂停", true, 3));
        book.replied("c1", "都改好了\n审查出口：通过\n结论：通过", Some("m1"), 4);
        assert_eq!(book.get(&id).unwrap().next(), Some(Next::Pass));
        // A revise with it off still waits for the person.
        let mut book = Book::default();
        let id = asked_once(&mut book);
        assert!(book.stop(&id, "停", true, 3));
        book.replied("c1", FIX, Some("m1"), 4);
        assert_eq!(book.get(&id).unwrap().next(), None);
    }

    #[test]
    fn the_auto_round_trip_sends_back_a_revise_ends_at_a_pass_and_stops_at_the_limit() {
        let mut book = Book::default();
        let id = asked_once(&mut book);
        assert!(book.set_limit(&id, 2));
        let kept = book.get(&id).unwrap();
        assert!(kept.auto, "a new handoff goes round by itself");
        assert_eq!(kept.next(), None, "nothing to do before an answer");
        book.replied("c1", FIX, Some("m1"), 4);
        assert_eq!(book.get(&id).unwrap().next(), Some(Next::Back));
        assert!(book.returned(&id, StepKind::Back, "意见", "p", true, 5));
        let back = book.get(&id).unwrap().steps.last().unwrap().clone();
        assert!(back.auto, "the step says the machine did it");
        assert_eq!(book.get(&id).unwrap().next(), None);
        // Round 2 still needs changes: the last round, the person decides.
        book.asked(&id, Some("按意见改完"), "第二轮", 6);
        book.replied(
            "c1",
            "1. 还差一点\n审查出口：返修\n结论：需修改",
            Some("m2"),
            7,
        );
        assert_eq!(book.get(&id).unwrap().next(), Some(Next::Limit));
        assert!(book.stop(&id, "已审 2 轮仍需修改", true, 8));
        let kept = book.get(&id).unwrap();
        assert!(!kept.auto && kept.live());
        assert_eq!(kept.halt.as_deref(), Some("已审 2 轮仍需修改"));
        assert_eq!(kept.steps.last().unwrap().kind, StepKind::Stop);
        assert_eq!(kept.next(), None, "stopped: nothing by itself");
        assert!(!book.stop(&id, "again", true, 9), "stops once");
        // The person turns it back on.
        assert!(book.resume(&id, 9));
        let kept = book.get(&id).unwrap();
        assert!(kept.auto && kept.halt.is_none());
        assert_eq!(kept.steps.last().unwrap().kind, StepKind::Resume);

        // A pass ends it; no verdict leaves it to the person.
        let mut book = Book::default();
        let id = asked_once(&mut book);
        book.replied("c1", "都改好了\n审查出口：通过\n结论：通过", Some("m1"), 4);
        assert_eq!(book.get(&id).unwrap().next(), Some(Next::Pass));
        assert!(book.passed(&id, "通过", 5));
        let ended = book.get(&id).unwrap();
        assert_eq!((ended.status, ended.phase), (Status::Closed, Phase::Ended));
        assert!(ended.steps.last().unwrap().auto);
        let mut book = Book::default();
        let id = asked_once(&mut book);
        book.replied("c1", "我看了一下，挺好的", Some("m1"), 4);
        assert_eq!(book.get(&id).unwrap().next(), Some(Next::Format));
        assert!(book.format_asked(&id, "请补写末尾几行", 5));
        book.replied("c1", "还是挺好的", Some("m2"), 6);
        assert_eq!(book.get(&id).unwrap().next(), Some(Next::NoVerdict));
    }

    // Owner chose 甲 on 2026-11-14: handoffs left with the person end after a
    // day untouched; one still moving, or touched lately, stays.
    #[test]
    fn handoffs_left_a_day_untouched_end_themselves() {
        let mut book = Book::default();
        let id = asked_once(&mut book);
        book.replied("c1", "结论：需修改", Some("m1"), 4);
        assert!(
            !book.idle(4 + IDLE_END_MS, "闲置"),
            "a day to the minute stays"
        );
        assert!(book.idle(5 + IDLE_END_MS, "闲置"));
        let ended = book.get(&id).unwrap();
        assert_eq!(ended.status, Status::Closed);
        assert_eq!(ended.phase, Phase::Ended);
        let last = ended.steps.last().unwrap();
        assert_eq!(last.kind, StepKind::End);
        assert_eq!(last.text.as_deref(), Some("闲置"));
        assert!(last.auto);
        // Still with ChatGPT and not stopped: it is not left with the person.
        let mut book = Book::default();
        let id = asked_once(&mut book);
        assert!(!book.idle(10 + IDLE_END_MS, "闲置"));
        assert!(book.get(&id).unwrap().live());
    }

    // #223: 「继续自动」 after a long wait starts the wait afresh, rather
    // than the next snapshot stopping it again at once.
    #[test]
    fn resuming_after_a_long_wait_counts_the_wait_from_then() {
        let reasons = ("30 分钟没回信", "排队没人领");
        let overdue = |book: &mut Book, now| book.overdue(now, reasons.0, reasons.1);
        let mut book = Book::default();
        let id = asked_once(&mut book);
        let late = 3 + REPLY_WAIT_MS;
        assert!(overdue(&mut book, late));
        assert!(book.resume(&id, late + 1));
        assert!(!overdue(&mut book, late + 2));
        assert!(book.get(&id).unwrap().auto);
        assert!(overdue(&mut book, late + 2 + REPLY_WAIT_MS));
        // Its answer queued for Claude: the hour to be taken up starts again too.
        let mut book = Book::default();
        let id = asked_once(&mut book);
        book.replied("c1", "结论：需修改", Some("m1"), 4);
        book.returned(&id, StepKind::Back, "意见", "p", true, 5);
        book.queued(&id, 5);
        let late = 6 + QUEUE_WAIT_MS;
        assert!(overdue(&mut book, late));
        assert!(book.resume(&id, late + 1));
        assert!(!overdue(&mut book, late + 2));
        assert_eq!(book.get(&id).unwrap().queued_at, Some(late + 1));
    }

    #[test]
    fn an_auto_round_trip_waiting_too_long_or_across_a_restart_stops() {
        let mut book = Book::default();
        let id = asked_once(&mut book);
        // Asked at 2 (opened): ChatGPT has REPLY_WAIT_MS to answer.
        assert!(!book.overdue(2 + REPLY_WAIT_MS, "30 分钟没回信", "排队没人领"));
        assert!(book.overdue(3 + REPLY_WAIT_MS, "30 分钟没回信", "排队没人领"));
        let kept = book.get(&id).unwrap();
        assert!(!kept.auto);
        assert!(kept.halt.as_deref().unwrap().contains("30 分钟没回信"));
        assert!(kept.steps.last().unwrap().auto);
        // Back with Claude: FIX_WAIT_MS to hand over again.
        let mut book = Book::default();
        let id = asked_once(&mut book);
        book.replied("c1", "结论：需修改", Some("m1"), 4);
        book.returned(&id, StepKind::Back, "意见", "p", true, 5);
        // The round trip goes on however long Claude mends (#507).
        assert!(!book.overdue(6 + 10 * FIX_WAIT_MS, "30 分钟没回信", "排队没人领"));
        let kept = book.get(&id).unwrap();
        assert!(kept.auto && kept.halt.is_none());
        // A handoff paused by the person is not overdue.
        let mut book = Book::default();
        let id = asked_once(&mut book);
        book.stop(&id, "常浩暂停", false, 3);
        assert!(!book.overdue(10 * REPLY_WAIT_MS, "30 分钟没回信", "排队没人领"));
        assert!(!book.get(&id).unwrap().steps.last().unwrap().auto);
        // A restart leaves the auto round trip as it was (owner, 2026-11-14:
        // it used to pause every one still on, and the person had to turn
        // each back on).
        let mut book = Book::default();
        let on = asked_once(&mut book);
        let off = book.begin("s2", None, "别的", None, "请审核", 1).id;
        book.opened(&off, "c2", 2);
        book.stop(&off, "常浩暂停", false, 3);
        assert!(!book.restarted());
        let kept = book.get(&on).unwrap();
        assert!(kept.auto && kept.halt.is_none());
        assert_eq!(book.get(&off).unwrap().halt.as_deref(), Some("常浩暂停"));
        // Records from before #72 load with it off.
        let old: Handoff = serde_json::from_value(serde_json::json!({
            "id":"h1","title":"t","claudeSession":"s","status":"open",
            "createdAt":1,"updatedAt":1
        }))
        .unwrap();
        assert!(!old.auto && old.halt.is_none());
    }

    #[test]
    fn a_verdict_and_points_are_read_however_they_are_written() {
        assert_eq!(review("都很好。\n结论：通过").1, Some(Verdict::Pass));
        assert_eq!(review("**结论:** 需要修改").1, Some(Verdict::Revise));
        assert_eq!(review("Verdict: pass").1, Some(Verdict::Pass));
        assert_eq!(review("没有结论").1, None);
        let (points, _) = review("- 第一条\n- 第二条\n结论：通过");
        assert_eq!(points, ["第一条", "第二条"]);
        assert!(review("1. 结论：通过").0.is_empty());
    }

    #[test]
    fn a_thinking_review_is_read_from_its_last_two_lines_only() {
        assert_eq!(
            exit("意见\n评审出口：成熟退出\n结论：通过"),
            Ok(Exit::Mature)
        );
        assert_eq!(
            exit("意见\n\n**评审出口:** 转其他路径  \n  **结论:** 通过；\n\n"),
            Ok(Exit::OtherPath)
        );
        assert_eq!(exit("评审出口：继续深化\n结论：需修改"), Ok(Exit::Deepen));
        assert_eq!(
            exit("评审出口：证据不足暂停\n结论：需修改"),
            Ok(Exit::NeedEvidence)
        );
        assert_eq!(
            exit("评审出口：决策升级\n结论：交常浩裁决"),
            Ok(Exit::Escalate)
        );
        // T2: an earlier 「结论：通过」 in the body never counts.
        assert_eq!(
            exit("上一轮写过：\n结论：通过\n评审出口：决策升级\n结论：交常浩裁决"),
            Ok(Exit::Escalate)
        );
        // T8: missing, unknown or at odds — none holds.
        assert_eq!(
            exit("评审出口：成熟退出\n结论：通过\n补充一句"),
            Err(Flaw::NoVerdict)
        );
        assert_eq!(
            exit("评审出口：成熟退出\n结论：挺好"),
            Err(Flaw::UnknownVerdict)
        );
        assert_eq!(exit("结论：通过"), Err(Flaw::NoExit));
        assert_eq!(exit("意见\n结论：通过"), Err(Flaw::NoExit));
        assert_eq!(exit("评审出口：收工\n结论：通过"), Err(Flaw::UnknownExit));
        assert_eq!(
            exit("评审出口：成熟退出\n结论：需修改"),
            Err(Flaw::Mismatch)
        );
        assert_eq!(exit("评审出口：决策升级\n结论：通过"), Err(Flaw::Mismatch));

        // The verdict kept for the card is the strict one.
        let mut book = Book::default();
        let handoff = book.begin("s1", None, "思维评审|方案", None, "请评审", 1);
        assert!(book.get(&handoff.id).unwrap().thinking());
        book.opened(&handoff.id, "c1", 2);
        book.replied(
            "c1",
            "结论：通过\n评审出口：决策升级\n结论：交常浩裁决",
            Some("m1"),
            3,
        );
        let handoff = book.get(&handoff.id).unwrap();
        assert_eq!(handoff.last_reply().unwrap().verdict, None);
        assert_eq!(handoff.next(), Some(Next::Escalate));
        let other = Book::default().begin("s2", None, "修登录", None, "请审核", 1);
        assert!(!other.thinking());
    }

    #[test]
    fn an_opening_that_times_out_or_is_cut_off_fails_and_can_be_retried() {
        let mut book = Book::default();
        let first = book.begin("s1", None, "t", None, "brief one", 0);
        assert!(!book.expire(OPEN_TIMEOUT_MS, "timeout"));
        assert!(book.expire(OPEN_TIMEOUT_MS + 1, "timeout"));
        let failed = book.get(&first.id).unwrap();
        assert_eq!(
            (failed.status, failed.phase),
            (Status::Failed, Phase::Failed)
        );
        assert_eq!(failed.steps.last().unwrap().kind, StepKind::Fail);
        let old = book.get(&first.id).unwrap().request();
        assert_eq!(book.retry(&first.id, 200_000).as_deref(), Some("brief one"));
        assert_ne!(
            book.get(&first.id).unwrap().request(),
            old,
            "a retry is a new request"
        );
        assert_eq!(book.get(&first.id).unwrap().status, Status::Opening);
        // The app restarted while it opened.
        assert!(book.interrupted(200_001, "restarted"));
        assert_eq!(
            book.get(&first.id).unwrap().error.as_deref(),
            Some("restarted")
        );
        // The first try's late answer binds nothing; the current try's does.
        assert!(!book.opened_late(&old, "c0", 200_002));
        let current = book.get(&first.id).unwrap().request();
        assert!(book.opened_late(&current, "c1", 200_002));
        assert_eq!(book.get(&first.id).unwrap().status, Status::Open);
        assert!(
            book.retry(&first.id, 1).is_none(),
            "only a failed one retries"
        );
    }

    #[test]
    fn a_failed_one_is_not_bound_late_once_its_session_moved_on() {
        let mut book = Book::default();
        let old = book.begin("s1", None, "t", None, "one", 0);
        book.failed(&old.id, "timeout", 1);
        let newer = book.begin("s1", None, "t", None, "two", 2);
        assert!(!book.opened_late(&old.request(), "c-old", 3));
        assert!(book.opened_late(&newer.request(), "c-new", 3));
    }

    #[test]
    fn a_failed_one_stays_down_once_a_newer_one_failed_too() {
        let mut book = Book::default();
        let old = book.begin("s1", None, "t", None, "one", 0);
        book.failed(&old.id, "timeout", 1);
        let newer = book.begin("s1", None, "t", None, "two", 2);
        book.failed(&newer.id, "timeout", 3);
        assert!(book.superseded(&old.id));
        assert!(!book.opened_late(&old.request(), "c-old", 4));
        assert!(book.opened_late(&newer.request(), "c-new", 4));
    }

    /// An engineering handoff of `risk` and pull request `pr` (#217), its
    /// review conversation open.
    fn ruled(book: &mut Book, session: &str, risk: Option<Risk>, pr: Option<&str>) -> String {
        let conversation = format!("c-{session}");
        let handoff = book.begin(session, None, "修登录", None, "请审核", 1);
        assert!(book.rule(&handoff.id, risk, pr, None));
        book.opened(&handoff.id, &conversation, 2);
        handoff.id
    }

    /// An engineering answer to revise, with its way out (#217).
    const FIX: &str = "1. 要超时\n审查出口：返修\n结论：需修改";

    #[test]
    fn the_risk_level_no_longer_sets_the_cap_and_l1_reviews_its_fix_again() {
        assert_eq!(Risk::parse(" l1 "), Some(Risk::L1));
        assert_eq!(Risk::parse("L3"), Some(Risk::L3));
        assert_eq!(Risk::parse("L0"), None, "L0 is not sent for review");
        let mut book = Book::default();
        let id = ruled(&mut book, "s1", Some(Risk::L1), None);
        let kept = book.get(&id).unwrap();
        assert_eq!(kept.budget(), LIMIT, "one cap for every level (#347)");
        assert!(kept.steps[0].text.as_deref().unwrap().starts_with("L1"));
        assert_eq!(kept.gate.chain.as_deref(), Some(chain_id(&id).as_str()));
        book.replied("c-s1", FIX, Some("m1"), 3);
        assert_eq!(
            book.get(&id).unwrap().next(),
            Some(Next::Back),
            "fixed, then reviewed"
        );
        assert!(book.set_limit(&id, 3));
        assert_eq!(book.get(&id).unwrap().budget(), 3);
        let thinking = book.begin("s4", None, "思维评审｜驿窗｜预算", None, "b", 1);
        assert!(!book.rule(&thinking.id, Some(Risk::L1), Some("a/b#1"), None));
        assert_eq!(book.get(&thinking.id).unwrap().budget(), LIMIT);
    }

    #[test]
    fn an_engineering_answer_may_end_with_its_way_out() {
        assert_eq!(
            review_exit("1. 好\n结论：需修改"),
            Ok(None),
            "the old form holds"
        );
        assert_eq!(
            review_exit("正文\n审查出口：返修\n结论：需修改"),
            Ok(Some(Review::Fix))
        );
        assert_eq!(
            review_exit("**审查出口：证据不足暂停**\n\n**结论：需修改。**\n"),
            Ok(Some(Review::NeedEvidence))
        );
        assert_eq!(
            review_exit("审查出口：决策升级\n结论：需修改"),
            Ok(Some(Review::Escalate))
        );
        assert_eq!(
            review_exit("审查出口：通过\n结论：通过"),
            Ok(Some(Review::Pass))
        );
        assert_eq!(
            review_exit("审查出口：通过\n结论：需修改"),
            Err(Flaw::Mismatch)
        );
        assert_eq!(
            review_exit("审查出口：返修\n结论：通过"),
            Err(Flaw::Mismatch)
        );
        assert_eq!(
            review_exit("审查出口：再看看\n结论：需修改"),
            Err(Flaw::UnknownExit)
        );
        assert_eq!(
            review_exit("审查出口：返修\n结论：待定"),
            Err(Flaw::UnknownVerdict)
        );
        assert_eq!(
            review_exit("审查出口：返修\n还有一句"),
            Err(Flaw::NoVerdict)
        );
    }

    #[test]
    fn a_paused_or_escalated_review_does_not_go_round_as_a_revise() {
        let mut book = Book::default();
        let id = ruled(&mut book, "s1", Some(Risk::L2), None);
        book.replied(
            "c-s1",
            "缺日志\n审查出口：证据不足暂停\n结论：需修改",
            Some("m1"),
            3,
        );
        assert_eq!(book.get(&id).unwrap().next(), Some(Next::Pause));
        // Back to Claude and stopped by itself: it waits for evidence, and
        // the evidence turns it on again without counting the paused review.
        assert!(book.returned(&id, StepKind::Back, "意见", "p", true, 4));
        assert!(book.stop(&id, "证据不足暂停", true, 5));
        assert!(book.get(&id).unwrap().waits_for_evidence());
        assert!(book.evidence_in(&id, 6));
        assert_eq!(book.get(&id).unwrap().counted(), 1, "a pause counts (#347)");
        let id = ruled(&mut book, "s2", Some(Risk::L2), None);
        book.replied(
            "c-s2",
            "要改方案\n审查出口：决策升级\n结论：需修改",
            Some("m2"),
            3,
        );
        assert_eq!(book.get(&id).unwrap().next(), Some(Next::Escalate));
        let id = ruled(&mut book, "s3", Some(Risk::L2), None);
        book.replied("c-s3", "审查出口：通过\n结论：需修改", Some("m3"), 3);
        // Asked once to mend its last lines (#347), not counted; still off.
        assert_eq!(book.get(&id).unwrap().next(), Some(Next::Format));
        assert!(book.format_asked(&id, "请补写末尾几行", 4));
        book.replied("c-s3", "审查出口：通过\n结论：需修改", Some("m3b"), 5);
        let kept = book.get(&id).unwrap();
        assert!(kept.mended() && kept.counted() == 1);
        assert_eq!(kept.next(), Some(Next::BadTail(Flaw::Mismatch)));
        assert!(book.stop(&id, "停", false, 4));
        assert_eq!(book.get(&id).unwrap().next(), None, "the person decides");
        // A way out of 通过 ends it, as a pass does.
        let id = ruled(&mut book, "s4", Some(Risk::L2), None);
        book.replied("c-s4", "审查出口：通过\n结论：通过", Some("m4"), 3);
        assert_eq!(book.get(&id).unwrap().next(), Some(Next::Pass));
    }

    #[test]
    fn a_pull_requests_reviews_count_on_in_a_new_handoff() {
        assert_eq!(
            pull_request(
                "见 https://github.com/Natsukashii1997/dt-sandbox/pull/4/files 和 /pull/5"
            ),
            Some("natsukashii1997/dt-sandbox#4".to_owned())
        );
        assert_eq!(pull_request("github.com/a/b/issues/3"), None);
        assert_eq!(pull_request("没有链接"), None);
        let mut book = Book::default();
        let first = ruled(&mut book, "s1", Some(Risk::L2), Some("a/b#4"));
        book.replied("c-s1", FIX, Some("m1"), 3);
        // Round 2 from another Claude session (SBX-8): it carries round 1,
        // and goes on the same review chain (#347).
        let second = ruled(&mut book, "s2", Some(Risk::L2), Some("a/b#4"));
        let kept = book.get(&second).unwrap();
        assert_eq!((kept.carried, kept.counted(), kept.total()), (1, 1, 1));
        assert_eq!(kept.gate.chain, book.get(&first).unwrap().gate.chain);
        assert!(kept.steps[0].text.as_deref().unwrap().contains(&first));
        book.replied("c-s2", FIX, Some("m2"), 3);
        assert_eq!(book.get(&second).unwrap().next(), Some(Next::Back));
        assert_eq!(
            book.earlier("", Some("a/b#4"), None)
                .map(|e| (e.id, e.period)),
            Some((second.clone(), 2))
        );
        // A pass PostPane let through carries nothing on by its pull
        // request; one that wrote 通过 and was held back still does (#347).
        let other = ruled(&mut book, "s3", None, Some("a/b#9"));
        book.replied("c-s3", "审查出口：通过\n结论：通过", Some("m3"), 3);
        assert_eq!(book.get(&other).unwrap().next(), Some(Next::Pass));
        let held = book.earlier("", Some("a/b#9"), None).map(|e| e.period);
        assert_eq!(held, Some(1), "not let through yet");
        assert!(book.note(&other, Notice::Passed, 4) && book.passed(&other, "通过", 4));
        assert!(book.earlier("", Some("a/b#9"), None).is_none());
        assert!(book.earlier("", Some("a/b#1"), None).is_none());
        // One chain, one open handoff: the first closed as handed over.
        let first = book.get(&first).unwrap();
        assert!(!first.live() && first.counted() == 1);
        assert_eq!(book.pr_counted(&first.id.clone()), 2);
    }

    #[test]
    fn the_persons_leave_begins_the_rounds_again() {
        let mut book = Book::default();
        let id = ruled(&mut book, "s1", Some(Risk::L1), None);
        assert!(book.set_limit(&id, 1));
        book.replied("c-s1", FIX, Some("m1"), 3);
        assert_eq!(book.get(&id).unwrap().next(), Some(Next::Limit));
        assert!(book.stop(&id, "停", true, 4));
        assert!(book.get(&id).unwrap().spent());
        assert!(book.allow_extra(&id, "常浩要求再审一次：P1 未确认", 5));
        let kept = book.get(&id).unwrap();
        assert_eq!((kept.counted(), kept.total(), kept.extra), (0, 1, 1));
        assert!(kept.auto && kept.halt.is_none());
        assert!(!kept.spent());
        let said = kept.steps.last().unwrap().text.clone().unwrap();
        assert!(said.ends_with("常浩要求再审一次：P1 未确认"), "{said}");
        // A 思维评审 keeps the same cap, and the person's leave goes past it
        // the same way (Fable review #9).
        let thinking = book.begin("s2", None, "思维评审｜x｜y", None, "b", 1);
        assert!(book.allow_extra(&thinking.id, "r", 2));
    }

    // An extra review allowed long after the round trip stopped starts its
    // waits afresh, as 「继续自动」 does (#223): on 2026-11-14 two handoffs
    // stopped with 「Claude 2 小时没交回复审」 the same minute they were
    // allowed one more review.
    #[test]
    fn an_extra_review_long_after_the_stop_counts_its_waits_from_then() {
        let reasons = ("30 分钟没回信", "排队没人领");
        let overdue = |book: &mut Book, now| book.overdue(now, reasons.0, reasons.1);
        let mut book = Book::default();
        let id = ruled(&mut book, "s1", Some(Risk::L2), None);
        book.replied("c-s1", FIX, Some("m1"), 3);
        book.returned(&id, StepKind::Back, "意见", "p", true, 4);
        book.queued(&id, 4);
        assert!(book.stop(&id, "停", true, 5));
        let late = 6 + FIX_WAIT_MS + QUEUE_WAIT_MS;
        assert!(book.allow_extra(&id, "常浩授权补审一轮", late));
        assert!(!overdue(&mut book, late + 1));
        let kept = book.get(&id).unwrap();
        assert!(kept.auto && kept.halt.is_none());
        assert_eq!(kept.queued_at, Some(late));
        assert!(overdue(
            &mut book,
            late + 1 + FIX_WAIT_MS.max(QUEUE_WAIT_MS)
        ));
    }

    /// #257: handoffs kept before words back had receipts, and before rounds
    /// could start again, read as they were; the new fields are kept.
    #[test]
    fn handoffs_kept_before_receipts_still_read() {
        let temp = tempfile::tempdir().unwrap();
        let data = temp.path().join("data");
        let old = r#"[{"id":"h1a2b3c400","title":"修登录","claudeSession":"s1","cwd":null,
            "chatgptConversation":"c1","status":"open","createdAt":1,"updatedAt":5,"rounds":2,
            "phase":"returned","phaseAt":5,"steps":[{"at":2,"kind":"ask","text":"请审核","key":"k1"},
            {"at":4,"kind":"reply","text":"1. 要超时\n结论：需修改","verdict":"revise"},
            {"at":5,"kind":"back","text":"意见","key":"k2","auto":true}],"auto":true,"queuedAt":5}]"#;
        let book = Book {
            list: serde_json::from_str(old).unwrap(),
        };
        save(&data, &book).unwrap();
        let kept = load(&data);
        let handoff = &kept.list[0];
        assert_eq!(handoff.rounds_from, 0);
        assert_eq!(handoff.doer, None);
        let back = handoff.steps.last().unwrap();
        assert_eq!((back.prompt.as_deref(), back.delivery), (None, None));
        assert_eq!(handoff.counted(), 1);
        // The new fields are kept across a restart.
        let mut book = kept.clone();
        let id = book.list[0].id.clone();
        assert!(book.returned(&id, StepKind::Again, "请复审", "h1a2b3c400-a3", false, 6));
        assert!(book.delivery(&id, "h1a2b3c400-a3", Delivery::Taken, 7));
        book.list[0].rounds_from = 3;
        save(&data, &book).unwrap();
        let text = std::fs::read_to_string(handoffs_path(&data)).unwrap();
        assert!(text.contains(r#""prompt": "h1a2b3c400-a3""#), "{text}");
        assert!(text.contains(r#""delivery": "taken""#), "{text}");
        assert!(text.contains(r#""roundsFrom": 3"#), "{text}");
        assert_eq!(load(&data), book);
    }

    /// #257: each step back to Claude has its own id, the same however many
    /// times it is tried, and a new one only once the plugin gave the words
    /// up; words given up are not 「sent already」.
    #[test]
    fn words_back_keep_one_id_until_the_plugin_gives_them_up() {
        let mut book = Book::default();
        let id = asked_once(&mut book);
        book.replied("c1", FIX, Some("m1"), 4);
        let handoff = book.get(&id).unwrap();
        let prompt = handoff.prompt_for(StepKind::Back);
        assert!(
            agent_hud_runtime::claude_plugin::valid_name(&prompt),
            "{prompt}"
        );
        assert_eq!(prompt, handoff.prompt_for(StepKind::Back), "fixed");
        assert_ne!(prompt, handoff.prompt_for(StepKind::Again));
        assert!(book.returned(&id, StepKind::Back, "意见", &prompt, true, 5));
        let back = book.get(&id).unwrap().steps.last().unwrap().clone();
        assert_eq!(back.prompt.as_deref(), Some(prompt.as_str()));
        assert_eq!(back.delivery, Some(Delivery::Waiting));
        assert!(book.returned_already(&id, "意见"));
        assert_eq!(book.get(&id).unwrap().prompt_for(StepKind::Back), prompt);
        // Taken and started: the step says so.
        assert!(book.delivery(&id, &prompt, Delivery::Taken, 6));
        assert!(!book.delivery(&id, &prompt, Delivery::Taken, 6), "once");
        assert!(book.delivery(&id, &prompt, Delivery::Started, 7));
        let kept = book.get(&id).unwrap();
        assert_eq!(kept.steps.last().unwrap().delivery, Some(Delivery::Started));
        // Given up: back with the person at once, and it may go again
        // under a new id.
        let mut book = Book::default();
        let id = asked_once(&mut book);
        book.replied("c1", FIX, Some("m1"), 4);
        let prompt = book.get(&id).unwrap().prompt_for(StepKind::Back);
        book.returned(&id, StepKind::Back, "意见", &prompt, true, 5);
        book.queued(&id, 5);
        assert!(book.undelivered(&id, &prompt, Delivery::Expired, "过期", 9));
        let kept = book.get(&id).unwrap();
        assert_eq!(
            kept.steps[kept.steps.len() - 2].delivery,
            Some(Delivery::Expired)
        );
        assert_eq!(kept.phase, Phase::Replied, "the answer waits again");
        assert!(!kept.auto && kept.halt.as_deref() == Some("过期"));
        assert_eq!(kept.queued_at, None);
        assert!(!book.returned_already(&id, "意见"));
        let again = book.get(&id).unwrap().prompt_for(StepKind::Back);
        assert_eq!(again, format!("{prompt}-1"));
    }

    /// #258: once the person spoke up since words last went back to Claude,
    /// the auto round trip counts its rounds from one again; words of
    /// PostPane's own begin no new count, and the limit stays.
    #[test]
    fn the_rounds_count_from_one_once_the_person_spoke_up() {
        use agent_hud_runtime::claude_plugin::Opener;
        let mut book = Book::default();
        let id = asked_once(&mut book);
        assert!(book.set_limit(&id, 2));
        book.replied("c1", FIX, Some("m1"), 4);
        let prompt = book.get(&id).unwrap().prompt_for(StepKind::Back);
        book.returned(&id, StepKind::Back, "意见全文", &prompt, true, 5);
        let handoff = book.get(&id).unwrap();
        assert!(!handoff.spoke_up(None), "not told: no restart");
        assert!(!handoff.spoke_up(Some(&(Opener::Person, 4))), "before");
        assert!(!handoff.spoke_up(Some(&(Opener::Plugin("意见全文".into()), 6))));
        // A delivery's label before PostPane's words leaves them PostPane's;
        // the phone's is the person's own.
        let labelled = "[Agent HUD · 来自驿窗]\n\n意见全文";
        assert!(!handoff.spoke_up(Some(&(Opener::Plugin(labelled.into()), 6))));
        let phone = "[Agent HUD · iPhone]\n\n意见全文";
        assert!(handoff.spoke_up(Some(&(Opener::Plugin(phone.into()), 6))));
        assert!(handoff.spoke_up(Some(&(Opener::Person, 6))));
        assert!(handoff.spoke_up(Some(&(Opener::Plugin("先改第 2 条".into()), 6))));
        assert!(book.restart_rounds(&id));
        book.asked(&id, Some("按意见改完"), "第二轮", 7);
        assert!(
            !book.get(&id).unwrap().spoke_up(Some(&(Opener::Person, 6))),
            "the same turn handing over again"
        );
        book.replied(
            "c1",
            "1. 还差一点\n审查出口：返修\n结论：需修改",
            Some("m2"),
            8,
        );
        let kept = book.get(&id).unwrap();
        assert_eq!(kept.counted(), 1);
        assert_eq!(kept.next(), Some(Next::Back), "counted from one");
        let prompt = kept.prompt_for(StepKind::Back);
        book.returned(&id, StepKind::Back, "意见二", &prompt, true, 9);
        book.asked(&id, None, "第三轮", 10);
        book.replied(
            "c1",
            "1. 还有\n审查出口：返修\n结论：需修改",
            Some("m3"),
            11,
        );
        assert_eq!(book.get(&id).unwrap().next(), Some(Next::Limit));
    }
}
