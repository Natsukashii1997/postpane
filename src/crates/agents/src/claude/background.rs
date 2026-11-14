//! A Claude Code session's background commands (`run_in_background`): the
//! session waits on them after its turn ends, and Claude Code wakes it with a
//! `<task-notification>` when one finishes, fails, is killed or stopped. A
//! session with one still out is at work, not done talking (#353).
use crate::transcript::live::{timestamp, LiveLog, Work, ABANDONED_MS};
use serde_json::Value;

impl LiveLog {
    /// Reads a Claude line, then the background commands it launches or ends;
    /// a main log reads only its own lines, as `claude` does.
    pub fn claude_line(&mut self, value: &Value) {
        self.claude(value);
        let Some(at) = timestamp(&value["timestamp"]) else {
            return;
        };
        if self.is_subagent || value["isSidechain"] != true {
            self.track_background(value, at);
        }
    }

    /// Notes a main-log line's background commands: a tool result that
    /// launched one, a notice that one ended, a `TaskStop` that stopped one.
    pub fn track_background(&mut self, value: &Value, at: i64) {
        if let Some(task) = value["toolUseResult"]["backgroundTaskId"].as_str() {
            self.background.insert(task.into(), at);
        }
        for task in ended(value) {
            self.background.remove(&task);
        }
        // A command that never told is given up with the turn it kept going.
        self.background
            .retain(|_, launched| at - *launched < ABANDONED_MS);
    }

    /// The child activity a session's state reads: its sub-agents' latest,
    /// or the launch of a background command still out within the time a
    /// silent child is given, whichever is later.
    pub fn with_background(&self, now: i64, subagents_at: Option<i64>) -> Option<i64> {
        let launched = self
            .background
            .values()
            .copied()
            .filter(|at| now - at < ABANDONED_MS)
            .max();
        subagents_at.into_iter().chain(launched).max()
    }

    /// What a session whose turn has ended does while a background command
    /// is still out: runs a command, as the board says, not sub-agents.
    pub fn background_work(&self, now: i64) -> Option<Work> {
        let ended = self.turns.back().is_some_and(|turn| !turn.running);
        (ended && self.with_background(now, None).is_some()).then_some(Work::Shell)
    }
}

/// The background commands a line says have ended: the task ids of its
/// `<task-notification>` (a prompt, or a queued command while the turn ran)
/// and the task a `TaskStop` call names.
fn ended(value: &Value) -> Vec<String> {
    let content = &value["message"]["content"];
    let blocks = content.as_array().map(Vec::as_slice).unwrap_or_default();
    let texts = content
        .as_str()
        .into_iter()
        .chain(value["attachment"]["prompt"].as_str())
        .chain(blocks.iter().filter_map(|block| block["text"].as_str()));
    let mut tasks = texts
        .filter(|text| text.contains("<task-notification>"))
        .flat_map(|text| text.split("<task-id>").skip(1))
        .filter_map(|rest| rest.split_once("</task-id>"))
        .map(|(task, _)| task.trim().to_owned())
        .collect::<Vec<_>>();
    tasks.extend(
        blocks
            .iter()
            .filter(|block| block["type"] == "tool_use" && block["name"] == "TaskStop")
            .filter_map(|block| block["input"]["task_id"].as_str())
            .map(str::to_owned),
    );
    tasks
}

#[cfg(test)]
mod tests {
    use crate::transcript::live::ABANDONED_MS;
    use crate::transcript::Log;
    use chrono::{DateTime, Utc};
    use serde_json::{json, Value};

    fn iso(at: i64) -> String {
        DateTime::<Utc>::from_timestamp_millis(at)
            .unwrap()
            .to_rfc3339()
    }

    fn usage() -> Value {
        json!({"input_tokens":10,"output_tokens":5,"cache_creation_input_tokens":0,"cache_read_input_tokens":0})
    }

    /// A turn that launches `task` in the background at `at + 2s` and ends
    /// its words at `at + 3s`, waiting to be told.
    fn waiting_on(log: &mut Log, task: &str, at: i64) {
        log.parse(&json!({"type":"user","sessionId":"s","timestamp":iso(at),"uuid":"u1","message":{"role":"user","content":"Run the tests"}}));
        log.parse(&json!({"type":"assistant","sessionId":"s","timestamp":iso(at + 1_000),"message":{"id":"m1","model":"claude-opus-4-5","role":"assistant","content":[{"type":"tool_use","id":"t1","name":"Bash","input":{"command":"pnpm test","run_in_background":true}}],"usage":usage()}}));
        log.parse(&json!({"type":"user","sessionId":"s","timestamp":iso(at + 2_000),"toolUseResult":{"stdout":"","backgroundTaskId":task},"message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"t1","content":format!("Command running in background with ID: {task}.")}]}}));
        log.parse(&json!({"type":"assistant","sessionId":"s","timestamp":iso(at + 3_000),"message":{"id":"m2","model":"claude-opus-4-5","role":"assistant","content":[{"type":"text","text":"Tests are running; I'll pick up when they finish."}],"stop_reason":"end_turn","usage":usage()}}));
    }

    fn notice(task: &str) -> String {
        format!("<task-notification>\n<task-id>{task}</task-id>\n<status>completed</status>\n<summary>Background command \"tests\" completed (exit code 0)</summary>\n</task-notification>")
    }

    fn outcome(log: &Log, now: i64) -> Value {
        log.live.facts("s", "claude", now, None).unwrap()["outcome"].clone()
    }

    #[test]
    fn a_turn_that_waits_on_a_background_command_is_still_at_work() {
        let now = Utc::now().timestamp_millis();
        let mut log = Log::new("/tmp/background-wait.jsonl".into(), "claude");
        waiting_on(&mut log, "b1", now - 60_000);
        assert_eq!(log.live.session_state(now, "claude", None), "running");
        assert_eq!(outcome(&log, now), Value::Null);
        // The board reads a command at work, not sub-agents.
        let activity = &log.live.facts("s", "claude", now, None).unwrap()["activity"];
        assert_eq!(activity["work"], json!("shell"));
        assert_eq!(activity["delegating"], json!(false));
        // The notice wakes it; the turn it starts ends with nothing left out.
        log.parse(&json!({"type":"user","sessionId":"s","timestamp":iso(now - 30_000),"origin":{"kind":"task-notification"},"message":{"role":"user","content":notice("b1")}}));
        assert_eq!(log.live.session_state(now, "claude", None), "running");
        log.parse(&json!({"type":"assistant","sessionId":"s","timestamp":iso(now - 20_000),"message":{"id":"m3","model":"claude-opus-4-5","role":"assistant","content":[{"type":"text","text":"All 812 tests pass."}],"stop_reason":"end_turn","usage":usage()}}));
        assert_eq!(log.live.session_state(now, "claude", None), "idle");
        assert_eq!(outcome(&log, now), json!("completed"));
    }

    #[test]
    fn a_command_that_never_tells_is_given_up_with_a_silent_child() {
        let now = Utc::now().timestamp_millis();
        let launched = now - 60_000 + 2_000;
        let mut log = Log::new("/tmp/background-silent.jsonl".into(), "claude");
        waiting_on(&mut log, "b1", now - 60_000);
        let gives_up = launched + ABANDONED_MS;
        assert_eq!(log.live.next_change(now, "claude", None), Some(gives_up));
        assert_eq!(
            log.live.session_state(gives_up - 1, "claude", None),
            "running"
        );
        assert_eq!(log.live.session_state(gives_up, "claude", None), "idle");
        assert_eq!(outcome(&log, gives_up), json!("completed"));
    }

    #[test]
    fn a_queued_notice_or_a_stop_ends_the_wait() {
        let now = Utc::now().timestamp_millis();
        let mut log = Log::new("/tmp/background-queued.jsonl".into(), "claude");
        waiting_on(&mut log, "b1", now - 60_000);
        log.parse(&json!({"type":"attachment","sessionId":"s","timestamp":iso(now - 50_000),"attachment":{"type":"queued_command","commandMode":"task-notification","prompt":notice("b1")}}));
        assert_eq!(log.live.session_state(now, "claude", None), "idle");
        assert_eq!(outcome(&log, now), json!("completed"));

        let mut log = Log::new("/tmp/background-stop.jsonl".into(), "claude");
        waiting_on(&mut log, "b2", now - 60_000);
        log.parse(&json!({"type":"assistant","sessionId":"s","timestamp":iso(now - 50_000),"message":{"id":"m3","model":"claude-opus-4-5","role":"assistant","content":[{"type":"tool_use","id":"t2","name":"TaskStop","input":{"task_id":"b2"}}],"usage":usage()}}));
        assert!(log.live.background.is_empty());
    }

    #[test]
    fn a_sidechain_line_leaves_the_main_log_s_commands() {
        let now = Utc::now().timestamp_millis();
        let mut log = Log::new("/tmp/background-sidechain.jsonl".into(), "claude");
        log.parse(&json!({"type":"user","sessionId":"s","isSidechain":true,"timestamp":iso(now - 2_000),"toolUseResult":{"backgroundTaskId":"b9"},"message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"t9","content":"running"}]}}));
        assert!(log.live.background.is_empty());
    }
}
