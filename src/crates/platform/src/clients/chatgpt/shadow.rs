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
    super::files::data_shadow(data)
}

/// The kinds a field may be.
#[derive(Clone, Copy)]
enum Kind {
    /// A message or conversation id: a UUID.
    Uuid,
    /// One of these words.
    Of(&'static [&'static str]),
    /// A count, at most a billion: sizes, times taken, numbers of things.
    Count,
    /// A time in milliseconds since 1970.
    Time,
    /// A whole number from the first to the second.
    Range(u64, u64),
    /// One of these numbers.
    Nums(&'static [u64]),
    Flag,
    /// 16 lowercase hex digits.
    Sha,
    /// At most 8 names of fields, at most 48 characters each.
    Names,
    Last,
    Final,
}
use Kind::*;

// The words a field may be: what the extension says, nothing else (#488
// review). The kinds of a message are data.js's `KINDS`, or `other`.
const WHY: &[&str] = &["complete", "reread", "writing", "off"];
const OUTCOME: &[&str] = &[
    "read",
    "http",
    "error",
    "unreadable",
    "no-login",
    "other-conversation",
    "stopped",
    "limited",
    "no-script",
    "failed",
    "invalid",
    "conflict",
    "unreachable",
    "no-tab",
    "no-prompt",
    "superseded",
    "ledger-unavailable",
    "disarmed",
    "disarm-pending",
];
const PAGE_OUTCOME: &[&str] = &[
    "told",
    "undrawn",
    "streaming",
    "unloaded",
    "waiting",
    "unreachable",
    "unopened",
    "changed",
    "closed",
];
const LOGIN: &[&str] = &["same", "other"];
const ASYNC: &[&str] = &["other"];
const ROLE: &[&str] = &["user", "assistant", "system", "tool", "other"];
const CHANNEL: &[&str] = &["final", "analysis", "commentary", "other"];
const STATUS: &[&str] = &[
    "finished_successfully",
    "in_progress",
    "finished_partial_completion",
    "other",
];
const TYPE: &[&str] = &[
    "text",
    "thoughts",
    "reasoning_recap",
    "code",
    "multimodal_text",
    "execution_output",
    "other",
];
const FINISH: &[&str] = &["stop", "max_tokens", "interrupted", "other"];

/// Every field a line may hold, and its kind. Ids, words and flags of the
/// extension's summary may also be null.
const FIELDS: &[(&str, Kind)] = &[
    ("conversation", Uuid),
    ("why", Of(WHY)),
    ("at", Time),
    ("pagePromptId", Uuid),
    ("pageMessageId", Uuid),
    ("pageChars", Count),
    ("pageOutcome", Of(PAGE_OUTCOME)),
    ("outcome", Of(OUTCOME)),
    ("status", Range(100, 599)),
    ("turns", Nums(&[2, 10])),
    ("tries", Nums(&[1, 2])),
    ("bytes", Count),
    ("ms", Count),
    ("hidden", Flag),
    ("login", Of(LOGIN)),
    ("messages", Count),
    ("more", Flag),
    ("asyncStatus", Of(ASYNC)),
    ("asked", Uuid),
    ("askFound", Flag),
    ("prompt", Uuid),
    ("after", Count),
    ("exchange", Flag),
    ("written", Flag),
    ("trusted", Flag),
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
    ("role", Of(ROLE)),
    ("channel", Of(CHANNEL)),
    ("status", Of(STATUS)),
    ("type", Of(TYPE)),
];
const FINAL: &[(&str, Kind)] = &[
    ("id", Uuid),
    ("status", Of(STATUS)),
    ("endTurn", Flag),
    ("complete", Flag),
    ("finish", Of(FINISH)),
    ("chars", Count),
    ("sha", Sha),
];

/// `8-4-4-4-12` hex digits.
fn uuid(value: &str) -> bool {
    let groups: Vec<&str> = value.split('-').collect();
    groups.len() == 5
        && groups
            .iter()
            .zip([8, 4, 4, 4, 12])
            .all(|(group, len)| group.len() == len && group.chars().all(|c| c.is_ascii_hexdigit()))
}

fn fits(kind: Kind, value: &Value) -> bool {
    match (kind, value) {
        (Uuid | Of(_) | Flag, Value::Null) => true,
        (Uuid, Value::String(s)) => uuid(s),
        (Of(words), Value::String(s)) => words.contains(&s.as_str()),
        (Count, Value::Number(n)) => n.as_u64().is_some_and(|n| n <= 1_000_000_000),
        (Time, Value::Number(n)) => n.as_u64().is_some(),
        (Range(low, high), Value::Number(n)) => {
            n.as_u64().is_some_and(|n| (low..=high).contains(&n))
        }
        (Nums(known), Value::Number(n)) => n.as_u64().is_some_and(|n| known.contains(&n)),
        (Flag, Value::Bool(_)) => true,
        (Sha, Value::String(s)) => {
            s.len() == 16 && s.chars().all(|c| matches!(c, '0'..='9' | 'a'..='f'))
        }
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
    kept.get("outcome").filter(|outcome| outcome.is_string())?;
    // A prompt found is the one asked for, or neither is kept.
    if kept.get("askFound") == Some(&Value::Bool(true)) && kept.get("asked") != kept.get("prompt") {
        kept.remove("askFound");
        kept.remove("prompt");
        dropped += 2;
    }
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
