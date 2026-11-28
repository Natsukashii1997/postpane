//! The desktop app's tab records (`claude-code-sessions/<org>/<account>/local_*.json`):
//! reading one, and finding the session a tab holds.
use super::{uuid, ClaudeDesktopIndex, DesktopTab};
use serde_json::Value;
use std::{fs, path::Path};

impl ClaudeDesktopIndex {
    /// The Claude Code session a desktop tab (`local_…`) holds, as a session
    /// link in a next step names it; None for a tab the app does not record.
    pub fn session_of_tab(&self, tab: &str) -> Option<String> {
        self.files
            .values()
            .filter_map(|file| file.tab.as_ref())
            .find(|desktop| desktop.id == tab)
            .map(|desktop| desktop.cli_id.clone())
    }
}

/// The tab a metadata file records: only its ids, archive flag and reasoning
/// effort are read; its account is the two folders above it.
pub(super) fn desktop_tab(path: &Path, kind: &'static str) -> Option<DesktopTab> {
    let stem = path.file_stem()?.to_str()?.to_owned();
    let value = serde_json::from_slice::<Value>(&fs::read(path).ok()?).ok()?;
    if value["sessionId"].as_str() != Some(stem.as_str()) {
        return None;
    }
    let cli_id = value["cliSessionId"]
        .as_str()
        .filter(|id| uuid(id))?
        .to_owned();
    let folder = |path: Option<&Path>| {
        path.and_then(Path::file_name)
            .and_then(|name| name.to_str())
            .unwrap_or("")
            .to_owned()
    };
    let account = path.parent();
    let scope = format!(
        "{}/{}",
        folder(account.and_then(Path::parent)),
        folder(account)
    );
    let effort = value["effort"]
        .as_str()
        .map(str::trim)
        .filter(|effort| !effort.is_empty())
        .map(str::to_owned);
    Some(DesktopTab {
        kind,
        id: stem,
        cli_id,
        archived: value["isArchived"] == true,
        effort,
        scope,
    })
}
