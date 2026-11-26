//! Commands told to the extension that wait for no answer: bring a
//! conversation's tab forward (`focus`), read it again (`reread`, #356), or
//! close the ended ones' tabs (`ended`, #542).
use super::{agent, tell_watch, Channel, CURRENT};
use agent_hud_core::l10n;
use serde_json::json;
use std::sync::Weak;

impl Channel {
    /// Asks the extension whether the words sent as `request` are in
    /// `conversation` (#509): it loads the tab again and reads its prompts,
    /// past `after`, the last prompt known to have gone in before them.
    /// What it found comes as `found`.
    pub fn find(
        &self,
        conversation: &str,
        request: &str,
        after: Option<&str>,
    ) -> Result<(), String> {
        if !agent::conversation_id(conversation) {
            return Err(l10n::text("会话 id 不对", "Invalid conversation id"));
        }
        self.shared.post(
            &json!({"type":"find","conversation":conversation,"request":request,"after":after}),
        )
    }
    /// Tells the extension the conversations every handoff of which ended
    /// (#542), with the watched list: their tabs in the relay group are
    /// closed. Told again only when they change.
    pub fn ended(&self, conversations: &[String]) {
        let mut state = self.shared.lock();
        if state.ended == conversations {
            return;
        }
        state.ended = conversations.to_vec();
        tell_watch(&mut state, &self.shared.data);
    }
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
