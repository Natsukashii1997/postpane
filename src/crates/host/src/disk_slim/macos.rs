//! 磁盘瘦身 on macOS: a menu bar app in /Applications that writes its status
//! under Application Support and registers the `diskslim` link.
use std::path::PathBuf;

const APP: &str = "DiskSlim.app";

pub(super) fn status_file() -> Option<PathBuf> {
    let home = agent_hud_runtime::home_directory().ok()?;
    Some(home.join("Library/Application Support/disk-slim/status.json"))
}

pub(super) fn installed() -> bool {
    let user = agent_hud_runtime::home_directory()
        .map(|home| home.join("Applications").join(APP).exists())
        .unwrap_or(false);
    user || std::path::Path::new("/Applications").join(APP).exists()
}

/// `open -g` hands the link to Launch Services without bringing the app
/// forward (and starts the app first when it is not running); it returns as
/// soon as the link is handed over, failing when no app takes it.
pub(super) fn open_link(url: &str) -> Result<(), String> {
    let status = std::process::Command::new("/usr/bin/open")
        .args(["-g", url])
        .status()
        .map_err(|error| error.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("open -g failed: {status}"))
    }
}
