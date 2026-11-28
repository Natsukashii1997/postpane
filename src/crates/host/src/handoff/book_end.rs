//! Ending a handoff with words on the card: an agent, at the person's word
//! (#439) or on its own (#587; `relay_end` in `end.rs`).
use super::{Book, Phase, Status, Step, StepKind};

impl Book {
    /// Ends it as `end` does, saying on the card who ended it and why:
    /// an agent at the person's word (#439). Not by the auto round trip,
    /// so a cap it reached counts as settled, as the person's own end.
    pub fn end_said(&mut self, id: &str, text: Option<&str>, now: i64) -> bool {
        self.end_with(id, Step::new(now, StepKind::End, text), now)
    }

    /// Ends it as `end_said` does, by an agent on its own (#587): the card
    /// says so, and a cap it reached stays unsettled, as when PostPane ends
    /// one after a day idle (#368), so the next review still needs the
    /// person's word.
    pub fn end_by_agent(&mut self, id: &str, text: &str, now: i64) -> bool {
        let step = Step {
            agent: true,
            ..Step::new(now, StepKind::End, Some(text))
        };
        self.end_with(id, step, now)
    }

    fn end_with(&mut self, id: &str, step: Step, now: i64) -> bool {
        let Some(handoff) = self
            .get_mut(id)
            .filter(|h| h.live() || h.status == Status::Failed)
        else {
            return false;
        };
        handoff.status = Status::Closed;
        handoff.brief = None;
        handoff.steps.push(step);
        handoff.enter(Phase::Ended, now);
        true
    }
}
