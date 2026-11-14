//! Trouble before any answer came (#318): the conversation could not open,
//! or ChatGPT did not answer in time. The session that handed its work over
//! waits on, unaware, unless it is told — once for each, never for trouble
//! from before PostPane started, so an upgrade tells no old session.
use super::{Book, Status, StepKind};

/// What went wrong before any answer came.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Trouble {
    /// The conversation did not open (its error).
    NotOpened(String),
    /// ChatGPT has not answered in `REPLY_WAIT_MS`; the auto round trip stopped.
    NoAnswer,
}

impl Book {
    /// Handoffs whose newest step is trouble the session was not told of,
    /// that came at `since` or later: id, the step's index and the trouble.
    /// `no_answer` is the stop's reason `overdue` wrote.
    pub fn untold(&self, since: i64, no_answer: &str) -> Vec<(String, usize, Trouble)> {
        self.list
            .iter()
            .filter_map(|h| {
                let at = h.steps.len().checked_sub(1)?;
                let step = &h.steps[at];
                if step.at < since || h.told.contains(&at) {
                    return None;
                }
                let trouble = match step.kind {
                    StepKind::Fail if h.status == Status::Failed && !step.auto => {
                        Trouble::NotOpened(h.error.clone().unwrap_or_default())
                    }
                    StepKind::Stop
                        if h.live() && step.auto && step.text.as_deref() == Some(no_answer) =>
                    {
                        Trouble::NoAnswer
                    }
                    _ => return None,
                };
                Some((h.id.clone(), at, trouble))
            })
            .collect()
    }
    /// The session was told of the trouble at step `at` (or could not be):
    /// `how` goes at the end of that step's words, and of the stop's reason.
    pub fn told(&mut self, id: &str, at: usize, how: &str, now: i64) -> bool {
        let Some(handoff) = self.get_mut(id) else {
            return false;
        };
        if handoff.told.contains(&at) || at >= handoff.steps.len() {
            return false;
        }
        handoff.told.push(at);
        let step = &mut handoff.steps[at];
        let text = format!("{}；{how}", step.text.as_deref().unwrap_or_default());
        if step.kind == StepKind::Stop && handoff.halt.as_deref() == step.text.as_deref() {
            handoff.halt = Some(text.clone());
        }
        handoff.steps[at].text = Some(text);
        handoff.updated_at = now;
        true
    }
}
