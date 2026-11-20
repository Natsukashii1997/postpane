//! The auto round trip: back to the doer, on to a pass or a stop, the person
//! pausing it, and what a restart keeps.
use super::*;

#[test]
fn the_auto_round_trip_goes_back_to_claude_and_ends_at_a_pass() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    assert!(!desk.drive(&lines, 3), "nothing before an answer");
    desk.observe(
        &turn("complete", "1. 要超时\n审查出口：返修\n结论：需修改"),
        4,
    );
    assert!(desk.drive(&lines, 5));
    let (kind, to, text) = lines.sent.borrow().last().unwrap().clone();
    assert_eq!((kind.as_str(), to.as_str()), ("reply", "s1"));
    assert!(text.contains("要超时") && text.contains("relay_to_chatgpt"));
    assert_eq!(desk.projection(5)[0]["phase"], "returned");
    assert_eq!(kinds(&desk, 5).last().unwrap(), &("back".to_owned(), true));
    assert!(!desk.drive(&lines, 6), "sent back once");
    assert_eq!(replies(&lines), 1);
    // Claude hands round 2 over itself; ChatGPT passes it.
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
    desk.observe(
        &json!({"type":"turn","phase":"complete","conversation":"c-new","reply":"P2：日志少一行\nP3：命名\n审查出口：通过\n结论：通过","messageId":"m2","prompt":asked()}),
        8,
    );
    assert!(desk.drive(&lines, 9));
    let shown = desk.projection(9);
    assert_eq!(shown[0]["phase"], "ended");
    assert_eq!(shown[0]["status"], "closed");
    assert_eq!(shown[0]["halt"], Value::Null);
    assert_eq!(
        kinds(&desk, 9)[kinds(&desk, 9).len() - 2..],
        [("back".to_owned(), true), ("end".to_owned(), true)]
    );
    // The pass goes back too (#316): the session is told it is
    // the end, with the points that do not block it.
    assert_eq!(replies(&lines), 2, "a pass goes back to Claude");
    let (kind, to, text) = lines.sent.borrow().last().unwrap().clone();
    assert_eq!((kind.as_str(), to.as_str()), ("reply", "s1"));
    assert!(text.contains("审查出口：通过，结论：通过"), "{text}");
    assert!(text.contains("P2：日志少一行") && text.contains("P3：命名"));
    assert!(text.contains("这是终局") && text.contains("驿窗已结束这次接力"));
    assert!(text.contains("不需要再调用 relay_to_chatgpt"));
    assert!(!desk.drive(&lines, 10), "sent back once");
    assert_eq!(replies(&lines), 2);
    let _ = handoff;
}

#[test]
fn the_auto_round_trip_stops_at_the_last_round_or_without_a_verdict() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    desk.observe(&turn("complete", "审查出口：返修\n结论：需修改"), 4);
    desk.drive(&lines, 5);
    desk.start(
        &lines,
        "s1",
        Some("/w"),
        "修登录",
        Some("按意见改完"),
        "第二轮",
        false,
        6,
    )
    .unwrap();
    desk.observe(
        &json!({"type":"turn","phase":"complete","conversation":"c-new","reply":"还差一点\n审查出口：返修\n结论：需修改","messageId":"m2","prompt":asked()}),
        7,
    );
    assert!(desk.drive(&lines, 8));
    let shown = desk.projection(8);
    assert_eq!(shown[0]["status"], "open", "the person decides");
    assert_eq!(shown[0]["auto"], false);
    assert_eq!(shown[0]["halt"], at_limit(2, Sent::Back));
    // The last answer goes back too, saying it is left to the person.
    assert_eq!(replies(&lines), 2);
    let text = last_sent(&lines).2;
    assert!(text.contains("还差一点") && text.contains("到顶"));
    assert!(text.contains("这是终局") && text.contains("交常浩决定"));
    assert!(!desk.drive(&lines, 8), "sent back once");
    // The person's button sends the same words: they went already.
    button_back_changes_nothing(&desk, &lines, &handoff.id, 9);
    // Every round used: turning it back on would do nothing, so it says
    // so instead of taking the click (#194).
    let refused = desk.act(&lines, &handoff.id, "resume", 10);
    assert_eq!(refused.err(), Some(no_rounds_left(2)));
    assert_eq!(desk.projection(10)[0]["auto"], false);

    let (_temp, desk) = self::desk();
    let lines = Fake::default();
    opened(&desk, &lines);
    desk.observe(&turn("complete", "看了，挺好"), 4);
    mend(&desk, &lines, "看了，挺好", 4);
    assert!(desk.drive(&lines, 5));
    assert_eq!(desk.projection(5)[0]["halt"], no_verdict(Sent::Back));
    assert_eq!(desk.projection(5)[0]["auto"], false);
    assert_eq!(replies(&lines), 1);
    let text = last_sent(&lines).2;
    assert!(text.contains("结论：未写") && text.contains("看了，挺好"));
    assert!(text.contains("先不要做") && text.contains("再调用 relay_to_chatgpt 送审"));
    assert!(text.contains("交常浩决定"));
    assert!(!desk.drive(&lines, 6), "sent back once");
    assert_eq!(replies(&lines), 1);
}

/// #316: each end left to the person goes back once, saying what Claude
/// may do meanwhile and what not — never 「按意见处理」 beside 「等常浩」 —
/// and the button afterwards changes nothing.
#[test]
fn an_end_left_to_the_person_goes_back_once_without_mixed_asks() {
    let ended = |desk: &Desk, lines: &Fake, id: &str| {
        assert!(desk.drive(lines, 5));
        let text = last_sent(lines).2;
        assert!(
            text.contains("这是终局") && text.contains("交常浩决定"),
            "{text}"
        );
        assert!(
            text.contains("现在可以做") && text.contains("先不要做"),
            "{text}"
        );
        assert!(
            !text.contains("按意见处理") && !text.contains("请先按意见"),
            "{text}"
        );
        assert!(!desk.drive(lines, 6), "sent back once");
        button_back_changes_nothing(desk, lines, id, 7);
        assert_eq!(replies(lines), 1);
    };
    // An engineering review: no verdict, and a way out that does not
    // go with its verdict.
    for reply in ["看了，挺好", "审查出口：通过\n结论：需修改"] {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        let handoff = opened(&desk, &lines);
        desk.observe(&turn("complete", reply), 4);
        mend(&desk, &lines, reply, 4);
        ended(&desk, &lines, &handoff.id);
    }
    // A 思维评审 whose last two lines do not hold.
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = thinking(&desk, &lines);
    desk.observe(&turn("complete", "意见如上\n审查出口：通过\n结论：通过"), 4);
    mend(&desk, &lines, "意见如上\n审查出口：通过\n结论：通过", 4);
    ended(&desk, &lines, &handoff.id);
    assert!(last_sent(&lines).2.contains("不要记成已定决策"));
}

/// #316: an end whose answer went into the queue of a quiet session
/// says so, not that it went back; no background run takes it up; and
/// once the plugin gives it up, the card says the session never had it,
/// keeping why the handoff ended.
#[test]
fn an_end_queued_for_a_quiet_session_says_whether_it_arrived() {
    let quiet = || Fake {
        reply_fails: std::cell::Cell::new(2),
        ..Fake::default()
    };
    let later = 5 + handoffs::WAKE_AFTER_MS + 1;
    // A pass: it ends, its answer queued.
    let (_temp, desk) = desk();
    let lines = quiet();
    opened(&desk, &lines);
    desk.observe(
        &turn("complete", "P2：补注释\n审查出口：通过\n结论：通过"),
        4,
    );
    assert!(desk.drive(&lines, 5));
    assert_eq!(sent_as(&lines, "queue").len(), 1);
    let shown = desk.projection(5);
    assert_eq!(shown[0]["status"], "closed");
    let last = |desk: &Desk, now| {
        desk.projection(now)[0]["steps"]
            .as_array()
            .unwrap()
            .last()
            .unwrap()
            .clone()
    };
    assert_eq!(last(&desk, 5)["text"], passed_back(Sent::Queued));
    lines.stopped.set(true);
    assert!(!desk.wake_queued(&lines, later), "no background run");
    assert!(sent_as(&lines, "wake").is_empty());
    let (prompt, _) = last_back(&desk, later);
    left_by(&lines, &prompt, "expired", None);
    assert!(desk.track(&lines, later));
    assert_eq!(last(&desk, later)["kind"], "fail");
    assert_eq!(last(&desk, later)["text"], end_undelivered("expired"));
    assert!(!desk.track(&lines, later + 1), "said once");

    // The last round: it stops for the person, its answer queued.
    let (_temp, desk) = self::desk();
    let lines = Fake::default();
    opened(&desk, &lines);
    desk.observe(&turn("complete", "审查出口：返修\n结论：需修改"), 4);
    desk.drive(&lines, 5);
    desk.start(&lines, "s1", Some("/w"), "修登录", None, "第二轮", false, 6)
        .unwrap();
    desk.observe(
        &json!({"type":"turn","phase":"complete","conversation":"c-new","reply":"还差一点\n审查出口：返修\n结论：需修改","messageId":"m2","prompt":asked()}),
        7,
    );
    lines.reply_fails.set(2);
    assert!(desk.drive(&lines, 8));
    assert_eq!(sent_as(&lines, "queue").len(), 1);
    let shown = desk.projection(8);
    assert_eq!(shown[0]["status"], "open");
    assert_eq!(shown[0]["halt"], at_limit(2, Sent::Queued));
    lines.stopped.set(true);
    let later = 8 + handoffs::WAKE_AFTER_MS + 1;
    assert!(!desk.wake_queued(&lines, later), "no background run");
    let (prompt, _) = last_back(&desk, later);
    left_by(&lines, &prompt, "expired", None);
    assert!(desk.track(&lines, later));
    let shown = desk.projection(later);
    assert_eq!(
        shown[0]["halt"],
        at_limit(2, Sent::Queued),
        "why it stopped stays"
    );
    assert_eq!(shown[0]["phase"], "replied", "the answer waits to go back");
    assert_eq!(last(&desk, later)["kind"], "fail");
    assert_eq!(last(&desk, later)["text"], undelivered("expired", None));
}

#[test]
fn the_person_pauses_and_resumes_the_auto_round_trip() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    desk.act(&lines, &handoff.id, "pause", 3).unwrap();
    assert_eq!(desk.projection(3)[0]["halt"], paused());
    desk.observe(&turn("complete", "审查出口：返修\n结论：需修改"), 4);
    // Paused, the answer goes back all the same (#410), saying the
    // person decides; the round trip stays off.
    desk.drive(&lines, 5);
    assert_eq!(replies(&lines), 1);
    let shown = desk.projection(5);
    assert_eq!(shown[0]["phase"], "returned");
    assert_eq!(shown[0]["auto"], false);
    assert_eq!(shown[0]["halt"], paused());
    assert!(lines
        .sent
        .borrow()
        .last()
        .unwrap()
        .2
        .contains("下一步交常浩决定"));
    // Turned back on, nothing goes twice.
    desk.act(&lines, &handoff.id, "resume", 6).unwrap();
    assert_eq!(replies(&lines), 1);
    assert_eq!(desk.projection(6)[0]["auto"], true);
    assert!(
        desk.act(&lines, &handoff.id, "resume", 7).is_err(),
        "already on"
    );
}

#[test]
fn a_review_that_passed_with_nothing_driving_it_ends_when_the_app_starts() {
    let temp = tempfile::tempdir().unwrap();
    let data = temp.path().join("data");
    let mut book = handoffs::Book::default();
    let handoff = book.begin("s1", None, "修登录", None, "请审核", 1);
    book.opened(&handoff.id, "c1", 2);
    assert!(book.stop(&handoff.id, "停", true, 3));
    book.replied("c1", "都改好了\n审查出口：通过\n结论：通过", Some("m1"), 4);
    handoffs::save(&data, &book).unwrap();
    let desk = Desk::new(Some(data));
    let shown = desk.projection(5);
    assert_eq!(shown[0]["status"], "closed");
    assert_eq!(shown[0]["phase"], "ended");
    // A pass as any other: the person is told, and its chain starts over (#411 L2 P2-03).
    assert_eq!(shown[0]["notice"], "passed");
}

#[test]
fn a_restart_keeps_the_auto_round_trip_on_and_a_long_wait_stops_it() {
    let temp = tempfile::tempdir().unwrap();
    let data = temp.path().join("data");
    let lines = Fake::default();
    let desk = Desk::new(Some(data.clone()));
    opened(&desk, &lines);
    // An answer that came in just before the restart, not yet sent back.
    desk.observe(
        &turn("complete", "1. 要改\n审查出口：返修\n结论：需修改"),
        3,
    );
    drop(desk);
    let desk = Desk::new(Some(data));
    let shown = desk.projection(4);
    assert_eq!(shown[0]["auto"], true);
    assert!(shown[0]["halt"].is_null());
    // It goes back to Claude once, and only once.
    assert!(desk.catch_up(&lines, 5));
    assert_eq!(replies(&lines), 1);
    assert!(!desk.catch_up(&lines, 6));
    assert_eq!(replies(&lines), 1);
    assert_eq!(desk.projection(6)[0]["phase"], "returned");

    let (_temp, desk) = self::desk();
    opened(&desk, &lines);
    let late = 2 + handoffs::REPLY_WAIT_MS + 1;
    let shown = desk.projection(late);
    assert_eq!(shown[0]["halt"], no_answer());
}

#[test]
fn words_back_to_claude_wait_for_an_answer_and_a_way_there() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    assert!(
        desk.act(&lines, &handoff.id, "back", 3).is_err(),
        "no answer yet"
    );
    // A pass goes back as the auto round trip sends it (P1-09); other
    // answers wait for a way there.
    desk.observe(
        &turn("complete", "1. 还差\n审查出口：返修\n结论：需修改"),
        4,
    );
    let unreachable = Fake {
        unreachable: true,
        ..Fake::default()
    };
    // Nor a queue to wait in (#223).
    unreachable.leave_fails.set(true);
    assert_eq!(
        desk.act(&unreachable, &handoff.id, "back", 5).unwrap_err(),
        "这个会话还没加载 Agent HUD 插件"
    );
    assert!(unreachable.sent.borrow().is_empty());
    assert_eq!(desk.projection(5)[0]["phase"], "replied");
}

// #223: what a restart writes is in the language Settings name, though
// Core has yet to follow it then.
#[test]
fn what_a_restart_writes_follows_the_language_setting() {
    let cases = [
        (
            "zh-CN",
            "驿窗重启时 ChatGPT 新会话还在打开",
            "结论：通过，自动结束接力",
        ),
        (
            "en",
            "PostPane restarted while the ChatGPT conversation was opening",
            "Passed; the handoff ended",
        ),
    ];
    for (language, cut_off, ended) in cases {
        let temp = tempfile::tempdir().unwrap();
        let data = temp.path().join("data");
        std::fs::create_dir_all(&data).unwrap();
        std::fs::write(
            data.join("settings.json"),
            json!({"settings":{"language":language},"providers":{}}).to_string(),
        )
        .unwrap();
        let mut book = handoffs::Book::default();
        let on = book.begin("s1", None, "修登录", None, "请审核", 1).id;
        book.opened(&on, "c1", 2);
        let opening = book.begin("s2", None, "别的", None, "请审核", 1).id;
        let passed = book.begin("s3", None, "第三个", None, "请审核", 1).id;
        book.opened(&passed, "c3", 2);
        book.stop(&passed, "停", true, 3);
        book.replied("c3", "审查出口：通过\n结论：通过", Some("m1"), 4);
        handoffs::save(&data, &book).unwrap();
        let desk = Desk::new(Some(data));
        let book = desk.lock();
        assert!(book.get(&on).unwrap().auto, "a restart keeps it on");
        assert_eq!(book.get(&opening).unwrap().error.as_deref(), Some(cut_off));
        assert_eq!(
            book.get(&passed)
                .unwrap()
                .steps
                .last()
                .unwrap()
                .text
                .as_deref(),
            Some(ended)
        );
    }
}

/// #316: a pass goes back even with the auto round trip off (it
/// ends the handoff all the same), and into a Codex thread for Codex.
#[test]
fn a_pass_goes_back_with_the_auto_round_trip_off_and_to_codex() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    desk.act(&lines, &handoff.id, "pause", 3).unwrap();
    desk.observe(
        &turn("complete", "P2：补注释\n审查出口：通过\n结论：通过"),
        4,
    );
    assert!(desk.drive(&lines, 5));
    assert_eq!(desk.projection(5)[0]["status"], "closed");
    assert_eq!(replies(&lines), 1);
    assert!(last_sent(&lines).2.contains("P2：补注释"));

    let (_temp, desk) = self::desk();
    let lines = Fake::default();
    codex_opened(&desk, &lines, Some("L2"));
    desk.observe(&turn("complete", "审查出口：通过\n结论：通过"), 4);
    assert!(desk.drive(&lines, 5));
    let (kind, _, text) = last_sent(&lines);
    assert_eq!(kind, "codex");
    assert!(text.contains("这是终局"));
    assert_eq!(desk.projection(5)[0]["status"], "closed");
}

/// A pass that cannot reach Claude still ends, saying so, and is not
/// tried again at the next turn.
#[test]
fn a_pass_that_cannot_go_back_ends_all_the_same() {
    let (_temp, desk) = desk();
    let lines = Fake {
        unreachable: true,
        leave_fails: std::cell::Cell::new(true),
        ..Fake::default()
    };
    opened(&desk, &lines);
    desk.observe(&turn("complete", "审查出口：通过\n结论：通过"), 4);
    assert!(desk.drive(&lines, 5));
    let shown = desk.projection(5);
    assert_eq!(shown[0]["status"], "closed");
    let ended = shown[0]["steps"]
        .as_array()
        .unwrap()
        .last()
        .unwrap()
        .clone();
    assert_eq!(ended["text"], passed_back(Sent::Failed));
    assert!(!desk.drive(&lines, 6), "not tried again");
}

/// #258: the person spoke up in the Claude session since words went
/// back, and Claude handed over again: the auto rounds count from one,
/// so the answer goes back by itself. Words of PostPane's own alone
/// stop at the last round as before.
#[test]
fn the_rounds_count_from_one_once_the_person_spoke_up_in_claude() {
    let round_two = |opener: fn(&str) -> Opener| {
        let (temp, desk) = self::desk();
        let lines = Fake::default();
        opened(&desk, &lines);
        desk.observe(
            &turn("complete", "1. 要超时\n审查出口：返修\n结论：需修改"),
            4,
        );
        desk.drive(&lines, 5);
        let back = lines.sent.borrow().last().unwrap().2.clone();
        *lines.opener.borrow_mut() = Some((opener(&back), 6));
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
        desk.observe(
            &json!({"type":"turn","phase":"complete","conversation":"c-new","reply":"1. 还差一点\n审查出口：返修\n结论：需修改","messageId":"m2","prompt":asked()}),
            8,
        );
        desk.drive(&lines, 9);
        (temp, desk, lines)
    };
    // PostPane's words began Claude's turn: the last round, it stops.
    let (_temp, desk, lines) = round_two(|back| Opener::Plugin(back.to_owned()));
    let shown = desk.projection(9);
    assert_eq!(shown[0]["halt"], at_limit(2, Sent::Back));
    assert!(shown[0]["roundsFrom"].is_null());
    // It goes back as the end, left to the person (#316).
    assert_eq!(replies(&lines), 2);
    assert!(last_sent(&lines).2.contains("到顶"));
    // The person's own words began it: round one again, back it goes.
    let (_temp, desk, lines) = round_two(|_| Opener::Person);
    let shown = desk.projection(9);
    assert!(shown[0]["halt"].is_null(), "{}", shown[0]["halt"]);
    assert_eq!(shown[0]["phase"], "returned");
    assert_eq!(shown[0]["roundsFrom"], 4);
    assert_eq!(replies(&lines), 2);
    // Not told who began it: as before, it stops.
    let (_temp, desk, _lines) = {
        let (temp, desk) = self::desk();
        let lines = Fake::default();
        opened(&desk, &lines);
        desk.observe(
            &turn("complete", "1. 要超时\n审查出口：返修\n结论：需修改"),
            4,
        );
        desk.drive(&lines, 5);
        desk.start(&lines, "s1", Some("/w"), "修登录", None, "第二轮", false, 7)
            .unwrap();
        desk.observe(
            &json!({"type":"turn","phase":"complete","conversation":"c-new","reply":"审查出口：返修\n结论：需修改","messageId":"m2","prompt":asked()}),
            8,
        );
        desk.drive(&lines, 9);
        (temp, desk, lines)
    };
    assert_eq!(desk.projection(9)[0]["halt"], at_limit(2, Sent::Back));
}
