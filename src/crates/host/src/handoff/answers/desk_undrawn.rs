//! A read again that found the answer in ChatGPT but not drawn (#457): on
//! 2026-11-20 #439's answer stayed in a tab whose window was off screen, and
//! the handoff waited out its 30 minutes with nothing said. What each read
//! found goes in `turns.jsonl`; reads in a row that find the answer there,
//! not drawn, stop the auto round trip and leave it to the person, saying
//! that opening the tab takes it in.
use super::Desk;
use agent_hud_runtime::l10n;
use serde_json::{json, Value};

/// How many reads in a row must find the answer undrawn, two minutes apart
/// (`reread::AGAIN_MS`): one may catch a tab put in front a moment late.
pub(super) const UNDRAWN_TIMES: u32 = 2;

impl Desk {
    /// The extension read a conversation again and says what it found
    /// (`outcome`) and how its tab stood. Whether a handoff stopped.
    pub(super) fn heard_reread(&self, message: &Value, now: i64) -> bool {
        self.append_turn(&json!({
            "at": now,
            "conversation": message["conversation"],
            "phase": "reread",
            "outcome": message["outcome"],
            "hidden": message["hidden"],
            "active": message["active"],
            "minimized": message["minimized"],
            "fronted": message["fronted"],
            "reloaded": message["reloaded"],
        }));
        let conversation = message["conversation"].as_str().unwrap_or("");
        let Some(id) = self
            .lock()
            .for_conversation(conversation)
            .map(|h| h.id.clone())
        else {
            return false;
        };
        // Reads that reach no page come further apart (#507).
        if let Some((_, missed)) = self
            .reread_at
            .lock()
            .unwrap_or_else(|p| p.into_inner())
            .get_mut(&id)
        {
            let reached = !matches!(
                message["outcome"].as_str(),
                Some("unreachable" | "unopened")
            );
            *missed = if reached { 0 } else { *missed + 1 };
        }
        let times = {
            let mut undrawn = self.undrawn.lock().unwrap_or_else(|p| p.into_inner());
            if message["outcome"] != "undrawn" {
                undrawn.remove(&id);
                return false;
            }
            let times = undrawn.entry(id.clone()).or_default();
            *times += 1;
            *times
        };
        if times < UNDRAWN_TIMES {
            return false;
        }
        self.undrawn
            .lock()
            .unwrap_or_else(|p| p.into_inner())
            .remove(&id);
        self.change(|book| book.stop_undrawn(&id, &undrawn_halt(), now))
    }
}

/// Why the round trip stopped: the answer is there, its tab drew nothing.
pub(super) fn undrawn_halt() -> String {
    l10n::text(
        "ChatGPT 已答完，但标签页没画出回信，自动往返停下，交还常浩；点开那个 ChatGPT 标签页就能收回",
        "ChatGPT has answered, but its tab drew nothing; left to you: open that ChatGPT tab to take it in",
    )
}
