//! A user turn with no readable bubble is not a review answer (#431).
//! Show its cause through the existing stop/failure line, without new UI.
use super::Desk;
use agent_hud_runtime::l10n;
use serde_json::{json, Value};

impl Desk {
    pub(super) fn unreadable_prompt(&self, conversation: &str, at: i64) -> bool {
        let why = l10n::text(
            "提问读不到（可能是附件）",
            "The prompt could not be read (possibly an attachment)",
        );
        self.change(|book| {
            let Some(handoff) = book
                .for_conversation(conversation)
                .filter(|h| h.in_flight())
                .cloned()
            else {
                return false;
            };
            if handoff.auto {
                return book.stop(&handoff.id, &why, true, at);
            }
            // Keep a person's pause (or another stop), and report once in
            // the card's existing failure row. Repeated reads add nothing.
            if handoff.halt.as_deref() == Some(why.as_str())
                || handoff.steps.last().and_then(|s| s.text.as_deref()) == Some(why.as_str())
            {
                return false;
            }
            book.trouble(&handoff.id, &why, at)
        })
    }

    /// One line in `chatgpt/turns.jsonl` for a turn the extension reported:
    /// its conversation, phase, message id, how long the reply was and what
    /// the desk made of it (`taken`, `unused`, `early`, `caught-up`,
    /// `evicted`). Never the words themselves. A lost reply is then traced to
    /// the extension (no line) or to the desk (a line that says why); what
    /// each read again found is there too (`heard_reread`, #457).
    pub(super) fn note_turn(&self, message: &Value, at: i64, outcome: &str) {
        self.append_turn(&json!({
            "at": at,
            "conversation": message["conversation"],
            "phase": message["phase"],
            "messageId": message["messageId"],
            "replyChars": message["reply"].as_str().map(|r| r.chars().count()),
            "outcome": outcome,
            "promptFingerprint": fingerprint(message["prompt"].as_str()),
            "promptUnreadable": message["unreadable"] == true,
        }));
    }
}

// Same input gives the same diagnostic hash in every build (FNV-1a, 64-bit,
// over the UTF-8 of the first 64 characters), so lines written by different
// versions compare. It is never used to claim a reply, and neither the
// prefix nor the full prompt is kept.
fn fingerprint(prompt: Option<&str>) -> Value {
    let hash = prompt.map(|prompt| {
        let prefix: String = prompt.chars().take(64).collect();
        let hash = prefix.bytes().fold(0xcbf2_9ce4_8422_2325_u64, |h, b| {
            (h ^ u64::from(b)).wrapping_mul(0x0000_0100_0000_01b3)
        });
        format!("{hash:016x}")
    });
    json!({"chars": prompt.map(|s| s.chars().count()), "headHash": hash})
}

#[cfg(test)]
mod tests {
    /// The hash is pinned (FNV-1a, 64-bit) so logs from different builds
    /// and Rust versions can be compared; `DefaultHasher` promises neither.
    #[test]
    fn prompt_hash_is_the_same_in_every_build() {
        assert_eq!(super::fingerprint(Some(""))["headHash"], "cbf29ce484222325");
        assert_eq!(
            super::fingerprint(Some("a"))["headHash"],
            "af63dc4c8601ec8c"
        );
    }
}
