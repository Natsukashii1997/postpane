//! Ending a handoff with words on the card: an agent at the person's word
//! (#439, `relay_end` in `end.rs`).
use super::{Book, Phase, Status, Step, StepKind};

impl Book {
    /// Ends it as `end` does, saying on the card who ended it and why:
    /// an agent at the person's word (#439). Not by the auto round trip,
    /// so a cap it reached counts as settled, as the person's own end.
    pub fn end_said(&mut self, id: &str, text: Option<&str>, now: i64) -> bool {
        let Some(handoff) = self
            .get_mut(id)
            .filter(|h| h.live() || h.status == Status::Failed)
        else {
            return false;
        };
        handoff.status = Status::Closed;
        handoff.brief = None;
        handoff.steps.push(Step::new(now, StepKind::End, text));
        handoff.enter(Phase::Ended, now);
        true
    }
}
