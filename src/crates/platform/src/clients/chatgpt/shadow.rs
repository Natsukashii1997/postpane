//! The shadow read (#488). While `dataShadow` is set in
//! `<data>/chatgpt/config.json`, the extension also reads a reply from the
//! data chatgpt.com loads for itself and tells what that found (`shadow`).
//! Each telling is kept as a line of `<data>/chatgpt/shadow.jsonl`, to be
//! compared with what the page gave (`scripts/relay-shadow-report.mjs`).
//! Nothing here is acted on: no handoff is claimed, sent back or stopped by
//! it. A line holds ids, sizes and marks: no words of a reply, nothing of the
//! sign-in. Fields: docs/chatgpt-channel.md.
use serde_json::{json, Value};
use std::{
    io::Write,
    path::{Path, PathBuf},
};

/// A summary is short. Anything longer (a reply's words would be) is not kept.
const LINE_LIMIT: usize = 4096;

pub fn path(data: &Path) -> PathBuf {
    super::folder(data).join("shadow.jsonl")
}

/// Whether the switch is on; off unless set.
pub fn on(data: &Path) -> bool {
    super::handoffs::data_shadow(data)
}

/// Keeps what one shadow read found, with when it was heard: only while the
/// switch is on, only of a conversation PostPane watches. Whether it was kept.
pub(super) fn keep(data: &Path, watched: bool, message: &Value, now: i64) -> Result<bool, String> {
    if !watched || !on(data) {
        return Ok(false);
    }
    let mut line = message.clone();
    let fields = line.as_object_mut().ok_or("not an object")?;
    fields.remove("type");
    fields.insert("heardAt".into(), json!(now));
    let mut bytes = serde_json::to_vec(&line).map_err(|error| error.to_string())?;
    if bytes.len() > LINE_LIMIT {
        return Err(format!("{} bytes is no summary", bytes.len()));
    }
    bytes.push(b'\n');
    crate::os::private_directory(&super::folder(data))?;
    crate::os::private_append(&path(data))
        .and_then(|mut file| file.write_all(&bytes))
        .map_err(|error| error.to_string())?;
    Ok(true)
}

/// What the extension told of a shadow read: kept, and nothing else.
pub(super) fn heard(data: &Path, watched: bool, message: &Value, now: i64) {
    if let Err(error) = keep(data, watched, message, now) {
        eprintln!("A shadow read could not be kept: {error}");
    }
}
