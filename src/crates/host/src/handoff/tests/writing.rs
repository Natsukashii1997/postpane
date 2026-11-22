//! #507 review round 3, P1-04: an answer being written in a handoff's
//! conversation that is not its review's (the person asked something there
//! once the review was back). No words go in beside it.
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

/// A turn of the person's own in the review's conversation.
fn own(phase: &str) -> Value {
    json!({"type":"turn","phase":phase,"conversation":"c-new","reply":"随便聊聊","prompt":"我自己问的","messageId":"m-own"})
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

fn goes(desk: &Desk, lines: &Fake, now: i64) {
    let (words, _) = went(lines);
    let again = ruled(desk, lines, "s1", "L2", None, 6).unwrap();
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
    desk.observe(&own("start"), 5);
    let (words, reads) = went(&lines);
    let refused = ruled(&desk, &lines, "s1", "L2", None, 6);
    assert_eq!(refused.err(), Some(guard::writing_other()));
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
    desk.observe(&own("complete"), 7);
    goes(&desk, &lines, 8);
}

// A beginning is often heard with no end: the tab moved on or went away
// mid-answer, the answer was stopped. What the page says now ends it.
#[test]
fn a_read_that_finds_no_answer_being_written_lets_the_words_go() {
    for (outcome, held) in [
        ("streaming", true),
        ("unreachable", true),
        ("unopened", true),
        ("unloaded", true),
        ("undrawn", true),
        ("waiting", false),
        ("told", false),
    ] {
        let (_temp, desk) = desk_of(5);
        let lines = Fake::default();
        sent_back(&desk, &lines);
        desk.observe(&own("start"), 5);
        assert!(ruled(&desk, &lines, "s1", "L2", None, 6).is_err());
        desk.observe(&read(outcome), 7);
        if held {
            let refused = ruled(&desk, &lines, "s1", "L2", None, 8);
            assert_eq!(refused.err(), Some(guard::writing_other()), "{outcome}");
        } else {
            goes(&desk, &lines, 8);
        }
    }
}

#[test]
fn an_answer_never_heard_to_end_holds_words_no_longer_than_an_answer_may_take() {
    let (_temp, desk) = desk_of(5);
    let lines = Fake::default();
    sent_back(&desk, &lines);
    desk.observe(&own("start"), 5);
    let within = 5 + book::REPLY_WAIT_MS;
    let refused = ruled(&desk, &lines, "s1", "L2", None, within);
    assert_eq!(refused.err(), Some(guard::writing_other()));
    let (words, _) = went(&lines);
    ruled(&desk, &lines, "s1", "L2", None, within + 1).unwrap();
    assert_eq!(went(&lines).0, words + 1);
}
