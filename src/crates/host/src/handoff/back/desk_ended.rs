//! 接力结束后关掉它的 ChatGPT 标签页（#542）：每次刷新告诉插件哪些会话的接力都已结束，
//! 插件只关「驿窗接力」组里显示这些会话的标签页。
use super::{Desk, Lines};
use crate::handoff::book::{Book, Status};
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

impl Desk {
    /// Tells the extension which conversations ended (#542); it says them
    /// again only when they change.
    pub(crate) fn tell_ended(&self, lines: &dyn Lines) {
        let ended = ended_conversations(&self.lock());
        lines.ended(&ended);
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
}
