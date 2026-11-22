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
//! told late or read again in another tab, does not. The page tells the
//! prompt only once it is drawn, which may be after the answer began; till
//! then the beginning names none, and only the end told by the same tab
//! ends it (round 5, P1-04): an end from another tab is no proof it is this
//! answer's. A beginning naming a prompt already heard to end is an older
//! turn's id read by mistake, and is taken to name none. A beginning heard
//! with no end (the tab moved on or went away mid-answer) has the
//! conversation read again when it holds words back (`unheld`): a written
//! answer to that prompt is told again, as an end. A page that was writing
//! already when its script began, or when the extension or PostPane started
//! again, tells a beginning then; one told before PostPane listened is kept
//! for it by the channel.
//!
//! What no end is heard of holds words back no longer than ChatGPT has to
//! answer (`REPLY_WAIT_MS`). That lets words go by an answer still being
//! written after it, and keeps holding by one stopped before anything was
//! written (the read finds no answer to tell): the cap is the way out, not a
//! promise nothing is being written. A restart forgets it, till a page tells
//! it again.
use super::super::{Book, Handoff, REPLY_WAIT_MS};
use serde_json::Value;

/// An answer heard to begin: when, the prompt it answers when known, and
/// the tab that told it.
#[derive(Clone, Debug, PartialEq)]
pub struct Writing {
    pub began: i64,
    pub prompt: Option<String>,
    pub tab: Option<i64>,
}

/// What is known of answers being written in a conversation.
#[derive(Clone, Debug, Default, PartialEq)]
pub struct Pen {
    pub now: Option<Writing>,
    /// The last prompt whose answer was heard to end.
    pub ended: Option<String>,
}

impl Book {
    /// A turn of `conversation` was heard to begin or to end (`message`, a
    /// `turn` with its `phase`, `promptId` and `tab`).
    pub fn heard_writing(&mut self, conversation: &str, message: &Value, now: i64) {
        let Some(handoff) = self.conversation_mut(conversation) else {
            return;
        };
        let pen = &mut handoff.gate.writing;
        let prompt = message["promptId"].as_str().map(str::to_owned);
        let tab = message["tab"].as_i64();
        if message["phase"] == "start" {
            let prompt = prompt.filter(|prompt| pen.ended.as_ref() != Some(prompt));
            // The same answer told again (its prompt drawn since, or after a
            // restart of the extension) keeps when it began.
            let same = |w: &Writing| {
                (w.prompt.is_some() && w.prompt == prompt)
                    || (w.prompt.is_none() && w.tab.is_some() && w.tab == tab)
            };
            let began = pen
                .now
                .as_ref()
                .filter(|w| same(w))
                .map_or(now, |w| w.began);
            pen.now = Some(Writing { began, prompt, tab });
            return;
        }
        let ends = |w: &Writing| match &w.prompt {
            Some(_) => w.prompt == prompt,
            None => w.tab.is_some() && w.tab == tab,
        };
        if pen.now.as_ref().is_some_and(ends) {
            pen.now = None;
        }
        if prompt.is_some() {
            pen.ended = prompt;
        }
    }
}

impl Handoff {
    /// Whether an answer is being written in its conversation, as last
    /// heard: one began within `REPLY_WAIT_MS` and was not heard to end.
    pub fn writing(&self, now: i64) -> bool {
        self.gate
            .writing
            .now
            .as_ref()
            .is_some_and(|writing| now - writing.began <= REPLY_WAIT_MS)
    }
}
