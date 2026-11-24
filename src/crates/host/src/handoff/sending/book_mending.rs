//! PostPane's ask to mend an answer's last lines, and word that it went in
//! (#347 round 4 P1-10, P1-15). Word that comes after its send gave up
//! waiting, and before the mended answer, is taken as a review's is (#446):
//! only in the run that sent it (`Word`), and only its own request. After
//! the answer, or after a restart, it only goes on the card, as before.
use super::super::{notice::Cause, Book, Handoff, Phase, Step, StepKind};
use super::Pending;

/// How long after send was never pressed for an ask to mend it is asked
/// again (#528): ChatGPT was likely still writing.
pub const MEND_AGAIN_MS: i64 = 30 * 1000;

/// How word of a mending stands in the run that sent it (#446). Never kept:
/// after a restart nothing says it went in (round 4 P1-14).
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub enum Word {
    /// Sent before this run; or a review's, which `asking` follows.
    #[default]
    Unknown,
    /// Its send waits for word.
    Awaited,
    /// Word came while its send waited.
    Heard,
    /// Its send gave up waiting.
    GaveUp,
}

impl Handoff {
    /// How often PostPane asked to mend the newest answer (#528).
    fn mendings_asked(&self) -> usize {
        let after = self
            .steps
            .iter()
            .rposition(|s| s.kind == StepKind::Reply)
            .map_or(0, |at| at + 1);
        let asked = |s: &&Step| s.kind == StepKind::Format;
        self.steps[after..].iter().filter(asked).count()
    }
    /// Whether the ask to mend the newest answer waits before it goes
    /// again (#528): send was never pressed for the last, `MEND_AGAIN_MS`
    /// ago or less.
    pub fn mending_waits(&self, now: i64) -> bool {
        self.mendings_asked() > 0 && now - self.phase_at < MEND_AGAIN_MS
    }
    /// The auto round trip is off by the stop that words never known to
    /// have gone in made (`unconfirmed`), and nothing stopped it or turned
    /// it on since (review of #446, P2-01): a stop made after, for an
    /// answer that did not come, is not this one.
    fn stopped_as_unconfirmed(&self) -> bool {
        self.steps
            .iter()
            .rev()
            .find(|step| matches!(step.kind, StepKind::Stop | StepKind::Resume))
            .is_some_and(|step| {
                step.kind == StepKind::Stop && step.auto && step.cause == Some(Cause::Unconfirmed)
            })
    }
}

impl Book {
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
            word: Word::Awaited,
            ..Pending::default()
        };
        handoff.gate.mending = Some(mending.kept());
        true
    }
    /// The extension says the mending asked as `request` went in (#446);
    /// None when `request` is no mending of this run still unanswered.
    /// While its send waits, that is only marked. After the send gave up
    /// it is known to have gone in, as a review's late word makes it:
    /// the mending alone clears, `note` goes on the card, and the round
    /// trip goes on when it was this that stopped it and no review is
    /// unsure still; its wait for the answer runs on from when the
    /// mending was asked. Whether the card changed.
    pub fn mending_heard(&mut self, id: &str, request: &str, note: &str, now: i64) -> Option<bool> {
        let handoff = self.live_mut(id)?;
        let mending = handoff.gate.mending.as_mut()?;
        if mending.request != request || mending.answered {
            return None;
        }
        let word = mending.word;
        match word {
            Word::Awaited => mending.word = Word::Heard,
            Word::GaveUp => {
                handoff.gate.mending = None;
                handoff
                    .steps
                    .push(Step::new(now, StepKind::Work, Some(note)).by_auto());
                if !handoff.unsure() && handoff.stopped_as_unconfirmed() {
                    handoff.resume_for_ask(now);
                }
                handoff.updated_at = now;
                return Some(true);
            }
            Word::Heard => {}
            Word::Unknown => return None,
        }
        Some(false)
    }
    /// Send was never pressed for the mending asked as `request` (#528):
    /// it did not go, so the answer waits again as before it was asked,
    /// `note` on the card, and it is asked once more (`mending_waits`).
    /// Not after the once more: then it is as any send not known (false).
    pub fn mending_not_sent(&mut self, id: &str, request: &str, note: &str, now: i64) -> bool {
        let Some(handoff) = self.live_mut(id) else {
            return false;
        };
        let asked = |p: &Pending| p.request == request && !p.answered;
        if !handoff.gate.mending.as_ref().is_some_and(asked) || handoff.mendings_asked() > 1 {
            return false;
        }
        handoff.gate.mending = None;
        handoff
            .steps
            .push(Step::new(now, StepKind::Work, Some(note)).by_auto());
        handoff.enter(Phase::Replied, now);
        true
    }
    /// The send of the mending asked as `request` gave up waiting.
    /// Whether nothing says it went in: not so when word of it was heard
    /// meanwhile (#446), and then it is cleared as gone in.
    pub fn mending_gave_up(&mut self, id: &str, request: &str) -> bool {
        let Some(gate) = self.get_mut(id).map(|handoff| &mut handoff.gate) else {
            return true;
        };
        let Some(mending) = gate.mending.as_mut().filter(|p| p.request == request) else {
            return true;
        };
        if mending.word == Word::Heard {
            gate.mending = None;
            return false;
        }
        mending.word = Word::GaveUp;
        true
    }
}
