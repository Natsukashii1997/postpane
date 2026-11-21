//! Telling the session that began a review of trouble: once, across restarts,
//! and while an answer or a retry comes in.
use super::*;

/// #318: a conversation that could not open — at once, or not within
/// two minutes — is told to the session once, under its own id, and the
/// card's line for it says so.
#[test]
fn a_session_is_told_once_when_its_review_could_not_open() {
    let (_temp, desk) = desk();
    let failing = Fake {
        open_fails: true,
        ..Fake::default()
    };
    let Started::Opening { handoff, .. } = desk
        .start(&failing, "s1", None, "修登录", None, "brief", false, 1)
        .unwrap()
    else {
        panic!("a first brief opens a conversation");
    };
    assert!(desk
        .open(&failing, &handoff.id, "brief", None, || 2)
        .is_err());
    assert!(desk.tell(&failing, 3));
    let told = sent_as(&failing, "reply");
    assert_eq!(told.len(), 1);
    assert_eq!(told[0].0, "s1");
    assert!(told[0]
        .1
        .contains("驿窗接力「修登录」出错：驿窗没能确认 ChatGPT 审核会话已打开（timeout）"));
    assert!(told[0].1.contains("重试") && told[0].1.contains("先不要再调用 relay_to_chatgpt"));
    assert!(last_step_text(&desk, 3).ends_with(&format!("；{}", told_back())));
    assert!(!desk.tell(&failing, 4), "told once");
    assert_eq!(sent_as(&failing, "reply").len(), 1);
    // The person retries; it fails again: that is told too, once.
    desk.act(&failing, &handoff.id, "retry", 5).unwrap();
    assert!(desk
        .open(&failing, &handoff.id, "brief", None, || 6)
        .is_err());
    assert!(desk.tell(&failing, 7));
    assert_eq!(sent_as(&failing, "reply").len(), 2);

    // Not open within two minutes.
    let (_temp, desk) = self::desk();
    let lines = Fake::default();
    desk.start(&lines, "s2", None, "修登录", None, "brief", false, 1)
        .unwrap();
    assert!(!desk.tell(&lines, 2), "still opening");
    let late = 1 + book::OPEN_TIMEOUT_MS + 1;
    assert!(desk.tell(&lines, late));
    let told = sent_as(&lines, "reply");
    assert_eq!(told.len(), 1);
    assert!(told[0].1.contains(&timed_out()));
    assert_eq!(desk.projection(late)[0]["status"], "failed");
}

/// #318: an opening cut off by a restart is told once the app runs;
/// trouble from before it started is not, so an upgrade tells no one of
/// old trouble, and a second restart tells nothing again.
#[test]
fn a_restart_tells_of_an_opening_it_cut_off_but_not_of_old_trouble() {
    let temp = tempfile::tempdir().unwrap();
    let data = temp.path().join("data");
    let mut book = book::Book::default();
    let old = book.begin("s-old", None, "旧单", None, "b", 1);
    book.failed(&old.id, "timeout", 2);
    book.begin("s1", None, "修登录", None, "b", 3);
    book::save(&data, &book).unwrap();
    let lines = Fake::default();
    let desk = Desk::new(Some(data.clone()));
    let now = now_ms();
    assert!(desk.tell(&lines, now));
    let told = sent_as(&lines, "reply");
    assert_eq!(told.len(), 1, "the old trouble is not told");
    assert_eq!(told[0].0, "s1");
    assert!(told[0].1.contains(&interrupted(true)) || told[0].1.contains(&interrupted(false)));
    drop(desk);
    let desk = Desk::new(Some(data));
    assert!(!desk.tell(&lines, now_ms()), "not told again");
    assert_eq!(sent_as(&lines, "reply").len(), 1);
}

/// #318 review P2-02: trouble that came after the notices began but the
/// app stopped before telling is told once it runs again, once.
#[test]
fn trouble_a_stop_left_untold_is_told_after_the_restart() {
    let temp = tempfile::tempdir().unwrap();
    let data = temp.path().join("data");
    let failing = Fake {
        open_fails: true,
        ..Fake::default()
    };
    let desk = Desk::new(Some(data.clone()));
    let at = now_ms();
    let Started::Opening { handoff, .. } = desk
        .start(&failing, "s1", None, "修登录", None, "brief", false, at)
        .unwrap()
    else {
        panic!("a first brief opens a conversation");
    };
    assert!(desk
        .open(&failing, &handoff.id, "brief", None, || at)
        .is_err());
    // The app stops before the next look.
    drop(desk);
    std::thread::sleep(std::time::Duration::from_millis(5));
    let lines = Fake::default();
    let desk = Desk::new(Some(data.clone()));
    assert!(desk.tell(&lines, now_ms()));
    assert_eq!(sent_as(&lines, "reply").len(), 1);
    drop(desk);
    let desk = Desk::new(Some(data));
    assert!(!desk.tell(&lines, now_ms()), "told once");
    assert_eq!(sent_as(&lines, "reply").len(), 1);
}

/// #318 review P2-03: trouble found, then the person retries or turns
/// the auto round trip back on before it is told: it is not told, the
/// words being out of date.
#[test]
fn trouble_moved_on_from_before_it_is_told_is_not_told() {
    let (_temp, desk) = desk();
    let failing = Fake {
        open_fails: true,
        ..Fake::default()
    };
    let Started::Opening { handoff, .. } = desk
        .start(&failing, "s1", None, "修登录", None, "brief", false, 1)
        .unwrap()
    else {
        panic!("a first brief opens a conversation");
    };
    assert!(desk
        .open(&failing, &handoff.id, "brief", None, || 2)
        .is_err());
    let (id, at, trouble) = desk.lock().untold(0).remove(0);
    desk.act(&failing, &id, "retry", 3).unwrap();
    assert!(!desk.tell_one(&failing, &id, at, &trouble, 4));
    assert!(sent_as(&failing, "reply").is_empty());

    // ChatGPT did not answer; the person turns it back on meanwhile.
    let (_temp, desk) = self::desk();
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    let late = 2 + book::REPLY_WAIT_MS + 1;
    desk.late(late);
    let (id, at, trouble) = desk.lock().untold(0).remove(0);
    desk.act(&lines, &id, "resume", late + 1).unwrap();
    assert!(!desk.tell_one(&lines, &id, at, &trouble, late + 2));
    assert!(sent_as(&lines, "reply").is_empty());
    let _ = handoff;
}

/// #318 review P2-01: an opening PostPane gave up waiting for may still
/// come: the session is not told there will be no answer, and when it
/// does come, the handoff carries on and its answer goes back.
#[test]
fn an_opening_told_of_that_comes_late_still_carries_on() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let Started::Opening { handoff, .. } = desk
        .start(&lines, "s1", None, "修登录", None, "改动如下", false, 1)
        .unwrap()
    else {
        panic!("a first brief opens a conversation");
    };
    let late = 1 + book::OPEN_TIMEOUT_MS + 1;
    assert!(desk.tell(&lines, late));
    let told = last_sent(&lines).2;
    assert!(!told.contains("不会有回信"), "{told}");
    assert!(told.contains("驿窗会接回这次接力"), "{told}");
    assert!(told.contains("先不要再调用 relay_to_chatgpt"), "{told}");
    // The extension says it opened after all.
    assert!(desk.observe(
        &json!({"type":"opened","requestId":format!("{}~0", handoff.id),"ok":true,"conversation":"c-new"}),
        late + 1
    ));
    assert_eq!(desk.projection(late + 1)[0]["status"], "open");
    assert!(!desk.tell(&lines, late + 2), "nothing more to tell");
    // ChatGPT answers the brief the opening carried.
    shown("改动如下");
    assert!(desk.observe(&turn("complete", GATE_PASS), late + 3));
    assert!(desk.drive(&lines, late + 4));
    assert_eq!(sent_as(&lines, "reply").len(), 2, "the answer went back");
    assert_eq!(desk.projection(late + 4)[0]["status"], "closed");
}

/// Review of #318, P2-03: while a session is told its opening failed,
/// the extension says it opened after all: that waits till the words
/// are out, so they were true when sent, and it is not lost.
#[test]
fn an_opening_reported_while_its_failure_is_told_waits_for_it() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let Started::Opening { handoff, .. } = desk
        .start(&lines, "s1", None, "修登录", None, "改动如下", false, 1)
        .unwrap()
    else {
        panic!("a first brief opens a conversation");
    };
    let late = 1 + book::OPEN_TIMEOUT_MS + 1;
    desk.late(late);
    let opened = json!({"type":"opened","requestId":format!("{}~0", handoff.id),"ok":true,"conversation":"c-new"});
    let (during, bound) = while_told(
        &desk,
        late + 1,
        || desk.observe(&opened, late + 2),
        || desk.lock().get(&handoff.id).unwrap().status,
    );
    assert_eq!(during, Status::Failed, "it waited while the words went");
    assert!(bound, "and was not lost");
    assert_eq!(desk.projection(late + 3)[0]["status"], "open");
}

/// Review of #318, P2-03: while a session is told ChatGPT has not
/// answered, the answer comes: it waits till the words are out, and is
/// taken then.
#[test]
fn an_answer_that_comes_while_no_answer_is_told_waits_for_it() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    let late = 2 + book::REPLY_WAIT_MS + 1;
    desk.late(late);
    let answer = turn("complete", "结论：需修改");
    let (during, took) = while_told(
        &desk,
        late + 1,
        || desk.observe(&answer, late + 2),
        || desk.lock().get(&handoff.id).unwrap().last_reply().is_some(),
    );
    assert!(!during, "it waited while the words went");
    // Held back while words were on their way (`turn_waits`), it is
    // taken once they are out: not lost.
    let _ = took;
    assert_eq!(desk.projection(late + 3)[0]["phase"], "replied");
}

/// Review of #318, P2-03: the person retries while the session is told
/// the opening failed: the retry waits till the words are out (no error
/// for the person), then opens again.
#[test]
fn a_retry_while_its_failure_is_told_waits_for_it() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let Started::Opening { handoff, .. } = desk
        .start(&lines, "s1", None, "修登录", None, "改动如下", false, 1)
        .unwrap()
    else {
        panic!("a first brief opens a conversation");
    };
    let late = 1 + book::OPEN_TIMEOUT_MS + 1;
    desk.late(late);
    let (during, retried) = while_told(
        &desk,
        late + 1,
        || {
            let lines = Fake::default();
            desk.act(&lines, &handoff.id, "retry", late + 2).is_ok()
        },
        || desk.lock().get(&handoff.id).unwrap().status,
    );
    assert_eq!(during, Status::Failed, "it waited while the words went");
    assert!(retried);
    assert_eq!(desk.projection(late + 3)[0]["status"], "opening");
}

/// #318: ChatGPT not answering in time stops the auto round trip and is
/// told once; an answer that comes later is still taken, and a pass
/// still goes back by itself.
#[test]
fn a_session_is_told_when_chatgpt_does_not_answer_and_a_late_answer_still_counts() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    let late = 2 + book::REPLY_WAIT_MS + 1;
    assert!(desk.tell(&lines, late));
    let told = sent_as(&lines, "reply");
    assert_eq!(told.len(), 1);
    assert!(
        told[0].1.contains("ChatGPT 30 分钟没回信")
            && told[0].1.contains("回信会照样转回这里")
            && !told[0].1.contains("才会转过来"),
        "every answer goes back now (#410 S1)"
    );
    let shown = desk.projection(late);
    assert_eq!(shown[0]["auto"], false);
    let halt = format!("{}；{}", no_answer(), told_back());
    assert_eq!(shown[0]["halt"], halt);
    assert_eq!(last_step_text(&desk, late), halt);
    assert!(!desk.tell(&lines, late + 1), "told once");
    // ChatGPT answers after all: taken, and a pass goes back and ends it.
    desk.observe(&turn("complete", GATE_PASS), late + 2);
    assert_eq!(desk.projection(late + 2)[0]["phase"], "replied");
    assert!(desk.drive(&lines, late + 3));
    assert_eq!(sent_as(&lines, "reply").len(), 2);
    assert_eq!(desk.projection(late + 3)[0]["status"], "closed");
    let _ = handoff;

    // A 思维评审 has no pass that ends it by itself, so it says none.
    let (_temp, desk) = self::desk();
    let lines = Fake::default();
    thinking(&desk, &lines);
    assert!(desk.tell(&lines, late));
    let text = last_sent(&lines).2;
    assert!(!text.contains("写「通过」"), "{text}");
    assert!(
        text.contains("收口以外的结论会写明下一步等常浩决定"),
        "{text}"
    );
}

/// #318: a session that cannot take it now finds it in its queue; one
/// whose queue cannot be written to is not told, and the card says why.
/// A Codex thread is told in its own queue, the card naming Codex.
#[test]
fn trouble_that_cannot_reach_the_session_says_how_it_went() {
    let late = 2 + book::REPLY_WAIT_MS + 1;
    let (_temp, desk) = desk();
    let quiet = Fake {
        unreachable: true,
        ..Fake::default()
    };
    opened(&desk, &quiet);
    assert!(desk.tell(&quiet, late));
    assert_eq!(sent_as(&quiet, "queue").len(), 1);
    assert!(last_step_text(&desk, late).ends_with(&told_queued()));

    let (_temp, desk) = self::desk();
    let shut = Fake {
        unreachable: true,
        leave_fails: std::cell::Cell::new(true),
        ..Fake::default()
    };
    opened(&desk, &shut);
    assert!(desk.tell(&shut, late));
    assert!(last_step_text(&desk, late).ends_with(&not_told("plugin folder not writable")));
    assert!(!desk.tell(&shut, late + 1), "not tried at every look");

    let (_temp, desk) = self::desk();
    let lines = Fake::default();
    codex_opened(&desk, &lines, None);
    assert!(desk.tell(&lines, late));
    let told = sent_as(&lines, "codex");
    assert_eq!(told.len(), 1);
    assert!(told[0].1.contains("回信会照样转回这里"), "{}", told[0].1);
    assert!(
        last_step_text(&desk, late).ends_with("已发到 Codex 会话")
            || last_step_text(&desk, late).ends_with("sent to the Codex session")
    );
}
