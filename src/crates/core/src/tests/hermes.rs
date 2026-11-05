use crate::{AgentHudCore, SourceRoot};
use chrono::Utc;
use rusqlite::Connection;
use serde_json::{json, Value};

fn session<'a>(snapshot: &'a Value, id: &str) -> &'a Value {
    snapshot["sessions"]
        .as_array()
        .unwrap()
        .iter()
        .find(|s| s["id"] == id)
        .unwrap_or_else(|| panic!("{id} listed"))
}

#[test]
fn a_held_turn_lease_runs_and_its_release_is_a_written_reply() {
    let temp = tempfile::tempdir().unwrap();
    let home = temp.path();
    let profile = home.join(".hermes").join("profiles").join("agumon");
    std::fs::create_dir_all(&profile).unwrap();
    std::fs::write(profile.join("SOUL.md"), "# 亚古兽 · SOUL\n").unwrap();
    let db = Connection::open(profile.join("state.db")).unwrap();
    let now = Utc::now().timestamp_millis() as f64 / 1000.0;
    db.execute_batch(&format!(
        "CREATE TABLE sessions (id TEXT, started_at REAL, title TEXT, source TEXT, model TEXT,
            input_tokens INTEGER, output_tokens INTEGER, last_activity_at REAL);
         INSERT INTO sessions VALUES ('s1', {s}, '周报怎么写', 'feishu', 'gpt-x', 10, 2, {s});
         CREATE TABLE session_turn_leases (conversation_id TEXT PRIMARY KEY, holder TEXT,
            acquired_at REAL, expires_at REAL);
         INSERT INTO session_turn_leases VALUES ('s1', 'gw', {a}, {e});
         CREATE TABLE messages (id INTEGER PRIMARY KEY, session_id TEXT, role TEXT, content TEXT);
         INSERT INTO messages (session_id, role, content) VALUES ('s1', 'user', '周报怎么写');",
        s = now - 60.0,
        a = now - 5.0,
        e = now + 300.0
    ))
    .unwrap();

    let mut core = AgentHudCore::new(
        vec![SourceRoot {
            path: home.join(".hermes"),
            provider: "hermes",
        }],
        home.join("app-data"),
    );
    let first = core.request("snapshot", json!({})).unwrap();
    let row = session(&first, "hermes:agumon:s1");
    assert_eq!(row["state"], "running");
    assert_eq!(row["bot"], json!({"id":"agumon","name":"亚古兽"}));

    std::thread::sleep(std::time::Duration::from_millis(20));
    db.execute_batch(&format!(
        "DELETE FROM session_turn_leases;
         INSERT INTO messages (session_id, role, content) VALUES ('s1', 'assistant', '分三块写');
         UPDATE sessions SET last_activity_at = {now}, output_tokens = 40;"
    ))
    .unwrap();
    let second = core.request("snapshot", json!({})).unwrap();
    let row = session(&second, "hermes:agumon:s1");
    assert_ne!(row["state"], "running");
    assert_eq!(row["liveFacts"]["outcome"], "completed");
    assert_eq!(row["liveFacts"]["message"], "分三块写");
    assert_eq!(row["liveFacts"]["prompt"], "周报怎么写");
    let reply = second["islandEvents"]["items"]
        .as_array()
        .unwrap()
        .iter()
        .find(|e| e["kind"] == "completion" && e["sessionId"] == "hermes:agumon:s1");
    assert!(
        reply.is_some(),
        "a written reply is news: {}",
        second["islandEvents"]
    );
    assert_eq!(reply.unwrap()["prompt"], "周报怎么写");
}
