//! Words never known to have gone in (送达未确认) and mending sends.
use super::*;

/// L3 P1-10..12: words never known to have gone in stop the round trip;
/// other words wait and the same are not sent twice; only an answer to
/// them counts, once, after their step, and cannot pass; word of them
/// after it only goes on the card.
#[test]
fn words_never_known_to_have_gone_in_hold_their_round() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let Started::Opening { handoff, .. } = ruled(&desk, &lines, "s1", "L2", None, 1).unwrap()
    else {
        panic!()
    };
    let first = asked();
    desk.observe(&reply_as(first.clone(), FIX, "m1"), 3);
    desk.drive(&lines, 4);
    lines.send_fails.set(true);
    assert!(ruled(&desk, &lines, "s1", "L2", None, 5).is_err());
    lines.send_fails.set(false);
    let (request, words) = (lines.requests.borrow().last().unwrap().clone(), asked());
    let get = || desk.lock().get(&handoff.id).cloned().unwrap();
    assert_eq!(get().halt, Some(guard::send_unconfirmed()));
    // P1-10 A: the same words are not sent twice; others wait.
    let sends = lines.sent.borrow().len();
    let Started::Sent { repeated, .. } = ruled(&desk, &lines, "s1", "L2", None, 5).unwrap() else {
        panic!()
    };
    assert!(repeated);
    assert_eq!(
        ruled(&desk, &lines, "s1", "L2", None, 6).err(),
        Some(guard::still_waiting())
    );
    assert_eq!(lines.sent.borrow().len(), sends);
    // P1-11: the earlier review's words, answered again, are not this round.
    desk.observe(&reply_as(first, PASS, "again"), 7);
    assert_eq!(get().counted(), 1);
    // Its own answer counts once, after its step, and cannot pass.
    desk.observe(&reply_as(words, PASS, "m2"), 8);
    desk.drive(&lines, 9);
    let answered = get();
    assert_eq!(answered.counted(), 2);
    let kinds = answered.steps.iter().map(|s| s.kind).collect::<Vec<_>>();
    let ask = kinds.iter().rposition(|k| *k == StepKind::Ask).unwrap();
    assert_eq!(
        kinds.iter().rposition(|k| *k == StepKind::Reply),
        Some(ask + 1)
    );
    assert_eq!(status(&desk, 9).0, "open");
    assert!(last_reply_to_claude(&lines).contains(&guard::unconfirmed()));
    // P1-12: word of them after the answer only goes on the card.
    desk.observe(&json!({"type":"sent","requestId":request,"ok":true}), 10);
    let late = get();
    assert_eq!((late.phase, late.counted()), (answered.phase, 2));
    assert!(late.gate.pending.is_some(), "still cannot pass");
    assert_eq!(
        late.steps.last().unwrap().text.as_deref(),
        Some(guard::confirmed_late().as_str())
    );
    desk.drive(&lines, 11);
    assert_eq!(status(&desk, 11).0, "open");
}

/// Review round 4 P1-10: word that a mending went in clears only the
/// mending; a review never known to have gone in still holds its pass.
#[test]
fn a_mending_confirmed_never_clears_a_review_still_unsure() {
    let (_temp, desk) = desk_of(5);
    let lines = Fake::default();
    let Started::Opening { handoff, .. } = ruled(&desk, &lines, "s1", "L2", None, 1).unwrap()
    else {
        panic!()
    };
    desk.observe(&turn("complete", FIX), 3);
    desk.drive(&lines, 4);
    lines.send_fails.set(true);
    assert!(ruled(&desk, &lines, "s1", "L2", None, 5).is_err());
    lines.send_fails.set(false);
    desk.observe(&reply_as(asked(), "1. 都好", "m2"), 6);
    // 继续自动 takes the waiting answer up at once: it asks for the last lines.
    desk.act(&lines, &handoff.id, "resume", 7).unwrap();
    desk.drive(&lines, 8);
    assert!(last_sent(&lines).2.contains("驿窗自动发送"));
    let kept = desk.lock().get(&handoff.id).cloned().unwrap();
    assert!(kept.gate.mending.is_none() && kept.gate.pending.is_some());
    desk.observe(&reply_as(asked(), PASS, "m3"), 9);
    desk.drive(&lines, 10);
    assert_eq!(status(&desk, 10).0, "open");
    assert!(last_reply_to_claude(&lines).contains(&guard::unconfirmed()));
}

/// Review round 4 P1-11: an earlier round's words, the same for their
/// first 600 characters, never pass for the round on its way, nor for
/// the one gone in.
#[test]
fn an_earlier_rounds_words_never_pass_for_this_ones() {
    let long = "同".repeat(700);
    let (_temp, desk) = desk_of(5);
    let lines = Fake::default();
    let first = format!("{long}\n第一版");
    let Started::Opening { handoff, .. } =
        engineering(&desk, &lines, "s1", "/w", &first, 1).unwrap()
    else {
        panic!()
    };
    let a = asked();
    desk.observe(&reply_as(a.clone(), FIX, "m1"), 3);
    desk.drive(&lines, 4);
    let counted = || desk.lock().get(&handoff.id).unwrap().counted();
    // On its way and never confirmed: A answered again is not B's.
    lines.send_fails.set(true);
    assert!(engineering(&desk, &lines, "s1", "/w", &format!("{long}\n第二版"), 5).is_err());
    lines.send_fails.set(false);
    desk.observe(&reply_as(a.clone(), FIX, "regen-1"), 6);
    assert_eq!(counted(), 1);
    // Its own answer counts.
    desk.observe(&reply_as(asked(), FIX, "m2"), 7);
    assert_eq!(counted(), 2);
    // Gone in, a third: A answered again is still not it.
    desk.act(&lines, &handoff.id, "resume", 8).unwrap();
    desk.drive(&lines, 9);
    engineering(&desk, &lines, "s1", "/w", &format!("{long}\n第三版"), 10).unwrap();
    desk.observe(&reply_as(a, FIX, "regen-2"), 11);
    assert_eq!(counted(), 2);
    desk.observe(&reply_as(asked(), FIX, "m3"), 12);
    assert_eq!(counted(), 3);
}

/// Review round 4 P1-14, P2-16: words never known to have gone in when
/// the app restarted are told of once, as unknown; word of them after
/// their answer still goes on the card.
#[test]
fn words_unsure_at_a_restart_are_told_of_and_late_word_is_noted() {
    let (temp, desk) = desk();
    let lines = Fake::default();
    let Started::Opening { handoff, .. } = ruled(&desk, &lines, "s1", "L2", None, 1).unwrap()
    else {
        panic!()
    };
    desk.observe(&turn("complete", FIX), 3);
    desk.drive(&lines, 4);
    lines.send_fails.set(true);
    assert!(ruled(&desk, &lines, "s1", "L2", None, 5).is_err());
    lines.send_fails.set(false);
    let (request, words) = (lines.requests.borrow().last().unwrap().clone(), asked());
    let told = sent_as(&lines, "reply").len();
    drop(desk);
    let mut desk = Desk::new(Some(temp.path().join("data")));
    desk.since = 0;
    assert!(desk.tell(&lines, 6));
    let said = sent_as(&lines, "reply");
    assert_eq!(said.len(), told + 1);
    assert!(said.last().unwrap().1.contains("送达状态未知"), "{said:?}");
    assert!(!desk.tell(&lines, 7), "told once");
    // Its answer, then word it went in: noted, nothing else moves.
    desk.observe(&reply_as(words, FIX, "m2"), 8);
    let before = desk.lock().get(&handoff.id).cloned().unwrap();
    desk.observe(&json!({"type":"sent","requestId":request,"ok":true}), 9);
    let after = desk.lock().get(&handoff.id).cloned().unwrap();
    assert_eq!(
        (after.phase, after.counted()),
        (before.phase, before.counted())
    );
    assert_eq!(
        after.steps.last().unwrap().text.as_deref(),
        Some(guard::confirmed_late().as_str())
    );
    // The same word again, here or after another restart: noted once
    // (round 5 P2-16).
    desk.observe(&json!({"type":"sent","requestId":request,"ok":true}), 10);
    drop(desk);
    let desk = Desk::new(Some(temp.path().join("data")));
    desk.observe(&json!({"type":"sent","requestId":request,"ok":true}), 11);
    let again = desk.lock().get(&handoff.id).cloned().unwrap();
    assert_eq!(again.steps.len(), after.steps.len());
}

/// #507: every restart finds the same words pending again. They go on the
/// card and to the session once: on 2026-11-22 one handoff had five such
/// steps and five notices, one a restart. Records from before, with no
/// mark that a restart said so, are known by their last step.
#[test]
fn words_unsure_at_a_later_restart_are_not_told_of_again() {
    let (temp, desk) = desk();
    let lines = Fake::default();
    let Started::Opening { handoff, .. } = ruled(&desk, &lines, "s1", "L2", None, 1).unwrap()
    else {
        panic!()
    };
    desk.observe(&turn("complete", FIX), 3);
    desk.drive(&lines, 4);
    lines.send_fails.set(true);
    assert!(ruled(&desk, &lines, "s1", "L2", None, 5).is_err());
    lines.send_fails.set(false);
    drop(desk);
    let mut desk = Desk::new(Some(temp.path().join("data")));
    desk.since = 0;
    assert!(desk.tell(&lines, 6));
    let steps = desk.lock().get(&handoff.id).unwrap().steps.len();
    let told = sent_as(&lines, "reply").len();
    for forgotten in [false, true] {
        if forgotten {
            desk.change(|book| {
                let kept = book.list.iter_mut().find(|h| h.id == handoff.id).unwrap();
                kept.gate.pending.as_mut().unwrap().restarted = false;
                true
            });
        }
        drop(desk);
        desk = Desk::new(Some(temp.path().join("data")));
        desk.since = 0;
        assert!(!desk.tell(&lines, 7), "told once");
        assert_eq!(desk.lock().get(&handoff.id).unwrap().steps.len(), steps);
        assert_eq!(sent_as(&lines, "reply").len(), told);
    }
}

/// Review round 4 P1-14: an answer come before the notice went makes it
/// out of date.
#[test]
fn an_answer_before_the_notice_leaves_nothing_to_tell() {
    let (temp, desk) = desk();
    let lines = Fake::default();
    ruled(&desk, &lines, "s1", "L2", None, 1).unwrap();
    desk.observe(&turn("complete", FIX), 3);
    desk.drive(&lines, 4);
    lines.send_fails.set(true);
    assert!(ruled(&desk, &lines, "s1", "L2", None, 5).is_err());
    lines.send_fails.set(false);
    let words = asked();
    drop(desk);
    let mut desk = Desk::new(Some(temp.path().join("data")));
    desk.since = 0;
    desk.observe(&reply_as(words, FIX, "m2"), 6);
    let told = sent_as(&lines, "reply").len();
    desk.tell(&lines, 7);
    assert_eq!(sent_as(&lines, "reply").len(), told);
}

/// Review round 5 P1-17: an answer to the ask to mend, come while its
/// send gave up waiting, is taken all the same: counted as a mending,
/// and still held back.
#[test]
fn an_answer_come_while_a_mending_send_gives_up_is_taken() {
    let (_temp, desk) = desk();
    let desk: &'static Desk = Box::leak(Box::new(desk));
    let mut lines = Fake::default();
    let Started::Opening { handoff, .. } = ruled(desk, &lines, "s1", "L2", None, 1).unwrap() else {
        panic!()
    };
    desk.observe(&turn("complete", "1. 都好"), 3);
    lines.send_fails.set(true);
    lines.on_send = Some(Box::new(|| {
        assert!(
            !desk.observe(&reply_as(asked(), PASS, "m2"), 4),
            "held till the send is done"
        );
    }));
    desk.drive(&lines, 4);
    lines.on_send = None;
    let kept = desk.lock().get(&handoff.id).cloned().unwrap();
    assert_eq!(kept.last_reply().and_then(|s| s.key.as_deref()), Some("m2"));
    assert_eq!(kept.counted(), 1, "a mending is no round");
    assert!(kept.gate.mending.as_ref().is_some_and(|m| m.answered));
    desk.drive(&lines, 5);
    assert_eq!(status(desk, 5).0, "open");
}

/// Review round 5 P1-18: a review whose handoff ended while it was made
/// ready keeps nothing and sends nothing.
#[test]
fn a_review_whose_handoff_ended_meanwhile_does_not_go() {
    let (_temp, desk) = desk();
    let desk: &'static Desk = Box::leak(Box::new(desk));
    let mut lines = Fake::default();
    let Started::Opening { handoff, .. } = ruled(desk, &lines, "s1", "L2", None, 1).unwrap() else {
        panic!()
    };
    desk.observe(&turn("complete", FIX), 3);
    desk.drive(&lines, 4);
    ruled(desk, &lines, "s1", "L2", None, 5).unwrap();
    desk.observe(&reply_as(asked(), FIX, "m2"), 6);
    desk.drive(&lines, 7);
    // Past the cap, while who began the turn is read, another hand ends it.
    let id: &'static str = Box::leak(handoff.id.clone().into_boxed_str());
    lines.on_opener = Some(Box::new(move || {
        let mut book = desk.lock();
        if let Some(h) = book.list.iter_mut().find(|h| h.id == id) {
            h.status = Status::Closed;
        }
    }));
    *lines.opener.borrow_mut() = Some((Opener::Person, 8));
    let sends = lines.sent.borrow().len();
    let refused = ruled(desk, &lines, "s1", "L2", Some("常浩要求再审一次"), 9);
    assert_eq!(refused.err(), Some(guard::moved_meanwhile()));
    assert_eq!(lines.sent.borrow().len(), sends);
    assert!(desk.lock().get(id).unwrap().gate.pending.is_none());
}

/// Review round 4 P1-15: the ask to mend that cannot be kept first
/// leaves the handoff as it was, and does not go.
#[test]
fn a_mending_that_cannot_be_kept_first_does_not_go() {
    let (temp, desk) = desk();
    let lines = Fake::default();
    let Started::Opening { handoff, .. } = ruled(&desk, &lines, "s1", "L2", None, 1).unwrap()
    else {
        panic!()
    };
    desk.observe(&turn("complete", "1. 都好"), 3);
    let file = temp
        .path()
        .join("data")
        .join("chatgpt")
        .join("handoffs.json");
    std::fs::remove_file(&file).unwrap();
    std::fs::create_dir_all(file.join("in-the-way")).unwrap();
    let to_chatgpt = |lines: &Fake| lines.sent.borrow().iter().filter(|s| s.0 == "send").count();
    let sends = to_chatgpt(&lines);
    desk.drive(&lines, 4);
    std::fs::remove_dir_all(&file).unwrap();
    assert_eq!(to_chatgpt(&lines), sends);
    let kept = desk.lock().get(&handoff.id).cloned().unwrap();
    assert!(kept.steps.iter().all(|s| s.kind != StepKind::Format));
    assert!(kept.gate.mending.is_none());
    // Stopped for it, the answer still went back to Claude (#410).
    assert!(!kept.auto);
    assert_eq!(kept.phase, Phase::Returned);
}

/// L3 P1-10 C: PostPane's ask to mend the last lines, never known to
/// have gone in, cannot let the mended pass end the review.
#[test]
fn a_mending_never_known_to_have_gone_in_cannot_pass() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    ruled(&desk, &lines, "s1", "L2", None, 1).unwrap();
    desk.observe(&turn("complete", "1. 都好"), 3);
    lines.send_fails.set(true);
    desk.drive(&lines, 4);
    lines.send_fails.set(false);
    assert!(lines
        .sent
        .borrow()
        .last()
        .unwrap()
        .2
        .contains("驿窗自动发送"));
    desk.observe(&turn("complete", PASS), 5);
    desk.drive(&lines, 6);
    assert_eq!(status(&desk, 6).0, "open");
}

/// L3 P1-10 D: words that cannot be kept on disk first do not go.
#[test]
fn a_review_that_cannot_be_kept_first_does_not_go() {
    let (temp, desk) = desk();
    let lines = Fake::default();
    ruled(&desk, &lines, "s1", "L2", None, 1).unwrap();
    desk.observe(&turn("complete", FIX), 3);
    desk.drive(&lines, 4);
    // A folder where the book is kept: it cannot be written over.
    let file = temp
        .path()
        .join("data")
        .join("chatgpt")
        .join("handoffs.json");
    std::fs::remove_file(&file).unwrap();
    std::fs::create_dir_all(file.join("in-the-way")).unwrap();
    let sends = lines.sent.borrow().len();
    let refused = ruled(&desk, &lines, "s1", "L2", None, 5);
    std::fs::remove_dir_all(&file).unwrap();
    assert_eq!(
        refused.err(),
        Some(guard::not_kept("The handoffs could not be saved"))
    );
    assert_eq!(lines.sent.borrow().len(), sends);
    let h = desk.lock().list.last().cloned().unwrap();
    assert!(h.gate.pending.is_none(), "left as it was");
}

/// #434：补格式成为最新提问后，只收它的回答；同时覆盖提问编号和正文归属。
#[test]
fn the_latest_format_owns_the_answer_instead_of_the_older_ask() {
    for with_id in [false, true] {
        let (_temp, desk) = desk_of(5);
        let lines = Fake::default();
        if with_id {
            *lines.asked_as.borrow_mut() = Some("ask-id".into());
        }
        let Started::Opening { handoff, .. } = ruled(&desk, &lines, "s1", "L2", None, 1).unwrap()
        else {
            panic!()
        };
        let original = asked().unwrap();
        desk.observe(&reply_as(Some(original.clone()), "缺少末尾格式", "m1"), 3);
        if with_id {
            *lines.asked_as.borrow_mut() = Some("format-id".into());
        }
        desk.drive(&lines, 4);
        let format = asked().unwrap();
        let kept = desk.lock().get(&handoff.id).cloned().unwrap();
        assert_eq!(kept.last_asked().unwrap().kind, StepKind::Format);
        assert_ne!(format, original);
        let reply = |prompt: String, id: &str, message: &str| {
            let mut turn = reply_as(Some(prompt), "```rust\nlet x = 1;\n```\n返修意见", message);
            if with_id {
                turn["promptId"] = json!(id);
            }
            turn
        };
        let before = kept.last_reply().cloned();
        desk.observe(&reply(original, "ask-id", "old-ask-answer"), 5);
        assert_eq!(
            desk.lock().get(&handoff.id).unwrap().last_reply().cloned(),
            before
        );
        desk.observe(&reply(format, "format-id", "format-answer"), 6);
        let kept = desk.lock().get(&handoff.id).cloned().unwrap();
        assert_eq!(
            kept.last_reply().unwrap().key.as_deref(),
            Some("format-answer")
        );
        assert!(kept
            .last_reply()
            .unwrap()
            .text
            .as_deref()
            .unwrap()
            .contains("```rust"));
    }
}
