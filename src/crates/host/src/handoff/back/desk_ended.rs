//! 接力结束后关掉它的 ChatGPT 标签页（#542）：每次刷新告诉插件哪些会话的接力都已结束、
//! 哪些接力已结束，插件只关「驿窗接力」组里的标签页。
use super::{Desk, Lines};
use crate::handoff::book::{Book, Status};
use serde_json::Value;
use std::collections::BTreeSet;

/// The conversations every handoff of which is closed, in order. One a
/// handoff still opening, open or failed has is not: a failed one's tab is
/// where Changhao looks at what went wrong, and it may still bind.
pub(crate) fn ended_conversations(book: &Book) -> Vec<String> {
    let mut ended = BTreeSet::new();
    let mut kept = BTreeSet::new();
    for handoff in &book.list {
        let Some(conversation) = handoff.chatgpt_conversation.as_deref() else {
            continue;
        };
        if handoff.status == Status::Closed {
            ended.insert(conversation);
        } else {
            kept.insert(conversation);
        }
    }
    ended.difference(&kept).map(|c| (*c).to_owned()).collect()
}

/// The handoffs closed, in order (#542 review P1-01): a tab one opened is
/// closed by it, though its opening failed and it never had a conversation.
pub(crate) fn ended_handoffs(book: &Book) -> Vec<String> {
    let ended = book.list.iter().filter(|h| h.status == Status::Closed);
    let ids = ended.map(|h| h.id.clone()).collect::<BTreeSet<_>>();
    ids.into_iter().collect()
}

impl Desk {
    /// The snapshot's handoffs as of `now`, and then the extension told which
    /// conversations and handoffs ended (#542): told after, so one the
    /// snapshot ends (24 hours idle) is told at once (review P2-03). The
    /// channel says them again only when they change.
    pub(crate) fn projection_told(&self, lines: &dyn Lines, now: i64) -> Value {
        let snapshot = self.projection(now);
        let (conversations, handoffs) = {
            let book = self.lock();
            (ended_conversations(&book), ended_handoffs(&book))
        };
        lines.ended(&conversations, &handoffs);
        snapshot
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_conversation_is_ended_once_every_handoff_of_it_is_closed() {
        let mut book = Book::default();
        let first = book.begin("s1", None, "修登录", None, "brief", 10).id;
        assert!(book.opened(&first, "c1", 11));
        assert!(ended_conversations(&book).is_empty(), "open");
        assert!(book.end(&first, 12));
        assert_eq!(ended_conversations(&book), ["c1"]);
        // A new handoff taking the conversation on keeps it.
        let again = book.begin("s2", None, "修登录", None, "brief", 20).id;
        assert!(book.opened(&again, "c1", 21));
        assert!(ended_conversations(&book).is_empty(), "taken on again");
        // Closed as its session asks for another review: ended once more.
        book.begin("s2", None, "下一轮", None, "brief", 30);
        assert_eq!(ended_conversations(&book), ["c1"]);
    }

    #[test]
    fn a_failed_handoffs_conversation_is_not_ended() {
        let mut book = Book::default();
        let failed = book.begin("s1", None, "t", None, "brief", 10).id;
        assert!(book.failed(&failed, "没打开", 11));
        assert!(book.opened(&failed, "c2", 12), "bound late");
        book.list[0].status = Status::Failed;
        assert!(ended_conversations(&book).is_empty());
        // Ended by Changhao, it is.
        assert!(book.end(&failed, 13));
        assert_eq!(ended_conversations(&book), ["c2"]);
    }

    #[test]
    fn the_handoffs_ended_are_the_closed_ones_conversation_or_not() {
        let mut book = Book::default();
        let failed = book.begin("s1", None, "t", None, "brief", 10).id;
        assert!(book.failed(&failed, "没打开", 11));
        let open = book.begin("s2", None, "t", None, "brief", 12).id;
        assert!(book.opened(&open, "c3", 13));
        assert!(ended_handoffs(&book).is_empty());
        assert!(book.end(&failed, 14));
        assert!(book.end(&open, 15));
        let mut both = vec![failed, open];
        both.sort();
        assert_eq!(ended_handoffs(&book), both);
    }
}
