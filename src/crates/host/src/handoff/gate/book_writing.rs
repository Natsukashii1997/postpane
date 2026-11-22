//! An answer being written in a handoff's conversation, whoever asked for
//! it (#507 review round 3, P1-04). `in_flight` knows only the handoff's own
//! words with ChatGPT; the person may have asked something in the same
//! conversation since the review came back, and its answer be on its way.
//! Words sent then would go in beside it: the page itself refuses (`busy`),
//! but a tab made for the words, the conversation's own not answering, may
//! not have drawn yet that an answer is being written.
//!
//! So every turn heard to begin or end in a handoff's conversation is kept,
//! in any phase, and no words go while one is being written. Kept for this
//! one use: nothing is loaded again or left alone for it.
//!
//! A beginning is often heard with no end: the tab moved to another
//! conversation or went away mid-answer, the answer was stopped empty. So
//! words held back for it have the conversation read again (`unheld`), and
//! a read that reached its page, not writing, ends it too (`read_writing`):
//! the same words go the next time. With no read to say, it holds words no
//! longer than ChatGPT has to answer (`REPLY_WAIT_MS`). A restart forgets
//! it, and the page's own look, as send is pressed, stands.
use super::super::{Book, Handoff, REPLY_WAIT_MS};

impl Book {
    /// A turn of `conversation` was heard to begin (`began`) or to end.
    pub fn heard_writing(&mut self, conversation: &str, began: bool, now: i64) {
        if let Some(handoff) = self.conversation_mut(conversation) {
            handoff.gate.writing = began.then_some(now);
        }
    }
    /// What a read of `conversation` again found (`outcome`): its page
    /// there with the newest answer written (`told`), or none being written
    /// (`waiting`), no answer is on its way. Any other says nothing of it.
    pub fn read_writing(&mut self, conversation: &str, outcome: &str) {
        if matches!(outcome, "told" | "waiting") {
            self.heard_writing(conversation, false, 0);
        }
    }
}

impl Handoff {
    /// Whether an answer is being written in its conversation, as last
    /// heard: one began within `REPLY_WAIT_MS` and was not heard to end.
    pub fn writing(&self, now: i64) -> bool {
        self.gate
            .writing
            .is_some_and(|began| now - began <= REPLY_WAIT_MS)
    }
}
