//! The channel over a real socket, with a test standing in for the extension.
use super::super::*;
use std::os::unix::net::UnixStream;

fn connect(data: &Path) -> UnixStream {
    let stream = UnixStream::connect(socket_path(data)).unwrap();
    stream
        .set_read_timeout(Some(Duration::from_secs(5)))
        .unwrap();
    stream
}
fn next(stream: &mut UnixStream) -> Value {
    read_frame(stream, INBOUND_LIMIT).unwrap().unwrap()
}
fn wait_for(mut done: impl FnMut() -> bool) {
    for _ in 0..200 {
        if done() {
            return;
        }
        std::thread::sleep(Duration::from_millis(10));
    }
    panic!("timed out");
}

#[test]
fn the_extension_opens_a_conversation_and_reports_its_reply() {
    // Leave room for the socket under macOS's long temporary path.
    let temp = tempfile::Builder::new().prefix("").tempdir().unwrap();
    let data = temp.path().join("d");
    let channel = Arc::new(Channel::start(data.clone()).unwrap());
    assert_eq!(channel.status()["connected"], false);
    assert!(channel.open("你好", None).is_err());

    let mut extension = connect(&data);
    assert_eq!(
        next(&mut extension),
        json!({"type":"watch","conversations":[]})
    );
    write_frame(
        &mut extension,
        &json!({"type":"hello","version":"0.1.0","extensionId":agent::EXTENSION_ID}),
        OUTBOUND_LIMIT,
    )
    .unwrap();
    wait_for(|| channel.status()["extensionVersion"] == "0.1.0");
    assert_eq!(channel.status()["connected"], true);

    let opener = channel.clone();
    let opening = std::thread::spawn(move || opener.open("帮我写周报", None));
    let open = next(&mut extension);
    assert_eq!(open["type"], "open");
    assert_eq!(open["text"], "帮我写周报");
    write_frame(
        &mut extension,
        &json!({"type":"opened","requestId":open["requestId"],"ok":true,"conversation":"68a1","title":"周报"}),
        OUTBOUND_LIMIT,
    )
    .unwrap();
    assert_eq!(
        next(&mut extension),
        json!({"type":"watch","conversations":["68a1"]})
    );
    assert_eq!(
        opening.join().unwrap().unwrap(),
        json!({"conversation":"68a1","title":"周报"})
    );
    assert_eq!(load_watched(&data)[0].id, "68a1");

    // A refused send says why.
    let sender = channel.clone();
    let sending = std::thread::spawn(move || sender.send("68a1", "再写短一点"));
    let send = next(&mut extension);
    assert_eq!(send["conversation"], "68a1");
    write_frame(
        &mut extension,
        &json!({"type":"sent","requestId":send["requestId"],"ok":false,"reason":"busy"}),
        OUTBOUND_LIMIT,
    )
    .unwrap();
    assert!(sending.join().unwrap().unwrap_err().contains("busy"));

    // A finished turn is recorded as a completion in the hook inbox.
    write_frame(
        &mut extension,
        &json!({"type":"turn","phase":"complete","conversation":"68a1","title":"","prompt":"帮我写周报","reply":"分三块写","messageId":"m1","at":chrono::Utc::now().timestamp_millis()}),
        OUTBOUND_LIMIT,
    )
    .unwrap();
    let inbox = data.join("hooks").join("inbox");
    wait_for(|| fs::read_dir(&inbox).is_ok_and(|mut entries| entries.next().is_some()));
    let recorded = fs::read_dir(&inbox)
        .unwrap()
        .next()
        .unwrap()
        .unwrap()
        .path();
    let event: HookEvent = serde_json::from_slice(&fs::read(recorded).unwrap()).unwrap();
    assert_eq!(event.session_id, "chatgpt:68a1");
    assert_eq!(event.data["message"], "分三块写");
    assert_eq!(event.data["title"], "周报");

    // A handoff's conversation is listed under its title, and the listener
    // hears of its opening (under the handoff's request id) and its turns.
    let heard = Arc::new(std::sync::Mutex::new(Vec::<Value>::new()));
    let log = heard.clone();
    channel.listen(Arc::new(move |message: &Value| {
        log.lock().unwrap().push(message.clone())
    }));
    let opener = channel.clone();
    let opening = std::thread::spawn(move || {
        opener.open_as("请审核：整段背景交代……", None, Some("修登录"), Some("h1"))
    });
    let open = next(&mut extension);
    assert_eq!(open["requestId"], "h1");
    write_frame(
        &mut extension,
        &json!({"type":"opened","requestId":"h1","ok":true,"conversation":"68b2","title":"请审核：整段背景交代……"}),
        OUTBOUND_LIMIT,
    )
    .unwrap();
    next(&mut extension);
    opening.join().unwrap().unwrap();
    let listed = load_watched(&data);
    assert_eq!(
        (listed[1].title.as_str(), listed[1].named),
        ("修登录", true)
    );
    write_frame(
        &mut extension,
        &json!({"type":"turn","phase":"start","conversation":"68b2"}),
        OUTBOUND_LIMIT,
    )
    .unwrap();
    wait_for(|| heard.lock().unwrap().len() == 2);
    let heard = heard.lock().unwrap().clone();
    assert_eq!(heard[0]["type"], "opened");
    assert_eq!(heard[0]["requestId"], "h1");
    assert_eq!(heard[1]["phase"], "start");

    // Navigation brings the tab forward through the extension.
    assert!(focus("68a1"));
    assert_eq!(
        next(&mut extension),
        json!({"type":"focus","conversation":"68a1"})
    );

    // A newer connection wins; the old one is closed.
    let mut newer = connect(&data);
    assert_eq!(
        next(&mut newer),
        json!({"type":"watch","conversations":["68a1","68b2"]})
    );
    assert_eq!(read_frame(&mut extension, INBOUND_LIMIT).unwrap(), None);
    assert_eq!(channel.status()["connected"], true);
    drop(newer);
    wait_for(|| channel.status()["connected"] == false);
    assert!(!focus("68a1"));
}
