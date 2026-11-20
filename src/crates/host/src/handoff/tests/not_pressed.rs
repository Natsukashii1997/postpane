//! #466: words the extension says send was never pressed for are not in the
//! conversation. The handoff is as before they were asked, the round trip
//! goes on, and the session may send them again. Words not known to have
//! gone in or not stay under the one rule for those (`unsure.rs`).
use super::*;

const FIX: &str = "1. 还差\n受审版本：0123456\n审查出口：返修\n结论：需修改";
const BUSY: &str = "ChatGPT 插件没能完成：busy";

fn kept(desk: &Desk, handoff: &Handoff) -> Handoff {
    desk.lock().get(&handoff.id).cloned().unwrap()
}

/// A review answered 返修 and gone back to the session: its handoff.
fn sent_back(desk: &Desk, lines: &Fake) -> Handoff {
    let Started::Opening { handoff, .. } = ruled(desk, lines, "s1", "L2", None, 1).unwrap() else {
        panic!()
    };
    desk.observe(&turn("complete", FIX), 3);
    desk.drive(lines, 4);
    kept(desk, &handoff)
}

#[test]
fn words_send_was_never_pressed_for_leave_the_handoff_as_it_was() {
    let (_temp, desk) = desk_of(5);
    let lines = Fake::default();
    let before = sent_back(&desk, &lines);
    assert!(before.auto);
    lines.send_unpressed.set(true);
    let refused = ruled(&desk, &lines, "s1", "L2", None, 5);
    assert_eq!(refused.err(), Some(guard::not_sent(BUSY)));
    let after = kept(&desk, &before);
    assert!(!after.unsure(), "nothing is with ChatGPT");
    assert!(after.auto, "the round trip goes on");
    assert_eq!(
        (after.phase, after.counted(), after.gate.head.clone()),
        (before.phase, before.counted(), before.gate.head.clone())
    );
    assert_eq!(after.steps.len(), before.steps.len() + 1);
    let note = after.steps.last().unwrap();
    assert_eq!(note.kind, StepKind::Work);
    assert_eq!(
        note.text.as_deref(),
        Some(guard::not_sent_note(BUSY).as_str())
    );
    assert!(desk.asking().is_empty());
    // The same words go again, and in.
    lines.send_unpressed.set(false);
    let sends = lines.sent.borrow().len();
    let again = ruled(&desk, &lines, "s1", "L2", None, 5).unwrap();
    assert!(matches!(
        again,
        Started::Sent {
            repeated: false,
            ..
        }
    ));
    assert_eq!(lines.sent.borrow().len(), sends + 1);
    desk.observe(&reply_as(asked(), FIX, "m2"), 7);
    assert_eq!(kept(&desk, &before).counted(), before.counted() + 1);
}

#[test]
fn what_was_unsure_before_them_stays_unsure() {
    let (_temp, desk) = desk_of(5);
    let lines = Fake::default();
    let handoff = sent_back(&desk, &lines);
    // A review never known to have gone in, and its answer.
    lines.send_fails.set(true);
    assert!(ruled(&desk, &lines, "s1", "L2", None, 5).is_err());
    lines.send_fails.set(false);
    desk.observe(&reply_as(asked(), FIX, "m2"), 6);
    desk.catch_up(&lines, 7);
    let before = kept(&desk, &handoff);
    let unsure = before.gate.pending.clone().unwrap();
    assert!(unsure.answered);
    // Other words, send never pressed for them: unsure of that review still.
    lines.send_unpressed.set(true);
    let refused = ruled(&desk, &lines, "s1", "L2", None, 8);
    assert_eq!(refused.err(), Some(guard::not_sent(BUSY)));
    let after = kept(&desk, &handoff);
    let pending = after.gate.pending.as_ref().unwrap();
    assert_eq!(
        (pending.request.as_str(), pending.answered),
        (unsure.request.as_str(), true)
    );
    assert_eq!(
        (after.auto, after.counted()),
        (before.auto, before.counted())
    );
}

#[test]
fn words_not_known_to_have_gone_stay_under_the_rule_for_those() {
    let (_temp, desk) = desk_of(5);
    let lines = Fake::default();
    let handoff = sent_back(&desk, &lines);
    lines.send_fails.set(true);
    let refused = ruled(&desk, &lines, "s1", "L2", None, 5);
    let timeout = "ChatGPT 插件没能完成：timeout";
    assert_eq!(refused.err(), Some(guard::sent_unknown(timeout)));
    let after = kept(&desk, &handoff);
    assert!(after.unsure() && !after.auto);
}
