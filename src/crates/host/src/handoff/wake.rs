//! Running Claude Code in the background for a session whose process
//! stopped (L-14, #175): Claude's desktop app reclaims idle sessions, and
//! opening one does not run it again, so words back to it would wait.
use super::now_ms;
use super::{back_failed, back_text, republish, Desk, Lines, CLAUDE};
use agent_hud_runtime::chatgpt::handoffs::{self, Delivery};
use agent_hud_runtime::l10n;
use serde_json::Value;
use std::path::PathBuf;
use tauri::Manager;

/// Claude Code's command line, as the MCP clients name it.
const CLAUDE_CODE: &str = "claudeCode";

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
                .left(CLAUDE, &session, &prompt)
                .is_some_and(|(state, _)| state != "waiting");
            if taken || !lines.stopped(&session) || !lines.withdraw(&session, &prompt) {
                continue;
            }
            let Some(text) = self.lock().get(&id).and_then(|handoff| {
                let reply = handoff.last_reply()?.text.clone()?;
                Some(back_text(handoff, &reply))
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
                .is_some_and(|h| h.live() && h.phase == handoffs::Phase::Returned);
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
                std::time::Duration::from_millis(handoffs::WAKE_AFTER_MS as u64),
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
    let (executable, home, folder, arguments) = wake_command(session, text)?;
    let app = app.clone();
    let handoff = handoff.to_owned();
    std::thread::spawn(move || {
        let run = std::time::Duration::from_millis(handoffs::FIX_WAIT_MS as u64);
        let result =
            crate::mcp_clients::run_client_in(&executable, &arguments, &home, &folder, run);
        if let Err(error) = &result {
            eprintln!("Background Claude run for {handoff}: {error}");
        }
        if app
            .try_state::<Desk>()
            .is_some_and(|desk| desk.woke_up(&handoff, result, now_ms()))
        {
            republish(&app);
        }
    });
    Ok(())
}

/// How Claude Code runs a stopped desktop session in the background: the
/// desktop app's own record of it gives its folder, model, effort and
/// permission mode; nobody is there to allow a tool, so only modes that do
/// not ask may run (L-14).
fn wake_command(
    session: &str,
    text: &str,
) -> Result<(PathBuf, PathBuf, PathBuf, Vec<String>), String> {
    let record = agent_hud_runtime::claude_desktop_session(session).ok_or_else(|| {
        l10n::text(
            "Claude 桌面版里找不到这个会话的记录",
            "Claude's desktop app has no record of this session",
        )
    })?;
    let folder = record["cwd"]
        .as_str()
        .map(PathBuf::from)
        .filter(|folder| folder.is_dir())
        .ok_or_else(|| {
            l10n::text(
                "这个会话的工作目录已经不在了",
                "This session's folder is gone",
            )
        })?;
    let home = crate::mcp_clients::home()?;
    let executable = crate::mcp_clients::executable(CLAUDE_CODE, &home).ok_or_else(|| {
        l10n::text(
            "这台 Mac 上找不到 Claude Code 命令行",
            "Claude Code's command line is not on this Mac",
        )
    })?;
    let arguments = wake_arguments(session, &record, text)?;
    Ok((executable, home, folder, arguments))
}
/// `claude -p --resume`, in the session's permission mode, model and effort.
pub(super) fn wake_arguments(
    session: &str,
    record: &Value,
    text: &str,
) -> Result<Vec<String>, String> {
    let mode = record["permissionMode"].as_str().unwrap_or("default");
    if !matches!(mode, "auto" | "acceptEdits" | "bypassPermissions") {
        return Err(l10n::text(
            &format!("这个会话的权限模式是 {mode}，后台没人点允许，不能续接"),
            &format!("This session's permission mode is {mode}; nobody is there to allow tools in the background"),
        ));
    }
    let mut arguments = vec!["-p", "--resume", session, "--permission-mode", mode];
    for (flag, field) in [("--model", "model"), ("--effort", "effort")] {
        if let Some(value) = record[field].as_str().filter(|value| !value.is_empty()) {
            arguments.extend([flag, value]);
        }
    }
    arguments.push(text);
    Ok(arguments.into_iter().map(str::to_owned).collect())
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
            handoffs::WAKE_AFTER_MS / 60_000
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
