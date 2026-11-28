//! Antigravity writes `transcript.jsonl` with long fields cut short
//! (`truncated_fields`, a `<truncated N bytes>` line in their middle) and the
//! whole record beside it in `transcript_full.jsonl`, under the same
//! `step_index`. A conversation page shows a cut line's whole record, so a
//! message's words and its answer read as they were written: a long message
//! sent as the user is found by its words, and its answer comes whole
//! (postpane#560). Usage and live state still come from `transcript.jsonl`.
use crate::MAX_LINE;
use serde_json::Value;
use std::{
    collections::HashMap,
    fs::{self, File},
    io::{BufRead, BufReader, Read, Seek, SeekFrom},
    path::{Path, PathBuf},
    sync::{Mutex, PoisonError},
    time::SystemTime,
};

/// A whole transcript larger than this is not indexed.
const MAX_WHOLE: u64 = 256 * 1024 * 1024;

/// Where each step's line starts in the whole transcript last indexed.
struct Index {
    path: PathBuf,
    length: u64,
    modified: Option<SystemTime>,
    at: HashMap<u64, u64>,
}
static INDEX: Mutex<Option<Index>> = Mutex::new(None);

/// One transcript line as a page reads it: for an Antigravity line with cut
/// fields, the whole record of its step where the whole transcript has it.
pub(crate) fn line(source: &str, path: &Path, bytes: &[u8]) -> serde_json::Result<Value> {
    let value = serde_json::from_slice::<Value>(bytes)?;
    Ok(whole(source, path, value))
}

fn whole(source: &str, path: &Path, value: Value) -> Value {
    if source != agent_hud_agents::antigravity::AGENT.id
        || !value["truncated_fields"]
            .as_array()
            .is_some_and(|fields| !fields.is_empty())
        || path
            .file_name()
            .is_none_or(|name| name != "transcript.jsonl")
    {
        return value;
    }
    let Some(step) = value["step_index"].as_u64() else {
        return value;
    };
    read(&path.with_file_name("transcript_full.jsonl"), step)
        .filter(|record| {
            record["step_index"].as_u64() == Some(step) && record["type"] == value["type"]
        })
        .unwrap_or(value)
}

fn read(full: &Path, step: u64) -> Option<Value> {
    let meta = fs::symlink_metadata(full)
        .ok()
        .filter(|meta| meta.is_file())?;
    let offset = {
        let mut index = INDEX.lock().unwrap_or_else(PoisonError::into_inner);
        let current = index.as_ref().is_some_and(|index| {
            index.path == full
                && index.length == meta.len()
                && index.modified == meta.modified().ok()
        });
        if !current {
            *index = Some(build(full, &meta)?);
        }
        *index.as_ref()?.at.get(&step)?
    };
    let mut reader = BufReader::new(File::open(full).ok()?);
    reader.seek(SeekFrom::Start(offset)).ok()?;
    let mut line = Vec::new();
    reader
        .take(MAX_LINE as u64 + 1)
        .read_until(b'\n', &mut line)
        .ok()?;
    (line.len() <= MAX_LINE)
        .then(|| serde_json::from_slice(&line).ok())
        .flatten()
}

fn build(full: &Path, meta: &fs::Metadata) -> Option<Index> {
    #[derive(serde::Deserialize)]
    struct Step {
        step_index: u64,
    }
    if meta.len() > MAX_WHOLE {
        return None;
    }
    let mut reader = BufReader::new(File::open(full).ok()?);
    let mut at = HashMap::new();
    let mut offset = 0u64;
    let mut line = Vec::new();
    loop {
        line.clear();
        let read = reader.read_until(b'\n', &mut line).ok()?;
        if read == 0 {
            break;
        }
        if let Ok(step) = serde_json::from_slice::<Step>(&line) {
            at.entry(step.step_index).or_insert(offset);
        }
        offset += read as u64;
    }
    Some(Index {
        path: full.into(),
        length: meta.len(),
        modified: meta.modified().ok(),
        at,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn write(dir: &Path, name: &str, lines: &[Value]) -> PathBuf {
        let path = dir.join(name);
        let text = lines
            .iter()
            .map(|line| format!("{line}\n"))
            .collect::<String>();
        fs::write(&path, text).unwrap();
        path
    }

    /// Shapes as Antigravity 2.35.2 wrote them for a 19,000-character request
    /// (session f2e8fb04, 2026-11-27): a cut line keeps its head and tail.
    #[test]
    fn a_cut_antigravity_line_reads_as_its_whole_record() {
        let dir = tempfile::tempdir().unwrap();
        let cut = json!({"step_index":1,"type":"PLANNER_RESPONSE","status":"DONE","content":"head\n<truncated 15808 bytes>\ntail","truncated_fields":["content"]});
        let whole_reply = json!({"step_index":1,"type":"PLANNER_RESPONSE","status":"DONE","content":"head and the whole middle and tail"});
        let short =
            json!({"step_index":0,"type":"USER_INPUT","source":"USER_EXPLICIT","content":"hi"});
        let path = write(
            dir.path(),
            "transcript.jsonl",
            &[short.clone(), cut.clone()],
        );
        write(
            dir.path(),
            "transcript_full.jsonl",
            &[short.clone(), whole_reply.clone()],
        );
        let id = agent_hud_agents::antigravity::AGENT.id;
        let read = |value: &Value| line(id, &path, value.to_string().as_bytes()).unwrap();
        assert_eq!(read(&cut), whole_reply);
        // A line that was not cut is read as it is.
        assert_eq!(read(&short), short);
        // Another client's line, or another file, is never replaced.
        assert_eq!(
            line("another-client", &path, cut.to_string().as_bytes()).unwrap(),
            cut
        );
        let other = dir.path().join("other.jsonl");
        assert_eq!(whole(id, &other, cut.clone()), cut);
    }

    #[test]
    fn without_a_matching_whole_record_the_cut_line_stands() {
        let dir = tempfile::tempdir().unwrap();
        let cut = json!({"step_index":4,"type":"PLANNER_RESPONSE","content":"a\n<truncated 9 bytes>\nb","truncated_fields":["content"]});
        let path = dir.path().join("transcript.jsonl");
        let id = agent_hud_agents::antigravity::AGENT.id;
        // No whole transcript.
        assert_eq!(whole(id, &path, cut.clone()), cut);
        // The whole transcript lacks the step, or has another kind of step there.
        write(
            dir.path(),
            "transcript_full.jsonl",
            &[
                json!({"step_index":3,"type":"PLANNER_RESPONSE","content":"x"}),
                json!({"step_index":4,"type":"USER_INPUT","content":"y"}),
            ],
        );
        assert_eq!(whole(id, &path, cut.clone()), cut);
        // It grows: the index follows the file.
        write(
            dir.path(),
            "transcript_full.jsonl",
            &[
                json!({"step_index":3,"type":"PLANNER_RESPONSE","content":"x"}),
                json!({"step_index":4,"type":"PLANNER_RESPONSE","content":"a, all of it, b"}),
            ],
        );
        assert_eq!(whole(id, &path, cut.clone())["content"], "a, all of it, b");
    }
}
