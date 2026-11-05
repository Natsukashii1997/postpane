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
    assert!(add_watched(&mut list, "68a1", "", 1));
    assert!(add_watched(&mut list, "68b2", "周报", 2));
    assert!(!add_watched(&mut list, "68a1", "", 3));
    assert!(add_watched(&mut list, "68a1", "方案", 4));
    save_watched(&data, &list).unwrap();
    let read = load_watched(&data);
    assert_eq!(read, list);
    assert_eq!(read[0].title, "方案");
    assert_eq!(read[0].opened_at, 1);
    assert_eq!(
        watch_message(&read),
        json!({"type":"watch","conversations":["68a1","68b2"]})
    );
}

#[test]
fn a_finished_turn_becomes_a_completion_event() {
    let now = 1_792_470_000_000;
    let turn = json!({"type":"turn","phase":"complete","conversation":"68a1","title":"","prompt":"问","reply":"答".repeat(5000),"messageId":"m1","at":now - 10});
    let event = completion(&turn, Some("周报"), now).unwrap();
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
