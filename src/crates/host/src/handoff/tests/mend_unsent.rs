//! #528 (owner 2026-11-24 「全按推荐」): PostPane's ask to mend an answer's
//! last lines, send never pressed for it, did not go: it is as before it was
//! asked, the round trip goes on, and it is asked once more a while after.
//! Never pressed again, it stops as words never known to have gone in did.
use super::*;
use crate::handoff::book::MEND_AGAIN_MS;

const NO_VERDICT: &str = "1. 都好";

fn kept(desk: &Desk, handoff: &Handoff) -> Handoff {
    desk.lock().get(&handoff.id).cloned().unwrap()
}

fn formats(lines: &Fake) -> usize {
    lines
        .requests
        .borrow()
        .iter()
        .filter(|r| r.contains("~format"))
        .count()
}

/// A review whose answer's last lines do not hold, and whose ask to mend
/// them at 4 was never pressed.
fn mending_unpressed(desk: &Desk, lines: &Fake) -> Handoff {
    let Started::Opening { handoff, .. } = ruled(desk, lines, "s1", "L2", None, 1).unwrap() else {
        panic!()
    };
    desk.observe(&turn("complete", NO_VERDICT), 3);
    lines.send_unpressed.set(true);
    desk.drive(lines, 4);
    lines.send_unpressed.set(false);
    assert_eq!(formats(lines), 1);
    handoff
}

#[test]
fn a_mending_never_pressed_did_not_go_and_is_asked_once_more() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = mending_unpressed(&desk, &lines);
    let after = kept(&desk, &handoff);
    assert!(!after.unsure(), "nothing went");
    assert!(after.auto, "the round trip goes on");
    assert_eq!(after.phase, Phase::Replied, "its answer waits again");
    let note = after.steps.last().unwrap().text.clone().unwrap_or_default();
    assert!(note.contains("busy"), "{note}");
    // Not at once: ChatGPT was likely busy.
    desk.drive(&lines, 4 + MEND_AGAIN_MS - 1);
    assert_eq!(formats(&lines), 1);
    desk.drive(&lines, 4 + MEND_AGAIN_MS);
    assert_eq!(formats(&lines), 2, "asked once more");
    let after = kept(&desk, &handoff);
    assert_eq!(after.phase, Phase::Delivered);
}

#[test]
fn a_mending_never_pressed_twice_stops_as_unconfirmed() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = mending_unpressed(&desk, &lines);
    lines.send_unpressed.set(true);
    desk.drive(&lines, 4 + MEND_AGAIN_MS);
    assert_eq!(formats(&lines), 2);
    let after = kept(&desk, &handoff);
    assert!(after.unsure() && !after.auto, "stopped, as before #528");
    desk.drive(&lines, 4 + 3 * MEND_AGAIN_MS);
    assert_eq!(formats(&lines), 2, "no third");
}
