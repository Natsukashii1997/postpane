//! Running a stopped or quiet Claude session in the background with the answer.
use super::*;

#[test]
fn a_session_whose_process_stopped_is_run_in_the_background_with_the_answer() {
    let (_temp, desk) = desk();
    let lines = Fake {
        unreachable: true,
        ..Fake::default()
    };
    lines.stopped.set(true);
    let handoff = opened(&desk, &lines);
    desk.observe(
        &turn("complete", "1. 补测试\n审查出口：返修\n结论：需修改"),
        4,
    );
    assert!(desk.drive(&lines, 5));
    assert_eq!(replies(&lines), 0);
    assert!(
        sent_as(&lines, "queue").is_empty(),
        "not queued: nothing runs to take it"
    );
    let woke = sent_as(&lines, "wake");
    assert_eq!(woke.len(), 1);
    assert_eq!(woke[0].0, format!("{}|s1", handoff.id));
    assert!(woke[0].1.contains("补测试") && woke[0].1.contains("relay_to_chatgpt"));
    let steps = kinds(&desk, 5);
    assert_eq!(
        steps[steps.len() - 2..],
        [("back".to_owned(), true), ("wake".to_owned(), true)]
    );
    let shown = desk.projection(5);
    assert_eq!(shown[0]["phase"], "returned");
    assert_eq!(shown[0]["auto"], true);
    assert_eq!(shown[0]["wakingSince"], 5);
    let steps_shown = shown[0]["steps"].as_array().unwrap();
    assert_eq!(steps_shown.last().unwrap()["text"], woke_stopped());
    // The run has the words: nothing waits with the plugin to follow.
    assert_eq!(last_back(&desk, 5).1, "started");
    assert!(!desk.track(&lines, 6));
    assert!(!desk.drive(&lines, 6), "run once");

    // The run ended and Claude handed the next round over: nothing to do.
    desk.start(
        &lines,
        "s1",
        Some("/w"),
        "修登录",
        Some("按意见改完"),
        "第二轮",
        false,
        7,
    )
    .unwrap();
    assert!(!desk.woke_up(&handoff.id, Ok(()), 8));
    assert!(desk.projection(8)[0].get("wakingSince").is_none());
}

#[test]
fn a_background_run_that_cannot_start_or_ends_without_a_handover_is_left_to_the_person() {
    let (_temp, desk) = desk();
    let lines = Fake {
        unreachable: true,
        ..Fake::default()
    };
    lines.stopped.set(true);
    *lines.wake_fails.borrow_mut() = Some("权限模式是 default".into());
    opened(&desk, &lines);
    desk.observe(&turn("complete", "审查出口：返修\n结论：需修改"), 4);
    assert!(desk.drive(&lines, 5));
    let shown = desk.projection(5);
    assert_eq!(shown[0]["auto"], false);
    assert_eq!(shown[0]["halt"], back_failed());
    let steps = kinds(&desk, 5);
    assert_eq!(
        steps[steps.len() - 2..],
        [("fail".to_owned(), true), ("stop".to_owned(), true)]
    );
    let fail = &shown[0]["steps"].as_array().unwrap()[steps.len() - 2];
    assert!(fail["text"]
        .as_str()
        .unwrap()
        .contains("权限模式是 default"));

    // It ran, but ended with Claude still on it: no handover came.
    let (_temp, desk) = self::desk();
    let lines = Fake {
        unreachable: true,
        ..Fake::default()
    };
    lines.stopped.set(true);
    let handoff = opened(&desk, &lines);
    desk.observe(&turn("complete", "审查出口：返修\n结论：需修改"), 4);
    desk.drive(&lines, 5);
    assert!(desk.woke_up(&handoff.id, Err("exit 1".into()), 9));
    let shown = desk.projection(9);
    assert_eq!(shown[0]["auto"], false);
    assert!(shown[0].get("wakingSince").is_none());
    let steps = shown[0]["steps"].as_array().unwrap();
    assert_eq!(
        steps[steps.len() - 2]["text"],
        woke_without_handover(Some("exit 1"))
    );
    assert!(!desk.woke_up(&handoff.id, Ok(()), 10), "once");
}

#[test]
fn queued_words_for_a_session_that_stays_quiet_are_taken_back_and_run_in_the_background() {
    let wake_at = 5 + handoffs::WAKE_AFTER_MS;
    let queued = || {
        let (temp, desk) = self::desk();
        let lines = Fake::default();
        lines.reply_fails.set(2);
        let handoff = opened(&desk, &lines);
        desk.observe(&turn("complete", "审查出口：返修\n结论：需修改"), 4);
        assert!(desk.drive(&lines, 5));
        assert_eq!(desk.projection(5)[0]["queuedAt"], 5);
        (temp, desk, lines, handoff)
    };

    // Quiet, but not for long yet: it waits.
    let (_temp, desk, lines, handoff) = queued();
    lines.stopped.set(true);
    assert!(!desk.wake_queued(&lines, wake_at - 1));
    assert!(sent_as(&lines, "wake").is_empty());
    // Long enough: the queued words are taken back and Claude runs.
    let (prompt, delivery) = last_back(&desk, 5);
    assert_eq!(delivery, "waiting");
    assert_eq!(sent_as(&lines, "queue").len(), 1);
    assert!(desk.wake_queued(&lines, wake_at));
    assert_eq!(sent_as(&lines, "withdraw"), [("s1".to_owned(), prompt)]);
    let woke = sent_as(&lines, "wake");
    assert_eq!(woke.len(), 1);
    assert_eq!(woke[0].0, format!("{}|s1", handoff.id));
    let shown = desk.projection(wake_at);
    assert!(shown[0].get("queuedAt").is_none());
    assert_eq!(shown[0]["wakingSince"], wake_at);
    let steps = kinds(&desk, wake_at);
    assert_eq!(steps.last().unwrap(), &("wake".to_owned(), true));
    let backs = steps.iter().filter(|s| s.0 == "back").count();
    assert_eq!(backs, 1, "the words went back once");
    // Taken back, the plugin says cancelled: the run has them, so that
    // does not leave the handoff to the person (#257).
    assert_eq!(last_back(&desk, wake_at).1, "started");
    assert!(!desk.track(&lines, wake_at + 1));
    assert_eq!(desk.projection(wake_at + 1)[0]["auto"], true);
    assert!(!desk.wake_queued(&lines, wake_at + 1), "run once");

    // The session took the words meanwhile: `track` follows them, no run.
    let (_temp, desk, lines, _) = queued();
    lines.stopped.set(true);
    left_by(&lines, &last_back(&desk, 5).0, "taken", None);
    assert!(!desk.wake_queued(&lines, wake_at));
    assert!(sent_as(&lines, "withdraw").is_empty());
    assert!(sent_as(&lines, "wake").is_empty());

    // Never seen stopped (it may run without the plugin): it keeps waiting.
    let (_temp, desk, lines, _) = queued();
    assert!(!desk.wake_queued(&lines, wake_at));
    assert_eq!(desk.projection(wake_at)[0]["queuedAt"], 5);

    // The words could not be taken back: no second copy runs.
    let (_temp, desk, lines, _) = queued();
    lines.stopped.set(true);
    lines.withdraw_fails.set(true);
    assert!(!desk.wake_queued(&lines, wake_at));
    assert!(sent_as(&lines, "wake").is_empty());

    // Taken back, but the run cannot start: the answer waits for the
    // person, who can send it again.
    let (_temp, desk, lines, _) = queued();
    lines.stopped.set(true);
    *lines.wake_fails.borrow_mut() = Some("找不到会话记录".into());
    assert!(desk.wake_queued(&lines, wake_at));
    let shown = desk.projection(wake_at);
    assert_eq!(shown[0]["auto"], false);
    assert_eq!(shown[0]["phase"], "replied");
    assert!(shown[0].get("queuedAt").is_none());
    assert_eq!(last_back(&desk, wake_at).1, "cancelled");
    assert!(shown[0]["halt"]
        .as_str()
        .unwrap()
        .contains("找不到会话记录"));
}

#[test]
fn the_background_run_takes_the_sessions_own_mode_model_and_effort() {
    let record = json!({"permissionMode":"auto","model":"claude-opus-5-5","effort":"high"});
    assert_eq!(
        wake_arguments("s1", &record, "意见").unwrap(),
        [
            "-p",
            "--resume",
            "s1",
            "--permission-mode",
            "auto",
            "--model",
            "claude-opus-5-5",
            "--effort",
            "high",
            "意见"
        ]
    );
    assert_eq!(
        wake_arguments("s1", &json!({"permissionMode":"acceptEdits"}), "意见").unwrap(),
        [
            "-p",
            "--resume",
            "s1",
            "--permission-mode",
            "acceptEdits",
            "意见"
        ]
    );
    // Nobody is there to allow a tool.
    for mode in [json!("default"), json!("plan"), Value::Null] {
        assert!(wake_arguments("s1", &json!({"permissionMode": mode}), "意见").is_err());
    }
}
