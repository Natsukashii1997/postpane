//! Words sent to ChatGPT and not yet known to have gone in (#347, L3
//! P1-10..12, round 4 P1-10, P1-11, P1-15, P2-16). One rule for them, till
//! word comes or a later review goes in: no other words go, and the same
//! words are not sent twice; an answer is held to these words only, counts
//! once, and cannot pass or close; word that comes after the answer only
//! goes on the card.
//!
//! A review's words and PostPane's ask to mend the last lines are kept
//! apart (round 4 P1-10): word that a mending went in clears only the
//! mending, never a review still unsure; only a later review known to have
//! gone in clears both.
//!
//! Every word sent into a conversation already holding a review begins with
//! a line naming its request (round 4 P1-11): an earlier round's words, even
//! the same for their first 600 characters, never pass for these.

use super::{excerpt, key, notice::Cause, Book, Handoff, Phase, Status, Step, StepKind, EXCERPT};
use serde::{Deserialize, Serialize};

const TAG_OPEN: &str = "【驿窗送审 ";
const TAG_CLOSE: &str = "】";

/// `text` as sent under `request`: its first line names the request.
pub fn tagged(request: &str, text: &str) -> String {
    format!("{TAG_OPEN}{request}{TAG_CLOSE}\n{text}")
}

/// `text` without the line naming its request: what the words themselves
/// are, the same however often they go.
pub fn untagged(text: &str) -> &str {
    match text.split_once('\n') {
        Some((first, rest)) if first.starts_with(TAG_OPEN) && first.ends_with(TAG_CLOSE) => rest,
        _ => text,
    }
}

/// Words sent and not yet known to have gone in: the request they go as,
/// and the pull request, commit and cap a review goes with.
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Pending {
    pub request: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub pr: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub head: Option<String>,
    #[serde(default)]
    pub limit: u32,
    /// The words, as a step keeps them (with the line naming the request):
    /// an answer to them, confirmed or not, is known as theirs (#356).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub words: Option<String>,
    /// The words' own fingerprint, the request line left out: the same
    /// words again are not sent twice.
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub key: String,
    /// Kept from before review round 4: an ask to mend kept here.
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub booked: bool,
    /// Their answer came: booked once, and kept so it cannot pass (P1-12).
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub answered: bool,
}

impl Pending {
    /// Whether `text` is these words again.
    pub fn same(&self, text: &str) -> bool {
        !self.key.is_empty() && self.key == key(untagged(text))
    }
    fn kept(self) -> Self {
        let words = self.words.as_deref();
        Pending {
            key: words.map(|w| key(untagged(w))).unwrap_or_default(),
            words: words.map(|w| excerpt(w, EXCERPT)),
            answered: false,
            ..self
        }
    }
}

impl Handoff {
    /// Whether words of its are with ChatGPT, unanswered: a review asked,
    /// its last lines asked to be mended (P1-04), or words sent and never
    /// known to have gone in (P1-10).
    pub fn in_flight(&self) -> bool {
        self.status == Status::Opening
            || (self.live()
                && (matches!(
                    self.phase,
                    Phase::Sending | Phase::Delivered | Phase::Working
                ) || self.unanswered().is_some()))
    }
    /// Words sent, never known to have gone in, their answer not yet in:
    /// the mending, sent after the review, first.
    pub fn unanswered(&self) -> Option<&Pending> {
        [&self.gate.mending, &self.gate.pending]
            .into_iter()
            .flatten()
            .find(|p| !p.answered)
    }
    /// Whether anything sent was never known to have gone in: no answer
    /// may pass or close it (P1-10).
    pub fn unsure(&self) -> bool {
        self.gate.pending.is_some() || self.gate.mending.is_some()
    }
    /// An answer to words never known to have gone in (P1-11): a review's
    /// go on the card before it, as word of them would have put them, so
    /// the count and the timeline keep their order; a mending is on the
    /// card already. They stay, answered, so the answer cannot pass.
    pub(super) fn answer_pending(&mut self, now: i64) {
        if let Some(mending) = self.gate.mending.as_mut().filter(|p| !p.answered) {
            mending.answered = true;
            return;
        }
        let Some(pending) = self.gate.pending.as_mut().filter(|p| !p.answered) else {
            return;
        };
        pending.answered = true;
        if !pending.booked {
            let step = Step::new(now, StepKind::Ask, pending.words.as_deref());
            let step = step.keyed(&pending.key.clone());
            self.steps.push(step);
            self.rounds += 1;
        }
    }
}

impl Book {
    /// A review of handoff `id` is about to be sent.
    pub fn ask_pending(&mut self, id: &str, pending: Pending) -> bool {
        let Some(handoff) = self.live_mut(id) else {
            return false;
        };
        handoff.gate.pending = Some(pending.kept());
        true
    }
    /// PostPane's ask to mend `id`'s last lines is about to be sent: on the
    /// card as sent, and kept apart from the review (round 4 P1-10, P1-15:
    /// one change, kept whole or not at all).
    pub fn ask_mending(&mut self, id: &str, request: &str, text: &str, now: i64) -> bool {
        if !self.format_asked(id, text, now) {
            return false;
        }
        let Some(handoff) = self.live_mut(id) else {
            return false;
        };
        let mending = Pending {
            request: request.to_owned(),
            words: Some(text.to_owned()),
            ..Pending::default()
        };
        handoff.gate.mending = Some(mending.kept());
        true
    }
    /// Word that `request` went in came after its answer (P1-12): it goes on
    /// the card, and nothing else changes; the answer still cannot pass.
    /// Whether it was such late word.
    pub fn confirmed_late(&mut self, id: &str, request: &str, note: &str, now: i64) -> bool {
        let Some(handoff) = self.list.iter_mut().find(|h| h.id == id) else {
            return false;
        };
        let late = [&handoff.gate.pending, &handoff.gate.mending]
            .into_iter()
            .flatten()
            .any(|p| p.request == request && p.answered);
        if late {
            handoff
                .steps
                .push(Step::new(now, StepKind::Work, Some(note)).by_auto());
            handoff.updated_at = now;
        }
        late
    }
    /// Words sent as `request` went in: a review's clears all that was
    /// unsure before it; a mending's clears only itself.
    pub fn confirm_pending(&mut self, id: &str, request: &str) -> bool {
        let Some(handoff) = self.list.iter_mut().find(|h| h.id == id) else {
            return false;
        };
        let gate = &mut handoff.gate;
        if gate.pending.as_ref().is_some_and(|p| p.request == request) {
            gate.pending = None;
            gate.mending = None;
            return true;
        }
        if gate.mending.as_ref().is_some_and(|p| p.request == request) {
            gate.mending = None;
            return true;
        }
        false
    }
    /// Words pending when the app stopped: nothing will say they went in,
    /// so the auto round trip stops on them, as when word never came, and
    /// the session is told (round 4 P1-14); their answers count but cannot
    /// pass. Each card says so.
    pub fn pending_at_restart(&mut self, text: &str, now: i64) -> bool {
        let ids = self
            .list
            .iter()
            .filter(|h| h.live() && h.unanswered().is_some())
            .map(|h| h.id.clone())
            .collect::<Vec<_>>();
        for id in &ids {
            self.unconfirmed(id, text, true, now);
        }
        !ids.is_empty()
    }
    /// Word that words of handoff `id` went in never came (P1-10): the auto
    /// round trip stops, saying so; one already off says so on the card.
    /// `tell`: the session is to be told (no caller heard it already).
    pub fn unconfirmed(&mut self, id: &str, text: &str, tell: bool, now: i64) -> bool {
        if !self.stop(id, text, true, now) {
            let Some(handoff) = self.live_mut(id) else {
                return false;
            };
            handoff
                .steps
                .push(Step::new(now, StepKind::Work, Some(text)).by_auto());
            handoff.updated_at = now;
        }
        if tell {
            self.caused_last(id, Cause::Unconfirmed);
        }
        true
    }
}
