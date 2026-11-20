//! Left swipes on a session row: what a swipe leaves for the session, and what
//! becomes of it.
use super::*;

#[test]
fn a_swipe_is_done_only_by_the_handoff_that_names_it() {
    let (temp, desk) = desk();
    // Three rounds go in here (the answers between them, L3 P1-10).
    handoffs::set_review_limit(&temp.path().join("data"), 5).unwrap();
    let lines = Fake::default();
    // The session already has a review open: its next round goes into it.
    opened(&desk, &lines);
    left_as(&lines, Some("started"), None);
    launch(&desk, &lines, CLAUDE, "s1", "review", 10).unwrap();
    let code = code_of(&lines);
    assert!(code.starts_with('L'));
    desk.observe(
        &turn("complete", "1. 还差\n审查出口：返修\n结论：需修改"),
        10,
    );
    // A handoff of the same session for something else settles nothing.
    desk.start(
        &lines,
        "s1",
        Some("/w"),
        "修登录",
        None,
        "别的事",
        false,
        11,
    )
    .unwrap();
    assert!(!desk.launch_relayed("s1", "L-other", 11));
    assert!(!desk.launch_relayed("s2", &code, 11), "another session's");
    assert_eq!(desk.launch_projection(&lines, 11)[0]["state"], "started");
    desk.observe(
        &turn("complete", "2. 还差\n审查出口：返修\n结论：需修改"),
        11,
    );
    // The round it asked for, into the review already open, does.
    desk.start(
        &lines,
        "s1",
        Some("/w"),
        "修登录",
        None,
        "左滑要的这轮",
        false,
        12,
    )
    .unwrap();
    assert!(desk.launch_relayed("s1", &code, 12));
    assert_eq!(desk.launch_projection(&lines, 12), json!([]));
    assert!(!desk.launch_relayed("s1", &code, 13), "once");
}

#[test]
fn swipes_waiting_across_a_restart_are_not_left_again() {
    let temp = tempfile::tempdir().unwrap();
    let data = temp.path().join("data");
    let lines = Fake::default();
    left_as(&lines, Some("taken"), None);
    let desk = Desk::new(Some(data.clone()));
    launch(&desk, &lines, CLAUDE, "s1", "review", 1).unwrap();
    desk.launch_projection(&lines, 2);
    drop(desk);
    let desk = Desk::new(Some(data.clone()));
    assert_eq!(
        launch(&desk, &lines, CLAUDE, "s1", "review", 3).unwrap(),
        Launched::AlreadyQueued
    );
    assert_eq!(
        lines
            .sent
            .borrow()
            .iter()
            .filter(|s| s.0 == "leave")
            .count(),
        1
    );
    // Its code still settles it after the restart.
    let code = code_of(&lines);
    assert!(desk.launch_relayed("s1", &code, 4));
    drop(desk);
    let desk = Desk::new(Some(data));
    assert_eq!(desk.launch_projection(&lines, 5), json!([]));
}

#[test]
fn a_stall_counts_its_hour_from_when_the_words_were_taken() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    left_as(&lines, Some("waiting"), None);
    launch(&desk, &lines, CLAUDE, "s1", "review", 0).unwrap();
    // Waiting 55 minutes, then taken.
    let taken = 55 * 60_000;
    left_as(&lines, Some("taken"), None);
    desk.launch_projection(&lines, taken);
    // The swipe's hour is up, the taking's is not.
    left_as(&lines, None, None);
    assert_eq!(
        desk.launch_projection(&lines, LAUNCH_LIFETIME_MS + 1)[0]["state"],
        "queued"
    );
    assert_eq!(
        desk.launch_projection(&lines, taken + LAUNCH_LIFETIME_MS)[0]["state"],
        "stalled"
    );
}

/// #282: 左滑发起 on a Codex thread leaves its words in Codex's queue
/// under the swipe's code, and follows them there.
#[test]
fn a_swipe_on_a_codex_thread_goes_into_its_queue() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    assert_eq!(
        launch(&desk, &lines, CODEX, "t1", "review", 1).unwrap(),
        Launched::Queued
    );
    {
        let sent = lines.sent.borrow();
        assert_eq!(sent.len(), 1, "{sent:?}");
        assert_eq!((sent[0].0.as_str(), sent[0].1.as_str()), ("codex", "t1"));
        assert!(sent[0].2.contains("relay_to_chatgpt"));
    }
    let launches = desk.launches();
    let left = launches.get("t1").unwrap();
    assert_eq!(left.doer.as_deref(), Some(CODEX));
    assert_eq!(left.id, left.code);
    drop(launches);
    // Still waiting in the queue: the same swipe leaves nothing more.
    assert_eq!(
        launch(&desk, &lines, CODEX, "t1", "review", 2).unwrap(),
        Launched::AlreadyQueued
    );
    assert_eq!(lines.sent.borrow().len(), 1);
}

#[test]
fn a_swipe_asks_the_claude_session_to_hand_its_own_work_over() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    left_as(&lines, Some("waiting"), None);
    assert_eq!(
        launch(&desk, &lines, CLAUDE, "s1", "review", 1).unwrap(),
        Launched::Queued
    );
    assert_eq!(
        launch(&desk, &lines, CLAUDE, "s2", "discuss", 1).unwrap(),
        Launched::Queued
    );
    let sent = lines.sent.borrow().clone();
    assert_eq!(sent.len(), 2);
    assert_eq!((sent[0].0.as_str(), sent[0].1.as_str()), ("leave", "s1"));
    assert!(sent[0].2.contains("relay_to_chatgpt") && sent[0].2.contains("审查出口"));
    assert!(sent[1].2.contains("relay_to_chatgpt") && sent[1].2.contains("不改代码"));
    // Kinds not open yet, a bad id, no way out: nothing is sent.
    assert!(launch(&desk, &lines, CLAUDE, "s3", "test", 1).is_err());
    assert!(launch(&desk, &lines, CLAUDE, "../x", "review", 1).is_err());
    let offline = Fake {
        offline: true,
        ..Fake::default()
    };
    assert!(launch(&desk, &offline, CLAUDE, "s3", "review", 1).is_err());
    let unreachable = Fake {
        unreachable: true,
        ..Fake::default()
    };
    assert!(launch(&desk, &unreachable, CLAUDE, "s3", "review", 1).is_err());
    assert!(offline.sent.borrow().is_empty() && unreachable.sent.borrow().is_empty());
    assert_eq!(lines.sent.borrow().len(), 2);
}

#[test]
fn a_second_swipe_while_the_words_wait_leaves_nothing_more() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    left_as(&lines, Some("waiting"), None);
    launch(&desk, &lines, CLAUDE, "s1", "review", 1).unwrap();
    assert_eq!(
        launch(&desk, &lines, CLAUDE, "s1", "review", 2).unwrap(),
        Launched::AlreadyQueued
    );
    // Another kind for the same session waits too: one ask at a time.
    assert_eq!(
        launch(&desk, &lines, CLAUDE, "s1", "discuss", 2).unwrap(),
        Launched::AlreadyQueued
    );
    // Taken words wait for the session to be idle: still queued.
    left_as(&lines, Some("taken"), None);
    assert_eq!(
        launch(&desk, &lines, CLAUDE, "s1", "review", 3).unwrap(),
        Launched::AlreadyQueued
    );
    // In the session but no handoff yet: still asked, and said so.
    left_as(&lines, Some("started"), None);
    assert_eq!(
        launch(&desk, &lines, CLAUDE, "s1", "review", 4).unwrap(),
        Launched::AlreadyQueued
    );
    assert_eq!(desk.launch_projection(&lines, 4)[0]["state"], "started");
    assert_eq!(lines.sent.borrow().len(), 1);
    // Once the session handed its work over naming this swipe, the row
    // gives way to its handoff and a new swipe leaves words again.
    let code = code_of(&lines);
    assert!(desk.launch_relayed("s1", &code, 5));
    assert_eq!(desk.launch_projection(&lines, 5), json!([]));
    left_as(&lines, Some("waiting"), None);
    assert_eq!(
        launch(&desk, &lines, CLAUDE, "s1", "review", 6).unwrap(),
        Launched::Queued
    );
    assert_eq!(
        lines
            .sent
            .borrow()
            .iter()
            .filter(|s| s.0 == "leave")
            .count(),
        2
    );
}

#[test]
fn words_that_could_not_be_left_can_be_swiped_again() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    lines.leave_fails.set(true);
    assert!(launch(&desk, &lines, CLAUDE, "s1", "review", 1).is_err());
    assert_eq!(desk.launch_projection(&lines, 1), json!([]));
    lines.leave_fails.set(false);
    left_as(&lines, Some("waiting"), None);
    assert_eq!(
        launch(&desk, &lines, CLAUDE, "s1", "review", 2).unwrap(),
        Launched::Queued
    );
    // Another session is its own line.
    assert_eq!(
        launch(&desk, &lines, CLAUDE, "s2", "review", 2).unwrap(),
        Launched::Queued
    );
}

#[test]
fn words_that_come_to_nothing_say_so_on_the_row_a_while() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    left_as(&lines, Some("waiting"), None);
    launch(&desk, &lines, CLAUDE, "s1", "review", 0).unwrap();
    left_as(&lines, Some("refused"), Some("session ended"));
    let shown = desk.launch_projection(&lines, 10);
    assert_eq!(shown[0]["state"], "refused");
    assert_eq!(shown[0]["reason"], "session ended");
    // A refusal can be swiped again at once.
    assert_eq!(
        launch(&desk, &lines, CLAUDE, "s1", "review", 11).unwrap(),
        Launched::Queued
    );
    left_as(&lines, Some("expired"), None);
    assert_eq!(desk.launch_projection(&lines, 20)[0]["state"], "expired");
    // Shown half an hour, then gone.
    assert_eq!(
        desk.launch_projection(&lines, 20 + LAUNCH_SHOWN_MS),
        json!([])
    );
    // Words whose file went before they were seen taken: not known to
    // be taken, so not said to be; with no handoff in the hour, lost.
    left_as(&lines, Some("waiting"), None);
    launch(&desk, &lines, CLAUDE, "s3", "review", 0).unwrap();
    desk.launch_projection(&lines, 1);
    left_as(&lines, None, None);
    let shown = desk.launch_projection(&lines, 60_000);
    assert!(shown
        .as_array()
        .unwrap()
        .iter()
        .any(|l| l["session"] == "s3" && l["state"] == "unknown"));
    // Words never taken expire with their hour.
    left_as(&lines, Some("waiting"), None);
    launch(&desk, &lines, CLAUDE, "s2", "review", 0).unwrap();
    let shown = desk.launch_projection(&lines, LAUNCH_LIFETIME_MS);
    let state = |session: &str| {
        shown
            .as_array()
            .unwrap()
            .iter()
            .find(|l| l["session"] == session)
            .map(|l| l["state"].clone())
    };
    assert_eq!(state("s2"), Some(json!("expired")));
    assert_eq!(state("s3"), Some(json!("lost")));
    assert_eq!(
        lines
            .sent
            .borrow()
            .iter()
            .filter(|s| s.0 == "leave")
            .count(),
        4
    );
}
