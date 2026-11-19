//! A Hermes session's bot and its way back: the Feishu chat it opens.
use super::Presentation;
use serde_json::{json, Value};
use std::{cell::OnceCell, collections::HashMap, path::PathBuf};

/// The Hermes homes read, and where each of their sessions opens in Feishu,
/// read once the first Hermes session asks (#424).
pub(super) struct HermesChats {
    roots: Vec<PathBuf>,
    chats: OnceCell<HashMap<String, String>>,
}

impl HermesChats {
    pub(super) fn new(roots: &[(PathBuf, &'static str)]) -> Self {
        Self {
            roots: roots
                .iter()
                .filter(|(_, source)| *source == "hermes")
                .map(|(root, _)| root.clone())
                .collect(),
            chats: OnceCell::new(),
        }
    }
}

impl Presentation<'_> {
    /// Each Hermes home is its own Feishu bot: the sidebar stamps its rows,
    /// and a row's ↗ opens its Feishu chat (#424).
    pub(super) fn stamp_hermes(&self, session: &mut Value) {
        if let Some(bot) = session["logPath"]
            .as_str()
            .and_then(agent_hud_agents::hermes::bot)
        {
            session["bot"] = json!({"id": bot.id, "name": bot.name});
        }
        let chats = self.hermes_chats.chats.get_or_init(|| {
            self.hermes_chats
                .roots
                .iter()
                .flat_map(|root| agent_hud_agents::hermes::gateways(root, self.now))
                .flat_map(|gateway| gateway.session_chats())
                .collect()
        });
        if let Some(target) = session["id"]
            .as_str()
            .and_then(|id| chats.get(id))
            .and_then(|chat| agent_hud_agents::hermes::chat_target(chat))
        {
            session["navigationTarget"] = target;
        }
    }
}
