//! Handoffs (relay 1c, docs/chatgpt-channel.md): a Claude Code session and the
//! ChatGPT conversation that reviews its work, bound together so words go
//! back and forth between the two. Kept in `<data>/chatgpt/handoffs.json`,
//! with the ChatGPT project new review conversations open in
//! (`<data>/chatgpt/config.json`).
use super::{folder, write_private};
use agent_hud_agents::chatgpt as agent;
use agent_hud_core::l10n;
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
};

/// How many handoffs are kept, newest first.
pub const KEEP: usize = 200;
/// How long a review conversation may take to open before it counts as
/// failed: the channel's own wait (90 s) and some slack.
pub const OPEN_TIMEOUT_MS: i64 = 120_000;
/// How many reviews a handoff is meant to take; more are allowed.
pub const ROUNDS: u32 = 2;
/// How long the auto round trip waits for ChatGPT's answer before it hands
/// the handoff back to the person (#72).
pub const REPLY_WAIT_MS: i64 = 30 * 60 * 1000;
/// How long it waits for Claude to hand its changes over again.
pub const FIX_WAIT_MS: i64 = 2 * 60 * 60 * 1000;
/// How long words queued for a paused Claude session wait to be taken up
/// (the plugin's own lifetime for words left).
pub const QUEUE_WAIT_MS: i64 = 60 * 60 * 1000;
/// The longest excerpt a step keeps of what was said.
const EXCERPT: usize = 600;
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
    /// The Claude Code session doing the work.
    pub claude_session: String,
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
    /// Claude by itself, a pass ends it, at most `ROUNDS` reviews.
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
}

/// What the auto round trip does with an answer that came in.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Next {
    /// 「需修改」 with rounds to go: back to Claude.
    Back,
    /// 「结论：通过」: the handoff ends.
    Pass,
    /// 「需修改」 after the last round: the person decides.
    Limit,
    /// No verdict written: the person decides.
    NoVerdict,
    /// 思维评审 (#209) 成熟退出 / 转其他路径: back to Claude, then the handoff ends.
    Close,
    /// 思维评审 证据不足暂停: back to Claude, then the auto round trip stops.
    Pause,
    /// 思维评审 决策升级: back to Claude, then the person decides.
    Escalate,
    /// 思维评审 whose last two lines do not hold: the person decides.
    Invalid(Flaw),
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
    /// How many reviews were asked for.
    pub fn reviews(&self) -> u32 {
        self.steps
            .iter()
            .filter(|step| step.kind == StepKind::Ask)
            .count() as u32
    }
    /// The newest reply, in full when it was kept so.
    pub fn last_reply(&self) -> Option<&Step> {
        self.steps
            .iter()
            .rev()
            .find(|step| step.kind == StepKind::Reply)
    }
    /// As the snapshot shows it: no brief, excerpts only.
    pub fn shown(&self) -> Self {
        let mut shown = self.clone();
        shown.brief = None;
        for step in &mut shown.steps {
            step.key = None;
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
    /// the rest only while it is on.
    pub fn next(&self) -> Option<Next> {
        if !self.live() || self.phase != Phase::Replied {
            return None;
        }
        // 思维评审 (#209): only its last two lines count, and nothing
        // happens by itself while the auto round trip is off — not even a
        // pass, which must reach Claude before the handoff ends.
        if self.thinking() {
            if !self.auto {
                return None;
            }
            let reply = self
                .last_reply()
                .and_then(|step| step.text.as_deref())
                .unwrap_or_default();
            return Some(match exit(reply) {
                Ok(Exit::Mature | Exit::OtherPath) => Next::Close,
                Ok(Exit::Deepen) if self.reviews() < ROUNDS => Next::Back,
                Ok(Exit::Deepen) => Next::Limit,
                Ok(Exit::NeedEvidence) => Next::Pause,
                Ok(Exit::Escalate) => Next::Escalate,
                Err(flaw) => Next::Invalid(flaw),
            });
        }
        let verdict = self.last_reply().and_then(|step| step.verdict);
        if verdict == Some(Verdict::Pass) {
            return Some(Next::Pass);
        }
        if !self.auto {
            return None;
        }
        Some(match verdict {
            Some(Verdict::Pass) => Next::Pass,
            Some(Verdict::Revise) if self.reviews() < ROUNDS => Next::Back,
            Some(Verdict::Revise) => Next::Limit,
            None => Next::NoVerdict,
        })
    }
    /// A 思维评审 handoff (#209): its title begins 「思维评审｜」.
    pub fn thinking(&self) -> bool {
        let title = self.title.trim_start();
        title.starts_with("思维评审｜") || title.starts_with("思维评审|")
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
        for handoff in &mut self.list {
            if handoff.id != id
                && handoff.live()
                && handoff.chatgpt_conversation.as_deref() == Some(conversation)
            {
                handoff.status = Status::Closed;
                handoff.updated_at = now;
            }
        }
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
        handoff
            .steps
            .push(Step::new(now, StepKind::Fail, Some(error)));
        handoff.enter(Phase::Failed, now);
        true
    }
    /// A failed open tried again: opening, with its brief.
    pub fn retry(&mut self, id: &str, now: i64) -> Option<String> {
        if self.get(id)?.status != Status::Failed {
            return None;
        }
        let session = self.get(id)?.claude_session.clone();
        if self.for_session(&session).is_some() {
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
    /// Whether `text` was just sent back to Claude for this handoff.
    pub fn returned_already(&self, id: &str, text: &str) -> bool {
        self.get(id)
            .is_some_and(|h| h.just_sent(&[StepKind::Back, StepKind::Again], &key(text)))
    }
    /// Words reached the handoff's ChatGPT conversation: Claude's work
    /// (`summary`, when it handed some over) and the words themselves.
    pub fn asked(&mut self, id: &str, summary: Option<&str>, text: &str, now: i64) -> bool {
        let Some(handoff) = self.live_mut(id) else {
            return false;
        };
        if let Some(summary) = summary {
            handoff
                .steps
                .push(Step::new(now, StepKind::Work, Some(summary)));
        }
        handoff
            .steps
            .push(Step::new(now, StepKind::Ask, Some(text)).keyed(&key(text)));
        handoff.queued_at = None;
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
        if reply.trim().is_empty()
            || !matches!(
                handoff.phase,
                Phase::Sending | Phase::Delivered | Phase::Working
            )
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
        for step in &mut handoff.steps {
            if step.kind == StepKind::Reply {
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
            auto: false,
        });
        handoff.enter(Phase::Replied, now);
        true
    }
    /// Words went back to Claude: ChatGPT's answer (`back`) or the ask to
    /// hand over again (`again`).
    pub fn returned(&mut self, id: &str, kind: StepKind, text: &str, auto: bool, now: i64) -> bool {
        let Some(handoff) = self.live_mut(id) else {
            return false;
        };
        let step = Step::new(now, kind, Some(text)).keyed(&key(text));
        handoff.steps.push(if auto { step.by_auto() } else { step });
        handoff.rounds += 1;
        handoff.enter(Phase::Returned, now);
        true
    }
    /// The person ended the handoff.
    pub fn end(&mut self, id: &str, now: i64) -> bool {
        let Some(handoff) = self
            .get_mut(id)
            .filter(|h| h.live() || h.status == Status::Failed)
        else {
            return false;
        };
        handoff.status = Status::Closed;
        handoff.brief = None;
        handoff.steps.push(Step::new(now, StepKind::End, None));
        handoff.enter(Phase::Ended, now);
        true
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
    /// The person turns the auto round trip back on.
    pub fn resume(&mut self, id: &str, now: i64) -> bool {
        let Some(handoff) = self.live_mut(id).filter(|h| !h.auto) else {
            return false;
        };
        handoff.auto = true;
        handoff.halt = None;
        handoff.steps.push(Step::new(now, StepKind::Resume, None));
        handoff.updated_at = now;
        true
    }
    /// Auto round trips waiting too long stop: ChatGPT not answering within
    /// `REPLY_WAIT_MS` (`no_answer`), Claude not handing over again within
    /// `FIX_WAIT_MS` (`no_handover`).
    pub fn overdue(&mut self, now: i64, no_answer: &str, no_handover: &str, no_wake: &str) -> bool {
        let late = self
            .list
            .iter()
            .filter(|h| h.auto && h.status == Status::Open)
            .filter_map(|h| {
                let waited = now - h.phase_at;
                match h.phase {
                    Phase::Delivered | Phase::Working if waited > REPLY_WAIT_MS => {
                        Some((h.id.clone(), no_answer))
                    }
                    Phase::Returned if h.queued_at.is_some_and(|at| now - at > QUEUE_WAIT_MS) => {
                        Some((h.id.clone(), no_wake))
                    }
                    Phase::Returned if waited > FIX_WAIT_MS => Some((h.id.clone(), no_handover)),
                    _ => None,
                }
            })
            .collect::<Vec<_>>();
        for (id, reason) in &late {
            self.stop(id, reason, true, now);
        }
        !late.is_empty()
    }
    /// The app started again: auto round trips that were on pause, so
    /// nothing is sent twice across the restart.
    pub fn restarted(&mut self, now: i64, reason: &str) -> bool {
        let on = self
            .list
            .iter()
            .filter(|h| h.auto && h.live())
            .map(|h| h.id.clone())
            .collect::<Vec<_>>();
        for id in &on {
            self.stop(id, reason, true, now);
        }
        !on.is_empty()
    }
    /// Words went across once more.
    pub fn round(&mut self, id: &str, now: i64) -> bool {
        let Some(handoff) = self.get_mut(id).filter(|h| h.live()) else {
            return false;
        };
        handoff.rounds += 1;
        handoff.updated_at = now;
        true
    }
    /// Keeps the newest `KEEP`, and the briefs of the newest few.
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

fn new_id(now: i64) -> String {
    use std::sync::atomic::{AtomicU32, Ordering};
    static SEQUENCE: AtomicU32 = AtomicU32::new(0);
    let sequence = SEQUENCE.fetch_add(1, Ordering::Relaxed) & 0xff;
    format!("h{:x}{sequence:02x}", now.max(0))
}

fn handoffs_path(data: &Path) -> PathBuf {
    folder(data).join("handoffs.json")
}
fn config_path(data: &Path) -> PathBuf {
    folder(data).join("config.json")
}

/// A small private JSON file in the channel's folder, when it is there and readable.
fn read_small(path: &Path) -> Option<Vec<u8>> {
    let metadata = fs::symlink_metadata(path).ok()?;
    if !metadata.is_file() || metadata.len() > 4 * 1024 * 1024 {
        return None;
    }
    fs::read(path).ok()
}

/// The handoffs kept; none when there are none or they cannot be read.
pub fn load(data: &Path) -> Book {
    let mut list = read_small(&handoffs_path(data))
        .and_then(|bytes| serde_json::from_slice::<Vec<Handoff>>(&bytes).ok())
        .unwrap_or_default();
    list.retain(|handoff| {
        crate::claude_plugin::valid_name(&handoff.claude_session)
            && handoff
                .chatgpt_conversation
                .as_deref()
                .is_none_or(agent::conversation_id)
    });
    let mut book = Book { list };
    book.trim();
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
    let bytes = serde_json::to_vec_pretty(&serde_json::json!({ "project": project }))
        .map_err(|_| "Project unavailable")?;
    write_private(data, "config", &bytes, &config_path(data))
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
        assert!(book.returned(&handoff.id, StepKind::Back, "意见", false, 5));
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
        // The snapshot carries neither the brief nor what was sent hashed.
        assert!(kept.shown().steps.iter().all(|step| step.key.is_none()));
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
        book.replied("c1", "都改好了\n结论：通过", Some("m1"), 4);
        assert_eq!(book.get(&id).unwrap().next(), Some(Next::Pass));
        // A revise with it off still waits for the person.
        let mut book = Book::default();
        let id = asked_once(&mut book);
        assert!(book.stop(&id, "停", true, 3));
        book.replied("c1", "1. 要超时\n结论：需修改", Some("m1"), 4);
        assert_eq!(book.get(&id).unwrap().next(), None);
    }

    #[test]
    fn the_auto_round_trip_sends_back_a_revise_ends_at_a_pass_and_stops_at_the_limit() {
        let mut book = Book::default();
        let id = asked_once(&mut book);
        let kept = book.get(&id).unwrap();
        assert!(kept.auto, "a new handoff goes round by itself");
        assert_eq!(kept.next(), None, "nothing to do before an answer");
        book.replied("c1", "1. 要超时\n结论：需修改", Some("m1"), 4);
        assert_eq!(book.get(&id).unwrap().next(), Some(Next::Back));
        assert!(book.returned(&id, StepKind::Back, "意见", true, 5));
        let back = book.get(&id).unwrap().steps.last().unwrap().clone();
        assert!(back.auto, "the step says the machine did it");
        assert_eq!(book.get(&id).unwrap().next(), None);
        // Round 2 still needs changes: the last round, the person decides.
        book.asked(&id, Some("按意见改完"), "第二轮", 6);
        book.replied("c1", "1. 还差一点\n结论：需修改", Some("m2"), 7);
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
        book.replied("c1", "都改好了\n结论：通过", Some("m1"), 4);
        assert_eq!(book.get(&id).unwrap().next(), Some(Next::Pass));
        assert!(book.passed(&id, "通过", 5));
        let ended = book.get(&id).unwrap();
        assert_eq!((ended.status, ended.phase), (Status::Closed, Phase::Ended));
        assert!(ended.steps.last().unwrap().auto);
        let mut book = Book::default();
        let id = asked_once(&mut book);
        book.replied("c1", "我看了一下，挺好的", Some("m1"), 4);
        assert_eq!(book.get(&id).unwrap().next(), Some(Next::NoVerdict));
    }

    #[test]
    fn an_auto_round_trip_waiting_too_long_or_across_a_restart_stops() {
        let mut book = Book::default();
        let id = asked_once(&mut book);
        // Asked at 2 (opened): ChatGPT has REPLY_WAIT_MS to answer.
        assert!(!book.overdue(
            2 + REPLY_WAIT_MS,
            "30 分钟没回信",
            "2 小时没交回",
            "排队没人领"
        ));
        assert!(book.overdue(
            3 + REPLY_WAIT_MS,
            "30 分钟没回信",
            "2 小时没交回",
            "排队没人领"
        ));
        let kept = book.get(&id).unwrap();
        assert!(!kept.auto);
        assert!(kept.halt.as_deref().unwrap().contains("30 分钟没回信"));
        assert!(kept.steps.last().unwrap().auto);
        // Back with Claude: FIX_WAIT_MS to hand over again.
        let mut book = Book::default();
        let id = asked_once(&mut book);
        book.replied("c1", "结论：需修改", Some("m1"), 4);
        book.returned(&id, StepKind::Back, "意见", true, 5);
        assert!(!book.overdue(
            5 + FIX_WAIT_MS,
            "30 分钟没回信",
            "2 小时没交回",
            "排队没人领"
        ));
        assert!(book.overdue(
            6 + FIX_WAIT_MS,
            "30 分钟没回信",
            "2 小时没交回",
            "排队没人领"
        ));
        assert!(book
            .get(&id)
            .unwrap()
            .halt
            .as_deref()
            .unwrap()
            .contains("2 小时"));
        // A handoff paused by the person is not overdue.
        let mut book = Book::default();
        let id = asked_once(&mut book);
        book.stop(&id, "常浩暂停", false, 3);
        assert!(!book.overdue(
            10 * REPLY_WAIT_MS,
            "30 分钟没回信",
            "2 小时没交回",
            "排队没人领"
        ));
        assert!(!book.get(&id).unwrap().steps.last().unwrap().auto);
        // A restart pauses those still on, and only those.
        let mut book = Book::default();
        let on = asked_once(&mut book);
        let off = book.begin("s2", None, "别的", None, "请审核", 1).id;
        book.opened(&off, "c2", 2);
        book.stop(&off, "常浩暂停", false, 3);
        assert!(book.restarted(4, "驿窗重启"));
        assert!(book
            .get(&on)
            .unwrap()
            .halt
            .as_deref()
            .unwrap()
            .contains("重启"));
        assert_eq!(book.get(&off).unwrap().halt.as_deref(), Some("常浩暂停"));
        assert!(!book.restarted(5, "驿窗重启"));
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
}
