//! #507 review rounds 3 and 4, P1-04: an answer being written in a handoff's
//! conversation that is not its review's (the person asked something there
//! once the review was back). No words go in beside it, and only the end of
//! that answer's own turn lets them go.
use super::*;

const FIX: &str = "1. 还差\n受审版本：0123456\n审查出口：返修\n结论：需修改";

fn kept(desk: &Desk, handoff: &Handoff) -> Handoff {
    desk.lock().get(&handoff.id).cloned().unwrap()
}

/// A review answered 返修 and gone back to the session: its handoff.
fn sent_back(desk: &Desk, lines: &Fake) -> Handoff {
    let Started::Opening { handoff, .. } = ruled(desk, lines, "s1", "L2", None, 1).unwrap() else {
        panic!()
    };
    desk.observe(&turn("start", ""), 2);
    desk.observe(&turn("complete", FIX), 3);
    desk.drive(lines, 4);
    kept(desk, &handoff)
}

/// A turn in the review's conversation, answering prompt `prompt`: the
/// person's own, a read again (`reread`), or one a page tells as it begins.
fn own(phase: &str, prompt: &str) -> Value {
    json!({"type":"turn","phase":phase,"conversation":"c-new","reply":"随便聊聊","prompt":"我自己问的","promptId":prompt,"messageId":format!("m-{prompt}")})
}

/// What the extension says a read of the conversation again found.
fn read(outcome: &str) -> Value {
    json!({"type":"reread","conversation":"c-new","outcome":outcome})
}

/// The words sent to ChatGPT, and the reads again asked of it.
fn went(lines: &Fake) -> (usize, usize) {
    let sent = lines.sent.borrow();
    let reads = sent.iter().filter(|(kind, ..)| kind == "reread").count();
    (sent.len() - reads, reads)
}

fn held(desk: &Desk, lines: &Fake, now: i64) {
    let refused = ruled(desk, lines, "s1", "L2", None, now);
    assert_eq!(refused.err(), Some(guard::writing_other()), "at {now}");
}

fn goes(desk: &Desk, lines: &Fake, now: i64) {
    let (words, _) = went(lines);
    let again = ruled(desk, lines, "s1", "L2", None, now).unwrap();
    let sent = matches!(
        again,
        Started::Sent {
            repeated: false,
            ..
        }
    );
    assert!(sent, "at {now}");
    assert_eq!(went(lines).0, words + 1);
}

#[test]
fn no_words_go_while_another_answer_is_written_in_the_conversation() {
    let (_temp, desk) = desk_of(5);
    let lines = Fake::default();
    let before = sent_back(&desk, &lines);
    assert!(!before.in_flight(), "its own review is answered");
    assert!(!before.writing(4), "and was heard to end");
    // The person asks something there; its answer begins.
    desk.observe(&own("start", "p-own"), 5);
    let (words, reads) = went(&lines);
    held(&desk, &lines, 6);
    assert_eq!(went(&lines), (words, reads + 1), "nothing went; read again");
    let after = kept(&desk, &before);
    assert!(
        !after.unsure() && after.auto,
        "and the handoff is as it was"
    );
    assert_eq!(
        (after.phase, after.counted(), after.steps.len()),
        (before.phase, before.counted(), before.steps.len())
    );
    // Written: the same words go.
    desk.observe(&own("complete", "p-own"), 7);
    goes(&desk, &lines, 8);
}

// Round 4, P1-04: the end of an older turn (told late, or read again in
// another tab) is not this one's; nor is what a read found, unless it tells
// this turn's answer again.
#[test]
fn only_the_end_of_the_same_prompts_turn_lets_the_words_go() {
    let (_temp, desk) = desk_of(5);
    let lines = Fake::default();
    sent_back(&desk, &lines);
    desk.observe(&own("start", "p-2"), 5);
    desk.observe(&own("complete", "p-1"), 6);
    held(&desk, &lines, 7);
    for outcome in ["waiting", "told", "streaming", "unloaded", "unreachable"] {
        desk.observe(&read(outcome), 8);
        held(&desk, &lines, 9);
    }
    // A newer turn begun meanwhile is the one waited on.
    desk.observe(&own("start", "p-3"), 10);
    desk.observe(&own("complete", "p-2"), 11);
    held(&desk, &lines, 12);
    // Read again, its answer is told again as its end.
    let mut again = own("complete", "p-3");
    again["reread"] = json!(true);
    desk.observe(&again, 13);
    goes(&desk, &lines, 14);
}

// Round 4, P1-04: a page writing already when its script began, or when the
// extension or PostPane started again, tells a beginning then; one whose
// prompt it could not tell ends at the next end heard.
#[test]
fn a_beginning_told_again_after_a_restart_holds_the_words() {
    let (_temp, desk) = desk_of(5);
    let lines = Fake::default();
    sent_back(&desk, &lines);
    let mut told = own("start", "p-2");
    told["again"] = json!(true);
    desk.observe(&told, 5);
    held(&desk, &lines, 6);
    desk.observe(&own("complete", "p-2"), 7);
    goes(&desk, &lines, 8);
    // A beginning whose prompt the page could not tell.
    let (_temp, desk) = desk_of(5);
    let lines = Fake::default();
    sent_back(&desk, &lines);
    let unknown = json!({"type":"turn","phase":"start","conversation":"c-new"});
    desk.observe(&unknown, 5);
    held(&desk, &lines, 6);
    desk.observe(&own("complete", "p-9"), 7);
    goes(&desk, &lines, 8);
}

#[test]
fn an_answer_never_heard_to_end_holds_words_no_longer_than_an_answer_may_take() {
    let (_temp, desk) = desk_of(5);
    let lines = Fake::default();
    sent_back(&desk, &lines);
    desk.observe(&own("start", "p-own"), 5);
    held(&desk, &lines, 5 + book::REPLY_WAIT_MS);
    goes(&desk, &lines, 5 + book::REPLY_WAIT_MS + 1);
}
