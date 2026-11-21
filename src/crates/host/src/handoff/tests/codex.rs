//! A Codex thread as the doer.
use super::*;

// #255 (L-14): the session ended once its turn was over, so its plugin
// no longer checks in. Sending is refused twice; the words still wait in
// its queue, which the plugin takes from when the session is opened.
/// #280: a review Codex handed over gets ChatGPT's words back in its
/// own thread, through Codex's queue, never Agent HUD's Claude plugin.
#[test]
fn words_back_to_a_codex_doer_go_into_its_thread() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let rule = Rule {
        doer: Some(CODEX.to_owned()),
        ..Rule::default()
    };
    let Started::Opening { handoff, project } = desk
        .start_ruled(
            &lines,
            "t1",
            None,
            "修登录",
            None,
            "改动如下",
            false,
            &rule,
            1,
        )
        .unwrap()
    else {
        panic!("a first brief opens a conversation");
    };
    desk.open(&lines, &handoff.id, "改动如下", project.as_deref(), || 2)
        .unwrap();
    assert_eq!(
        desk.lock().get(&handoff.id).unwrap().doer.as_deref(),
        Some(CODEX)
    );
    desk.observe(
        &turn("complete", "1. 少一项\n审查出口：返修\n结论：需修改"),
        4,
    );
    assert!(desk.drive(&lines, 5));
    let sent = lines.sent.borrow();
    let back = sent
        .iter()
        .find(|(kind, ..)| kind != "open" && kind != "send");
    let (kind, session, text) = back.expect("words went back");
    assert_eq!((kind.as_str(), session.as_str()), ("codex", "t1"));
    assert!(text.contains("少一项"));
}

/// #282: the letters of a review Codex handed over fly between ChatGPT
/// and Codex's mark, Codex standing where Claude stands.
#[test]
fn letters_fly_between_chatgpt_and_codex_for_a_codex_doer() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = codex_opened(&desk, &lines, None);
    let sent = desk.tosses();
    assert_eq!(
        (sent[0].from.as_str(), sent[0].to.as_str()),
        ("codex", "chatgpt")
    );
    assert!(sent[0].from_left);
    assert_eq!(sent[0].lane, format!("relay:{}:codex", handoff.id));
    desk.observe(
        &turn("complete", "1. 少一项\n审查出口：返修\n结论：需修改"),
        4,
    );
    let back = desk.tosses();
    assert_eq!(
        (back[0].from.as_str(), back[0].to.as_str()),
        ("chatgpt", "codex")
    );
}

/// #282: the timeline says Codex where a Codex review's words go back.
#[test]
fn a_codex_reviews_timeline_names_codex() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = codex_opened(&desk, &lines, Some("L1"));
    desk.observe(
        &turn("complete", "1. 要改方案\n审查出口：决策升级\n结论：需修改"),
        4,
    );
    assert!(desk.drive(&lines, 5));
    let said = serde_json::to_string(&desk.projection(5)).unwrap();
    let up = by_doer(&escalated(), Some(CODEX));
    assert!(said.contains(&up), "{said}");
    assert!(!said.contains("Claude"), "{said}");
    // A Claude review's words stay as they were.
    assert_eq!(by_doer(&escalated(), None), escalated());
    assert_eq!(
        desk.lock().get(&handoff.id).unwrap().doer.as_deref(),
        Some(CODEX)
    );
}

/// #283: words back to a Codex thread are followed by what they said,
/// which its rollout shows a turn begun with once Codex started on them.
#[test]
fn words_back_to_a_codex_thread_are_followed_by_their_words() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = codex_opened(&desk, &lines, None);
    desk.observe(
        &turn("complete", "1. 少一项\n审查出口：返修\n结论：需修改"),
        4,
    );
    assert!(desk.drive(&lines, 5));
    let (prompt, delivery) = last_back(&desk, 5);
    assert_eq!(delivery, "waiting");
    let said = desk
        .lock()
        .get(&handoff.id)
        .unwrap()
        .steps
        .iter()
        .rev()
        .find(|s| s.kind == StepKind::Back)
        .and_then(|s| s.text.clone())
        .unwrap();
    assert!(said.contains("少一项"));
    left_by(&lines, &prompt, "started", None);
    assert!(desk.track(&lines, 6));
    assert_eq!(lines.words.borrow().last(), Some(&said));
    assert_eq!(last_back(&desk, 6).1, "started");
}

/// A review started without naming its doer stays Claude Code's.
#[test]
fn a_review_with_no_doer_named_is_claude_codes() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    assert_eq!(desk.lock().get(&handoff.id).unwrap().doer, None);
    desk.observe(&turn("complete", "审查出口：返修\n结论：需修改"), 4);
    assert!(desk.drive(&lines, 5));
    assert_eq!(replies(&lines), 1);
}

/// #175 with #280: only a Claude Code session runs in the background; a
/// Codex thread that cannot take the words now keeps them in its queue.
#[test]
fn a_codex_doer_is_never_run_as_a_claude_session() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    lines.stopped.set(true);
    lines.reply_fails.set(2);
    let rule = Rule {
        doer: Some(CODEX.to_owned()),
        ..Rule::default()
    };
    let Started::Opening { handoff, project } = desk
        .start_ruled(
            &lines,
            "t1",
            None,
            "修登录",
            None,
            "改动如下",
            false,
            &rule,
            1,
        )
        .unwrap()
    else {
        panic!("a first brief opens a conversation");
    };
    desk.open(&lines, &handoff.id, "改动如下", project.as_deref(), || 2)
        .unwrap();
    desk.observe(
        &turn("complete", "1. 少一项\n审查出口：返修\n结论：需修改"),
        4,
    );
    assert!(desk.drive(&lines, 5));
    assert!(sent_as(&lines, "wake").is_empty());
    assert_eq!(sent_as(&lines, "codex").len(), 1, "queued for Codex");
    assert_eq!(desk.projection(5)[0]["queuedAt"], 5);
    let later = 5 + book::WAKE_AFTER_MS;
    assert!(!desk.wake_queued(&lines, later));
    assert!(sent_as(&lines, "withdraw").is_empty());
    assert!(sent_as(&lines, "wake").is_empty());
}
