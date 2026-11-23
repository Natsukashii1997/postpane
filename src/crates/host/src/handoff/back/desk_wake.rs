//! Running Claude Code in the background for a session whose process
//! stopped (L-14, #175): Claude's desktop app reclaims idle sessions, and
//! opening one does not run it again, so words back to it would wait. How
//! Claude Code is run is `claude_wake`'s, shared with the HUD's answers.
use super::now_ms;
use super::{back_failed, back_text, republish, Desk, Lines, CLAUDE};
use crate::handoff::book::{self, Delivery};
use agent_hud_runtime::l10n;
use tauri::Manager;

impl Desk {
    /// Words back that waited in the queue of a session that has gone quiet
    /// for `WAKE_AFTER_MS`: taken back, and Claude Code runs for the session
    /// in the background with them (L-14). Words it took meanwhile are
    /// `track`'s; a session never seen running the plugin keeps waiting,
    /// since it may be running without it. Whether anything changed.
    pub(crate) fn wake_queued(&self, lines: &dyn Lines, now: i64) -> bool {
        let due = self.lock().waiting_to_wake(now);
        let mut changed = false;
        for (id, session, prompt) in due {
            let Ok(_sending) = self.claim(&id) else {
                continue;
            };
            let taken = lines
                .left(CLAUDE, &session, &prompt, "")
                .is_some_and(|(state, _)| state != "waiting");
            if taken || !lines.stopped(&session) || !lines.withdraw(&session, &prompt) {
                continue;
            }
            // The words as they were queued, a pass held back by its commit
            // too (L3 P1-09); else as an answer goes back now.
            let Some(text) = self.lock().get(&id).and_then(|handoff| {
                let queued = handoff
                    .steps
                    .iter()
                    .rev()
                    .find(|s| s.prompt.as_deref() == Some(prompt.as_str()))
                    .and_then(|s| s.text.clone());
                let reply = handoff.last_reply()?.text.clone()?;
                Some(queued.unwrap_or_else(|| back_text(handoff, &reply, !handoff.auto)))
            }) else {
                continue;
            };
            changed |= match lines.wake(&id, &session, &text) {
                Ok(()) => self.change(|book| book.woke(&id, &woke_queued(), now)),
                // Taken back and not run: the answer waits for the person.
                Err(error) => self.change(|book| {
                    let why = wake_failed(&queued_quiet(), &error);
                    book.undelivered(&id, &prompt, Delivery::Cancelled, &why, now)
                }),
            };
        }
        changed
    }
    /// The background run for handoff `id` ended (`result`). Claude handing
    /// the next round over moved it on; still waiting on Claude, it ended
    /// without doing so, and is left to the person.
    pub(crate) fn woke_up(&self, id: &str, result: Result<(), String>, now: i64) -> bool {
        self.change(|book| {
            if !book.awake(id, now) {
                return false;
            }
            let waiting = book
                .get(id)
                .is_some_and(|h| h.live() && h.phase == book::Phase::Returned);
            if waiting {
                book.trouble(id, &woke_without_handover(result.err().as_deref()), now);
                book.stop(id, &back_failed(), true, now);
            }
            true
        })
    }
}

pub(super) fn stopped(app: &tauri::AppHandle, session: &str) -> bool {
    app.try_state::<crate::claude_plugin::ClaudePlugin>()
        .is_some_and(|plugin| {
            plugin.channel().stopped(
                session,
                std::time::SystemTime::now(),
                std::time::Duration::from_millis(book::WAKE_AFTER_MS as u64),
            )
        })
}
pub(super) fn withdraw(app: &tauri::AppHandle, session: &str, id: &str) -> bool {
    use agent_hud_runtime::claude_plugin::PromptState;
    app.try_state::<crate::claude_plugin::ClaudePlugin>()
        .and_then(|plugin| plugin.channel().cancel(session, id).ok())
        .is_some_and(|state| !matches!(state, PromptState::Taken | PromptState::Started))
}
pub(super) fn wake(
    app: &tauri::AppHandle,
    handoff: &str,
    session: &str,
    text: &str,
) -> Result<(), String> {
    let app = app.clone();
    let handoff = handoff.to_owned();
    let limit = std::time::Duration::from_millis(book::FIX_WAIT_MS as u64);
    crate::claude_wake::run(session, text, limit, move |result| {
        if let Err(error) = &result {
            agent_hud_runtime::note!("Background Claude run for {handoff}: {error}");
        }
        if app
            .try_state::<Desk>()
            .is_some_and(|desk| desk.woke_up(&handoff, result, now_ms()))
        {
            republish(&app);
        }
    })
}

/// Why a session runs in the background: its process stopped. The reason
/// sending failed is not repeated, as it tells the person to open the
/// session, which PostPane does for them here.
pub(super) fn woke_stopped() -> String {
    l10n::text(
        "这个会话的 Claude 进程已停（桌面版会回收空闲会话），直接送话送不到；驿窗改在后台续接它，按意见修改",
        "This session's Claude process stopped (the desktop app reclaims idle sessions), so the answer could not go straight to it; PostPane runs it in the background to work on the answer",
    )
}
pub(super) fn woke_queued() -> String {
    l10n::text(
        &format!(
            "意见排队 {} 分钟没被领走，会话一直没运行；驿窗撤回排队，改在后台续接 Claude，按意见修改",
            book::WAKE_AFTER_MS / 60_000
        ),
        "The queued answer was not taken up and the session stayed quiet; PostPane took it back and runs the session in the background to work on it",
    )
}
pub(super) fn queued_quiet() -> String {
    l10n::text(
        "意见排队后会话一直没运行",
        "The session stayed quiet after the answer was queued",
    )
}
pub(super) fn wake_failed(why: &str, error: &str) -> String {
    l10n::text(
        &format!("{why}；后台续接 Claude 也没成：{error}"),
        &format!("{why}; running Claude in the background failed too: {error}"),
    )
}
pub(super) fn woke_without_handover(error: Option<&str>) -> String {
    match error {
        Some(error) => l10n::text(
            &format!("后台续接 Claude 出错结束：{error}"),
            &format!("The background Claude run ended with an error: {error}"),
        ),
        None => l10n::text(
            "后台续接 Claude 这一轮结束了，但它没有交回复审",
            "The background Claude run ended without handing the work over again",
        ),
    }
}
