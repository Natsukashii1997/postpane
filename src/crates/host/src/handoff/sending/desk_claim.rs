//! One sending per handoff, with its direction (#443): only words going
//! toward ChatGPT hold incoming turns until they are confirmed.
use super::Desk;
use agent_hud_runtime::l10n;

/// A handoff's words on their way; let go when dropped.
pub(super) struct Sending<'a>(&'a Desk, String);
impl Drop for Sending<'_> {
    fn drop(&mut self) {
        self.0
            .sending
            .lock()
            .unwrap_or_else(|p| p.into_inner())
            .remove(&self.1);
    }
}

impl Desk {
    pub(super) fn claim(&self, id: &str) -> Result<Sending<'_>, String> {
        self.claim_toward(id, true)
    }
    pub(super) fn claim_back(&self, id: &str) -> Result<Sending<'_>, String> {
        self.claim_toward(id, false)
    }
    fn claim_toward(&self, id: &str, chatgpt: bool) -> Result<Sending<'_>, String> {
        let mut sending = self.sending.lock().unwrap_or_else(|p| p.into_inner());
        if sending.contains_key(id) {
            return Err(l10n::text(
                "上一段还在送，等它送完再试。",
                "Words are still on their way; try again once they arrive.",
            ));
        }
        sending.insert(id.to_owned(), chatgpt);
        Ok(Sending(self, id.to_owned()))
    }
}
