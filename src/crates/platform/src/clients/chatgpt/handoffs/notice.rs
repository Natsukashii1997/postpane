//! Trouble before any answer came (#318): the conversation could not open,
//! or ChatGPT did not answer in time. The session that handed its work over
//! waits on, unaware, unless it is told — once for each, never for trouble
//! from before the notices began, so an upgrade tells no old session.
use super::{Book, Handoff, Status, Step, StepKind};
use serde::{Deserialize, Serialize};

/// What went wrong before any answer came.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Trouble {
    /// The conversation did not open (its error).
    NotOpened(String),
    /// ChatGPT has not answered in `REPLY_WAIT_MS`; the auto round trip stopped.
    NoAnswer,
}

/// The mark a step of such trouble carries: known by it, not by its words,
/// which follow the language (review of #318, P3-02).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Cause {
    /// `failed`: the conversation did not open.
    NotOpened,
    /// `overdue`: ChatGPT did not answer in time.
    NoAnswer,
}

impl Step {
    pub(super) fn caused(mut self, cause: Cause) -> Self {
        self.cause = Some(cause);
        self
    }
}

impl Handoff {
    /// Its trouble the session was not told of, that came at `since` or
    /// later: the step's index and the trouble. The newest marked step,
    /// with only failures after it (one the plugin gave up on does not hide
    /// it, P3-01) and the handoff still as it left it: an answer, a retry or
    /// the auto round trip on again moved it on.
    pub fn untold(&self, since: i64) -> Option<(usize, Trouble)> {
        let at = self.steps.iter().rposition(|step| step.cause.is_some())?;
        let step = &self.steps[at];
        let moved_on = self.steps[at + 1..]
            .iter()
            .any(|step| step.kind != StepKind::Fail);
        if step.at < since || self.told.contains(&at) || moved_on {
            return None;
        }
        let trouble = match step.cause? {
            Cause::NotOpened if self.status == Status::Failed => {
                Trouble::NotOpened(self.error.clone().unwrap_or_default())
            }
            Cause::NoAnswer if self.live() && !self.auto => Trouble::NoAnswer,
            _ => return None,
        };
        Some((at, trouble))
    }
}

impl Book {
    /// Handoffs with trouble the session was not told of, that came at
    /// `since` or later: id, the step's index and the trouble.
    pub fn untold(&self, since: i64) -> Vec<(String, usize, Trouble)> {
        self.list
            .iter()
            .filter_map(|h| {
                h.untold(since)
                    .map(|(at, trouble)| (h.id.clone(), at, trouble))
            })
            .collect()
    }
    /// The step `overdue` just put down for `id` is of trouble `cause`.
    pub(super) fn caused_last(&mut self, id: &str, cause: Cause) {
        if let Some(step) = self.get_mut(id).and_then(|h| h.steps.last_mut()) {
            step.cause = Some(cause);
        }
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

#[cfg(test)]
mod tests {
    use super::super::{Book, Step, StepKind, REPLY_WAIT_MS};
    use super::Trouble;

    const NO_ANSWER: &str = "ChatGPT 30 分钟没回信";

    /// An open handoff asked at 2 whose auto round trip stopped: ChatGPT
    /// did not answer in time (the stop's reason in Chinese).
    fn stopped(book: &mut Book) -> (String, i64) {
        stopped_for(book, NO_ANSWER)
    }
    fn stopped_for(book: &mut Book, reason: &str) -> (String, i64) {
        let handoff = book.begin("s1", None, "修登录", None, "请审核", 1);
        book.opened(&handoff.id, "c1", 2);
        let late = 3 + REPLY_WAIT_MS;
        assert!(book.overdue(late, reason, "没交回", "没人领"));
        (handoff.id, late)
    }

    /// P3-01: a failure put after the stop (the plugin gave words up) does
    /// not hide it; the stop is still the trouble to tell of.
    #[test]
    fn a_failure_after_the_stop_does_not_hide_it() {
        let mut book = Book::default();
        let (id, late) = stopped(&mut book);
        book.list[0]
            .steps
            .push(Step::new(late + 1, StepKind::Fail, Some("插件放弃了")));
        let untold = book.untold(0);
        assert_eq!(untold.len(), 1, "{untold:?}");
        assert_eq!(untold[0].0, id);
        assert_eq!(untold[0].2, Trouble::NoAnswer);
    }

    /// P3-02: the stop is known by a mark, not by its words: the language
    /// switched since, it is still told of.
    #[test]
    fn a_stop_is_known_whatever_the_language() {
        let mut book = Book::default();
        stopped_for(&mut book, "ChatGPT has not answered in 30 minutes");
        let untold = book.untold(0);
        assert_eq!(untold.len(), 1, "{untold:?}");
        assert_eq!(untold[0].2, Trouble::NoAnswer);
    }

    /// What moved the handoff on since its trouble — an answer, the auto
    /// round trip on again — leaves nothing to tell.
    #[test]
    fn trouble_moved_on_from_is_not_told() {
        let mut book = Book::default();
        let (id, late) = stopped(&mut book);
        book.replied("c1", "结论：需修改", Some("m1"), late + 1);
        assert!(book.untold(0).is_empty());

        let mut book = Book::default();
        let (id2, late) = stopped(&mut book);
        assert!(book.resume(&id2, late + 1));
        assert!(book.untold(0).is_empty());
        let _ = id;
    }
}
