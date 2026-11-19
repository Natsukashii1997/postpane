//! Answers in while the auto round trip is off go back all the same (#410):
//! one of them used to wait on the sidebar for the person's 「转回」 while
//! the session that asked waited on unaware (16 of 22 in Fable's count).
use super::{Handoff, Phase, Step, StepKind};

impl Handoff {
    /// An answer in while the auto round trip is off: it goes back to the
    /// session all the same, once, saying the person decides what comes
    /// next. What `next` acts on goes as before; a try that could not reach
    /// the session is not repeated by itself (the person's 「转回」 still can).
    pub fn held_answer(&self) -> bool {
        let since = self
            .steps
            .iter()
            .rposition(|step| step.kind == StepKind::Reply)
            .map_or(0, |at| at + 1);
        self.live()
            && self.phase == Phase::Replied
            && !self.auto
            && self.next().is_none()
            && !self.steps[since..]
                .iter()
                .any(|step| step.kind == StepKind::Fail)
    }
    /// The auto round trip stopped itself last, not paused by the person.
    pub(super) fn stopped_by_itself(&self) -> bool {
        self.steps
            .iter()
            .rev()
            .find(|step| matches!(step.kind, StepKind::Stop | StepKind::Resume))
            .is_some_and(|step| step.kind == StepKind::Stop && step.auto)
    }
    /// The auto round trip is off because the person paused it, not
    /// stopped by itself: what `relay_to_chatgpt` says of the answer to come.
    pub fn paused_by_person(&self) -> bool {
        !self.auto && !self.stopped_by_itself()
    }
    /// New words taken after the auto round trip stopped itself: that stop
    /// was about the round before, so it turns on again, marked as
    /// PostPane's. Not after the person paused it: that holds until they
    /// turn it on. A review at its cap never gets here without their leave.
    pub(super) fn resume_for_ask(&mut self, now: i64) {
        if !self.auto && self.stopped_by_itself() {
            self.auto = true;
            self.halt = None;
            self.steps
                .push(Step::new(now, StepKind::Resume, None).by_auto());
        }
    }
}
