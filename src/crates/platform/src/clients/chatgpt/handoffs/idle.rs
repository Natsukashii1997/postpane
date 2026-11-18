//! Handoffs left with the person end themselves after a day untouched
//! (owner chose 甲, 2026-11-14: they piled up to 21 on the paper plane).
use super::{Book, Phase, Status, Step, StepKind};

/// How long a handoff left with the person (answered, sent back or stopped)
/// may sit untouched before PostPane ends it itself.
pub const IDLE_END_MS: i64 = 24 * 60 * 60 * 1000;

impl Book {
    /// Handoffs left with the person past `IDLE_END_MS` end themselves: an
    /// answer waiting on the person, words sent back, or a stopped round
    /// trip, with nothing on its way and no background run. `text` says why
    /// on the closing step, marked as PostPane's.
    pub fn idle(&mut self, now: i64, text: &str) -> bool {
        let idle = self
            .list
            .iter()
            .filter(|h| h.status == Status::Open && h.waking_since.is_none())
            .filter(|h| {
                matches!(h.phase, Phase::Replied | Phase::Returned)
                    || (h.halt.is_some() && matches!(h.phase, Phase::Delivered | Phase::Working))
            })
            .filter(|h| now - h.phase_at.max(h.updated_at) > IDLE_END_MS)
            .map(|h| h.id.clone())
            .collect::<Vec<_>>();
        for id in &idle {
            if let Some(handoff) = self.get_mut(id) {
                handoff.status = Status::Closed;
                handoff.brief = None;
                handoff
                    .steps
                    .push(Step::new(now, StepKind::End, Some(text)).by_auto());
                handoff.enter(Phase::Ended, now);
            }
        }
        !idle.is_empty()
    }
}
