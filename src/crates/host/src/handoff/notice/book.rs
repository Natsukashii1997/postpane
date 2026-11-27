//! Trouble before any answer came (#318): the conversation could not open,
//! or ChatGPT did not answer in time. The session that handed its work over
//! waits on, unaware, unless it is told — once for each, never for trouble
//! from before the notices began, so an upgrade tells no old session.
use super::{read_small, Book, Handoff, Phase, Status, Step, StepKind};
use agent_hud_runtime::chatgpt::{folder, write_private};
use serde::{Deserialize, Serialize};
use std::path::Path;

/// When the notices began here: trouble from before is not told of. Kept
/// from the first start that tells (review of #318, P2-02): set at every
/// start, trouble the app stopped before telling of was never told.
pub fn notices_since(data: &Path, now: i64) -> i64 {
    let path = folder(data).join("notices.json");
    let kept = read_small(&path)
        .and_then(|bytes| serde_json::from_slice::<serde_json::Value>(&bytes).ok())
        .and_then(|kept| kept["since"].as_i64());
    if let Some(since) = kept {
        return since;
    }
    let bytes = serde_json::json!({ "since": now }).to_string();
    if let Err(error) = write_private(data, "notices", bytes.as_bytes(), &path) {
        agent_hud_runtime::note!("{error}");
    }
    now
}

/// What went wrong before any answer came.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Trouble {
    /// The conversation did not open (its error).
    NotOpened(String),
    /// ChatGPT has not answered in `REPLY_WAIT_MS`; the auto round trip stopped.
    NoAnswer,
    /// Words were sent and never known to have gone in; the auto round
    /// trip stopped (#347 round 4 P1-14).
    Unconfirmed,
    /// ChatGPT answered, and the tab it answered in drew nothing; the auto
    /// round trip stopped (#457).
    Undrawn,
    /// A review looked for is not in its conversation: it did not go, and
    /// may go again (#524).
    Absent,
    /// A review looked for `FIND_MOST` times is still not known to have
    /// gone in: the person has it (#524).
    Lost,
    /// The page lacks what PostPane reads, so it cannot read the answer
    /// (#548): what it lacks, as the step says.
    PageChanged(String),
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
    /// `unconfirmed`: words sent were never known to have gone in.
    Unconfirmed,
    /// `stop_undrawn`: the answer is there, not drawn (#457).
    Undrawn,
    /// `found_absent`: a review looked for did not go (#524).
    Absent,
    /// `lost_finding`: a review looked for long is still not known (#524).
    Lost,
    /// `page_changed`: the page lacks what PostPane reads (#548).
    PageChanged,
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
        // The round trip going on again is what found absent words do.
        let resumed = |s: &Step| s.kind == StepKind::Resume && step.cause == Some(Cause::Absent);
        let moved_on = self.steps[at + 1..]
            .iter()
            .any(|s| s.kind != StepKind::Fail && !resumed(s));
        if step.at < since || self.told.contains(&at) || moved_on {
            return None;
        }
        let trouble = match step.cause? {
            Cause::NotOpened if self.status == Status::Failed => {
                Trouble::NotOpened(self.error.clone().unwrap_or_default())
            }
            Cause::NoAnswer if self.live() && !self.auto => Trouble::NoAnswer,
            Cause::Undrawn if self.live() && !self.auto => Trouble::Undrawn,
            // Its answer, come since, moved it on; so did word it went in.
            Cause::Unconfirmed if self.live() && self.unanswered().is_some() => {
                Trouble::Unconfirmed
            }
            Cause::Absent if self.live() => Trouble::Absent,
            Cause::Lost if self.live() && self.unanswered().is_some() => Trouble::Lost,
            Cause::PageChanged if self.live() => {
                Trouble::PageChanged(step.text.clone().unwrap_or_default())
            }
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
                let (at, trouble) = self.untold_of(&h.id, since)?;
                Some((h.id.clone(), at, trouble))
            })
            .collect()
    }
    /// `id`'s trouble to tell of, unless its session handed over again
    /// since, in a newer handoff (review of #318, P2-04).
    pub fn untold_of(&self, id: &str, since: i64) -> Option<(usize, Trouble)> {
        if self.superseded(id) {
            return None;
        }
        self.get(id)?.untold(since)
    }
    /// ChatGPT answered `id`'s words, and the tab drew nothing (#457): an
    /// auto round trip still waiting on it stops, for `reason`, as one not
    /// answered in time would. Whether it stopped.
    pub fn stop_undrawn(&mut self, id: &str, reason: &str, now: i64) -> bool {
        let waits = self.get(id).is_some_and(|h| {
            h.auto
                && h.status == Status::Open
                && matches!(h.phase, Phase::Delivered | Phase::Working)
        });
        if !waits || !self.stop(id, reason, true, now) {
            return false;
        }
        self.caused_last(id, Cause::Undrawn);
        true
    }
    /// Reads again found the page lacks what PostPane reads (#548), while
    /// `id` waits on ChatGPT: a round trip on stops for `reason`; one
    /// stopped already gets the reason as a step, once for this wait.
    /// Whether it changed.
    pub fn page_changed(&mut self, id: &str, reason: &str, now: i64) -> bool {
        let Some(h) = self
            .get(id)
            .filter(|h| h.live() && matches!(h.phase, Phase::Delivered | Phase::Working))
        else {
            return false;
        };
        if h.auto {
            return self.stop(id, reason, true, now) && {
                self.caused_last(id, Cause::PageChanged);
                true
            };
        }
        let since = h.phase_at;
        let said = h
            .steps
            .iter()
            .any(|s| s.at >= since && s.cause == Some(Cause::PageChanged));
        let Some(h) = self.get_mut(id).filter(|_| !said) else {
            return false;
        };
        h.steps.push(
            Step::new(now, StepKind::Fail, Some(reason))
                .by_auto()
                .caused(Cause::PageChanged),
        );
        h.updated_at = now;
        true
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
        assert!(book.overdue(late, reason, "没人领"));
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

    /// Review of #318, P2-04: the session handed over again since, in a new
    /// handoff: the old one's trouble is out of date, and not told.
    #[test]
    fn trouble_of_a_handoff_handed_over_again_is_not_told() {
        let mut book = Book::default();
        let old = book.begin("s1", None, "修登录", None, "请审核", 1);
        assert!(book.failed(&old.id, "timeout", 2));
        assert_eq!(book.untold(0).len(), 1);
        let new = book.begin("s1", None, "修登录", None, "请审核", 3);
        assert!(book.opened(&new.id, "c1", 4));
        assert!(book.untold(0).is_empty(), "{:?}", book.untold(0));
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
