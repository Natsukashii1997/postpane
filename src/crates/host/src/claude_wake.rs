//! Running a Claude desktop session whose process stopped, in the background
//! (L-14): the desktop app reclaims idle sessions, and opening one does not
//! run it again, so words for it would wait. `claude -p --resume` takes them
//! as the session's next message, and the desktop app picks up the same
//! conversation later. Relays run words back this way (#175), and so do the
//! HUD's answers to Claude's questions (#520).
use agent_hud_runtime::l10n;
use serde_json::Value;
use std::{path::PathBuf, time::Duration};

/// Claude Code's command line, as the MCP clients name it.
const CLAUDE_CODE: &str = "claudeCode";

/// Starts Claude Code for `session` with `text` in the background, and calls
/// `done` with how the run ended, after at most `limit`. Err, before anything
/// runs, gives why it cannot run (no record, no folder, no command line, or a
/// permission mode that would ask).
pub(crate) fn run(
    session: &str,
    text: &str,
    limit: Duration,
    done: impl FnOnce(Result<(), String>) + Send + 'static,
) -> Result<(), String> {
    let (executable, home, folder, arguments) = command(session, text)?;
    std::thread::spawn(move || {
        done(crate::mcp_clients::run_client_in(
            &executable,
            &arguments,
            &home,
            &folder,
            limit,
        ))
    });
    Ok(())
}

/// How Claude Code runs a stopped desktop session in the background: the
/// desktop app's own record of it gives its folder, model, effort and
/// permission mode; nobody is there to allow a tool, so only modes that do
/// not ask may run (L-14).
fn command(session: &str, text: &str) -> Result<(PathBuf, PathBuf, PathBuf, Vec<String>), String> {
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
pub(crate) fn wake_arguments(
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
