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
//! A beginning is known by the prompt it answers (ChatGPT's id of it), and
//! only the end of that turn ends it (round 4, P1-04): an older turn's end,
//! told late or read again in another tab, does not. A beginning heard with
//! no end (the tab moved on or went away mid-answer) has the conversation
//! read again when it holds words back (`unheld`): a written answer to that
//! prompt is told again, as an end. A page that was writing already when
//! its script began, or when the extension or PostPane started again, tells
//! a beginning then.
//!
//! What no end is heard of holds words back no longer than ChatGPT has to
//! answer (`REPLY_WAIT_MS`). That lets words go by an answer still being
//! written after it, and keeps holding by one stopped before anything was
//! written (the read finds no answer to tell): the cap is the way out, not a
//! promise nothing is being written. A restart forgets it, till a page tells
//! it again.
use super::super::{Book, Handoff, REPLY_WAIT_MS};
use serde_json::Value;

/// An answer heard to begin: when, and the prompt it answers when known.
#[derive(Clone, Debug, PartialEq)]
pub struct Writing {
    pub began: i64,
    pub prompt: Option<String>,
}

impl Book {
    /// A turn of `conversation` was heard to begin or to end (`message`, a
    /// `turn` with its `phase` and `promptId`). An end ends the beginning of
    /// the same prompt's turn, or one whose prompt was not known.
    pub fn heard_writing(&mut self, conversation: &str, message: &Value, now: i64) {
        let Some(handoff) = self.conversation_mut(conversation) else {
            return;
        };
        let prompt = message["promptId"].as_str().map(str::to_owned);
        if message["phase"] == "start" {
            handoff.gate.writing = Some(Writing { began: now, prompt });
            return;
        }
        let ends = |writing: &Writing| writing.prompt.is_none() || writing.prompt == prompt;
        if handoff.gate.writing.as_ref().is_some_and(ends) {
            handoff.gate.writing = None;
        }
    }
}

impl Handoff {
    /// Whether an answer is being written in its conversation, as last
    /// heard: one began within `REPLY_WAIT_MS` and was not heard to end.
    pub fn writing(&self, now: i64) -> bool {
        self.gate
            .writing
            .as_ref()
            .is_some_and(|writing| now - writing.began <= REPLY_WAIT_MS)
    }
}
