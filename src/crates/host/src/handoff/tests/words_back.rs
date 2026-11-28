//! Words on their way back to the Claude session: queued, retried, followed
//! until its turn on them starts.
use super::*;

#[test]
fn words_back_to_a_claude_session_that_ended_wait_in_its_queue() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    opened(&desk, &lines);
    desk.observe(
        &turn("complete", "1. 少一项\n审查出口：返修\n结论：需修改"),
        4,
    );
    let ended = Fake {
        unreachable: true,
        ..Fake::default()
    };
    assert!(desk.drive(&ended, 5));
    let sent = ended.sent.borrow();
    assert_eq!(sent.len(), 1, "{sent:?}");
    assert_eq!((sent[0].0.as_str(), sent[0].1.as_str()), ("queue", "s1"));
    assert!(sent[0].2.contains("少一项"));
    let shown = desk.projection(5);
    assert_eq!(shown[0]["phase"], "returned");
    assert_eq!(shown[0]["auto"], true, "still going by itself");
    assert_eq!(shown[0]["queuedAt"], 5);
    assert!(shown[0]["halt"].is_null());
    let steps = kinds(&desk, 5);
    let second = &shown[0]["steps"].as_array().unwrap()[steps.len() - 2];
    assert_eq!(
        second["text"],
        queued_instead("这个会话还没加载 Agent HUD 插件")
    );
}

#[test]
fn words_back_to_claude_that_fail_are_tried_once_more_then_left_to_the_person() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    lines.reply_fails.set(1);
    opened(&desk, &lines);
    desk.observe(&turn("complete", "审查出口：返修\n结论：需修改"), 4);
    assert!(desk.drive(&lines, 5));
    assert_eq!(replies(&lines), 1, "the second try went through");
    let steps = kinds(&desk, 5);
    assert_eq!(
        steps[steps.len() - 2..],
        [("fail".to_owned(), true), ("back".to_owned(), true)]
    );
    let shown = desk.projection(5);
    let fail = &shown[0]["steps"].as_array().unwrap()[steps.len() - 2];
    assert_eq!(fail["text"], back_retry("会话的待发送目录写不进"));

    // A session Claude paused (its turn over, the plugin quiet): the
    // words wait in its queue and go in once it is opened (#72, L5 run 1).
    let (_temp, desk) = self::desk();
    let lines = Fake::default();
    lines.reply_fails.set(2);
    opened(&desk, &lines);
    desk.observe(&turn("complete", "审查出口：返修\n结论：需修改"), 4);
    assert!(desk.drive(&lines, 5));
    assert_eq!(replies(&lines), 0);
    let left = lines
        .sent
        .borrow()
        .iter()
        .filter(|s| s.0 == "queue")
        .count();
    assert_eq!(left, 1, "queued for the session");
    let shown = desk.projection(5);
    assert_eq!(shown[0]["phase"], "returned");
    assert_eq!(shown[0]["auto"], true, "still going by itself");
    assert_eq!(shown[0]["queuedAt"], 5);
    let steps = kinds(&desk, 5);
    assert_eq!(
        steps[steps.len() - 3..],
        [
            ("fail".to_owned(), true),
            ("fail".to_owned(), true),
            ("back".to_owned(), true)
        ]
    );
    let shown = desk.projection(5);
    let second = &shown[0]["steps"].as_array().unwrap()[steps.len() - 2];
    assert_eq!(second["text"], queued_instead("会话的待发送目录写不进"));
    assert!(!desk.drive(&lines, 6), "queued once");
    // Claude hands the next round over: no longer waiting in the queue.
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
    assert!(desk.projection(7)[0].get("queuedAt").is_none());

    // Not even queued: left to the person.
    let (_temp, desk) = self::desk();
    let lines = Fake::default();
    lines.reply_fails.set(2);
    lines.leave_fails.set(true);
    opened(&desk, &lines);
    desk.observe(&turn("complete", "审查出口：返修\n结论：需修改"), 4);
    assert!(desk.drive(&lines, 5));
    let shown = desk.projection(5);
    assert_eq!(shown[0]["phase"], "replied");
    assert_eq!(shown[0]["halt"], back_failed());
    let steps = kinds(&desk, 5);
    assert_eq!(
        steps[steps.len() - 3..],
        [
            ("fail".to_owned(), true),
            ("fail".to_owned(), true),
            ("stop".to_owned(), true)
        ]
    );

    // Queued and never taken up within the hour: left to the person.
    let (_temp, desk) = self::desk();
    let lines = Fake::default();
    lines.reply_fails.set(2);
    opened(&desk, &lines);
    desk.observe(&turn("complete", "审查出口：返修\n结论：需修改"), 4);
    desk.drive(&lines, 5);
    assert!(desk.projection(5 + book::QUEUE_WAIT_MS)[0]["halt"].is_null());
    let shown = desk.projection(6 + book::QUEUE_WAIT_MS);
    assert_eq!(shown[0]["halt"], no_wake());
    assert_eq!(shown[0]["phase"], "returned");
}

// #223: words that reached ChatGPT after the wait for them gave up
// still count once the extension says so, and its answer is taken.
#[test]
fn words_sent_after_the_wait_gave_up_still_count() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    desk.observe(
        &turn("complete", "1. 少一项\n审查出口：返修\n结论：需修改"),
        3,
    );
    desk.act(&lines, &handoff.id, "back", 3).unwrap();
    lines.send_fails.set(true);
    assert!(desk
        .start(&lines, "s1", None, "t", None, "第 2 轮改动", false, 4)
        .is_err());
    assert_eq!(desk.projection(4)[0]["phase"], "returned");
    let request = lines.requests.borrow().last().unwrap().clone();
    assert!(desk.observe(&json!({"type":"sent","requestId":request,"ok":true}), 5));
    let shown = desk.projection(5);
    assert_eq!(shown[0]["phase"], "delivered");
    // The ask, then a step setting right what the session heard (#544).
    let steps = shown[0]["steps"].as_array().unwrap();
    let kinds = steps.iter().rev().take(2).map(|s| s["kind"].clone());
    assert_eq!(kinds.collect::<Vec<_>>(), [json!("work"), json!("ask")]);
    // Told twice, it counts once; Claude asking again sends nothing more.
    assert!(!desk.observe(&json!({"type":"sent","requestId":request,"ok":true}), 5));
    lines.send_fails.set(false);
    let Started::Sent { repeated, .. } = desk
        .start(&lines, "s1", None, "t", None, "第 2 轮改动", false, 6)
        .unwrap()
    else {
        panic!("round 2 goes into the same conversation")
    };
    assert!(repeated);
    // The answer that follows is the review's.
    assert!(desk.observe(
        &json!({"type":"turn","phase":"complete","conversation":"c-new","reply":"审查出口：通过\n结论：通过","messageId":"m2","prompt":asked()}),
        7
    ));
    assert_eq!(desk.projection(7)[0]["phase"], "replied");
}

// #223: 转回 Claude by hand that cannot go into the session waits in its
// queue, as the auto round trip's does.
#[test]
fn words_back_by_hand_that_cannot_go_in_wait_in_the_queue() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    desk.act(&lines, &handoff.id, "pause", 3).unwrap();
    desk.observe(
        &turn("complete", "1. 少一项\n审查出口：返修\n结论：需修改"),
        4,
    );
    let unreachable = Fake {
        unreachable: true,
        ..Fake::default()
    };
    desk.act(&unreachable, &handoff.id, "back", 5).unwrap();
    let shown = desk.projection(5);
    assert_eq!(shown[0]["phase"], "returned");
    assert_eq!(shown[0]["queuedAt"], 5);
    {
        let sent = unreachable.sent.borrow();
        assert_eq!(sent.len(), 1);
        assert_eq!((sent[0].0.as_str(), sent[0].1.as_str()), ("queue", "s1"));
        assert!(sent[0].2.contains("少一项"));
    }
    // Clicked again, nothing more is queued.
    desk.act(&unreachable, &handoff.id, "back", 6).unwrap();
    assert_eq!(unreachable.sent.borrow().len(), 1);
    // A reply that fails is queued too.
    let (_temp, desk) = self::desk();
    let handoff = opened(&desk, &lines);
    desk.observe(&turn("complete", "审查出口：返修\n结论：需修改"), 4);
    let failing = Fake::default();
    failing.reply_fails.set(1);
    desk.act(&failing, &handoff.id, "back", 5).unwrap();
    assert_eq!(desk.projection(5)[0]["queuedAt"], 5);
    assert_eq!(failing.sent.borrow()[0].0, "queue");
}

/// #257: a step back to Claude goes under its own id, so triggered again
/// — by the person, by the auto round trip, or after a restart that lost
/// the record of it — it leaves no second copy.
#[test]
fn a_step_back_to_claude_leaves_one_copy_under_its_own_id() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    desk.observe(
        &turn("complete", "1. 要超时\n审查出口：返修\n结论：需修改"),
        4,
    );
    assert!(desk.drive(&lines, 5));
    let (prompt, delivery) = last_back(&desk, 5);
    assert!(prompt.starts_with(&handoff.id), "{prompt}");
    assert_eq!(delivery, "waiting");
    assert_eq!(
        lines.prompts.borrow().as_slice(),
        [("s1".to_owned(), prompt.clone())]
    );
    desk.act(&lines, &handoff.id, "back", 6).unwrap();
    assert!(!desk.drive(&lines, 6));
    assert_eq!(replies(&lines), 1);

    // Words left before the record of them was kept (the app stopped
    // in between): the same step again finds them there and counts them
    // as sent, leaving nothing more.
    let (_temp, desk) = self::desk();
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    desk.observe(
        &turn("complete", "1. 要超时\n审查出口：返修\n结论：需修改"),
        4,
    );
    let prompt = desk
        .lock()
        .get(&handoff.id)
        .unwrap()
        .prompt_for(StepKind::Back);
    lines
        .prompts
        .borrow_mut()
        .push(("s1".to_owned(), prompt.clone()));
    desk.act(&lines, &handoff.id, "back", 5).unwrap();
    assert!(lines.sent.borrow().iter().all(|s| s.0 == "open"));
    assert_eq!(desk.projection(5)[0]["phase"], "returned");
    assert_eq!(last_back(&desk, 5).0, prompt);
}

/// #257: words back are followed as the plugin has them — waiting,
/// taken, started — and the card's data says which; queued words taken
/// no longer wait in the queue.
#[test]
fn words_back_to_claude_are_followed_until_its_turn_on_them_starts() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    opened(&desk, &lines);
    desk.observe(
        &turn("complete", "1. 少一项\n审查出口：返修\n结论：需修改"),
        4,
    );
    let ended = Fake {
        unreachable: true,
        ..Fake::default()
    };
    assert!(desk.drive(&ended, 5));
    assert_eq!(desk.projection(5)[0]["queuedAt"], 5);
    let (prompt, delivery) = last_back(&desk, 5);
    assert_eq!(delivery, "waiting");
    assert!(!desk.track(&ended, 6), "still waiting");
    left_by(&ended, &prompt, "taken", None);
    assert!(desk.track(&ended, 7));
    assert_eq!(last_back(&desk, 7).1, "taken");
    let shown = desk.projection(7);
    assert!(shown[0]["queuedAt"].is_null(), "no longer queued");
    assert_eq!(shown[0]["phaseAt"], 7, "the wait for changes begins");
    left_by(&ended, &prompt, "started", None);
    assert!(desk.track(&ended, 8));
    assert_eq!(last_back(&desk, 8).1, "started");
    // The plugin's file gone a minute after: it stays started.
    ended.left_by.borrow_mut().clear();
    ended.prompts.borrow_mut().clear();
    assert!(!desk.track(&ended, 70_000));
    assert_eq!(last_back(&desk, 70_000).1, "started");
    assert_eq!(desk.projection(70_000)[0]["auto"], true);
}

/// #257: words the plugin gave up (expired, refused) leave the handoff
/// to the person at once, saying why, not an hour on; sent again by
/// hand, they go under a new id.
#[test]
fn words_back_the_plugin_gave_up_are_left_to_the_person_at_once() {
    let (_temp, desk) = desk();
    let lines = Fake {
        unreachable: true,
        ..Fake::default()
    };
    let handoff = opened(&desk, &Fake::default());
    desk.observe(
        &turn("complete", "1. 少一项\n审查出口：返修\n结论：需修改"),
        4,
    );
    desk.drive(&lines, 5);
    let (prompt, _) = last_back(&desk, 5);
    left_by(&lines, &prompt, "expired", None);
    assert!(desk.track(&lines, 10));
    let shown = desk.projection(10);
    assert_eq!(shown[0]["phase"], "replied", "the answer waits again");
    assert_eq!(shown[0]["auto"], false);
    assert_eq!(shown[0]["halt"], undelivered("expired", None));
    assert!(shown[0]["queuedAt"].is_null());
    assert_eq!(last_back(&desk, 10).1, "expired");
    assert!(!desk.track(&lines, 11), "once");
    desk.act(&lines, &handoff.id, "back", 12).unwrap();
    let queued = lines
        .sent
        .borrow()
        .iter()
        .filter(|s| s.0 == "queue")
        .count();
    assert_eq!(queued, 2, "sent again");
    assert_eq!(
        last_back(&desk, 12),
        (format!("{prompt}-1"), "waiting".into())
    );

    // Refused: the plugin's reason is on the card.
    let (_temp, desk) = self::desk();
    let lines = Fake::default();
    opened(&desk, &lines);
    desk.observe(
        &turn("complete", "1. 少一项\n审查出口：返修\n结论：需修改"),
        4,
    );
    desk.drive(&lines, 5);
    let (prompt, _) = last_back(&desk, 5);
    left_by(&lines, &prompt, "refused", Some("busy"));
    assert!(desk.track(&lines, 6));
    let shown = desk.projection(6);
    assert_eq!(shown[0]["halt"], undelivered("refused", Some("busy")));
    assert_eq!(last_back(&desk, 6).1, "refused");
}
