//! #528 (owner 2026-11-24 「全按推荐」): PostPane's ask to mend an answer's
//! last lines, send never pressed for it, did not go: it is as before it was
//! asked, the round trip goes on, and it is asked once more a while after.
//! Never pressed again, it did not go either: the round trip stops, saying
//! so, and it holds nothing back (#544). Pressed and not known, it stops as
//! words never known to have gone in do.
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

// #544 (owner 2026-11-28 「A、B 都改」): never pressed the once more as
// well, it is known not to have gone: the round trip stops saying so, the
// answer goes back to the session with that, not that it may have gone,
// and nothing of it holds the next review back.
#[test]
fn a_mending_never_pressed_twice_did_not_go_and_holds_nothing_back() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = mending_unpressed(&desk, &lines);
    lines.send_unpressed.set(true);
    desk.drive(&lines, 4 + MEND_AGAIN_MS);
    lines.send_unpressed.set(false);
    assert_eq!(formats(&lines), 2);
    let after = kept(&desk, &handoff);
    assert!(!after.unsure(), "nothing it sent is pending");
    assert!(!after.auto, "the round trip stopped");
    let halt = guard::mending_never_sent("ChatGPT 插件没能完成：busy");
    assert_eq!(after.halt.as_deref(), Some(halt.as_str()));
    desk.drive(&lines, 4 + 3 * MEND_AGAIN_MS);
    assert_eq!(formats(&lines), 2, "no third");
    // The answer went back with why, once, and no word it may have gone.
    assert_eq!(after.phase, Phase::Returned);
    let back = sent_as(&lines, "reply");
    assert_eq!(back.len(), 1);
    assert!(back[0].1.contains(&halt), "{}", back[0].1);
    assert!(
        !desk.tell(&lines, 4 + 3 * MEND_AGAIN_MS),
        "no notice of words unknown"
    );
    // The next review goes, not held back as one still waiting.
    let sends = formats(&lines);
    let next = ruled(&desk, &lines, "s1", "L2", None, 6 + 3 * MEND_AGAIN_MS);
    assert!(
        matches!(
            next,
            Ok(Started::Sent {
                repeated: false,
                ..
            })
        ),
        "{next:?}"
    );
    assert_eq!(formats(&lines), sends);
}

// Pressed and never seen to begin the once more: not known, as before.
#[test]
fn a_mending_not_known_to_have_gone_the_once_more_stops_as_unconfirmed() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = mending_unpressed(&desk, &lines);
    lines.send_fails.set(true);
    desk.drive(&lines, 4 + MEND_AGAIN_MS);
    lines.send_fails.set(false);
    assert_eq!(formats(&lines), 2);
    let after = kept(&desk, &handoff);
    assert!(after.unsure() && !after.auto, "stopped as not known");
}
