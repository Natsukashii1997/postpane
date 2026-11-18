//! What keeps a review's count and its commit whole however it is handed
//! on (#347, L3 round 2): the pull request a later brief names (P1-02), a
//! review still with ChatGPT (P1-04), a cap reached here and not settled
//! (P1-08), and words sent and never known to have gone in (P1-10..12).

use super::{excerpt, key, Book, Handoff, Notice, Phase, Status, Step, StepKind, EXCERPT};
use serde::{Deserialize, Serialize};

/// Words sent to ChatGPT and not yet known to have gone in (L3 P1-10): a
/// review, or PostPane's ask to mend the last lines. One rule for them, till
/// word comes or a later review goes in: no other words go, and the same
/// words are not sent twice; an answer is held to these words only, counts
/// once, and cannot pass or close; word that comes after the answer only
/// goes on the card.
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Pending {
    pub request: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub pr: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub head: Option<String>,
    #[serde(default)]
    pub limit: u32,
    /// The words, as a step keeps them: an answer to them, confirmed or
    /// not, is known as this review's (#356).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub words: Option<String>,
    /// The words' fingerprint: the same words again are not sent twice.
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub key: String,
    /// Already on the card as sent (an ask to mend the last lines): an
    /// answer adds no 「送审」 step for them.
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub booked: bool,
    /// Their answer came: booked once, and kept so it cannot pass (P1-12).
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub answered: bool,
}

impl Pending {
    /// Whether `text` is these words again.
    pub fn same(&self, text: &str) -> bool {
        !self.key.is_empty() && self.key == key(text)
    }
}

impl Handoff {
    /// Whether words of its are with ChatGPT, unanswered: a review asked,
    /// its last lines asked to be mended (P1-04), or words sent and never
    /// known to have gone in (P1-10).
    pub fn in_flight(&self) -> bool {
        self.status == Status::Opening
            || (self.live()
                && (matches!(
                    self.phase,
                    Phase::Sending | Phase::Delivered | Phase::Working
                ) || self.unanswered().is_some()))
    }
    /// Words sent, never known to have gone in, their answer not yet in.
    pub fn unanswered(&self) -> Option<&Pending> {
        self.gate.pending.as_ref().filter(|p| !p.answered)
    }
    /// An answer to words never known to have gone in (P1-11): they go on
    /// the card before it, as word of them would have put them, so the
    /// count and the timeline keep their order; the pending stays, answered,
    /// so the answer cannot pass.
    pub(super) fn answer_pending(&mut self, now: i64) {
        let Some(pending) = self.gate.pending.as_mut().filter(|p| !p.answered) else {
            return;
        };
        pending.answered = true;
        if !pending.booked {
            let step = Step::new(now, StepKind::Ask, pending.words.as_deref());
            let step = step.keyed(&pending.key.clone());
            self.steps.push(step);
            self.rounds += 1;
        }
    }
}

impl Book {
    /// A review of handoff `id` is about to be sent (L3 P1-10).
    pub fn ask_pending(&mut self, id: &str, pending: Pending) -> bool {
        let Some(handoff) = self.live_mut(id) else {
            return false;
        };
        let fingerprint = pending.words.as_deref().map(key).unwrap_or_default();
        let words = pending.words.as_deref().map(|w| excerpt(w, EXCERPT));
        handoff.gate.pending = Some(Pending {
            words,
            key: fingerprint,
            answered: false,
            ..pending
        });
        true
    }
    /// Word that `request` went in came after its answer (P1-12): it goes on
    /// the card, and nothing else changes; the answer still cannot pass.
    /// Whether it was such late word.
    pub fn confirmed_late(&mut self, id: &str, request: &str, note: &str, now: i64) -> bool {
        let Some(handoff) = self.list.iter_mut().find(|h| h.id == id) else {
            return false;
        };
        let late = handoff
            .gate
            .pending
            .as_ref()
            .is_some_and(|p| p.request == request && p.answered);
        if late {
            handoff
                .steps
                .push(Step::new(now, StepKind::Work, Some(note)).by_auto());
            handoff.updated_at = now;
        }
        late
    }
    /// The review sent as `request` went in: it is no longer pending.
    pub fn confirm_pending(&mut self, id: &str, request: &str) -> bool {
        let Some(handoff) = self.list.iter_mut().find(|h| h.id == id) else {
            return false;
        };
        if handoff
            .gate
            .pending
            .as_ref()
            .is_some_and(|p| p.request == request)
        {
            handoff.gate.pending = None;
            return true;
        }
        false
    }
    /// Words pending when the app stopped: nothing will say they went in,
    /// so the auto round trip stops on them, as when word never came; their
    /// answers count but cannot pass. Each card says so.
    pub fn pending_at_restart(&mut self, text: &str, now: i64) -> bool {
        let ids = self
            .list
            .iter()
            .filter(|h| h.live() && h.unanswered().is_some())
            .map(|h| h.id.clone())
            .collect::<Vec<_>>();
        for id in &ids {
            self.unconfirmed(id, text, now);
        }
        !ids.is_empty()
    }
    /// Word that words of handoff `id` went in never came (P1-10): the auto
    /// round trip stops, saying so; one already off says so on the card.
    pub fn unconfirmed(&mut self, id: &str, text: &str, now: i64) -> bool {
        if self.stop(id, text, true, now) {
            return true;
        }
        let Some(handoff) = self.live_mut(id) else {
            return false;
        };
        handoff
            .steps
            .push(Step::new(now, StepKind::Work, Some(text)).by_auto());
        handoff.updated_at = now;
        true
    }
    /// Binds handoff `id` to the pull request its newest brief names
    /// (P1-02): the one a pass is checked against.
    pub fn set_pr(&mut self, id: &str, pr: &str) -> bool {
        let Some(handoff) = self.live_mut(id).filter(|h| !h.thinking()) else {
            return false;
        };
        handoff.pr = Some(pr.to_owned());
        true
    }
    /// The engineering review of this session or working directory that
    /// reached its cap and is not settled (P1-08): still open, and no
    /// engineering review begun here since. A new one here goes only with
    /// the person's word, whatever chain or pull request it names.
    pub fn unsettled_top(&self, session: &str, cwd: Option<&str>) -> Option<&Handoff> {
        let here = |h: &Handoff| {
            !h.thinking()
                && (h.claude_session == session || (cwd.is_some() && h.cwd.as_deref() == cwd))
        };
        // Ended by PostPane after a day untouched (#368) settles nothing:
        // only the person's end, or a review begun since, does.
        let unsettled = |h: &Handoff| {
            h.live()
                || h.steps
                    .last()
                    .is_some_and(|s| s.kind == StepKind::End && s.auto)
        };
        let top = self
            .list
            .iter()
            .rev()
            .find(|h| here(h) && h.gate.notice == Some(Notice::Top) && unsettled(h))?;
        // When it reached the cap; kept from before that, its last change.
        let at = match top.gate.top_at {
            0 => top.updated_at,
            at => at,
        };
        let since = self
            .list
            .iter()
            .any(|h| h.id != top.id && here(h) && h.created_at > at);
        (!since).then_some(top)
    }
}

#[cfg(test)]
mod tests {
    use super::super::*;

    #[test]
    fn a_cap_reached_here_stays_unsettled_until_the_next_review_begins() {
        let mut book = Book::default();
        let top = book.begin("s1", Some("/w"), "修登录", None, "改动", 1);
        book.opened(&top.id, "c1", 1);
        assert!(book.get(&top.id).unwrap().in_flight(), "asked, unanswered");
        book.replied("c1", "还差\n审查出口：返修\n结论：需修改", Some("m1"), 2);
        assert!(!book.get(&top.id).unwrap().in_flight());
        book.note(&top.id, Notice::Top, 2);
        let at = book.get(&top.id).unwrap().updated_at;
        for (session, cwd, found) in [
            ("s1", None, true),
            ("s2", Some("/w"), true),
            ("s2", Some("/other"), false),
        ] {
            assert_eq!(
                book.unsettled_top(session, cwd).is_some(),
                found,
                "{session} {cwd:?}"
            );
        }
        // Ended after a day untouched, it is still not settled (#368).
        let mut idle = book.clone();
        assert!(idle.idle(at + super::super::IDLE_END_MS + 1, "闲置结束"));
        assert!(idle.unsettled_top("s1", None).is_some());
        // A thinking review begun since settles nothing; an engineering one does.
        book.begin("s2", Some("/w"), "思维评审｜方向", None, "想法", at + 1);
        assert!(book.unsettled_top("s3", Some("/w")).is_some());
        book.begin("s2", Some("/w"), "修登录二", None, "改动", at + 2);
        assert!(book.unsettled_top("s3", Some("/w")).is_none());
        // A pull request named later binds the handoff to it.
        assert!(book.set_pr(&top.id, "o/r#9"));
        assert_eq!(book.get(&top.id).unwrap().pr.as_deref(), Some("o/r#9"));
    }

    /// P2-05: an ended handoff's answer is cut only once it is kept whole
    /// in `replies/`; one from before the gate is kept first, and one that
    /// cannot be kept stays whole.
    #[test]
    fn an_answer_is_cut_only_once_it_is_kept_whole() {
        let long = format!("{}\n审查出口：返修\n结论：需修改", "长".repeat(EXCERPT * 2));
        let ended = || {
            let mut book = Book::default();
            let h = book.begin("s1", None, "修登录", None, "改动", 1);
            book.opened(&h.id, "c1", 1);
            book.replied("c1", &long, Some("m1"), 2);
            book.passed(&h.id, "结束", 3);
            (book, h.id)
        };
        let reply = |book: &Book, id: &str| {
            book.get(id)
                .unwrap()
                .last_reply()
                .unwrap()
                .text
                .clone()
                .unwrap()
        };
        let temp = tempfile::tempdir().unwrap();
        // Nowhere to keep it: it stays whole.
        let blocked = temp.path().join("file");
        std::fs::write(&blocked, "").unwrap();
        let (mut book, id) = ended();
        slim_kept(&blocked, &mut book);
        assert_eq!(reply(&book, &id), long.trim());
        // Kept first, then cut.
        let data = temp.path().join("data");
        slim_kept(&data, &mut book);
        assert!(reply(&book, &id).chars().count() <= EXCERPT + 1);
        assert_eq!(archived(&data, &id, 1).as_deref(), Some(long.trim()));
        // Read back from a file of before the gate, it is kept whole first.
        let (book, id) = ended();
        let fresh = temp.path().join("fresh");
        save(&fresh, &book).unwrap();
        let loaded = load(&fresh);
        assert!(reply(&loaded, &id).chars().count() <= EXCERPT + 1);
        assert_eq!(archived(&fresh, &id, 1).as_deref(), Some(long.trim()));
    }

    /// P2-07: a cap reached is measured from when it was reached, whatever
    /// moves the handoff on after.
    #[test]
    fn a_cap_settled_stays_settled_as_its_words_are_taken() {
        let mut book = Book::default();
        let top = book.begin("s1", Some("/w"), "修登录", None, "改动", 1);
        book.opened(&top.id, "c1", 1);
        book.replied("c1", "还差\n审查出口：返修\n结论：需修改", Some("m1"), 2);
        book.returned(&top.id, StepKind::Back, "意见", "p1", true, 3);
        book.note(&top.id, Notice::Top, 3);
        book.begin("s2", Some("/w"), "修登录二", None, "改动", 9);
        assert!(book.delivery(&top.id, "p1", Delivery::Taken, 10));
        assert!(book.unsettled_top("s3", Some("/w")).is_none());
    }

    /// P2-10: an answer kept twice is read back whole.
    #[test]
    fn an_answer_kept_twice_is_read_back_whole() {
        let temp = tempfile::tempdir().unwrap();
        // Several, so the order a folder is read in cannot hide the pick.
        for n in 1..=12 {
            let id = format!("h{n}");
            archive(temp.path(), &id, 1, &format!("截过的 {n}")).unwrap();
            archive(temp.path(), &id, 1, &format!("完整的原文，比截过的长 {n}")).unwrap();
            archive(temp.path(), &id, 2, "下一封").unwrap();
        }
        for n in 1..=12 {
            assert_eq!(
                archived(temp.path(), &format!("h{n}"), 1),
                Some(format!("完整的原文，比截过的长 {n}"))
            );
        }
    }
}
