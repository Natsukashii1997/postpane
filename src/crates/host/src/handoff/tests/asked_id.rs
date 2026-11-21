//! #410 (2026-11-19): an answer is held to the words a handoff sent by the
//! prompt they went in as, ChatGPT's id for it, not by how the page draws
//! them. A long brief ChatGPT made an attachment drew no words, and its
//! answer waited unclaimed (19:27 「#348 解冲突定向复核」).
use super::*;

const ATTACHED: &str = "粘贴的文本 (1)(1).txt文档";

/// A brief long enough for ChatGPT to make an attachment of.
fn long_brief() -> String {
    format!(
        "驿窗｜#348 解冲突定向复核（L1）\n{}",
        "合并后复核 belongs.rs 的解冲突。".repeat(80)
    )
}

/// A handoff opened with `brief`, the page showing it went in as `asked`.
fn opened_with(desk: &Desk, lines: &Fake, brief: &str, asked: Option<&str>) -> Handoff {
    *lines.asked_as.borrow_mut() = asked.map(str::to_owned);
    let Started::Opening { handoff, project } = desk
        .start(
            lines,
            "s1",
            Some("/w"),
            "解冲突复核",
            Some("只读复核"),
            brief,
            false,
            1,
        )
        .unwrap()
    else {
        panic!("a first brief opens a conversation");
    };
    desk.open(lines, &handoff.id, brief, project.as_deref(), || 2)
        .unwrap();
    handoff
}

/// A finished turn answering `prompt`, ChatGPT's `prompt_id` for it.
fn answered(prompt: &str, prompt_id: Option<&str>, reply: &str, message: &str) -> Value {
    json!({"type":"turn","phase":"complete","conversation":"c-new","reply":reply,
        "messageId":message,"prompt":prompt,"promptId":prompt_id})
}

fn phase(desk: &Desk, id: &str) -> Phase {
    desk.lock().get(id).unwrap().phase
}

#[test]
fn an_answer_is_held_to_the_prompt_its_words_went_in_as() {
    let (_temp, desk) = desk_of(5);
    let lines = Fake::default();
    let handoff = opened_with(&desk, &lines, &long_brief(), Some("p1"));
    let kept = desk.lock().get(&handoff.id).cloned().unwrap();
    assert_eq!(kept.last_asked().unwrap().asked_id.as_deref(), Some("p1"));
    // The page shows only the attachment: the id is enough.
    desk.observe(
        &answered(ATTACHED, Some("p1"), "审查出口：返修\n结论：需修改", "m1"),
        3,
    );
    assert_eq!(phase(&desk, &handoff.id), Phase::Replied);
}

#[test]
fn an_answer_to_another_prompt_is_not_taken_even_with_the_same_words() {
    let (_temp, desk) = desk_of(5);
    let lines = Fake::default();
    let handoff = opened_with(&desk, &lines, "改动如下", Some("p1"));
    // The person sent the very same words again in that conversation.
    desk.observe(&answered("改动如下", Some("p2"), "我的回答", "m9"), 3);
    assert_eq!(phase(&desk, &handoff.id), Phase::Delivered);
    // The extension of before names no id: held to the words as before.
    desk.observe(
        &answered("改动如下", None, "审查出口：返修\n结论：需修改", "m1"),
        4,
    );
    assert_eq!(phase(&desk, &handoff.id), Phase::Replied);
}

#[test]
fn the_next_round_is_held_to_its_own_prompt() {
    let (_temp, desk) = desk_of(5);
    let lines = Fake::default();
    let handoff = opened_with(&desk, &lines, "改动如下", Some("p1"));
    desk.observe(
        &answered("改动如下", Some("p1"), "审查出口：返修\n结论：需修改", "m1"),
        3,
    );
    desk.act(&lines, &handoff.id, "back", 4).unwrap();
    *lines.asked_as.borrow_mut() = Some("p2".into());
    desk.start(
        &lines,
        "s1",
        Some("/w"),
        "解冲突复核",
        Some("改完"),
        "第 2 轮",
        false,
        5,
    )
    .unwrap();
    // A late copy of round one's answer, by its prompt, is not round two's.
    desk.observe(&answered("改动如下", Some("p1"), "旧回信", "m1b"), 6);
    assert_eq!(phase(&desk, &handoff.id), Phase::Delivered);
    desk.observe(
        &answered(ATTACHED, Some("p2"), "审查出口：返修\n结论：需修改", "m2"),
        7,
    );
    assert_eq!(phase(&desk, &handoff.id), Phase::Replied);
}

#[test]
fn words_sent_after_the_wait_gave_up_keep_the_prompt_the_extension_names_later() {
    let (_temp, desk) = desk_of(5);
    let lines = Fake::default();
    let handoff = opened_with(&desk, &lines, "改动如下", Some("p1"));
    desk.observe(
        &answered("改动如下", Some("p1"), "审查出口：返修\n结论：需修改", "m1"),
        3,
    );
    desk.act(&lines, &handoff.id, "back", 3).unwrap();
    lines.send_fails.set(true);
    let brief = long_brief();
    assert!(desk
        .start(&lines, "s1", None, "t", None, &brief, false, 4)
        .is_err());
    let request = lines.requests.borrow().last().unwrap().clone();
    desk.observe(
        &json!({"type":"sent","requestId":request,"ok":true,"promptId":"p5"}),
        5,
    );
    let kept = desk.lock().get(&handoff.id).cloned().unwrap();
    assert_eq!(kept.last_asked().unwrap().asked_id.as_deref(), Some("p5"));
    desk.observe(
        &answered(ATTACHED, Some("p5"), "审查出口：返修\n结论：需修改", "m5"),
        6,
    );
    assert_eq!(phase(&desk, &handoff.id), Phase::Replied);
}

#[test]
fn words_with_no_prompt_known_count_an_attachment_only_when_long() {
    // Long words from before ids: the attachment is theirs.
    let (_temp, desk) = desk_of(5);
    let lines = Fake::default();
    let handoff = opened_with(&desk, &lines, &long_brief(), None);
    desk.observe(
        &answered(ATTACHED, Some("p1"), "审查出口：返修\n结论：需修改", "m1"),
        3,
    );
    assert_eq!(phase(&desk, &handoff.id), Phase::Replied);
    // Short words never became one: an attachment is the person's own.
    let (_temp, desk) = desk_of(5);
    let lines = Fake::default();
    let handoff = opened_with(&desk, &lines, "改动如下", None);
    desk.observe(&answered(ATTACHED, None, "我的回答", "m9"), 3);
    assert_eq!(phase(&desk, &handoff.id), Phase::Delivered);
    // Nor any other prompt of the person's.
    desk.observe(&answered("粘贴的文本 讲讲这个", None, "我的回答", "m8"), 4);
    assert_eq!(phase(&desk, &handoff.id), Phase::Delivered);
}

/// The owner's 「#348 解冲突定向复核」 (`h1a1f38f8b6200`), replayed: a long
/// first brief went in with no id known (the extension of 19:27), ChatGPT
/// answered in 9 minutes, nothing was told for 30, the round trip stopped.
/// Read again by the new extension, the answer is taken and goes back (S1).
#[test]
fn the_owners_stuck_review_is_taken_when_read_again() {
    let (_temp, desk) = desk_of(5);
    let lines = Fake::default();
    let handoff = opened_with(&desk, &lines, &long_brief(), None);
    desk.observe(
        &json!({"type":"turn","phase":"start","conversation":"c-new","prompt":ATTACHED}),
        3,
    );
    let late = 3 + book::REPLY_WAIT_MS + 1;
    assert!(desk.late(late));
    assert!(
        !desk.lock().get(&handoff.id).unwrap().auto,
        "stopped for no answer"
    );
    let reply = "1. 解冲突成立\n审查出口：通过\n结论：通过";
    let read_again = json!({"type":"turn","phase":"complete","conversation":"c-new","reply":reply,
        "messageId":"1eec6d53","prompt":ATTACHED,"promptId":"6482f36e","reread":true});
    desk.observe(&read_again, late + 60_000);
    assert_eq!(phase(&desk, &handoff.id), Phase::Replied);
    desk.catch_up(&lines, late + 61_000);
    assert_eq!(replies(&lines), 1, "the answer goes back once");
    assert!(sent_as(&lines, "reply")[0].1.contains("解冲突成立"));
    assert_eq!(
        desk.lock().get(&handoff.id).unwrap().status,
        Status::Closed,
        "a pass ends it"
    );
}
