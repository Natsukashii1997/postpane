//! Who does a handoff's work (#280, #282): Claude Code unless the record
//! says Codex. Texts name the doer as Claude; `by_doer` gives a Codex
//! one's as Codex. Moved out of handoffs.rs for the 300-line ratchet.

use super::Book;

/// The doer's name as texts give it.
pub fn doer_name(doer: Option<&str>) -> &'static str {
    match doer {
        Some("codex") => "Codex",
        _ => "Claude",
    }
}

/// `text`, which names the doer as Claude, as this doer's.
pub fn by_doer(text: &str, doer: Option<&str>) -> String {
    text.replace("Claude", doer_name(doer))
}

impl Book {
    /// Names the client doing `id`'s work, when not Claude Code (#280).
    pub fn set_doer(&mut self, id: &str, doer: &str) {
        self.get_mut(id)
            .into_iter()
            .for_each(|h| h.doer = Some(doer.into()));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn texts_name_the_doer() {
        let text = "转回 Claude 失败两次，交还常浩";
        assert_eq!(by_doer(text, None), text);
        assert_eq!(by_doer(text, Some("claude")), text);
        assert_eq!(
            by_doer(text, Some("codex")),
            "转回 Codex 失败两次，交还常浩"
        );
    }
}
