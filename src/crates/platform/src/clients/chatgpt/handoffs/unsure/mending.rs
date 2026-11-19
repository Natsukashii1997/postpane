//! PostPane's ask to mend an answer's last lines, and word that it went in
//! (#347 round 4 P1-10, P1-15). Word that comes after its send gave up
//! waiting, and before the mended answer, is taken as a review's is (#446):
//! only in the run that sent it (`Word`), and only its own request. After
//! the answer, or after a restart, it only goes on the card, as before.
use super::super::{Book, Step, StepKind};
use super::Pending;

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
    /// trip that stopped for it goes on, unless a review is unsure
    /// still. Whether the card changed.
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
                if !handoff.unsure() {
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
