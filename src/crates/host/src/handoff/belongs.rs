//! Whose answer a finished turn is (#356 P1-01): a turn counts for a
//! handoff only when it answers the words the handoff last sent. A lost
//! report followed by the person chatting on in the same conversation would
//! otherwise make their own turn's answer the review's; the message id only
//! keeps one answer from counting twice, not the wrong one from counting.
//!
//! The words are held to as far as they are kept: in full when short, the
//! kept start (`EXCERPT` characters) when cut. Spaces are left out: the page
//! shows the prompt as sent but lays it out its own way (2026-11-14, a
//! 6887-character brief matched the 600 kept to the last character). So are
//! backticks: the page draws inline code as code and drops its marks
//! (2026-11-14, a brief naming `Desk::open` went unmatched 35 times). Two
//! sendings of the very same words, or a prompt of the person's own that
//! starts with all the kept words, still cannot be told apart.
use super::Desk;
use agent_hud_runtime::chatgpt::handoffs::{Book, Handoff, StepKind, EXCERPT};
use serde_json::Value;

/// The words without their spaces and inline-code marks.
fn bare(text: &str) -> String {
    text.chars()
        .filter(|c| !c.is_whitespace() && *c != '`')
        .collect()
}

/// Whether `prompt` (the turn's user message, as the page shows it) is the
/// words `handoff` last sent. One with no words kept, or a turn whose prompt
/// could not be read, cannot be held to them and is not taken (P2-04).
pub(super) fn answers(handoff: &Handoff, prompt: Option<&str>) -> bool {
    let Some(prompt) = prompt.map(bare) else {
        return false;
    };
    // Words sent and never known to have gone in (L3 P1-10) are the only
    // ones it may answer while they wait: an earlier review's words, asked
    // again on the page, are not this round (P1-11). Else the words a review
    // went with, or PostPane's own ask to mend its last lines (#347):
    // whichever went last.
    let words = match handoff.unanswered() {
        Some(pending) => pending.words.as_deref(),
        None => handoff
            .steps
            .iter()
            .rev()
            .find(|step| matches!(step.kind, StepKind::Ask | StepKind::Format))
            .and_then(|step| step.text.as_deref()),
    };
    words
        .filter(|text| !text.trim().is_empty())
        .is_some_and(|text| held_to(&prompt, text))
}

/// Whether `prompt`, spaces left out, is `text` as a step keeps it.
fn held_to(prompt: &str, asked: &str) -> bool {
    // A step keeps `EXCERPT` characters and marks the cut with 「…」.
    let cut = asked.chars().count() == EXCERPT + 1;
    match asked.strip_suffix('…').filter(|_| cut) {
        Some(kept) => prompt.starts_with(&bare(kept)),
        None => prompt == bare(asked),
    }
}

/// Whether a finished turn in `conversation` may count for its live
/// handoff: its prompt is the handoff's words. A conversation no live
/// handoff holds is left to `Book::replied`, which takes nothing there.
pub(super) fn fits(book: &Book, conversation: &str, prompt: Option<&str>) -> bool {
    book.list
        .iter()
        .rev()
        .find(|h| h.live() && h.chatgpt_conversation.as_deref() == Some(conversation))
        .is_none_or(|h| answers(h, prompt))
}

impl Desk {
    /// Whether a finished turn in `conversation` answers other words than
    /// those its live handoff last sent: logged as `unmatched`.
    pub(super) fn unmatched(&self, message: &Value, conversation: &str) -> bool {
        message["phase"] == "complete"
            && !fits(&self.lock(), conversation, message["prompt"].as_str())
    }
    /// How the turn log names what became of a turn: `taken`, `unmatched`
    /// (another prompt's answer) or `unused`.
    pub(super) fn outcome(&self, took: bool, message: &Value, conversation: &str) -> &'static str {
        if took {
            "taken"
        } else if self.unmatched(message, conversation) {
            "unmatched"
        } else {
            "unused"
        }
    }
}
