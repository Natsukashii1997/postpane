//! The watched list (docs/chatgpt-channel.md): the conversations PostPane
//! opened, which the extension may send to. Kept in
//! `<data>/chatgpt/watched.json` and told to the extension whole.
use super::{agent, folder, write_private};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    fs,
    path::{Path, PathBuf},
};

fn watched_path(data: &Path) -> PathBuf {
    folder(data).join("watched.json")
}

/// A conversation the extension reports on: one PostPane opened.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Watched {
    pub id: String,
    #[serde(default)]
    pub title: String,
    pub opened_at: i64,
    /// Whether PostPane named it (a handoff's title): that name comes before
    /// the tab's on its replies.
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub named: bool,
}
/// The watched list; empty when there is none or it cannot be read.
pub fn load_watched(data: &Path) -> Vec<Watched> {
    let path = watched_path(data);
    let Ok(metadata) = fs::symlink_metadata(&path) else {
        return vec![];
    };
    if !metadata.is_file() || metadata.len() > 4 * 1024 * 1024 {
        return vec![];
    }
    fs::read(&path)
        .ok()
        .and_then(|bytes| serde_json::from_slice::<Vec<Watched>>(&bytes).ok())
        .map(|list| {
            list.into_iter()
                .filter(|entry| agent::conversation_id(&entry.id))
                .collect()
        })
        .unwrap_or_default()
}
/// Replaces the watched list, privately and at once.
pub fn save_watched(data: &Path, list: &[Watched]) -> Result<(), String> {
    let bytes = serde_json::to_vec_pretty(list).map_err(|_| "Watched list unavailable")?;
    write_private(data, "watched", &bytes, &watched_path(data))
        .map_err(|_| "The watched list could not be saved".into())
}
/// The watched list, as the extension is told it; with the shadow switch
/// (#488) when it is on.
pub(super) fn watch_message(list: &[Watched], shadow: bool) -> Value {
    let mut message =
        json!({"type":"watch","conversations":list.iter().map(|w| &w.id).collect::<Vec<_>>()});
    if shadow {
        message["shadow"] = json!(true);
    }
    message
}
/// Adds a conversation to the list, or names it again; whether it changed.
/// A name PostPane gave is not replaced by the tab's.
pub(super) fn add_watched(
    list: &mut Vec<Watched>,
    id: &str,
    title: &str,
    named: bool,
    at: i64,
) -> bool {
    if let Some(entry) = list.iter_mut().find(|entry| entry.id == id) {
        if title.is_empty() || entry.title == title || (entry.named && !named) {
            return false;
        }
        entry.title = title.to_owned();
        entry.named = named;
        return true;
    }
    list.push(Watched {
        id: id.to_owned(),
        title: title.to_owned(),
        opened_at: at,
        named,
    });
    true
}
/// The watched conversation a message of the extension's is about.
pub(super) fn watched_entry(list: &[Watched], message: &Value) -> Option<Watched> {
    list.iter()
        .find(|w| Some(w.id.as_str()) == message["conversation"].as_str())
        .cloned()
}
