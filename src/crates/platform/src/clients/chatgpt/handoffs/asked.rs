//! Which prompt in ChatGPT a handoff's words went in as (#410): ChatGPT's
//! own id for it, as the extension read it off the page. An answer is held
//! to the words by that id, not by how the page draws them; a long brief
//! ChatGPT turned into an attachment drew no words at all (2026-11-19).
use super::{Book, Handoff, Step, StepKind};

impl Handoff {
    /// The newest words it sent: a review's (`ask`) or PostPane's own ask to
    /// mend the last lines (`format`).
    pub fn last_asked(&self) -> Option<&Step> {
        self.steps
            .iter()
            .rev()
            .find(|step| matches!(step.kind, StepKind::Ask | StepKind::Format))
    }
}

impl Book {
    /// Handoff `id`'s newest words went in as prompt `asked_id`, as the
    /// extension said when it sent them. Kept once: a later word for the
    /// same words changes nothing. Whether it was kept.
    pub fn asked_as(&mut self, id: &str, asked_id: Option<&str>) -> bool {
        let Some(asked_id) = asked_id.filter(|id| !id.is_empty()) else {
            return false;
        };
        let Some(step) = self.get_mut(id).and_then(|handoff| {
            handoff
                .steps
                .iter_mut()
                .rev()
                .find(|step| matches!(step.kind, StepKind::Ask | StepKind::Format))
        }) else {
            return false;
        };
        if step.asked_id.is_some() {
            return false;
        }
        step.asked_id = Some(asked_id.to_owned());
        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_newest_words_keep_the_prompt_they_went_in_as_once() {
        let mut book = Book::default();
        let handoff = book.begin("s1", None, "修登录", None, "请审核", 1);
        book.opened(&handoff.id, "c1", 2);
        assert!(book.asked_as(&handoff.id, Some("p1")));
        assert!(!book.asked_as(&handoff.id, Some("p2")), "kept once");
        assert!(!book.asked_as(&handoff.id, None));
        let kept = book.get(&handoff.id).unwrap();
        assert_eq!(kept.last_asked().unwrap().asked_id.as_deref(), Some("p1"));
        book.replied("c1", "意见", Some("m1"), 3);
        book.asked(&handoff.id, None, "第二轮", 4);
        assert!(
            book.asked_as(&handoff.id, Some("p2")),
            "the next words' own"
        );
        let kept = book.get(&handoff.id).unwrap();
        assert_eq!(kept.last_asked().unwrap().asked_id.as_deref(), Some("p2"));
    }
}
