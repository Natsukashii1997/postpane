//! #544, gaps 4 and 5: the session heard its words were never known to
//! have gone in (the round trip stopped, and an answer could not pass).
//! Word they did go in after all, late from the extension or found in the
//! conversation, sets that right: the session is told once.
use super::*;

/// A handoff whose second review went out at 5 and was never known to have
/// gone in, as its session heard; with the request it went as.
fn unsure(desk: &Desk, lines: &Fake) -> (Handoff, String) {
    let Started::Opening { handoff, .. } = ruled(desk, lines, "s1", "L2", None, 1).unwrap() else {
        panic!()
    };
    desk.observe(&turn("complete", FIX), 3);
    desk.drive(lines, 4);
    lines.send_fails.set(true);
    let heard = ruled(desk, lines, "s1", "L2", None, 5).err().unwrap();
    lines.send_fails.set(false);
    assert_eq!(heard, guard::sent_unknown("ChatGPT 插件没能完成：timeout"));
    let request = lines.requests.borrow().last().unwrap().clone();
    (handoff, request)
}

fn told(lines: &Fake) -> Vec<String> {
    sent_as(lines, "reply")
        .into_iter()
        .map(|(_, text)| text)
        .collect()
}

#[test]
fn late_word_the_words_went_in_is_told_and_their_answer_may_pass() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let (handoff, request) = unsure(&desk, &lines);
    let before = told(&lines).len();
    desk.observe(&json!({"type":"sent","requestId":request,"ok":true}), 6);
    let kept = desk.lock().get(&handoff.id).cloned().unwrap();
    assert!(!kept.unsure() && kept.auto, "the round trip went on");
    assert!(desk.tell(&lines, 7));
    let said = told(&lines);
    assert_eq!(said.len(), before + 1);
    let last = said.last().unwrap();
    assert!(
        last.contains("更正")
            && last.contains("自动往返已经恢复")
            && last.contains("可以按通过结束"),
        "{last}"
    );
    assert!(!desk.tell(&lines, 8), "told once");
    // Its answer passes as any review's does.
    desk.observe(&reply_as(asked(), PASS, "m2"), 9);
    desk.drive(&lines, 10);
    assert_eq!(status(&desk, 10).0, "closed");
}

#[test]
fn words_found_in_the_conversation_after_the_session_heard_are_told() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let (_, request) = unsure(&desk, &lines);
    desk.observe(
        &json!({"type":"found","conversation":"c-new","request":request,"outcome":"there"}),
        50_000,
    );
    assert!(desk.tell(&lines, 50_001));
    assert!(told(&lines).last().unwrap().contains("更正"));
    assert!(!desk.tell(&lines, 50_002), "told once");
}

#[test]
fn words_known_to_have_gone_in_at_once_need_no_word_of_it() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let Started::Opening { .. } = ruled(&desk, &lines, "s1", "L2", None, 1).unwrap() else {
        panic!()
    };
    desk.observe(&turn("complete", FIX), 3);
    desk.drive(&lines, 4);
    ruled(&desk, &lines, "s1", "L2", None, 5).unwrap();
    assert!(!desk.tell(&lines, 6));
}

// Gap 8: word that the words went in, come after a restart and before their
// answer, is not taken (nothing kept in this run says what they were); the
// look for them finds them, and that sets right what the session heard.
#[test]
fn late_word_after_a_restart_waits_for_the_look_that_finds_the_words() {
    let (temp, desk) = desk();
    let lines = Fake::default();
    let (handoff, request) = unsure(&desk, &lines);
    drop(desk);
    let mut desk = Desk::new(Some(temp.path().join("data")));
    desk.since = 0;
    assert!(!desk.observe(&json!({"type":"sent","requestId":request,"ok":true}), 6));
    assert!(desk.lock().get(&handoff.id).unwrap().unsure(), "not taken");
    desk.observe(
        &json!({"type":"found","conversation":"c-new","request":request,"outcome":"there"}),
        50_000,
    );
    assert!(!desk.lock().get(&handoff.id).unwrap().unsure());
    assert!(desk.tell(&lines, 50_001));
    let last = told(&lines).last().unwrap().clone();
    assert!(last.contains("更正"), "{last}");
}
