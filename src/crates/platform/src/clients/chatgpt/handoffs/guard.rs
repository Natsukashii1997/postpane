//! What keeps a review's count and its commit whole however it is handed
//! on (#347, L3 round 2): the pull request a later brief names (P1-02), a
//! review still with ChatGPT (P1-04), and a cap reached here and not
//! settled (P1-08).

use super::{Book, Handoff, Notice, Phase, Status, Step, StepKind};
use serde::{Deserialize, Serialize};

/// A review asked and not yet known to have gone in (L3 P1-10): the
/// request it is sent as, and the pull request, commit and cap it goes
/// with. An answer that comes while it is kept cannot pass: what it
/// reviewed is not known.
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
}

impl Handoff {
    /// Whether words of its are with ChatGPT, unanswered: a review asked,
    /// or its last lines asked to be mended (P1-04).
    pub fn in_flight(&self) -> bool {
        self.status == Status::Opening
            || (self.live()
                && matches!(
                    self.phase,
                    Phase::Sending | Phase::Delivered | Phase::Working
                ))
    }
}

impl Book {
    /// A review of handoff `id` is about to be sent (L3 P1-10).
    pub fn ask_pending(&mut self, id: &str, pending: Pending) -> bool {
        let Some(handoff) = self.live_mut(id) else {
            return false;
        };
        handoff.gate.pending = Some(pending);
        true
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
    /// Reviews pending when the app stopped: nothing will say they went
    /// in, so their answers count but cannot pass; each card says so.
    pub fn pending_at_restart(&mut self, text: &str, now: i64) -> bool {
        let mut any = false;
        for h in self
            .list
            .iter_mut()
            .filter(|h| h.live() && h.gate.pending.is_some())
        {
            h.steps
                .push(Step::new(now, StepKind::Work, Some(text)).by_auto());
            any = true;
        }
        any
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
        let top = self
            .list
            .iter()
            .rev()
            .find(|h| here(h) && h.live() && h.gate.notice == Some(Notice::Top))?;
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
