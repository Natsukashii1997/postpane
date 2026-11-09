//! Runs of Claude Code in the background for a session whose process
//! stopped, with the words back (L-14, #175).
use super::{Book, Delivery, Phase, Step, StepKind};

/// How long words back wait in the queue of a session that has gone quiet
/// before PostPane runs Claude Code for it in the background (L-14): long
/// enough for a stall to pass, short against ChatGPT's minutes.
pub const WAKE_AFTER_MS: i64 = 3 * 60 * 1000;

impl Book {
    /// Auto round trips whose words back waited in a session's queue for
    /// longer than `WAKE_AFTER_MS`, not taken, and that nothing runs for
    /// yet: (id, session, the words' id).
    pub fn waiting_to_wake(&self, now: i64) -> Vec<(String, String, String)> {
        self.list
            .iter()
            .filter(|h| h.auto && h.live() && h.phase == Phase::Returned)
            .filter(|h| h.waking_since.is_none())
            // Only a Claude Code session runs in the background (#280).
            .filter(|h| h.doer.as_deref().is_none_or(|doer| doer == "claude"))
            .filter(|h| h.queued_at.is_some_and(|at| now - at >= WAKE_AFTER_MS))
            .filter_map(|h| {
                let back = h
                    .steps
                    .iter()
                    .rev()
                    .find(|step| step.kind == StepKind::Back)?;
                (back.delivery == Some(Delivery::Waiting)).then_some(())?;
                Some((h.id.clone(), h.claude_session.clone(), back.prompt.clone()?))
            })
            .collect()
    }
    /// PostPane runs Claude Code for the session in the background with the
    /// words back (`how`: why): they count as begun, nothing waits in the
    /// queue, and the wait for Claude's changes starts now.
    pub fn woke(&mut self, id: &str, how: &str, now: i64) -> bool {
        let Some(handoff) = self.live_mut(id) else {
            return false;
        };
        if let Some(back) = handoff
            .steps
            .iter_mut()
            .rev()
            .find(|step| step.kind == StepKind::Back)
        {
            back.delivery = Some(Delivery::Started);
        }
        handoff.queued_at = None;
        handoff.waking_since = Some(now);
        handoff.phase_at = now;
        handoff
            .steps
            .push(Step::new(now, StepKind::Wake, Some(how)).by_auto());
        handoff.updated_at = now;
        true
    }
    /// The background run ended; whether it was still marked running.
    pub fn awake(&mut self, id: &str, now: i64) -> bool {
        let Some(handoff) = self.get_mut(id).filter(|h| h.waking_since.is_some()) else {
            return false;
        };
        handoff.waking_since = None;
        handoff.updated_at = now;
        true
    }
    /// Background runs from before a restart, no longer followed: whether
    /// there were any.
    pub(super) fn forget_runs(&mut self) -> bool {
        let mut woke = false;
        for handoff in &mut self.list {
            woke |= handoff.waking_since.take().is_some();
        }
        woke
    }
}
