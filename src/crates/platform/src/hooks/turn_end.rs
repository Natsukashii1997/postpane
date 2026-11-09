//! A Codex permission request outlives its turn (#286). When the turn that
//! asked ends (the model gave up waiting, or the person stopped it), Codex
//! keeps the call and its hook waiting; approving it later runs the call long
//! after anyone reads its result. So the hook follows the turn in the client's
//! own record and, once it ended, declines on the person's behalf: the call
//! never runs, and closing the connection takes the card off the sidebar.
//!
//! Only a client whose reviewer is read from its turn records
//! (`reviewer_gate`, Codex) writes each turn's end there as
//! `{"type":"event_msg","payload":{"type":"task_complete"|"turn_aborted","turn_id":…}}`.
use serde_json::{json, Value};
use std::{
    fs::File,
    io::{Read, Seek, SeekFrom},
    path::Path,
};

/// The most read at one look; the rest is read on the next. The hook looks
/// on every round of its wait loop (0.1 s), reading only what was appended.
const CHUNK: u64 = 4 * 1024 * 1024;

pub(super) struct TurnEnd {
    file: File,
    turn: String,
    partial: Vec<u8>,
}

impl TurnEnd {
    /// Follows the turn that asked, from the record's current end: the turn
    /// cannot have ended before its own request. None when the client does
    /// not record its turns, or the request names no turn or record.
    pub fn new(source: &str, payload: &Value) -> Option<Self> {
        if !records_turns(source) {
            return None;
        }
        let turn = payload["turn_id"].as_str().filter(|s| !s.is_empty())?;
        let path = Path::new(payload["transcript_path"].as_str()?);
        let mut file = File::open(path).ok()?;
        let metadata = file.metadata().ok()?;
        if !metadata.is_file() || !crate::os::owned_by_user(path, &metadata) {
            return None;
        }
        file.seek(SeekFrom::End(0)).ok()?;
        Some(Self {
            file,
            turn: turn.to_owned(),
            partial: Vec::new(),
        })
    }

    /// Whether what was appended since the last look says the turn ended.
    pub fn ended(&mut self) -> bool {
        let mut bytes = Vec::new();
        let read = (&mut self.file).take(CHUNK).read_to_end(&mut bytes);
        if read.is_err() || bytes.is_empty() {
            return false;
        }
        self.partial.extend_from_slice(&bytes);
        let mut ended = false;
        while let Some(end) = self.partial.iter().position(|b| *b == b'\n') {
            let line: Vec<u8> = self.partial.drain(..=end).collect();
            ended |= closes(&line, &self.turn);
        }
        ended
    }
}

/// Whether `line` is the record of `turn` ending.
fn closes(line: &[u8], turn: &str) -> bool {
    if !line.windows(turn.len()).any(|part| part == turn.as_bytes()) {
        return false;
    }
    let Ok(record) = serde_json::from_slice::<Value>(line) else {
        return false;
    };
    record["type"] == "event_msg"
        && matches!(
            record["payload"]["type"].as_str(),
            Some("task_complete" | "turn_aborted")
        )
        && record["payload"]["turn_id"].as_str() == Some(turn)
}

fn records_turns(source: &str) -> bool {
    agent_hud_agents::hooks::hooks_of(source)
        .ok()
        .and_then(|(_, hooks)| hooks.permission.as_ref())
        .is_some_and(|permission| permission.reviewer_gate)
}

/// The decline handed back once the turn ended, in the client's own reply
/// format, saying why; None when the request cannot be read.
pub(super) fn declined(source: &str, payload: &Value) -> Option<Value> {
    let request = agent_hud_agents::parse_request(source, payload).ok()??;
    let mut reply = request.response(&json!({"kind": "deny"})).ok()??;
    let why = "The turn that asked for this has ended, so PostPane withdrew the request; the call did not run.";
    if let Some(decision) = reply.pointer_mut("/hookSpecificOutput/decision") {
        decision["message"] = json!(why);
    }
    Some(reply)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn payload(path: &Path, turn: &str) -> Value {
        json!({
            "session_id": "01a1be3c-e125-7411-a308-4169ce8921a9",
            "turn_id": turn,
            "transcript_path": path,
            "hook_event_name": "PermissionRequest",
            "tool_name": "mcp__agent_hud__relay_to_chatgpt",
            "tool_input": {"title": "驿窗 #286"},
            "cwd": "/"
        })
    }

    fn event(kind: &str, turn: &str) -> String {
        format!(
            "{}\n",
            json!({"timestamp":"2026-11-09T04:52:40.499Z","type":"event_msg",
                "payload":{"type":kind,"root_turn_id":turn,"turn_id":turn}})
        )
    }

    fn rollout(lines: &[String]) -> (tempfile::TempDir, std::path::PathBuf) {
        let folder = tempfile::tempdir().unwrap();
        let path = folder
            .path()
            .join("rollout-2026-11-09T10-57-03-01a1be3c.jsonl");
        std::fs::write(&path, lines.concat()).unwrap();
        (folder, path)
    }

    fn append(path: &Path, line: &str) {
        let mut file = std::fs::OpenOptions::new().append(true).open(path).unwrap();
        file.write_all(line.as_bytes()).unwrap();
    }

    /// Looks until the watch says so, or a few seconds pass.
    fn ends(watch: &mut TurnEnd) -> bool {
        let until = std::time::Instant::now() + std::time::Duration::from_secs(3);
        while std::time::Instant::now() < until {
            if watch.ended() {
                return true;
            }
            std::thread::sleep(std::time::Duration::from_millis(50));
        }
        false
    }

    #[test]
    fn the_request_stops_once_its_own_turn_completes_or_is_stopped() {
        for kind in ["task_complete", "turn_aborted"] {
            let (_folder, path) = rollout(&[event("task_complete", "turn-before")]);
            let mut watch = TurnEnd::new("codex", &payload(&path, "turn-asking")).unwrap();
            assert!(!ends(&mut watch), "an earlier turn's end is history");
            append(&path, &event(kind, "turn-asking"));
            assert!(ends(&mut watch), "{kind} of the asking turn ends it");
        }
    }

    #[test]
    fn another_turn_ending_or_the_turn_going_on_keeps_it_waiting() {
        let (_folder, path) = rollout(&[]);
        let mut watch = TurnEnd::new("codex", &payload(&path, "turn-asking")).unwrap();
        append(&path, &event("task_complete", "turn-other"));
        append(
            &path,
            "{\"type\":\"response_item\",\"payload\":{\"type\":\"function_call_output\",\"output\":\"Script running with cell ID 6 turn-asking\"}}\n",
        );
        assert!(!ends(&mut watch));
    }

    #[test]
    fn a_line_written_in_two_pieces_still_counts() {
        let (_folder, path) = rollout(&[]);
        let mut watch = TurnEnd::new("codex", &payload(&path, "turn-asking")).unwrap();
        let line = event("task_complete", "turn-asking");
        let (head, tail) = line.split_at(30);
        append(&path, head);
        assert!(!ends(&mut watch));
        append(&path, tail);
        assert!(ends(&mut watch));
    }

    #[test]
    fn only_a_client_that_records_its_turns_follows_them() {
        let (_folder, path) = rollout(&[]);
        assert!(TurnEnd::new("claude", &payload(&path, "turn-asking")).is_none());
        let mut nameless = payload(&path, "");
        assert!(TurnEnd::new("codex", &nameless).is_none());
        nameless["turn_id"] = json!("turn-asking");
        nameless["transcript_path"] = json!("/nowhere/rollout.jsonl");
        assert!(TurnEnd::new("codex", &nameless).is_none());
    }

    #[test]
    fn the_decline_says_why_in_codexs_reply_format() {
        let (_folder, path) = rollout(&[]);
        let reply = declined("codex", &payload(&path, "turn-asking")).unwrap();
        let decision = &reply["hookSpecificOutput"]["decision"];
        assert_eq!(
            reply["hookSpecificOutput"]["hookEventName"],
            "PermissionRequest"
        );
        assert_eq!(decision["behavior"], "deny");
        assert!(decision["message"].as_str().unwrap().contains("ended"));
    }
}
