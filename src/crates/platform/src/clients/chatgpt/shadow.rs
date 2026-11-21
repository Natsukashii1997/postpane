//! The shadow read (#488). While `dataShadow` is set in
//! `<data>/chatgpt/config.json`, the extension also reads a reply from the
//! data chatgpt.com loads for itself and tells what that found (`shadow`).
//! Each telling is kept as a line of `<data>/chatgpt/shadow.jsonl`, to be
//! compared with what the page gave (`scripts/relay-shadow-report.mjs`).
//! Nothing here is acted on: no handoff is claimed, sent back or stopped by
//! it. A line holds only the fields below, of their kinds: ids, sizes and
//! marks, no words of a reply, nothing of the sign-in. Fields:
//! docs/chatgpt-channel.md.
use serde_json::{json, Map, Value};
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
};

/// A summary is short. Anything longer is not kept, whatever it holds.
const LINE_LIMIT: usize = 4096;

pub fn path(data: &Path) -> PathBuf {
    super::folder(data).join("shadow.jsonl")
}

/// Whether the switch is on; off unless set.
pub fn on(data: &Path) -> bool {
    super::handoffs::data_shadow(data)
}

/// The kinds a field may be.
#[derive(Clone, Copy)]
enum Kind {
    /// An id: letters, digits, `-` and `_`, at most 64.
    Id,
    /// A word: a letter, then letters, digits, `-` and `_`, at most 40.
    Word,
    Count,
    Flag,
    Sha,
    /// At most 8 names of fields, at most 48 characters each.
    Names,
    Last,
    Final,
}
use Kind::*;

/// Every field a line may hold, and its kind. Ids, words and flags of the
/// extension's summary may also be null.
const FIELDS: &[(&str, Kind)] = &[
    ("conversation", Id),
    ("why", Word),
    ("at", Count),
    ("pagePromptId", Id),
    ("pageMessageId", Id),
    ("pageChars", Count),
    ("pageOutcome", Word),
    ("outcome", Word),
    ("status", Count),
    ("turns", Count),
    ("tries", Count),
    ("bytes", Count),
    ("ms", Count),
    ("hidden", Flag),
    ("login", Word),
    ("messages", Count),
    ("more", Flag),
    ("asyncStatus", Word),
    ("asked", Id),
    ("askFound", Flag),
    ("prompt", Id),
    ("after", Count),
    ("exchange", Flag),
    ("written", Flag),
    ("missing", Names),
    ("fields", Names),
    ("last", Last),
    ("final", Final),
    ("tabs", Count),
    ("stopped", Count),
    ("failed", Count),
    ("unregistered", Flag),
];
const LAST: &[(&str, Kind)] = &[
    ("role", Word),
    ("channel", Word),
    ("status", Word),
    ("type", Word),
];
const FINAL: &[(&str, Kind)] = &[
    ("id", Id),
    ("status", Word),
    ("endTurn", Flag),
    ("complete", Flag),
    ("finish", Word),
    ("chars", Count),
    ("sha", Sha),
];

fn text_is(value: &str, max: usize, first: fn(char) -> bool) -> bool {
    let mut chars = value.chars();
    value.len() <= max
        && chars.next().is_some_and(first)
        && chars.all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

fn fits(kind: Kind, value: &Value) -> bool {
    match (kind, value) {
        (Id | Word | Flag, Value::Null) => true,
        (Id, Value::String(s)) => text_is(s, 64, |c| c.is_ascii_alphanumeric()),
        (Word, Value::String(s)) => text_is(s, 40, |c| c.is_ascii_alphabetic()),
        (Count, Value::Number(n)) => n.as_u64().is_some(),
        (Flag, Value::Bool(_)) => true,
        (Sha, Value::String(s)) => s.len() == 16 && s.chars().all(|c| c.is_ascii_hexdigit()),
        (Names, Value::Array(names)) => {
            names.len() <= 8
                && names.iter().all(|name| {
                    name.as_str().is_some_and(|s| {
                        (1..=48).contains(&s.len())
                            && s.chars()
                                .all(|c| c.is_ascii_alphanumeric() || "_.[]?".contains(c))
                    })
                })
        }
        (Last, Value::Object(_)) => only(LAST, value).is_some(),
        (Final, Value::Object(_)) => only(FINAL, value).is_some(),
        (Last | Final, Value::Null) => true,
        _ => false,
    }
}

/// `value`'s fields that are among `fields` and of their kind; none when
/// any field is not.
fn only(fields: &[(&str, Kind)], value: &Value) -> Option<Map<String, Value>> {
    let mut kept = Map::new();
    for (name, field) in value.as_object()? {
        let (_, kind) = fields.iter().find(|(known, _)| known == name)?;
        if !fits(*kind, field) {
            return None;
        }
        kept.insert(name.clone(), field.clone());
    }
    Some(kept)
}

/// The line kept of a telling: its known fields of their kinds; the others
/// left out and counted (`dropped`). None when it says nothing at all.
fn line(message: &Value, now: i64) -> Option<Map<String, Value>> {
    let told = message.as_object()?;
    let mut kept = Map::new();
    let mut dropped = 0;
    for (name, value) in told {
        match FIELDS.iter().find(|(known, _)| known == name) {
            Some((_, kind)) if fits(*kind, value) => {
                kept.insert(name.clone(), value.clone());
            }
            _ if name == "type" => {}
            _ => dropped += 1,
        }
    }
    kept.get("outcome")?;
    if dropped > 0 {
        kept.insert("dropped".into(), json!(dropped));
    }
    kept.insert("heardAt".into(), json!(now));
    Some(kept)
}

/// Keeps what one shadow read found, with when it was heard: only while the
/// switch is on, only of a conversation PostPane watches. What a switch-off
/// came to (`why: off`, no conversation) is kept either way: it says the
/// pages no longer read. Whether it was kept.
pub(super) fn keep(data: &Path, watched: bool, message: &Value, now: i64) -> Result<bool, String> {
    let off = message["why"] == "off" && message.get("conversation").is_none();
    if !off && (!watched || !on(data)) {
        return Ok(false);
    }
    let line = line(message, now).ok_or("no summary")?;
    let mut bytes = serde_json::to_vec(&line).map_err(|error| error.to_string())?;
    if bytes.len() > LINE_LIMIT {
        return Err(format!("{} bytes is no summary", bytes.len()));
    }
    bytes.push(b'\n');
    crate::os::private_directory(&super::folder(data))?;
    let file = path(data);
    // One already there must be this user's alone (#488 review P2-04).
    if let Ok(metadata) = fs::symlink_metadata(&file) {
        if !metadata.is_file() || !crate::os::owner_only(&file, &metadata) {
            return Err("shadow.jsonl is not this user's alone".into());
        }
    }
    crate::os::private_append(&file)
        .and_then(|mut handle| handle.write_all(&bytes))
        .map_err(|error| error.to_string())?;
    Ok(true)
}

/// What the extension told of a shadow read: kept, and nothing else.
pub(super) fn heard(data: &Path, watched: bool, message: &Value, now: i64) {
    if let Err(error) = keep(data, watched, message, now) {
        agent_hud_core::note!("A shadow read could not be kept: {error}");
    }
}
