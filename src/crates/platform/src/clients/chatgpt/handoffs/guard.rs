//! What keeps a review's count and its commit whole however it is handed
//! on (#347, L3 round 2): the pull request a later brief names (P1-02), a
//! review still with ChatGPT (P1-04), a cap reached here and not settled
//! (P1-08). Words sent and never known to have gone in: `unsure.rs`.

use super::{Book, Handoff, Notice, Phase, Status, StepKind};

impl Book {
    /// Binds handoff `id` to the pull request its newest brief names
    /// (P1-02): the one a pass is checked against.
    pub fn set_pr(&mut self, id: &str, pr: &str) -> bool {
        let Some(handoff) = self.live_mut(id).filter(|h| !h.thinking()) else {
            return false;
        };
        handoff.pr = Some(pr.to_owned());
        true
    }
    /// The review of this kind (`thinking`: a 思维评审, else engineering) of
    /// this session or working directory that reached its cap and is not
    /// settled (P1-08; a 思维评审 too, round 4 P1-13): not ended by the
    /// person, and no review of its kind begun here since. A new one here
    /// goes only with the person's word, whatever chain or pull request it
    /// names.
    pub fn unsettled_top(
        &self,
        session: &str,
        cwd: Option<&str>,
        thinking: bool,
    ) -> Option<&Handoff> {
        let here = |h: &Handoff| {
            h.thinking() == thinking
                && (h.claude_session == session || (cwd.is_some() && h.cwd.as_deref() == cwd))
        };
        let top = self
            .list
            .iter()
            .rev()
            .find(|h| here(h) && h.gate.notice == Some(Notice::Top) && open_top(h))?;
        let at = top_at(top);
        let since = self
            .list
            .iter()
            .any(|h| h.id != top.id && here(h) && h.created_at > at);
        (!since).then_some(top)
    }

    /// Whether handoff `h` is in the snapshot at `now`: live; failed or
    /// ended within `day` of its last change; or a stop still holding
    /// reviews back, however long ago (#411 L2 P2-02).
    pub fn in_sight(&self, h: &Handoff, now: i64, day: i64) -> bool {
        h.live()
            || (matches!(h.phase, Phase::Failed | Phase::Ended)
                && h.status != Status::Open
                && now - h.updated_at < day)
            || self.holds_back(h)
    }

    /// Whether `top` reached its cap and is not settled, as
    /// [`Book::unsettled_top`] counts it for a review sent from its own
    /// session or folder. Such a one stays in the snapshot past the day an
    /// ended one is shown, so the 「停」 that still holds reviews back stays
    /// in sight (#411 L2 P2-02).
    pub fn holds_back(&self, top: &Handoff) -> bool {
        if top.gate.notice != Some(Notice::Top) || !open_top(top) {
            return false;
        }
        let at = top_at(top);
        !self.list.iter().any(|h| {
            h.id != top.id
                && h.thinking() == top.thinking()
                && (h.claude_session == top.claude_session
                    || (top.cwd.is_some() && h.cwd == top.cwd))
                && h.created_at > at
        })
    }
}

/// Live, or ended by PostPane after a day untouched (#368), which settles
/// nothing: only the person's end, or a review begun since, does.
fn open_top(h: &Handoff) -> bool {
    h.live()
        || h.steps
            .last()
            .is_some_and(|s| s.kind == StepKind::End && s.auto)
}

/// When it reached the cap; kept from before that, its last change.
fn top_at(top: &Handoff) -> i64 {
    match top.gate.top_at {
        0 => top.updated_at,
        at => at,
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
                book.unsettled_top(session, cwd, false).is_some(),
                found,
                "{session} {cwd:?}"
            );
        }
        // Ended after a day untouched, it is still not settled (#368).
        let mut idle = book.clone();
        assert!(idle.idle(at + super::super::IDLE_END_MS + 1, "闲置结束"));
        assert!(idle.unsettled_top("s1", None, false).is_some());
        // So it stays in the snapshot however long ago it ended (#411 L2
        // P2-02); a review of its kind begun since lets it go after the day.
        let year = at + 365 * super::super::IDLE_END_MS;
        assert!(idle.in_sight(idle.get(&top.id).unwrap(), year, 1000));
        let mut other = idle.clone();
        other.begin("s1", None, "思维评审｜方向", None, "想法", at + 1);
        assert!(other.in_sight(other.get(&top.id).unwrap(), year, 1000));
        other.begin("s1", None, "修登录二", None, "改动", at + 2);
        assert!(!other.in_sight(other.get(&top.id).unwrap(), year, 1000));
        // A thinking review begun since settles nothing; an engineering one does.
        book.begin("s2", Some("/w"), "思维评审｜方向", None, "想法", at + 1);
        assert!(book.unsettled_top("s3", Some("/w"), false).is_some());
        book.begin("s2", Some("/w"), "修登录二", None, "改动", at + 2);
        assert!(book.unsettled_top("s3", Some("/w"), false).is_none());
        // A pull request named later binds the handoff to it.
        assert!(book.set_pr(&top.id, "o/r#9"));
        assert_eq!(book.get(&top.id).unwrap().pr.as_deref(), Some("o/r#9"));
    }

    /// #439: an agent ending it at the person's word settles a cap as the
    /// person's own end does, and its card says who ended it and why.
    #[test]
    fn an_end_an_agent_made_at_the_persons_word_settles_the_cap() {
        let mut book = Book::default();
        let top = book.begin("s1", Some("/w"), "修登录", None, "改动", 1);
        book.opened(&top.id, "c1", 1);
        book.replied("c1", "还差\n审查出口：返修\n结论：需修改", Some("m1"), 2);
        book.note(&top.id, Notice::Top, 2);
        assert!(book.unsettled_top("s1", None, false).is_some());
        assert!(book.end_said(
            &top.id,
            Some("Claude Code 会话 s2 按常浩授权结束：已合并"),
            3
        ));
        assert!(book.unsettled_top("s1", None, false).is_none());
        let ended = book.get(&top.id).unwrap();
        let last = ended.steps.last().unwrap();
        assert_eq!((last.kind, last.auto), (StepKind::End, false));
        assert_eq!(
            last.text.as_deref(),
            Some("Claude Code 会话 s2 按常浩授权结束：已合并")
        );
        // Ended already: nothing more.
        assert!(!book.end_said(&top.id, Some("再结束一次"), 4));
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
        assert!(book.unsettled_top("s3", Some("/w"), false).is_none());
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
