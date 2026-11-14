//! Whose answer a finished turn is (#356 P1-01): a turn counts for a
//! handoff only when it answers the words the handoff last sent. A lost
//! report followed by the person chatting on in the same conversation would
//! otherwise make their own turn's answer the review's; the message id only
//! keeps one answer from counting twice, not the wrong one from counting.
use super::Desk;
use agent_hud_runtime::chatgpt::handoffs::{Handoff, StepKind};
use serde_json::Value;

/// How much of the words' start, spaces left out, has to agree: the page
/// shows the prompt as sent (2026-11-14, a 6887-character brief matched to
/// the end of the 600 kept), and an excerpt keeps far more than this.
const HEAD: usize = 100;

/// The words without their spaces, at most `HEAD` characters.
fn head(text: &str) -> String {
    text.chars()
        .filter(|c| !c.is_whitespace())
        .take(HEAD)
        .collect()
}

/// Whether `prompt` (the turn's user message, as the page shows it) is the
/// words `handoff` last sent. One that never sent any has nothing to hold
/// it to; a turn whose prompt could not be read is not taken as its answer.
pub(super) fn answers(handoff: &Handoff, prompt: Option<&str>) -> bool {
    let Some(asked) = handoff
        .steps
        .iter()
        .rev()
        .find(|step| step.kind == StepKind::Ask)
        .and_then(|step| step.text.as_deref())
    else {
        return true;
    };
    prompt.is_some_and(|prompt| head(prompt).starts_with(&head(asked)))
}

impl Desk {
    /// Whether a finished turn in `conversation` answers other words than
    /// those its live handoff last sent: kept out, and logged as `unmatched`.
    pub(super) fn unmatched(&self, message: &Value, conversation: &str) -> bool {
        message["phase"] == "complete"
            && self
                .lock()
                .list
                .iter()
                .rev()
                .find(|h| h.live() && h.chatgpt_conversation.as_deref() == Some(conversation))
                .is_some_and(|h| !answers(h, message["prompt"].as_str()))
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
