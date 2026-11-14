//! Commands told to the extension that wait for no answer: bring a
//! conversation's tab forward (`focus`), or read it again (`reread`, #356).
use super::{agent, Channel, CURRENT};
use agent_hud_core::l10n;
use serde_json::json;
use std::sync::Weak;

impl Channel {
    /// Asks the extension to tell the newest reply of a watched conversation
    /// again, once written (#356): a finished turn whose word was lost still
    /// arrives as a turn that completed, marked `reread`. The extension
    /// answers nothing; what it finds comes as any turn does.
    pub fn reread(&self, conversation: &str) -> Result<(), String> {
        if !agent::conversation_id(conversation) {
            return Err(l10n::text("会话 id 不对", "Invalid conversation id"));
        }
        self.shared
            .post(&json!({"type":"reread","conversation":conversation}))
    }
}

/// Brings a conversation's tab forward through the extension; false when no
/// extension is connected, so the caller opens it in the browser instead.
pub(crate) fn focus(conversation: &str) -> bool {
    if !agent::conversation_id(conversation) {
        return false;
    }
    let shared = CURRENT
        .lock()
        .unwrap_or_else(|p| p.into_inner())
        .as_ref()
        .and_then(Weak::upgrade);
    shared.is_some_and(|shared| {
        shared
            .post(&json!({"type":"focus","conversation":conversation}))
            .is_ok()
    })
}
