//! Antigravity's completion and session-origin hooks, kept in Agent HUD's own
//! `agent-hud` entry. Its permissions are observed natively (`permissions.rs`),
//! not through hooks.
use crate::hooks::{Completed, Completion, Hooks, Layout, POSIX_ONLY};
use crate::{text, HookEvent, Location};
use serde_json::{json, Value};

pub static HOOKS: Hooks = Hooks {
    settings: Some(Location::home(
        &["GEMINI_CLI_HOME"],
        &[".gemini"],
        "config/hooks.json",
    )),
    aliases: &[],
    layout: Layout::OwnedEntry,
    permission: None,
    completion: Some(Completion {
        begin: None,
        event: "Stop",
        timeout: 5,
        read: completed,
        enrich: Some(enrich),
        reply: Some(r#"{"decision":"stop"}"#),
    }),
    origin: Some(super::process::origin),
    attention: false,
    compaction: None,
    prefixed_sessions: true,
    launch: POSIX_ONLY,
};

/// A conversation that stopped without a tool call, fully idle and without
/// an error. Its turn is the callback's time.
fn completed(payload: &Value, now_ms: i64) -> Option<Completed> {
    if payload["terminationReason"] != "NO_TOOL_CALL"
        || payload["fullyIdle"] != true
        || payload["error"].as_str().is_some_and(|s| !s.is_empty())
    {
        return None;
    }
    let id = text(&payload["conversationId"])?;
    Some(Completed {
        session: id.to_owned(),
        turn: format!("stop-{now_ms}"),
        workspace: payload["workspacePaths"][0].as_str().map(str::to_owned),
        model: payload["modelName"].as_str().map(str::to_owned),
        transcript_path: text(&payload["transcriptPath"]).map(|s| json!(s)),
        usage: None,
    })
}

/// Antigravity's `Stop` payload omits its final assistant message. When the
/// platform reads the tail of `transcript.jsonl`, fill in the latest completed
/// `PLANNER_RESPONSE` step's message, and name its turn as the transcript does:
/// by the `USER_INPUT` step that began it (`transcript::TURNS`), so a message's
/// turn reads as ended (postpane#558). A turn begun before the tail keeps the
/// callback's own turn.
fn enrich(event: &mut HookEvent, transcript_tail: &[u8]) -> bool {
    if event.kind != "completion" || !event.session_id.starts_with("antigravity:") {
        return false;
    }
    let tail = &transcript_tail[transcript_tail.len().saturating_sub(1024 * 1024)..];
    let mut message = None;
    for line in tail.split(|byte| *byte == b'\n').rev() {
        let Ok(record) = serde_json::from_slice::<Value>(line) else {
            continue;
        };
        let prompt = record["type"] == "USER_INPUT";
        if message.is_some() {
            if prompt && record["source"] != "SYSTEM" {
                if let Some(idx) = record["step_index"].as_u64() {
                    event.data["turnId"] = json!(format!("step-{idx}"));
                }
                break;
            }
            continue;
        }
        if prompt && record["source"] == "USER_EXPLICIT" {
            return false;
        }
        if record["type"] != "PLANNER_RESPONSE" || record["status"] != "DONE" {
            continue;
        }
        message = record["content"]
            .as_str()
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(|content| content.chars().take(4096).collect::<String>());
    }
    let Some(message) = message else {
        return false;
    };
    event.data["message"] = json!(message);
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    fn stop() -> HookEvent {
        HookEvent {
            source: "antigravity".into(),
            session_id: "antigravity:97fe65e3-1ce2-45d2-af18-a491050f7f79".into(),
            at_ms: 1,
            kind: "completion".into(),
            data: json!({"turnId": "stop-1"}),
        }
    }

    fn tail(lines: &[Value]) -> Vec<u8> {
        lines
            .iter()
            .map(Value::to_string)
            .collect::<Vec<_>>()
            .join("\n")
            .into_bytes()
    }

    fn step(index: u64, kind: &str, source: &str, content: &str) -> Value {
        json!({"step_index": index, "source": source, "type": kind, "status": "DONE", "content": content})
    }

    /// The transcript names a turn by the `USER_INPUT` step that began it
    /// (`transcript::TURNS`); the completion must name the same turn, or a
    /// message's turn never reads as ended (postpane#558, Antigravity 2.35.2).
    #[test]
    fn the_completion_names_the_turn_its_prompt_began() {
        let mut event = stop();
        let lines = [
            step(
                0,
                "USER_INPUT",
                "USER_EXPLICIT",
                "<USER_REQUEST>\nhi\n</USER_REQUEST>",
            ),
            step(1, "PLANNER_RESPONSE", "MODEL", "驿窗 558 已收到"),
        ];
        assert!(enrich(&mut event, &tail(&lines)));
        assert_eq!(event.data["turnId"], "step-0");
        assert_eq!(event.data["message"], "驿窗 558 已收到");

        let mut event = stop();
        let lines = [
            step(0, "USER_INPUT", "USER_EXPLICIT", "first"),
            step(1, "PLANNER_RESPONSE", "MODEL", "one"),
            step(2, "USER_INPUT", "USER_EXPLICIT", "second"),
            step(3, "PLANNER_RESPONSE", "MODEL", "looking"),
            step(4, "TOOL_RESPONSE", "SYSTEM", ""),
            step(5, "USER_INPUT", "SYSTEM", "system note"),
            step(6, "PLANNER_RESPONSE", "MODEL", "done"),
        ];
        assert!(enrich(&mut event, &tail(&lines)));
        assert_eq!(event.data["turnId"], "step-2");
        assert_eq!(event.data["message"], "done");
    }

    #[test]
    fn a_prompt_without_a_reply_yet_or_a_turn_begun_out_of_reach_is_left_alone() {
        let mut event = stop();
        let lines = [
            step(0, "USER_INPUT", "USER_EXPLICIT", "first"),
            step(1, "PLANNER_RESPONSE", "MODEL", "one"),
            step(2, "USER_INPUT", "USER_EXPLICIT", "second"),
        ];
        assert!(!enrich(&mut event, &tail(&lines)));
        assert_eq!(event.data, json!({"turnId": "stop-1"}));

        // The reply is read, but the prompt that began its turn is not in the tail.
        let mut event = stop();
        assert!(enrich(
            &mut event,
            &tail(&[step(9, "PLANNER_RESPONSE", "MODEL", "late")])
        ));
        assert_eq!(event.data["turnId"], "stop-1");
        assert_eq!(event.data["message"], "late");
    }
}
