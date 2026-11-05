use crate::AgentHudCore;
use agent_hud_agents::HookEvent;
use chrono::Utc;
use serde_json::json;

#[test]
fn a_finished_chatgpt_turn_is_a_reply_with_its_prompt_and_whole_message() {
    let temp = tempfile::tempdir().unwrap();
    let mut core = AgentHudCore::new(vec![], temp.path().join("app-data"));
    // The event history only takes replies that finish after it starts.
    std::thread::sleep(std::time::Duration::from_millis(5));
    let reply = format!("# 方案\n\n{}", "长回复。".repeat(20_000));
    let at = Utc::now().timestamp_millis();
    core.ingest_hook_events(vec![HookEvent {
        source: "chatgpt".into(),
        session_id: "chatgpt:68a1-c0".into(),
        kind: "completion".into(),
        at_ms: at,
        data: json!({
            "turnId": "msg-1",
            "title": "周报方案",
            "prompt": "帮我想想周报怎么写",
            "message": reply,
            "navigationTarget": {"kind": "chatgpt-conversation", "id": "68a1-c0"},
        }),
    }]);
    let snapshot = core.request("snapshot", json!({})).unwrap();
    let row = snapshot["sessions"]
        .as_array()
        .unwrap()
        .iter()
        .find(|s| s["id"] == "chatgpt:68a1-c0")
        .expect("listed");
    assert_eq!(row["liveFacts"]["prompt"], "帮我想想周报怎么写");
    let receipt = snapshot["islandEvents"]["items"]
        .as_array()
        .unwrap()
        .iter()
        .find(|e| e["kind"] == "completion" && e["sessionId"] == "chatgpt:68a1-c0")
        .unwrap_or_else(|| panic!("a reply is news: {}", snapshot["islandEvents"]));
    assert_eq!(receipt["source"], "chatgpt");
    assert_eq!(receipt["prompt"], "帮我想想周报怎么写");
    assert_eq!(receipt["message"].as_str().unwrap().len(), reply.len());
    assert!(receipt["title"].as_str().unwrap().contains("周报方案"));
    assert_eq!(
        receipt["navigationTarget"],
        json!({"kind": "chatgpt-conversation", "id": "68a1-c0"})
    );
    // The same turn again is not news twice.
    core.ingest_hook_events(vec![HookEvent {
        source: "chatgpt".into(),
        session_id: "chatgpt:68a1-c0".into(),
        kind: "completion".into(),
        at_ms: at + 1,
        data: json!({"turnId": "msg-1", "message": "again"}),
    }]);
    let again = core.request("snapshot", json!({})).unwrap();
    let count = again["islandEvents"]["items"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|e| e["kind"] == "completion" && e["sessionId"] == "chatgpt:68a1-c0")
        .count();
    assert_eq!(count, 1);
    // A relay's next round in the same conversation is news with its own words.
    core.ingest_hook_events(vec![HookEvent {
        source: "chatgpt".into(),
        session_id: "chatgpt:68a1-c0".into(),
        kind: "completion".into(),
        at_ms: at + 2,
        data: json!({"turnId": "msg-2", "prompt": "第二轮", "message": "结论：通过"}),
    }]);
    let next = core.request("snapshot", json!({})).unwrap();
    let second = next["islandEvents"]["items"]
        .as_array()
        .unwrap()
        .iter()
        .find(|e| e["kind"] == "completion" && e["turnId"] == "msg-2")
        .unwrap_or_else(|| panic!("the second round is news: {}", next["islandEvents"]));
    assert_eq!(second["message"], "结论：通过");
    assert_eq!(second["prompt"], "第二轮");
}

#[test]
fn a_completion_from_a_client_without_one_is_ignored() {
    let temp = tempfile::tempdir().unwrap();
    let mut core = AgentHudCore::new(vec![], temp.path().join("app-data"));
    std::thread::sleep(std::time::Duration::from_millis(5));
    core.ingest_hook_events(vec![HookEvent {
        source: "hermes".into(),
        session_id: "hermes:x".into(),
        kind: "completion".into(),
        at_ms: Utc::now().timestamp_millis(),
        data: json!({"turnId": "t", "message": "hi"}),
    }]);
    let snapshot = core.request("snapshot", json!({})).unwrap();
    assert!(!snapshot["sessions"]
        .as_array()
        .unwrap()
        .iter()
        .any(|s| s["id"] == "hermes:x"));
}
