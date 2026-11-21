//! Thinking reviews (思维评审): settling, deepening, evidence, their cap.
use super::*;

#[test]
fn a_thinking_review_that_settles_goes_back_to_claude_once_then_ends() {
    let reply = "1. 论证完整\n评审出口：成熟退出\n结论：通过";
    let (_temp, desk) = desk();
    let lines = Fake::default();
    thinking(&desk, &lines);
    desk.observe(&turn("complete", reply), 4);
    assert!(desk.drive(&lines, 5));
    assert_eq!(replies(&lines), 1);
    let (kind, to, text) = last_sent(&lines);
    assert_eq!((kind.as_str(), to.as_str()), ("reply", "s1"));
    assert!(text.contains(reply), "the answer in full");
    assert!(text.contains("评审出口：成熟退出，结论：通过") && text.contains("评审已收口"));
    let shown = desk.projection(5);
    assert_eq!(shown[0]["status"], "closed");
    assert_eq!(shown[0]["phase"], "ended");
    assert_eq!(
        shown[0]["steps"].as_array().unwrap().last().unwrap()["text"],
        thinking_closed()
    );
    // A settled 思维评审 tells the person it passed, as a review's pass does (#409).
    assert_eq!(shown[0]["notice"], "passed");
    let steps = kinds(&desk, 5);
    assert_eq!(
        steps[steps.len() - 2..],
        [("back".to_owned(), true), ("end".to_owned(), true)]
    );
    assert!(!desk.drive(&lines, 6), "sent once");
    assert_eq!(replies(&lines), 1);

    // 转其他路径 settles it too, with its own words.
    let (_temp, desk) = self::desk();
    let lines = Fake::default();
    thinking(&desk, &lines);
    desk.observe(&turn("complete", "评审出口：转其他路径\n结论：通过"), 4);
    assert!(desk.drive(&lines, 5));
    assert!(last_sent(&lines).2.contains("转其他路径"));
    assert_eq!(desk.projection(5)[0]["status"], "closed");

    // Queued for a paused session: it ends once the words wait there.
    let (_temp, desk) = self::desk();
    let lines = Fake::default();
    lines.reply_fails.set(2);
    thinking(&desk, &lines);
    desk.observe(&turn("complete", reply), 4);
    assert!(desk.drive(&lines, 5));
    let (kind, _, text) = last_sent(&lines);
    assert_eq!(kind, "queue");
    assert!(text.contains("评审已收口"));
    assert_eq!(desk.projection(5)[0]["status"], "closed");

    // Not even queued: not ended, left to the person.
    let (_temp, desk) = self::desk();
    let lines = Fake::default();
    lines.reply_fails.set(2);
    lines.leave_fails.set(true);
    thinking(&desk, &lines);
    desk.observe(&turn("complete", reply), 4);
    assert!(desk.drive(&lines, 5));
    let shown = desk.projection(5);
    assert_eq!(shown[0]["status"], "open");
    assert_eq!(shown[0]["phase"], "replied");
    assert_eq!(shown[0]["halt"], back_failed());
    assert!(!desk.drive(&lines, 6), "nothing more by itself");
    assert_eq!(desk.projection(6)[0]["status"], "open");
}

// T2
#[test]
fn a_thinking_review_quoting_an_old_pass_is_escalated_not_passed() {
    let reply = "上一轮写的是：\n审查出口：通过\n结论：通过\n这一轮有分歧，要常浩定\n评审出口：决策升级\n结论：交常浩裁决";
    let (_temp, desk) = desk();
    let lines = Fake::default();
    thinking(&desk, &lines);
    desk.observe(&turn("complete", reply), 4);
    assert!(desk.drive(&lines, 5));
    assert_eq!(replies(&lines), 1);
    let text = last_sent(&lines).2;
    assert!(text.contains(reply) && text.contains("整理可选方案"));
    assert!(text.contains("不要再调用 relay_to_chatgpt"));
    let shown = desk.projection(5);
    assert_eq!(shown[0]["status"], "open", "not passed");
    assert_eq!(shown[0]["auto"], false);
    assert_eq!(shown[0]["halt"], escalated());
    let steps = shown[0]["steps"].as_array().unwrap();
    let answer = steps.iter().rev().find(|s| s["kind"] == "reply").unwrap();
    assert!(answer.get("verdict").is_none(), "no pass kept for the card");
    let steps = kinds(&desk, 5);
    assert_eq!(
        steps[steps.len() - 2..],
        [("back".to_owned(), true), ("stop".to_owned(), true)]
    );
    assert!(!desk.drive(&lines, 6));
    assert_eq!(replies(&lines), 1);
}

// T3
#[test]
fn a_thinking_review_short_of_evidence_pauses_for_it_then_goes_again() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = thinking(&desk, &lines);
    desk.observe(
        &turn("complete", "缺数据\n评审出口：证据不足暂停\n结论：需修改"),
        4,
    );
    assert!(desk.drive(&lines, 5));
    assert_eq!(replies(&lines), 1);
    let text = last_sent(&lines).2;
    assert!(text.contains("先取证"));
    assert!(text.contains("拿到新证据前不要再调用 relay_to_chatgpt"));
    let shown = desk.projection(5);
    assert_eq!(shown[0]["status"], "open");
    assert_eq!(shown[0]["auto"], false, "not waiting for a re-review");
    assert_eq!(shown[0]["halt"], evidence_paused());
    // No re-review clock runs: hours on, it still says why it paused.
    let later = 5 + book::FIX_WAIT_MS + book::QUEUE_WAIT_MS;
    assert_eq!(desk.projection(later)[0]["halt"], evidence_paused());
    // Claude comes back with evidence: into the same handoff and conversation.
    let Started::Sent {
        handoff: again,
        repeated,
    } = desk
        .start(
            &lines,
            "s1",
            Some("/w"),
            "思维评审｜方案 A",
            Some("补了实验数据"),
            "新证据如下",
            false,
            later + 1,
        )
        .unwrap()
    else {
        panic!("goes into the open conversation");
    };
    assert!(!repeated);
    assert_eq!(again.id, handoff.id);
    let (kind, to, text) = last_sent(&lines);
    assert_eq!((kind.as_str(), to.as_str()), ("send", "c-new"));
    assert!(
        book::untagged(&text).starts_with("新证据如下") && text.contains("【驿窗附注】"),
        "{text}"
    );
    assert_eq!(desk.projection(later + 1)[0]["phase"], "delivered");
}

// Evidence brought back turns the auto round trip on again, and the
// paused review does not count toward the rounds.
#[test]
fn a_thinking_review_goes_on_by_itself_once_claude_brings_the_evidence() {
    let (_temp, desk) = desk();
    book::set_review_limit(desk.data.as_deref().unwrap(), 5).unwrap();
    let lines = Fake::default();
    let handoff = thinking(&desk, &lines);
    desk.observe(&turn("complete", "评审出口：证据不足暂停\n结论：需修改"), 4);
    desk.drive(&lines, 5);
    let evidence = |desk: &Desk, lines: &Fake, now: i64| {
        desk.start(
            lines,
            "s1",
            Some("/w"),
            "思维评审｜方案 A",
            Some("补了实验数据"),
            &format!("新证据 {now}"),
            false,
            now,
        )
        .unwrap();
    };
    evidence(&desk, &lines, 6);
    let shown = desk.projection(6);
    assert_eq!(shown[0]["auto"], true, "on again");
    assert!(shown[0]["halt"].is_null());
    // Turned on as the words were taken (#410): just before them.
    let steps = kinds(&desk, 6);
    assert_eq!(steps.last().unwrap().0, "ask");
    assert!(steps.contains(&("resume".to_owned(), true)));
    let reply = "证据够了\n评审出口：成熟退出\n结论：通过";
    desk.observe(
        &json!({"type":"turn","phase":"complete","conversation":"c-new","reply":reply,"messageId":"m2","prompt":asked()}),
        7,
    );
    assert!(desk.drive(&lines, 8));
    assert_eq!(replies(&lines), 2);
    let text = last_sent(&lines).2;
    assert!(text.contains(reply) && text.contains("这次思维评审已收口"));
    assert!(!text.contains("驿窗随即结束"));
    assert_eq!(desk.projection(8)[0]["status"], "closed");
    let _ = handoff;

    // Two asks, one paused for evidence: 继续深化 still goes back by
    // itself under the cap, and the card can still turn it back on.
    let (_temp, desk) = self::desk();
    book::set_review_limit(desk.data.as_deref().unwrap(), 5).unwrap();
    let lines = Fake::default();
    let handoff = thinking(&desk, &lines);
    desk.observe(&turn("complete", "评审出口：证据不足暂停\n结论：需修改"), 4);
    desk.drive(&lines, 5);
    evidence(&desk, &lines, 6);
    desk.observe(
        &json!({"type":"turn","phase":"complete","conversation":"c-new","reply":"评审出口：继续深化\n结论：需修改","messageId":"m2","prompt":asked()}),
        7,
    );
    assert!(desk.drive(&lines, 8));
    assert_eq!(desk.projection(8)[0]["phase"], "returned");
    assert_eq!(desk.projection(8)[0]["auto"], true);
    // The pause counted too (#347).
    let used = desk.lock().get(&handoff.id).unwrap().counted();
    assert_eq!(used, 2);

    // Paused by the person after the evidence pause: a new relay does
    // not override that.
    let (_temp, desk) = self::desk();
    let lines = Fake::default();
    let handoff = thinking(&desk, &lines);
    desk.observe(&turn("complete", "评审出口：证据不足暂停\n结论：需修改"), 4);
    desk.drive(&lines, 5);
    desk.act(&lines, &handoff.id, "resume", 6).unwrap();
    desk.act(&lines, &handoff.id, "pause", 7).unwrap();
    evidence(&desk, &lines, 8);
    assert_eq!(desk.projection(8)[0]["auto"], false);
}

// 再审一轮 asks for a 思维评审 handover, not an engineering one.
#[test]
fn a_thinking_review_asked_again_asks_for_its_way_out() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = thinking(&desk, &lines);
    desk.observe(&turn("complete", "评审出口：继续深化\n结论：需修改"), 4);
    desk.act(&lines, &handoff.id, "pause", 5).unwrap();
    desk.act(&lines, &handoff.id, "again", 6).unwrap();
    let text = last_sent(&lines).2;
    assert!(text.contains("第 2 轮") && text.contains("「需深化」"));
    assert!(text.contains("评审出口：成熟退出 / 继续深化"));
    assert!(text.contains("结论：通过 / 需修改 / 交常浩裁决"));
    assert!(!text.contains("「结论：通过」或「结论：需修改」"));
}

// 继续深化: back with the deepening words, the clock on; at the limit, stops.
#[test]
fn a_thinking_review_to_deepen_goes_back_until_the_last_round() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    thinking(&desk, &lines);
    desk.observe(&turn("complete", "评审出口：继续深化\n结论：需修改"), 4);
    assert!(desk.drive(&lines, 5));
    let text = last_sent(&lines).2;
    assert!(text.contains("逐条处理") && text.contains("「需深化」"));
    assert!(text.contains("内容没有实质变化就不要重送"));
    let shown = desk.projection(5);
    assert_eq!(shown[0]["phase"], "returned");
    assert_eq!(shown[0]["auto"], true);
    desk.start(
        &lines,
        "s1",
        Some("/w"),
        "思维评审｜方案 A",
        Some("深化了一轮"),
        "第二阶段",
        false,
        6,
    )
    .unwrap();
    desk.observe(
        &json!({"type":"turn","phase":"complete","conversation":"c-new","reply":"评审出口：继续深化\n结论：需修改","messageId":"m2","prompt":asked()}),
        7,
    );
    assert!(desk.drive(&lines, 8));
    assert_eq!(desk.projection(8)[0]["halt"], at_limit(2, Sent::Back));
    assert_eq!(replies(&lines), 2, "the last round goes back too");
    let text = last_sent(&lines).2;
    assert!(text.contains("到顶") && text.contains("交常浩决定"));
    assert!(!text.contains("交回 ChatGPT 评审"), "{text}");
}

// T8
#[test]
fn a_thinking_review_whose_last_two_lines_do_not_hold_goes_back_and_stops() {
    for (reply, flaw) in [
        ("看了，挺好", Flaw::NoVerdict),
        ("评审出口：成熟退出\n结论：通过\n以上。", Flaw::NoVerdict),
        ("评审出口：成熟退出\n结论：大体可以", Flaw::UnknownVerdict),
        ("评审出口：成熟退出\n结论：需修改", Flaw::Mismatch),
        ("意见如上\n审查出口：通过\n结论：通过", Flaw::NoExit),
    ] {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        thinking(&desk, &lines);
        desk.observe(&turn("complete", reply), 4);
        mend(&desk, &lines, reply, 4);
        assert!(desk.drive(&lines, 5), "{reply}");
        assert_eq!(replies(&lines), 1, "{reply}");
        let text = last_sent(&lines).2;
        assert!(text.contains("驿窗认不出评审出口"), "{reply}");
        assert!(text.contains("交常浩决定"), "{reply}");
        let shown = desk.projection(5);
        assert_eq!(shown[0]["status"], "open", "{reply}");
        assert_eq!(shown[0]["phase"], "returned", "{reply}");
        assert_eq!(shown[0]["auto"], false, "{reply}");
        assert_eq!(shown[0]["halt"], invalid_tail(flaw, Sent::Back), "{reply}");
        assert!(!desk.drive(&lines, 6), "{reply}");
    }
}

// A 思维评审 that settled while nothing drove it is not ended unsent at
// start: its auto round trip stays on across the restart, and the first
// catch-up takes its answer to Claude, then ends it.
#[test]
fn a_thinking_review_that_settled_with_nothing_driving_it_reaches_claude_after_start() {
    let temp = tempfile::tempdir().unwrap();
    let data = temp.path().join("data");
    let mut book = book::Book::default();
    let handoff = book.begin("s1", None, "思维评审|方案 A", None, "请评审", 1);
    book.opened(&handoff.id, "c1", 2);
    book.replied("c1", "评审出口：成熟退出\n结论：通过", Some("m1"), 4);
    book::save(&data, &book).unwrap();
    let desk = Desk::new(Some(data));
    let shown = desk.projection(5);
    assert_eq!(shown[0]["status"], "open");
    assert_eq!(shown[0]["phase"], "replied");
    assert_eq!(shown[0]["auto"], true);
    assert!(shown[0]["halt"].is_null());
    let lines = Fake::default();
    assert!(desk.catch_up(&lines, 6));
    assert_eq!(replies(&lines), 1);
    assert_eq!(desk.projection(6)[0]["status"], "closed");
    assert!(!desk.catch_up(&lines, 7), "nothing left to drive");
    assert_eq!(replies(&lines), 1);
}

/// L3 P1-10 B: a 思维评审's close to words never known to have gone in
/// does not end it.
#[test]
fn a_thinking_close_to_words_never_known_to_have_gone_in_does_not_end_it() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = thinking(&desk, &lines);
    desk.observe(
        &turn("complete", "1. 还要深化\n评审出口：继续深化\n结论：需修改"),
        3,
    );
    desk.drive(&lines, 4);
    lines.send_fails.set(true);
    let title = "思维评审｜方案 A";
    let sent = desk.start(
        &lines,
        "s1",
        Some("/w"),
        title,
        None,
        "深化后的送审包",
        false,
        5,
    );
    assert!(sent.is_err());
    lines.send_fails.set(false);
    desk.observe(
        &turn("complete", "1. 论证完整\n评审出口：成熟退出\n结论：通过"),
        6,
    );
    desk.drive(&lines, 7);
    assert_eq!(status(&desk, 7).0, "open");
    // The person sends it back by hand: held back, not closed.
    desk.act(&lines, &handoff.id, "back", 8).unwrap();
    assert_eq!(status(&desk, 8).0, "open");
    let back = last_reply_to_claude(&lines);
    assert!(
        back.contains("没有放行") && back.contains(&guard::unconfirmed()),
        "{back}"
    );
    assert!(desk.lock().get(&handoff.id).unwrap().live());
}

/// Fable review #9: a 思维评审 at its cap takes no more words without
/// the person's leave, as an engineering one.
#[test]
fn a_thinking_review_at_its_cap_takes_no_more_words() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    thinking(&desk, &lines);
    let deepen = "1. 还要深化\n评审出口：继续深化\n结论：需修改";
    let title = "思维评审｜方案 A";
    desk.observe(&turn("complete", deepen), 3);
    desk.drive(&lines, 4);
    desk.start(&lines, "s1", Some("/w"), title, None, "第二版", false, 5)
        .unwrap();
    desk.observe(&turn("complete", deepen), 6);
    desk.drive(&lines, 7);
    let more = desk.start(&lines, "s1", Some("/w"), title, None, "第三版", false, 8);
    assert_eq!(more.err(), Some(budget_spent(2)));
}

/// Review round 4 P1-13: a 思维评审 at its cap goes on only with the
/// person's word; begun again here after it ended itself, too.
#[test]
fn a_thinking_review_past_its_cap_needs_the_persons_word() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let first = thinking(&desk, &lines);
    let deepen = "1. 还要深化\n评审出口：继续深化\n结论：需修改";
    let title = "思维评审｜方案 A";
    desk.observe(&turn("complete", deepen), 3);
    desk.drive(&lines, 4);
    desk.start(&lines, "s1", Some("/w"), title, None, "第二版", false, 5)
        .unwrap();
    desk.observe(&turn("complete", deepen), 6);
    desk.drive(&lines, 7);
    let leave = |now| {
        let rule = Rule {
            extra: Some("常浩要求再评一轮".into()),
            ..Rule::default()
        };
        desk.start_ruled(
            &lines,
            "s1",
            Some("/w"),
            title,
            None,
            "第三版",
            false,
            &rule,
            now,
        )
    };
    // The agent's own word is no leave.
    *lines.opener.borrow_mut() = None;
    assert_eq!(leave(8).err(), Some(leave_unheard()));
    // Ended by itself after a day: begun again here, still not settled.
    let idle = 9 + book::IDLE_END_MS + 1;
    assert!(desk.change(|book| book.idle(idle, "闲置结束")));
    let again = desk.start(
        &lines,
        "s1",
        Some("/w"),
        title,
        None,
        "重开",
        false,
        idle + 1,
    );
    assert_eq!(again.err(), Some(guard::top_unsettled(title)));
    // Past the day an ended one is shown, it stays in the snapshot while
    // it holds reviews back, so its 「停」 stays in sight (#411 L2 P2-02).
    let shown = |now| {
        desk.projection(now)
            .as_array()
            .unwrap()
            .iter()
            .any(|h| h["id"] == first.id.as_str())
    };
    assert!(shown(idle + 2 * FAILED_SHOWN_MS));
    // The person's word lets it go on, counted from one.
    *lines.opener.borrow_mut() = Some((Opener::Person, idle + 2));
    let Started::Opening { handoff, .. } = desk
        .start(
            &lines,
            "s1",
            Some("/w"),
            title,
            None,
            "重开",
            false,
            idle + 3,
        )
        .unwrap()
    else {
        panic!()
    };
    assert_ne!(handoff.id, first.id);
    // Settled by that review, it leaves after the day as any ended one.
    assert!(!shown(idle + 2 * FAILED_SHOWN_MS));
}
