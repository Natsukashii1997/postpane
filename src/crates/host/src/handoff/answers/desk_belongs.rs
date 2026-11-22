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
//! (2026-11-14, a brief naming `Desk::open` went unmatched 35 times).
//! Code-fence lines are held to two ways (#410): a page that draws the
//! fenced block as code shows no fence line, language and all (2026-11-17,
//! three briefs with a ```python or ```diff block in their first 600
//! characters never matched); one that shows the words as typed keeps them,
//! with its line breaks lost. Either way counts. Two
//! sendings of the very same words, or a prompt of the person's own that
//! starts with all the kept words, still cannot be told apart.
//!
//! Since #410 (2026-11-19) words are held to by the prompt they went in as:
//! the extension reads ChatGPT's id of it off the page when it sends, and of
//! the prompt each finished turn answers. Two ids decide alone, whatever the
//! page shows: a long brief ChatGPT made an attachment showed no words, and
//! its answer waited unclaimed. The words above are held to only when an id
//! is missing (words from before, or a page that showed none); then a turn
//! whose prompt is only that attachment counts for words long enough to
//! have been made one.
use super::Desk;
use crate::handoff::book::{Book, Handoff, StepKind, EXCERPT};
use serde_json::Value;

/// The words without their spaces and inline-code marks, and without
/// code-fence lines when `fences` is false.
fn bare(text: &str, fences: bool) -> String {
    text.lines()
        .filter(|line| fences || !line.trim_start().starts_with("```"))
        .flat_map(str::chars)
        .filter(|c| !c.is_whitespace() && *c != '`')
        .collect()
}

/// Whether a turn answering `prompt` (the turn's user message as the page
/// shows it, `prompt_id` ChatGPT's id of it) answers the words `handoff`
/// last sent. One with no words kept, or a turn whose prompt could not be
/// read, cannot be held to them and is not taken (P2-04).
pub(super) fn answers(handoff: &Handoff, prompt: Option<&str>, prompt_id: Option<&str>) -> bool {
    // Known by the prompt they went in as (#410): that alone. Words still
    // waiting to be known gone in have no id yet.
    let asked_id = handoff
        .last_asked()
        .and_then(|step| step.asked_id.as_deref());
    if let (None, Some(asked_id), Some(prompt_id)) = (handoff.unanswered(), asked_id, prompt_id) {
        return asked_id == prompt_id;
    }
    let Some(prompt) = prompt else {
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
        .is_some_and(|text| held_to(prompt, text) || (cut(text) && attached(prompt)))
}

/// Whether a step kept only the start of the words (`EXCERPT` characters
/// and 「…」): words long enough for ChatGPT to make an attachment of.
fn cut(asked: &str) -> bool {
    asked.chars().count() == EXCERPT + 1 && asked.ends_with('…')
}

/// Whether a prompt is only the attachment ChatGPT made of a long paste:
/// its name and kind, 「粘贴的文本 (1).txt文档」 or "Pasted text.txt Document".
fn attached(prompt: &str) -> bool {
    let name: String = prompt.split_whitespace().collect();
    let pasted = name.starts_with("粘贴的文本") || name.to_lowercase().starts_with("pastedtext");
    pasted && name.contains(".txt") && name.chars().count() <= 60
}

/// Whether `prompt`, held to as the module says, is `asked` as a step keeps it.
fn held_to(prompt: &str, asked: &str) -> bool {
    // A step keeps `EXCERPT` characters and marks the cut with 「…」.
    let kept = asked.strip_suffix('…').filter(|_| cut(asked));
    [true, false].into_iter().any(|fences| {
        let prompt = bare(prompt, fences);
        match kept {
            Some(kept) => prompt.starts_with(&bare(kept, fences)),
            None => prompt == bare(asked, fences),
        }
    })
}

/// Whether a finished turn in `conversation` may count for its live
/// handoff: its prompt is the handoff's words. A conversation no live
/// handoff holds is left to `Book::replied`, which takes nothing there.
pub(super) fn fits(
    book: &Book,
    conversation: &str,
    prompt: Option<&str>,
    prompt_id: Option<&str>,
) -> bool {
    book.list
        .iter()
        .rev()
        .find(|h| h.live() && h.chatgpt_conversation.as_deref() == Some(conversation))
        .is_none_or(|h| answers(h, prompt, prompt_id))
}

impl Desk {
    /// Whether a finished turn in `conversation` answers other words than
    /// those its live handoff last sent: logged as `unmatched`.
    pub(super) fn unmatched(&self, message: &Value, conversation: &str) -> bool {
        message["phase"] == "complete"
            && !fits(
                &self.lock(),
                conversation,
                message["prompt"].as_str(),
                message["promptId"].as_str(),
            )
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
