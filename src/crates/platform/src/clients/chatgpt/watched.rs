//! The watched list (docs/chatgpt-channel.md): the conversations PostPane
//! opened, which the extension may send to. Kept in
//! `<data>/chatgpt/watched.json` and told to the extension whole.
use super::{agent, folder, post_locked, shadow, write_private, State};
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
/// What PostPane tells the extension of handoffs that ended, for it to close
/// their tabs (#542), in order.
#[derive(Clone, Debug, Default, PartialEq)]
pub struct Ended {
    /// The conversations every handoff of which is closed.
    pub conversations: Vec<String>,
    /// The handoffs closed: a tab one opened is closed by it, though its
    /// opening failed and it never had a conversation (review P1-01).
    pub handoffs: Vec<String>,
    /// The conversations a handoff not closed has: a tab of one is kept,
    /// whatever opened it (review round 2, P2-09).
    pub live: Vec<String>,
}
/// The watch message for the list `state` keeps: with the shadow switch
/// as kept in `data`, and what ended (#542), each part when it holds any.
pub(super) fn watch_of(state: &State, data: &Path) -> Value {
    let mut message = watch_message(&state.watched, shadow::on(data));
    let ended = &state.ended;
    for (key, list) in [
        ("ended", &ended.conversations),
        ("endedRelays", &ended.handoffs),
        ("live", &ended.live),
    ] {
        if !list.is_empty() {
            message[key] = json!(list);
        }
    }
    message
}
/// Tells the extension the list `state` keeps, if one is connected.
pub(super) fn tell_watch(state: &mut State, data: &Path) {
    let watch = watch_of(state, data);
    post_locked(state, &watch);
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
