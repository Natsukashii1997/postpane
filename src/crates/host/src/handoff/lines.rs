//! The app's own `Lines` (moved out of handoff.rs for the 300-line ratchet,
//! #280): words to ChatGPT through the Chrome extension, words back to a
//! Claude Code session through Agent HUD's plugin, and to a Codex thread
//! through Codex's own queue, as agent messages send (#278).
use super::{no_plugin, Lines, Unsent, CLAUDE, CODEX};
use crate::messages::DeliveryClients;
use agent_hud_runtime::claude_plugin::Opener;
use agent_hud_runtime::delivery::{
    DeliveryState, LocalClients, Operation, PromptForm, Provider, SendRequest,
};
use agent_hud_runtime::l10n;
use std::sync::Arc;
use tauri::Manager;

/// The app's own lines: the ChatGPT channel, Agent HUD's Claude Code plugin,
/// and for a Codex doer (#280) the senders agent messages keep (#278).
pub(super) struct AppLines<'a>(pub(super) &'a tauri::AppHandle);
impl Lines for AppLines<'_> {
    fn connected(&self) -> bool {
        self.0
            .try_state::<crate::chatgpt::ChatGpt>()
            .is_some_and(|chatgpt| chatgpt.connected())
    }
    fn open(
        &self,
        text: &str,
        project: Option<&str>,
        title: &str,
        request: &str,
    ) -> Result<String, String> {
        let state = self
            .0
            .try_state::<crate::chatgpt::ChatGpt>()
            .ok_or("The ChatGPT channel is unavailable")?;
        let opened = state
            .channel()?
            .open_as(text, project, Some(title), Some(request))?;
        opened["conversation"]
            .as_str()
            .map(str::to_owned)
            .ok_or_else(|| "The ChatGPT extension named no conversation".into())
    }
    fn send(&self, conversation: &str, text: &str, request: &str) -> Result<(), String> {
        let state = self
            .0
            .try_state::<crate::chatgpt::ChatGpt>()
            .ok_or("The ChatGPT channel is unavailable")?;
        state
            .channel()?
            .send_as(conversation, text, Some(request))
            .map(drop)
    }
    fn reaches(&self, doer: &str, session: &str) -> Result<(), String> {
        if doer == CODEX {
            // Codex's queue takes words for a thread not open now and
            // wakes or waits for it (#278).
            return codex_clients(self.0).map(drop);
        }
        let plugin = self
            .0
            .try_state::<crate::claude_plugin::ClaudePlugin>()
            .ok_or_else(no_plugin)?;
        plugin
            .replies()
            .reaches(CLAUDE, session)
            .map_err(|unreachable| unreachable.note)
    }
    fn reply(&self, doer: &str, session: &str, id: &str, text: &str) -> Result<(), Unsent> {
        if doer == CODEX {
            return codex_send(self.0, session, id, text);
        }
        use agent_hud_runtime::claude_plugin::Refusal;
        let plugin = self
            .0
            .try_state::<crate::claude_plugin::ClaudePlugin>()
            .ok_or_else(|| Unsent::Failed(no_plugin()))?;
        let replies = plugin.claude_replies();
        replies
            .reply_as(session, id, text)
            .map_err(|refusal| match refusal {
                Refusal::IdentityConflict => Unsent::Again,
                refusal => Unsent::Failed(replies.refusal_text(session, &refusal)),
            })
    }
    fn leave(&self, session: &str, text: &str) -> Result<String, String> {
        let plugin = self
            .0
            .try_state::<crate::claude_plugin::ClaudePlugin>()
            .ok_or_else(no_plugin)?;
        plugin
            .channel()
            .hand(session, text, std::time::SystemTime::now())
            .map_err(|refusal| {
                eprintln!("左滑发起 could not leave words: {refusal}");
                l10n::text(
                    "没能交给这个会话的 Agent HUD 插件。",
                    "The words could not be left for this session's Agent HUD plugin.",
                )
            })
    }
    fn queue(&self, doer: &str, session: &str, id: &str, text: &str) -> Result<(), Unsent> {
        if doer == CODEX {
            return codex_send(self.0, session, id, text);
        }
        use agent_hud_runtime::claude_plugin::Refusal;
        let plugin = self
            .0
            .try_state::<crate::claude_plugin::ClaudePlugin>()
            .ok_or_else(|| Unsent::Failed(no_plugin()))?;
        plugin
            .channel()
            .queue_as(session, id, text, std::time::SystemTime::now())
            .map_err(|refusal| match refusal {
                Refusal::IdentityConflict => Unsent::Again,
                refusal => {
                    eprintln!("转回 Claude could not queue words: {refusal}");
                    Unsent::Failed(l10n::text(
                        "没能排进这个会话的待发送队列。",
                        "The words could not be queued for this session.",
                    ))
                }
            })
    }
    fn left(&self, doer: &str, session: &str, id: &str) -> Option<(String, Option<String>)> {
        if doer == CODEX {
            return codex_left(self.0, session, id);
        }
        use agent_hud_runtime::claude_plugin::PromptState;
        let plugin = self.0.try_state::<crate::claude_plugin::ClaudePlugin>()?;
        let (state, reason) = plugin
            .channel()
            .state(session, id, std::time::SystemTime::now())
            .ok()??;
        let state = match state {
            PromptState::Waiting | PromptState::CancelRequested => "waiting",
            PromptState::Taken => "taken",
            PromptState::Started => "started",
            PromptState::Refused => "refused",
            PromptState::Cancelled => "cancelled",
            PromptState::Expired => "expired",
        };
        Some((state.to_owned(), reason))
    }
    fn opener(&self, doer: &str, session: &str) -> Option<(Opener, i64)> {
        // Who began a Codex turn is not read yet (#253 B): its rounds count on.
        if doer == CODEX {
            return None;
        }
        let home = crate::mcp_clients::home().ok()?;
        agent_hud_runtime::claude_plugin::current_turn(
            &agent_hud_runtime::claude_plugin::claude_config_directory(&home),
            session,
        )
    }
    fn stopped(&self, session: &str) -> bool {
        super::wake::stopped(self.0, session)
    }
    fn withdraw(&self, session: &str, id: &str) -> bool {
        super::wake::withdraw(self.0, session, id)
    }
    fn wake(&self, handoff: &str, session: &str, text: &str) -> Result<(), String> {
        super::wake::wake(self.0, handoff, session, text)
    }
}

/// The senders agent messages keep, which Codex words go through.
fn codex_clients(app: &tauri::AppHandle) -> Result<Arc<LocalClients>, String> {
    app.try_state::<DeliveryClients>()
        .map(|clients| clients.0.clone())
        .ok_or_else(|| {
            l10n::text(
                "Codex 送话通道不可用",
                "The way into Codex sessions is unavailable",
            )
        })
}

/// Words into a Codex thread's queue under the step's own id: it takes them
/// as a new turn once idle, never in a running one. The same id again is
/// the same send, so it goes once.
fn codex_send(app: &tauri::AppHandle, thread: &str, id: &str, text: &str) -> Result<(), Unsent> {
    let clients = codex_clients(app).map_err(Unsent::Failed)?;
    let receipt = clients
        .send(SendRequest {
            provider: Provider::Codex,
            session_id: thread.to_owned(),
            request_id: id.to_owned(),
            text: text.to_owned(),
            form: PromptForm::Labelled,
            operation: Operation::Enqueue,
            expected_turn_id: None,
        })
        .map_err(|error| Unsent::Failed(error.to_string()))?;
    match receipt.state {
        DeliveryState::Refused | DeliveryState::Failed => {
            Err(Unsent::Failed(receipt.reason.unwrap_or_else(|| {
                l10n::text("Codex 没收下", "Codex did not take the words")
            })))
        }
        _ => Ok(()),
    }
}

/// How words left for a Codex thread stand, in the plugin's words
/// (`waiting`, `taken`, `started`, `refused`, `expired`).
fn codex_left(app: &tauri::AppHandle, thread: &str, id: &str) -> Option<(String, Option<String>)> {
    let receipt = codex_clients(app)
        .ok()?
        .receipt(Provider::Codex, thread, id)
        .ok()??;
    let state = match receipt.state {
        DeliveryState::Waiting | DeliveryState::Queued | DeliveryState::Uncertain => "waiting",
        DeliveryState::Taken | DeliveryState::CancelRequested => "taken",
        DeliveryState::Started | DeliveryState::Steered => "started",
        DeliveryState::Refused | DeliveryState::Failed | DeliveryState::Interrupted => "refused",
        DeliveryState::Cancelled => "cancelled",
        DeliveryState::Expired => "expired",
    };
    Some((state.to_owned(), receipt.reason))
}
