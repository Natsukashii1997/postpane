//! Opening a review and binding its conversation: the first brief, turns
//! that come before the conversation is bound, retries, ending while words are
//! on their way.
use super::*;

#[test]
fn the_first_brief_opens_a_review_and_the_next_goes_into_it() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    desk.set_project("https://chatgpt.com/g/g-p-1-review/project")
        .unwrap();
    let Started::Opening { handoff, project } = desk
        .start(
            &lines,
            "s1",
            Some("/w"),
            "修登录",
            None,
            "改动如下",
            false,
            1,
        )
        .unwrap()
    else {
        panic!("a first brief opens a conversation");
    };
    assert_eq!(
        project.as_deref(),
        Some("https://chatgpt.com/g/g-p-1-review/project")
    );
    // While it opens, another brief waits.
    assert!(desk
        .start(&lines, "s1", Some("/w"), "修登录", None, "再看看", false, 2)
        .is_err());
    assert_eq!(
        desk.open(&lines, &handoff.id, "改动如下", project.as_deref(), || 3)
            .unwrap(),
        "c-new"
    );
    // Opened under the handoff's title and asked as the handoff.
    assert_eq!(
        lines.sent.borrow()[0].1,
        format!(
            "https://chatgpt.com/g/g-p-1-review/project|修登录|{}~0",
            handoff.id
        )
    );
    // Answered: the next words may go (while it waits, other words do
    // not, L3 P1-10).
    desk.observe(
        &turn("complete", "1. 还差\n审查出口：返修\n结论：需修改"),
        3,
    );
    let Started::Sent {
        handoff: sent,
        repeated,
    } = desk
        .start(
            &lines,
            "s1",
            Some("/w"),
            "修登录",
            Some("按意见改完"),
            "第二轮",
            false,
            4,
        )
        .unwrap()
    else {
        panic!("the next brief goes into the same conversation");
    };
    assert!(!repeated);
    assert_eq!(sent.id, handoff.id);
    assert_eq!(sent.reviews(), 2);
    // Its words, with PostPane's note of the round (#347).
    let last = lines.sent.borrow().last().unwrap().clone();
    assert_eq!((last.0.as_str(), last.1.as_str()), ("send", "c-new"));
    assert!(
        book::untagged(&last.2).starts_with("第二轮\n\n---\n【驿窗附注】")
            && last.2.starts_with("【驿窗送审 "),
        "{}",
        last.2
    );
    // The same words again are not sent twice.
    let Started::Sent { repeated, .. } = desk
        .start(&lines, "s1", Some("/w"), "修登录", None, "第二轮", false, 5)
        .unwrap()
    else {
        panic!()
    };
    assert!(repeated);
    assert_eq!(lines.sent.borrow().len(), 2);
    // Words already on their way: a second sending side by side waits.
    let held = desk.claim(&handoff.id).unwrap();
    assert!(desk
        .start(&lines, "s1", Some("/w"), "修登录", None, "第三轮", false, 5)
        .is_err());
    assert_eq!(lines.sent.borrow().len(), 2, "nothing more sent");
    drop(held);
    let shown = desk.projection(5);
    assert_eq!(shown[0]["status"], "open");
    assert_eq!(shown[0]["phase"], "delivered");
    assert_eq!(shown[0]["chatgptConversation"], "c-new");
    assert_eq!(shown[0]["claudeSession"], "s1");
    assert!(shown[0].get("brief").is_none());
    // A new review asked for opens another and closes this one.
    let Started::Opening { handoff: fresh, .. } = desk
        .start(&lines, "s1", None, "修登录", None, "重新审", true, 6)
        .unwrap()
    else {
        panic!("a fresh start opens a conversation");
    };
    assert_ne!(fresh.id, handoff.id);
    let shown = desk.projection(7);
    assert_eq!(shown.as_array().unwrap().len(), 1);
    assert_eq!(shown[0]["id"], fresh.id.as_str());
}

#[test]
fn chatgpt_starting_and_answering_moves_the_handoff_on() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    assert!(desk.observe(&turn("start", ""), 3));
    assert_eq!(desk.projection(3)[0]["phase"], "working");
    let reply = "1. 会话认不准时不该猜\n2. opening 要超时\n审查出口：返修\n结论：需修改";
    assert!(desk.observe(&turn("complete", reply), 4));
    assert!(
        !desk.observe(&turn("complete", reply), 4),
        "a review answered is not answered again"
    );
    let shown = desk.projection(4);
    assert_eq!(shown[0]["phase"], "replied");
    let last = shown[0]["steps"]
        .as_array()
        .unwrap()
        .last()
        .unwrap()
        .clone();
    assert_eq!(last["kind"], "reply");
    assert_eq!(last["verdict"], "revise");
    assert_eq!(
        last["points"],
        json!(["会话认不准时不该猜", "opening 要超时"])
    );
    // Another conversation's turns change nothing.
    assert!(!desk.observe(
        &json!({"type":"turn","phase":"start","conversation":"c-other"}),
        5
    ));
    // 转回 Claude: the answer in full, once.
    desk.act(&lines, &handoff.id, "back", 6).unwrap();
    let (kind, to, text) = lines.sent.borrow().last().unwrap().clone();
    assert_eq!((kind.as_str(), to.as_str()), ("reply", "s1"));
    assert!(
        text.contains(reply)
            && text.contains("审查出口：返修\n结论：需修改")
            && text.contains("relay_to_chatgpt")
    );
    desk.act(&lines, &handoff.id, "back", 7).unwrap();
    assert_eq!(lines.sent.borrow().len(), 2, "not sent twice");
    assert_eq!(desk.projection(7)[0]["phase"], "returned");
    // 再审一轮 asks Claude to hand over round 2.
    desk.act(&lines, &handoff.id, "again", 8).unwrap();
    assert!(lines.sent.borrow().last().unwrap().2.contains("第 2 轮"));
    // 结束接力.
    desk.act(&lines, &handoff.id, "end", 9).unwrap();
    let shown = desk.projection(9);
    assert_eq!(shown[0]["phase"], "ended");
    assert!(desk.act(&lines, &handoff.id, "back", 10).is_err());
    assert!(desk.act(&lines, &handoff.id, "nope", 10).is_err());
}

#[test]
fn chatgpt_starting_before_the_conversation_is_bound_still_counts() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let Started::Opening { handoff, .. } = desk
        .start(&lines, "s1", None, "t", None, "brief", false, 1)
        .unwrap()
    else {
        panic!()
    };
    // The first words start a turn before `opened` answers.
    assert!(!desk.observe(&turn("start", ""), 2));
    desk.open(&lines, &handoff.id, "brief", None, || 3).unwrap();
    let shown = desk.projection(4);
    assert_eq!(shown[0]["phase"], "working");
    assert_eq!(shown[0]["phaseAt"], 2);
}

#[test]
fn a_review_that_cannot_open_says_why_and_can_be_retried() {
    let (_temp, desk) = desk();
    let offline = Fake {
        offline: true,
        ..Fake::default()
    };
    assert!(desk
        .start(&offline, "s1", None, "t", None, "brief", false, 1)
        .unwrap_err()
        .contains("ChatGPT"));
    assert!(desk
        .start(&offline, "s1", None, "t", None, " ", false, 1)
        .is_err());
    let long = "改".repeat(TEXT_LIMIT / 3 + 1);
    assert!(desk
        .start(&Fake::default(), "s1", None, "t", None, &long, false, 1)
        .unwrap_err()
        .contains("768"));
    assert!(desk
        .start(&offline, "../x", None, "t", None, "b", false, 1)
        .is_err());
    let failing = Fake {
        open_fails: true,
        ..Fake::default()
    };
    let Started::Opening { handoff, .. } = desk
        .start(&failing, "s1", None, "", None, "brief", false, 1)
        .unwrap()
    else {
        panic!()
    };
    assert!(!handoff.title.is_empty(), "an untitled review is named");
    assert!(desk
        .open(&failing, &handoff.id, "brief", None, || 2)
        .is_err());
    let shown = desk.projection(3);
    assert_eq!(shown[0]["status"], "failed");
    assert_eq!(shown[0]["error"], "timeout");
    // Retried: opening again with the same brief.
    let Acted::Open { brief, .. } = desk.act(&Fake::default(), &handoff.id, "retry", 4).unwrap()
    else {
        panic!("a retry opens again")
    };
    assert_eq!(brief, "brief");
    assert_eq!(desk.projection(4)[0]["status"], "opening");
    // An opening that hangs fails after two minutes.
    let later = 4 + book::OPEN_TIMEOUT_MS + 1;
    assert_eq!(desk.projection(later)[0]["status"], "failed");
    // The first try's answer coming late binds nothing; this try's does.
    assert!(!desk.observe(
        &json!({"type":"opened","requestId":format!("{}~0", handoff.id),"ok":true,"conversation":"c-old"}),
        later + 1
    ));
    assert!(desk.observe(
        &json!({"type":"opened","requestId":format!("{}~1", handoff.id),"ok":true,"conversation":"c-late"}),
        later + 1
    ));
    assert_eq!(
        desk.projection(later + 1)[0]["chatgptConversation"],
        "c-late"
    );
    // A failed one leaves the snapshot after a day.
    assert!(desk
        .act(&Fake::default(), &handoff.id, "end", later + 2)
        .is_ok());
    assert_eq!(desk.projection(later + 2 + FAILED_SHOWN_MS), json!([]));
}

#[test]
fn an_opening_cut_off_by_a_restart_fails_to_retry() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let Started::Opening { handoff, .. } = desk
        .start(&lines, "s1", None, "t", None, "brief", false, now_ms())
        .unwrap()
    else {
        panic!()
    };
    let again = Desk::new(desk.data.clone());
    let shown = again.projection(now_ms());
    assert_eq!(shown[0]["id"], handoff.id.as_str());
    assert_eq!(shown[0]["status"], "failed");
    assert!(matches!(
        again.act(&lines, &handoff.id, "retry", now_ms()).unwrap(),
        Acted::Open { .. }
    ));
}

#[test]
fn the_caller_is_only_ever_the_session_that_named_itself() {
    assert_eq!(
        caller_session(&json!({"client":"claude","sessionId":"s1"})),
        Some("s1".into())
    );
    // No id, or a malformed one: refused, never guessed from the folder.
    assert_eq!(caller_session(&json!({"client":"claude"})), None);
    assert_eq!(caller_session(&json!({"sessionId":"../x"})), None);
    assert_eq!(caller_session(&Value::Null), None);
}

#[test]
fn two_starts_side_by_side_begin_one_handoff() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let first = desk.claim("session:s1").unwrap();
    assert!(desk
        .start(&lines, "s1", None, "t", None, "brief", false, 1)
        .is_err());
    // Another session is not held up.
    assert!(desk
        .start(&lines, "s2", None, "t", None, "brief", false, 1)
        .is_ok());
    drop(first);
    assert!(matches!(
        desk.start(&lines, "s1", None, "t", None, "brief", false, 2),
        Ok(Started::Opening { .. })
    ));
    assert_eq!(desk.projection(3).as_array().unwrap().len(), 2);
}

#[test]
fn ending_waits_for_words_on_their_way() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    let sending = desk.claim(&handoff.id).unwrap();
    assert!(desk.act(&lines, &handoff.id, "end", 3).is_err());
    assert_ne!(desk.projection(3)[0]["phase"], "ended");
    drop(sending);
    desk.act(&lines, &handoff.id, "end", 4).unwrap();
    assert_eq!(desk.projection(4)[0]["phase"], "ended");
}

#[test]
fn turns_before_the_conversation_is_bound_are_taken_in_order() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let Started::Opening { handoff, .. } = desk
        .start(&lines, "s1", None, "t", None, "brief", false, 1)
        .unwrap()
    else {
        panic!()
    };
    // ChatGPT answers in full before `opened` does: the page shows
    // the brief it was opened with.
    shown("brief");
    assert!(!desk.observe(&turn("start", ""), 2));
    assert!(!desk.observe(
        &turn("complete", "1. 少一项\n审查出口：返修\n结论：需修改"),
        3
    ));
    desk.open(&lines, &handoff.id, "brief", None, || 4).unwrap();
    let shown = desk.projection(5);
    assert_eq!(shown[0]["phase"], "replied");
    let kinds = shown[0]["steps"]
        .as_array()
        .unwrap()
        .iter()
        .map(|step| step["kind"].as_str().unwrap().to_owned())
        .collect::<Vec<_>>();
    assert_eq!(kinds.last().map(String::as_str), Some("reply"));
    assert_eq!(
        shown[0]["steps"].as_array().unwrap().last().unwrap()["at"],
        3
    );
    // Taken once: nothing is left to take again.
    assert!(!desk.caught_up("c-new"));
}

#[test]
fn every_turn_is_logged_with_what_became_of_it_but_not_its_words() {
    let (temp, desk) = desk();
    let lines = Fake::default();
    let Started::Opening { handoff, .. } = desk
        .start(&lines, "s1", None, "t", None, "brief", false, 1)
        .unwrap()
    else {
        panic!()
    };
    desk.observe(&turn("start", ""), 2);
    desk.open(&lines, &handoff.id, "brief", None, || 3).unwrap();
    // The empty placeholder of 2026-11-07, then the answer.
    desk.observe(&turn("complete", ""), 4);
    desk.observe(&turn("complete", "审查出口：通过\n结论：通过"), 5);
    for i in 0..=EARLY_KEPT {
        desk.observe(
            &json!({"type":"turn","phase":"start","conversation":format!("own-{i}")}),
            6,
        );
    }
    let log = std::fs::read_to_string(turns_path(&temp.path().join("data"))).unwrap();
    assert!(!log.contains("结论"), "no words are logged");
    let lines: Vec<Value> = log
        .lines()
        .map(|line| serde_json::from_str(line).unwrap())
        .collect();
    let seen = |line: &Value| {
        (
            line["conversation"].as_str().unwrap().to_owned(),
            line["phase"].as_str().unwrap().to_owned(),
            line["outcome"].as_str().unwrap().to_owned(),
        )
    };
    let mine: Vec<_> = lines
        .iter()
        .filter(|l| l["conversation"] == "c-new")
        .map(seen)
        .collect();
    let row =
        |phase: &str, outcome: &str| ("c-new".to_owned(), phase.to_owned(), outcome.to_owned());
    assert_eq!(
        mine,
        [
            row("start", "early"),
            row("start", "caught-up"),
            row("complete", "unused"),
            row("complete", "taken"),
        ]
    );
    assert_eq!(lines[3]["replyChars"], 13);
    assert!(lines
        .iter()
        .any(|l| l["conversation"] == "own-0" && l["outcome"] == "evicted"));
}

#[test]
fn turns_while_the_next_round_is_on_its_way_count_for_that_round() {
    let (_temp, desk) = desk();
    let desk: &'static Desk = Box::leak(Box::new(desk));
    let mut lines = Fake::default();
    let handoff = opened(desk, &lines);
    assert!(desk.observe(
        &turn("complete", "1. 少一项\n审查出口：返修\n结论：需修改"),
        3
    ));
    // Round 2: ChatGPT starts, and answers, before `send` returns.
    lines.on_send = Some(Box::new(|| {
        assert!(!desk.observe(&turn("start", ""), 5));
        assert!(!desk.observe(
            &json!({"type":"turn","phase":"complete","conversation":"c-new","reply":"审查出口：通过\n结论：通过","messageId":"m2","prompt":asked()}),
            6
        ));
    }));
    let Started::Sent { repeated, .. } = desk
        .start(&lines, "s1", None, "t", None, "第 2 轮改动", false, 4)
        .unwrap()
    else {
        panic!("round 2 goes into the same conversation")
    };
    assert!(!repeated);
    let shown = desk.projection(7);
    assert_eq!(shown[0]["id"], handoff.id.as_str());
    assert_eq!(shown[0]["phase"], "replied");
    let last = shown[0]["steps"]
        .as_array()
        .unwrap()
        .last()
        .unwrap()
        .clone();
    assert_eq!(
        (last["kind"].as_str(), last["verdict"].as_str()),
        (Some("reply"), Some("pass"))
    );
    // Talk after the answer is not taken as another answer.
    lines.on_send = None;
    assert!(!desk.observe(&turn("complete", "顺便说一句"), 8));
    assert_eq!(
        desk.projection(8)[0]["steps"].as_array().unwrap().len(),
        shown[0]["steps"].as_array().unwrap().len()
    );
}

// #223: 结束接力 while the review conversation is still opening waits
// for it; ended before it opens, none is opened.
#[test]
fn ending_waits_for_the_conversation_to_open() {
    let (_temp, desk) = desk();
    let desk: &'static Desk = Box::leak(Box::new(desk));
    let mut lines = Fake::default();
    let Started::Opening { handoff, .. } = desk
        .start(&lines, "s1", None, "t", None, "brief", false, 1)
        .unwrap()
    else {
        panic!()
    };
    let id = handoff.id.clone();
    lines.on_open = Some(Box::new(move || {
        assert!(desk.act(&Fake::default(), &id, "end", 2).is_err());
    }));
    desk.open(&lines, &handoff.id, "brief", None, || 3).unwrap();
    assert_eq!(desk.projection(3)[0]["phase"], "delivered");
    desk.act(&lines, &handoff.id, "end", 4).unwrap();
    assert_eq!(desk.projection(4)[0]["phase"], "ended");
    // Ended before its opening began: nothing is opened.
    let lines = Fake::default();
    let Started::Opening { handoff, .. } = desk
        .start(&lines, "s9", None, "t", None, "brief", false, 5)
        .unwrap()
    else {
        panic!()
    };
    desk.act(&lines, &handoff.id, "end", 6).unwrap();
    assert!(desk.open(&lines, &handoff.id, "brief", None, || 7).is_err());
    assert!(lines.sent.borrow().is_empty());
}

/// L3 P1-10: while a review waits on ChatGPT, other words do not go;
/// the same words again are fine, and words that went in are no longer
/// pending.
#[test]
fn a_review_waiting_on_chatgpt_takes_no_other_words() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let Started::Opening { handoff, .. } = ruled(&desk, &lines, "s1", "L2", None, 1).unwrap()
    else {
        panic!()
    };
    desk.observe(&turn("complete", FIX), 3);
    desk.drive(&lines, 4);
    ruled(&desk, &lines, "s1", "L2", None, 5).unwrap();
    assert!(desk.lock().get(&handoff.id).unwrap().gate.pending.is_none());
    let sends = lines.sent.borrow().len();
    let Started::Sent { repeated, .. } = ruled(&desk, &lines, "s1", "L2", None, 5).unwrap() else {
        panic!()
    };
    assert!(repeated, "the same words again");
    assert_eq!(
        ruled(&desk, &lines, "s1", "L2", None, 6).err(),
        Some(guard::still_waiting())
    );
    assert_eq!(lines.sent.borrow().len(), sends);
}

/// #542 review round 6 (owner 2026-11-27 「甲」): an opening's words go
/// named by their request, as words sent later are, so the extension knows
/// the prompt they became from any prompt of the person's; its answer is
/// held to them all the same, the line aside, and not to other words.
#[test]
fn an_openings_words_go_named_by_their_request_and_its_answer_still_counts() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let Started::Opening { handoff, .. } = desk
        .start(&lines, "s1", None, "修登录", None, "改动如下", false, 1)
        .unwrap()
    else {
        panic!("a first brief opens a conversation");
    };
    desk.open(&lines, &handoff.id, "改动如下", None, || 2)
        .unwrap();
    let (kind, _, text) = last_sent(&lines);
    assert_eq!(kind, "open");
    assert_eq!(text, format!("【驿窗送审 {}~0】\n改动如下", handoff.id));
    // Another prompt with that line is not its answer.
    shown(&format!("【驿窗送审 {}~0】\n别的话", handoff.id));
    assert!(!desk.observe(&turn("complete", GATE_PASS), 3));
    shown(&text);
    assert!(desk.observe(&turn("complete", GATE_PASS), 4));
    assert_eq!(desk.lock().get(&handoff.id).unwrap().phase, Phase::Replied);
}
