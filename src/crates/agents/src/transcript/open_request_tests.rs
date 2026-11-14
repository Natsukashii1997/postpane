//! A request the log still holds open waits on the user however long it has
//! stood; one the log has gone quiet on for half an hour is stale (ADR 0001,
//! 「等你 / 待核对」, B1).
use crate::Log;
use chrono::{DateTime, Utc};
use serde_json::{json, Value};

const MINUTE: i64 = 60_000;

fn iso(at: i64) -> String {
    DateTime::<Utc>::from_timestamp_millis(at)
        .unwrap()
        .to_rfc3339()
}

/// A Codex turn that asked the user a question `asked` ms before `now`, and
/// its answer `answered` ms before `now` when there is one.
fn codex_question(now: i64, asked: i64, answered: Option<i64>) -> Log {
    let mut log = Log::new("codex-question.jsonl".into(), "codex");
    let line = |at: i64, kind: &str, payload: Value| json!({"type":kind,"timestamp":iso(at),"payload":payload});
    log.parse(&line(
        now - asked - MINUTE,
        "event_msg",
        json!({"type":"task_started","turn_id":"t1"}),
    ));
    log.parse(&line(
        now - asked,
        "response_item",
        json!({"type":"function_call","name":"request_user_input","call_id":"q1"}),
    ));
    if let Some(answered) = answered {
        log.parse(&line(
            now - answered,
            "response_item",
            json!({"type":"function_call_output","call_id":"q1","output":"yes"}),
        ));
    }
    log
}

fn requests(log: &Log, now: i64) -> Vec<Value> {
    log.live
        .facts("s", "codex", now, None)
        .expect("the log has events")["requests"]
        .as_array()
        .unwrap()
        .clone()
}

#[test]
fn a_question_asked_long_ago_still_waits_and_is_stale() {
    let now = Utc::now().timestamp_millis();
    let log = codex_question(now, 45 * MINUTE, None);
    assert_eq!(log.live.session_state(now, "codex", None), "waiting");
    let requests = requests(&log, now);
    assert_eq!(requests.len(), 1);
    assert_eq!(requests[0]["kind"], "question");
    assert_eq!(requests[0]["stale"], true);
}

#[test]
fn a_question_asked_lately_waits_and_is_not_stale() {
    let now = Utc::now().timestamp_millis();
    let log = codex_question(now, 10 * MINUTE, None);
    assert_eq!(log.live.session_state(now, "codex", None), "waiting");
    let requests = requests(&log, now);
    assert_eq!(requests.len(), 1);
    assert_eq!(requests[0]["stale"], false);
}

#[test]
fn an_answered_question_no_longer_waits() {
    let now = Utc::now().timestamp_millis();
    let lately = codex_question(now, 10 * MINUTE, Some(9 * MINUTE));
    assert_eq!(lately.live.session_state(now, "codex", None), "running");
    assert!(requests(&lately, now).is_empty());
    let long_ago = codex_question(now, 50 * MINUTE, Some(45 * MINUTE));
    assert_eq!(long_ago.live.session_state(now, "codex", None), "idle");
    assert!(requests(&long_ago, now).is_empty());
}

/// A running turn the log has gone quiet on with nothing asked is no wait:
/// it settles as it did.
#[test]
fn a_quiet_turn_with_nothing_asked_still_settles() {
    let now = Utc::now().timestamp_millis();
    let mut log = Log::new("codex-quiet.jsonl".into(), "codex");
    log.parse(&json!({"type":"event_msg","timestamp":iso(now - 46 * MINUTE),"payload":{"type":"task_started","turn_id":"t1"}}));
    log.parse(&json!({"type":"response_item","timestamp":iso(now - 45 * MINUTE),"payload":{"type":"function_call","name":"exec_command","call_id":"c1"}}));
    assert_eq!(log.live.session_state(now, "codex", None), "idle");
    assert_eq!(
        log.live.session_state(now - 20 * MINUTE, "codex", None),
        "running"
    );
}

/// The request turns stale with no new event, when the log has been quiet
/// half an hour: the change falls due then, and the clock's fingerprint moves.
#[test]
fn a_request_turns_stale_at_its_next_change() {
    let now = Utc::now().timestamp_millis();
    let log = codex_question(now, 10 * MINUTE, None);
    let due = now - 10 * MINUTE + super::live::ABANDONED_MS;
    assert_eq!(log.live.next_change(now, "codex", None), Some(due));
    assert_eq!(log.live.session_state(due, "codex", None), "waiting");
    assert_eq!(
        log.live.clock_fingerprint(due - 1),
        log.live.clock_fingerprint(now)
    );
    assert_ne!(
        log.live.clock_fingerprint(due),
        log.live.clock_fingerprint(now)
    );
    assert_eq!(requests(&log, due - 1)[0]["stale"], false);
    assert_eq!(requests(&log, due)[0]["stale"], true);
}

/// The desktop app's next-step question stands past its turn's end until the
/// user writes again, however long that takes.
#[test]
fn a_claude_desktop_next_step_question_still_waits_after_an_hour() {
    let now = Utc::now().timestamp_millis();
    let mut log = Log::new("claude-next-step.jsonl".into(), "claude");
    let usage = json!({"input_tokens":10,"output_tokens":5,"cache_creation_input_tokens":0,"cache_read_input_tokens":0});
    log.parse(&json!({"type":"user","sessionId":"s","timestamp":iso(now - 62 * MINUTE),"uuid":"u1","message":{"role":"user","content":"Fix the build"}}));
    log.parse(&json!({"type":"assistant","sessionId":"s","timestamp":iso(now - 61 * MINUTE),"message":{"id":"m1","model":"claude-opus-4-5","role":"assistant","content":[{"type":"tool_use","id":"w1","name":"mcp__ccd_turn__wrap_up","input":{"recap":"Fixed.","ask":"Commit it?","actions":[{"label":"Yes"}]}}],"usage":usage}}));
    log.parse(&json!({"type":"user","sessionId":"s","timestamp":iso(now - 61 * MINUTE + 1_000),"message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"w1","content":"shown"}]}}));
    log.parse(&json!({"type":"assistant","sessionId":"s","timestamp":iso(now - 60 * MINUTE),"message":{"id":"m2","model":"claude-opus-4-5","role":"assistant","content":[{"type":"text","text":"Done."}],"stop_reason":"end_turn","usage":usage}}));
    assert_eq!(log.live.session_state(now, "claude", None), "waiting");
    let facts = log.live.facts("s", "claude", now, None).unwrap();
    assert_eq!(facts["requests"][0]["stale"], true);
}
