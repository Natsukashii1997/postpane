use super::watched::{watch_message, watch_of};
use super::*;

#[test]
fn a_frame_reads_back_as_it_was_written() {
    let message = json!({"type":"turn","reply":"长回复".repeat(1000)});
    let mut bytes = Vec::new();
    write_frame(&mut bytes, &message, OUTBOUND_LIMIT).unwrap();
    assert_eq!(
        u32::from_le_bytes(bytes[..4].try_into().unwrap()) as usize,
        bytes.len() - 4
    );
    let mut reader = bytes.as_slice();
    assert_eq!(
        read_frame(&mut reader, INBOUND_LIMIT).unwrap(),
        Some(message)
    );
    // The stream ends between frames: no frame, no error.
    assert_eq!(read_frame(&mut reader, INBOUND_LIMIT).unwrap(), None);
    // Too large, or cut short, is an error.
    assert!(read_frame(&mut bytes.as_slice(), 8).is_err());
    assert!(read_frame(&mut &bytes[..10], INBOUND_LIMIT).is_err());
    assert!(write_frame(&mut Vec::new(), &json!({"a":"x".repeat(64)}), 16).is_err());
    // A frame must be an object.
    let mut array = Vec::new();
    write_frame(&mut array, &json!([1]), 64).unwrap();
    assert!(read_frame(&mut array.as_slice(), 64).is_err());
}

#[test]
fn only_the_fixed_extension_may_start_the_relay() {
    assert!(origin_allowed(
        "chrome-extension://fjjbgamejbdjdaddinacpbmaeokinbjl/"
    ));
    for origin in [
        "chrome-extension://fjjbgamejbdjdaddinacpbmaeokinbjm/",
        "chrome-extension://fjjbgamejbdjdaddinacpbmaeokinbjl",
        "chrome-extension://fjjbgamejbdjdaddinacpbmaeokinbjl/x",
        "",
    ] {
        assert!(!origin_allowed(origin), "{origin}");
    }
    let temp = tempfile::tempdir().unwrap();
    let data = temp.path().join("data");
    let run = |origin: &str| bridge(&["engine".into(), origin.into()], &data);
    // Not Chrome's arguments: not the relay.
    assert_eq!(run("--app-channel"), None);
    assert_eq!(bridge(&["engine".into()], &data), None);
    // Another extension is refused before anything is opened.
    assert_eq!(run("chrome-extension://abc/"), Some(1));
    // Ours, with no app listening, fails to connect.
    assert_eq!(
        run("chrome-extension://fjjbgamejbdjdaddinacpbmaeokinbjl/"),
        Some(1)
    );
}

#[test]
fn the_watched_list_is_kept_between_runs() {
    let temp = tempfile::tempdir().unwrap();
    let data = temp.path().join("data");
    assert!(load_watched(&data).is_empty());
    let mut list = vec![];
    assert!(add_watched(&mut list, "68a1", "", false, 1));
    assert!(add_watched(&mut list, "68b2", "周报", false, 2));
    assert!(!add_watched(&mut list, "68a1", "", false, 3));
    assert!(add_watched(&mut list, "68a1", "方案", false, 4));
    // A name PostPane gave (a handoff's title) is not replaced by the tab's.
    assert!(add_watched(&mut list, "68b2", "接力：修登录", true, 5));
    assert!(!add_watched(
        &mut list,
        "68b2",
        "请审核本轮改动……",
        false,
        6
    ));
    assert_eq!(list[1].title, "接力：修登录");
    save_watched(&data, &list).unwrap();
    let read = load_watched(&data);
    assert_eq!(read, list);
    assert_eq!(read[0].title, "方案");
    assert_eq!(read[0].opened_at, 1);
    assert_eq!(
        watch_message(&read, false),
        json!({"type":"watch","conversations":["68a1","68b2"]})
    );
    // The shadow switch (#488) rides with the list, only when it is on.
    assert_eq!(
        watch_message(&read, true),
        json!({"type":"watch","conversations":["68a1","68b2"],"shadow":true})
    );
}

// #542: the conversations every handoff of which ended ride with the list,
// only when there are any: their tabs in the relay group are closed.
#[test]
fn the_watch_list_names_the_ended_conversations_when_there_are_any() {
    let mut state = State::default();
    add_watched(&mut state.watched, "68a1", "", false, 1);
    let temp = tempfile::tempdir().unwrap();
    let data = temp.path().join("data");
    assert_eq!(
        watch_of(&state, &data),
        json!({"type":"watch","conversations":["68a1"]})
    );
    state.ended = (vec!["68a1".into()], vec![]);
    assert_eq!(
        watch_of(&state, &data),
        json!({"type":"watch","conversations":["68a1"],"ended":["68a1"]})
    );
    // A handoff that ended with no conversation of its own (review P1-01).
    state.ended = (vec![], vec!["h1".into()]);
    assert_eq!(
        watch_of(&state, &data),
        json!({"type":"watch","conversations":["68a1"],"endedRelays":["h1"]})
    );
}

// #488: what the extension read from ChatGPT's own data is kept beside what
// the page gave, only while the switch is on and for watched conversations.
#[test]
fn a_shadow_read_is_kept_as_a_line_while_the_switch_is_on() {
    let temp = tempfile::tempdir().unwrap();
    let data = temp.path().join("data");
    let told = json!({"type":"shadow","conversation":"6af7ec47-c0f4-83ee-9b9e-bf518660767e","why":"complete","at":5,"outcome":"read","written":true,"final":{"id":"0b1c2d3e-0000-4000-8000-0000000000a1","chars":12,"sha":"0123456789abcdef"}});
    // Off unless set: nothing is written.
    assert!(!shadow::on(&data));
    assert_eq!(shadow::keep(&data, true, &told, 9), Ok(false));
    assert!(!shadow::path(&data).exists());
    crate::os::private_directory(&folder(&data)).unwrap();
    std::fs::write(
        folder(&data).join("config.json"),
        r#"{"project":null,"dataShadow":true}"#,
    )
    .unwrap();
    assert!(shadow::on(&data));
    // One PostPane does not watch is not kept.
    assert_eq!(shadow::keep(&data, false, &told, 9), Ok(false));
    assert_eq!(shadow::keep(&data, true, &told, 9), Ok(true));
    assert_eq!(
        shadow::keep(
            &data,
            true,
            &json!({"type":"shadow","conversation":"6af7ec47-c0f4-83ee-9b9e-bf518660767e","why":"reread","outcome":"http","status":429}),
            10
        ),
        Ok(true)
    );
    let kept = std::fs::read_to_string(shadow::path(&data)).unwrap();
    let lines: Vec<Value> = kept
        .lines()
        .map(|line| serde_json::from_str(line).unwrap())
        .collect();
    assert_eq!(lines.len(), 2);
    assert_eq!(
        lines[0],
        json!({"conversation":"6af7ec47-c0f4-83ee-9b9e-bf518660767e","why":"complete","at":5,"outcome":"read","written":true,"final":{"id":"0b1c2d3e-0000-4000-8000-0000000000a1","chars":12,"sha":"0123456789abcdef"},"heardAt":9})
    );
    assert_eq!(lines[1]["status"], 429);
    // A summary is short: anything long (a reply's words would be) is refused.
    let long = json!({"type":"shadow","conversation":"6af7ec47-c0f4-83ee-9b9e-bf518660767e","text":"答".repeat(3000)});
    assert!(shadow::keep(&data, true, &long, 11).is_err());
    assert_eq!(
        std::fs::read_to_string(shadow::path(&data))
            .unwrap()
            .lines()
            .count(),
        2
    );
}

// #488 review P1-01: a line holds the known fields of their kinds, nothing
// else, whatever the extension (or a page) put in it.
#[test]
fn a_shadow_line_keeps_only_known_fields_of_their_kinds() {
    let temp = tempfile::tempdir().unwrap();
    let data = temp.path().join("data");
    crate::os::private_directory(&folder(&data)).unwrap();
    std::fs::write(folder(&data).join("config.json"), r#"{"dataShadow":true}"#).unwrap();
    let told = json!({
        "type": "shadow", "conversation": "6af7ec47-c0f4-83ee-9b9e-bf518660767e", "why": "complete", "at": 5, "outcome": "read",
        "text": "回信的正文", "authorization": "Bearer x", "status": "200", "hidden": "yes",
        "final": {"id": "0b1c2d3e-0000-4000-8000-0000000000a1", "chars": 3, "sha": "0123456789abcdef"},
        "last": {"role": "assistant", "words": "正文"},
        "missing": ["messages[].id"]
    });
    assert_eq!(shadow::keep(&data, true, &told, 9), Ok(true));
    let kept: Value =
        serde_json::from_str(std::fs::read_to_string(shadow::path(&data)).unwrap().trim()).unwrap();
    assert_eq!(
        kept,
        json!({"conversation":"6af7ec47-c0f4-83ee-9b9e-bf518660767e","why":"complete","at":5,"outcome":"read",
               "final":{"id":"0b1c2d3e-0000-4000-8000-0000000000a1","chars":3,"sha":"0123456789abcdef"},
               "missing":["messages[].id"],"dropped":5,"heardAt":9})
    );
    // Words where an id or a word goes are not ids or words.
    let wordy = json!({"type":"shadow","conversation":"6af7ec47-c0f4-83ee-9b9e-bf518660767e","outcome":"read","prompt":"请 审核","why":"a b"});
    assert_eq!(shadow::keep(&data, true, &wordy, 10), Ok(true));
    let last: Value = serde_json::from_str(
        std::fs::read_to_string(shadow::path(&data))
            .unwrap()
            .lines()
            .last()
            .unwrap(),
    )
    .unwrap();
    assert_eq!(last["dropped"], 2);
    assert!(last.get("prompt").is_none() && last.get("why").is_none());
}

// #488 review: ids are UUIDs and words are the ones the extension says; a
// prompt found is the one asked for. Anything else is left out and counted.
#[test]
fn a_shadow_line_takes_only_uuids_known_words_and_a_prompt_found_as_asked() {
    let temp = tempfile::tempdir().unwrap();
    let data = temp.path().join("data");
    crate::os::private_directory(&folder(&data)).unwrap();
    std::fs::write(folder(&data).join("config.json"), r#"{"dataShadow":true}"#).unwrap();
    let asked = "0b1c2d3e-0000-4000-8000-000000000001";
    let other = "0b1c2d3e-0000-4000-8000-000000000002";
    let lines = |at: i64, told: Value| {
        assert_eq!(shadow::keep(&data, true, &told, at), Ok(true));
        let text = std::fs::read_to_string(shadow::path(&data)).unwrap();
        serde_json::from_str::<Value>(text.lines().last().unwrap()).unwrap()
    };
    let known = lines(
        1,
        json!({
            "type": "shadow", "conversation": "6af7ec47-c0f4-83ee-9b9e-bf518660767e", "why": "complete", "outcome": "read",
            "asked": asked, "askFound": true, "prompt": asked, "trusted": false,
            "asyncStatus": "other", "login": "same", "pageOutcome": "told",
            "last": {"role": "assistant", "channel": "final", "status": "in_progress", "type": "other"},
            "final": {"id": other, "status": "finished_successfully", "finish": "stop", "chars": 1}
        }),
    );
    assert!(known.get("dropped").is_none(), "{known}");
    assert_eq!(known["trusted"], false);
    // Free ASCII where an id or a word goes: left out.
    let free = lines(
        2,
        json!({
            "type": "shadow", "conversation": "6af7ec47-c0f4-83ee-9b9e-bf518660767e", "outcome": "read",
            "asked": "sk-not-an-id", "asyncStatus": "token_abc", "login": "bearer",
            "final": {"id": other, "finish": "stopped_by_me"},
            "last": {"role": "assistant", "status": "abcdef"}
        }),
    );
    assert_eq!(free["dropped"], 5);
    for name in ["asked", "asyncStatus", "login", "final", "last"] {
        assert!(free.get(name).is_none(), "{name} kept: {free}");
    }
    // Found, but not the prompt asked for: neither is kept.
    let found = lines(
        3,
        json!({
            "type": "shadow", "conversation": "6af7ec47-c0f4-83ee-9b9e-bf518660767e", "outcome": "read",
            "asked": asked, "askFound": true, "prompt": other
        }),
    );
    assert_eq!(found["dropped"], 2);
    assert!(found.get("askFound").is_none() && found.get("prompt").is_none());
    assert_eq!(found["asked"], asked);
    // Numbers within what the extension says, as it says them (review P2-10).
    let numbers = lines(
        5,
        json!({
            "type": "shadow", "conversation": "6af7ec47-c0f4-83ee-9b9e-bf518660767e", "outcome": "http", "at": 1_763_700_000_000u64,
            "status": 600, "turns": 3, "tries": 0, "bytes": 1_000_000_001u64, "ms": 5,
            "final": {"id": other, "sha": "0123456789ABCDEF"}
        }),
    );
    assert_eq!(numbers["dropped"], 5, "{numbers}");
    assert_eq!(numbers["ms"], 5);
    assert_eq!(numbers["at"], 1_763_700_000_000u64);
    let edges = lines(
        6,
        json!({
            "type": "shadow", "conversation": "6af7ec47-c0f4-83ee-9b9e-bf518660767e", "outcome": "http",
            "status": 599, "turns": 10, "tries": 2, "bytes": 1_000_000_000u64,
            "final": {"id": other, "sha": "0123456789abcdef"}
        }),
    );
    assert!(edges.get("dropped").is_none(), "{edges}");
    // An outcome is one the extension says, or there is no line.
    let made_up = json!({"type": "shadow", "conversation": "6af7ec47-c0f4-83ee-9b9e-bf518660767e", "outcome": "made-up"});
    assert!(shadow::keep(&data, true, &made_up, 4).is_err());
}

// #488 review P1-02: what a switch-off came to is kept with the switch off.
#[test]
fn a_switch_off_is_kept_with_the_switch_off() {
    let temp = tempfile::tempdir().unwrap();
    let data = temp.path().join("data");
    let off = json!({"type":"shadow","why":"off","at":3,"outcome":"disarmed","tabs":2,"stopped":2,"failed":0,"unregistered":true});
    assert!(!shadow::on(&data));
    assert_eq!(shadow::keep(&data, false, &off, 4), Ok(true));
    // A read with the switch off is not, even of a watched conversation.
    let read = json!({"type":"shadow","conversation":"6af7ec47-c0f4-83ee-9b9e-bf518660767e","why":"complete","outcome":"read"});
    assert_eq!(shadow::keep(&data, true, &read, 5), Ok(false));
    // Nor is one saying `off` about a conversation.
    let posing = json!({"type":"shadow","conversation":"6af7ec47-c0f4-83ee-9b9e-bf518660767e","why":"off","outcome":"read"});
    assert_eq!(shadow::keep(&data, true, &posing, 6), Ok(false));
    let lines = std::fs::read_to_string(shadow::path(&data)).unwrap();
    assert_eq!(lines.lines().count(), 1);
    assert!(lines.contains(r#""outcome":"disarmed""#));
}

/// The extension's end of a connection, for a test: what it was sent.
struct Sent(Arc<Mutex<Vec<u8>>>);
impl Write for Sent {
    fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
        self.0.lock().unwrap().extend_from_slice(bytes);
        Ok(bytes.len())
    }
    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}
impl Peer for Sent {
    fn close(&self) {}
}

/// #488: with the shadow switch on, the extension is told so with the list,
/// and what its shadow reads found is kept: of watched conversations only.
#[test]
fn a_shadow_read_told_by_the_extension_is_kept_for_watched_conversations() {
    let temp = tempfile::tempdir().unwrap();
    let data = temp.path().join("data");
    let mut list = vec![];
    add_watched(
        &mut list,
        "6af7ec47-c0f4-83ee-9b9e-bf518660767e",
        "审核",
        true,
        1,
    );
    save_watched(&data, &list).unwrap();
    std::fs::write(folder(&data).join("config.json"), r#"{"dataShadow":true}"#).unwrap();
    let shared = Shared::new(data.clone());
    let sent = Arc::new(Mutex::new(Vec::new()));
    let id = shared.attach(Box::new(Sent(sent.clone())));
    let first = sent.lock().unwrap().clone();
    assert_eq!(
        read_frame(&mut first.as_slice(), INBOUND_LIMIT).unwrap(),
        Some(
            json!({"type":"watch","conversations":["6af7ec47-c0f4-83ee-9b9e-bf518660767e"],"shadow":true})
        )
    );
    for conversation in ["other", "6af7ec47-c0f4-83ee-9b9e-bf518660767e"] {
        shared.inbound(
            id,
            json!({"type":"shadow","conversation":conversation,"why":"complete","at":7,"outcome":"read","written":true}),
        );
    }
    let kept = std::fs::read_to_string(shadow::path(&data)).unwrap();
    let lines: Vec<Value> = kept
        .lines()
        .map(|line| serde_json::from_str(line).unwrap())
        .collect();
    assert_eq!(lines.len(), 1);
    assert_eq!(
        lines[0]["conversation"],
        "6af7ec47-c0f4-83ee-9b9e-bf518660767e"
    );
    assert_eq!(lines[0]["why"], "complete");
    assert!(lines[0]["heardAt"].is_i64());
    assert!(lines[0].get("type").is_none());
}

#[test]
fn a_finished_turn_becomes_a_completion_event() {
    let now = 1_792_470_000_000;
    let turn = json!({"type":"turn","phase":"complete","conversation":"68a1","title":"","prompt":"问","reply":"答".repeat(5000),"messageId":"m1","at":now - 10});
    let watched = |named: bool| Watched {
        id: "68a1".into(),
        title: "周报".into(),
        opened_at: 1,
        named,
    };
    let event = completion(&turn, Some(&watched(false)), now).unwrap();
    assert_eq!(event.source, "chatgpt");
    assert_eq!(event.session_id, "chatgpt:68a1");
    assert_eq!(event.kind, "completion");
    assert_eq!(event.at_ms, now - 10);
    assert_eq!(event.data["turnId"], "m1");
    assert_eq!(event.data["title"], "周报");
    assert_eq!(event.data["prompt"], "问");
    assert_eq!(
        event.data["message"].as_str().unwrap().chars().count(),
        5000
    );
    assert_eq!(
        event.data["navigationTarget"],
        json!({"kind":"chatgpt-conversation","id":"68a1"})
    );
    // The tab's title comes first, unless PostPane named the conversation.
    let titled = json!({"conversation":"68a1","title":"Tab","reply":"答"});
    assert_eq!(
        completion(&titled, Some(&watched(false)), now)
            .unwrap()
            .data["title"],
        "Tab"
    );
    assert_eq!(
        completion(&titled, Some(&watched(true)), now).unwrap().data["title"],
        "周报"
    );
    // A time from the future is now; no conversation, no event.
    let later = json!({"conversation":"68a1","at":now + 60_000});
    let event = completion(&later, None, now).unwrap();
    assert_eq!(event.at_ms, now);
    assert_eq!(event.data["turnId"], now.to_string());
    assert!(event.data["title"].is_null());
    assert!(completion(&json!({"conversation":"a/b"}), None, now).is_none());
    assert!(completion(&json!({}), None, now).is_none());
}

#[test]
fn any_conversation_reports_its_turns_and_whether_postpane_opened_it() {
    let now = 1_792_470_000_000;
    let watched = Watched {
        id: "68a1".into(),
        title: "审核".into(),
        opened_at: 1,
        named: true,
    };
    // A finished turn says whether it is one of PostPane's (a review).
    let done = json!({"conversation":"68a1","reply":"答","messageId":"m1","at":now});
    assert_eq!(
        completion(&done, Some(&watched), now).unwrap().data["review"],
        true
    );
    let own = json!({"conversation":"77b2","title":"杭州两日行程","reply":"答","messageId":"m2","at":now});
    assert_eq!(completion(&own, None, now).unwrap().data["review"], false);
    // A turn that starts is a running observation of its conversation.
    let start = json!({"type":"turn","phase":"start","conversation":"77b2","title":"杭州两日行程","prompt":"帮我排两天","at":now - 20});
    let event = started(&start, None, now).unwrap();
    assert_eq!(event.source, "chatgpt");
    assert_eq!(event.session_id, "chatgpt:77b2");
    assert_eq!(event.kind, "session-observation");
    assert_eq!(event.at_ms, now - 20);
    assert_eq!(event.data["state"], "running");
    assert_eq!(event.data["startedAtMs"], now - 20);
    assert_eq!(event.data["title"], "杭州两日行程");
    assert_eq!(event.data["prompt"], "帮我排两天");
    assert_eq!(event.data["review"], false);
    assert_eq!(
        event.data["navigationTarget"],
        json!({"kind":"chatgpt-conversation","id":"77b2"})
    );
    assert_eq!(
        started(
            &json!({"conversation":"68a1","at":now}),
            Some(&watched),
            now
        )
        .unwrap()
        .data["title"],
        "审核"
    );
    // A new chat's first start, before it has an address, is not one.
    assert!(started(&json!({"phase":"start","at":now}), None, now).is_none());
}

#[test]
fn the_manifest_names_the_relay_and_only_the_extension() {
    let temp = tempfile::tempdir().unwrap();
    let directory = temp.path().join("NativeMessagingHosts");
    let engine = temp.path().join("agent-hud-engine");
    std::fs::write(&engine, b"").unwrap();
    assert_eq!(manifest_state(&directory, Some(&engine)), (false, false));
    install_manifest(&directory, &engine).unwrap();
    let path = manifest_path(&directory);
    assert_eq!(
        path.file_name().unwrap().to_str(),
        Some("com.postpane.chatgpt.json")
    );
    let written: Value = serde_json::from_slice(&std::fs::read(&path).unwrap()).unwrap();
    assert_eq!(
        written,
        json!({
            "name": "com.postpane.chatgpt",
            "description": "PostPane ChatGPT channel",
            "path": engine,
            "type": "stdio",
            "allowed_origins": ["chrome-extension://fjjbgamejbdjdaddinacpbmaeokinbjl/"],
        })
    );
    assert_eq!(manifest_state(&directory, Some(&engine)), (true, true));
    // Another relay: there, but not current.
    let other = temp.path().join("other-engine");
    assert_eq!(manifest_state(&directory, Some(&other)), (true, false));
    assert_eq!(manifest_state(&directory, None), (true, false));
    // A missing relay or a build output is refused, and nothing changes.
    assert!(install_manifest(&directory, &other).is_err());
    let build = temp.path().join("target").join("debug").join("engine");
    assert!(transient(&build));
    assert!(install_manifest(&directory, &build).is_err());
    assert!(!transient(&engine));
    assert_eq!(manifest_state(&directory, Some(&engine)), (true, true));
    remove_manifest(&directory).unwrap();
    assert_eq!(manifest_state(&directory, Some(&engine)), (false, false));
    remove_manifest(&directory).unwrap();
}

#[cfg(unix)]
#[path = "tests_unix.rs"]
mod unix;

/// Stands in for the extension's end of a connection; what is written goes nowhere.
struct Sink;
impl std::io::Write for Sink {
    fn write(&mut self, bytes: &[u8]) -> std::io::Result<usize> {
        Ok(bytes.len())
    }
    fn flush(&mut self) -> std::io::Result<()> {
        Ok(())
    }
}
impl Peer for Sink {
    fn close(&self) {}
}

#[test]
fn a_new_connection_has_no_version_until_it_says_hello() {
    let temp = tempfile::tempdir().unwrap();
    let shared = Shared::new(temp.path().join("data"));
    let first = shared.attach(Box::new(Sink));
    shared.inbound(
        first,
        json!({"type":"hello","version":"0.2.4","extensionId":"abc"}),
    );
    assert_eq!(shared.status()["extensionVersion"], "0.2.4");
    // The next connection may be another extension: the old version is not its (#493).
    let second = shared.attach(Box::new(Sink));
    assert_eq!(shared.status()["connected"], true);
    assert!(shared.status()["extensionVersion"].is_null());
    shared.inbound(
        second,
        json!({"type":"hello","version":"0.2.5","extensionId":"abc"}),
    );
    assert_eq!(shared.status()["extensionVersion"], "0.2.5");
}
