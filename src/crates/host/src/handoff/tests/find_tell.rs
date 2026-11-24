//! A review looked for is told of (#524, #510 L3 P2-01, P2-02; owner
//! 2026-11-24 「全按推荐」). Found absent, only the card said so, and the
//! session that sent it waited on; looked for 30 times and still not known,
//! nothing more happened ever; a look the extension never got counted, and
//! a restart forgot the count.
use super::*;
use crate::handoff::book::{FIND_AFTER_MS, FIND_EVERY_MS, FIND_MOST};

/// A handoff whose second review went out at 5 and was never known to have
/// gone in, with the request it went as; the session told of that already.
fn unsure(desk: &Desk, lines: &Fake) -> (Handoff, String) {
    let Started::Opening { handoff, .. } = ruled(desk, lines, "s1", "L2", None, 1).unwrap() else {
        panic!()
    };
    desk.observe(&turn("complete", FIX), 3);
    desk.drive(lines, 4);
    lines.send_fails.set(true);
    assert!(ruled(desk, lines, "s1", "L2", None, 5).is_err());
    lines.send_fails.set(false);
    let request = lines.requests.borrow().last().unwrap().clone();
    desk.tell(lines, 6);
    lines.sent.borrow_mut().clear();
    (desk.lock().get(&handoff.id).cloned().unwrap(), request)
}

fn found(desk: &Desk, request: &str, outcome: &str, now: i64) -> bool {
    desk.observe(
        &json!({"type":"found","conversation":"c-new","request":request,"outcome":outcome}),
        now,
    )
}

/// The `n`th look's time: the first `FIND_AFTER_MS` after the words went.
fn look(n: u32) -> i64 {
    5 + FIND_AFTER_MS + i64::from(n) * FIND_EVERY_MS
}

#[test]
fn words_found_absent_are_told_of_once() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let (_, request) = unsure(&desk, &lines);
    assert!(found(&desk, &request, "absent", 50_000));
    assert!(desk.tell(&lines, 50_001));
    let told = sent_as(&lines, "reply");
    assert_eq!(told.len(), 1, "{told:?}");
    assert!(
        told[0].1.contains("查明没送到") && told[0].1.contains("原样重送"),
        "{}",
        told[0].1
    );
    assert!(!desk.tell(&lines, 50_002), "told once");
}

#[test]
fn words_sent_again_before_the_telling_are_not_told_of() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let (_, request) = unsure(&desk, &lines);
    assert!(found(&desk, &request, "absent", 50_000));
    assert!(ruled(&desk, &lines, "s1", "L2", None, 50_001).is_ok());
    desk.tell(&lines, 50_002);
    assert!(sent_as(&lines, "reply").is_empty());
}

#[test]
fn after_the_last_look_the_person_has_it_and_the_session_is_told() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let (handoff, _) = unsure(&desk, &lines);
    for n in 0..FIND_MOST {
        desk.reread(&lines, look(n));
    }
    assert_eq!(sent_as(&lines, "find").len(), FIND_MOST as usize);
    let steps = desk.lock().get(&handoff.id).unwrap().steps.len();
    desk.reread(&lines, look(FIND_MOST) - 1);
    assert_eq!(
        desk.lock().get(&handoff.id).unwrap().steps.len(),
        steps,
        "the last look may yet answer"
    );
    desk.reread(&lines, look(FIND_MOST));
    assert_eq!(
        sent_as(&lines, "find").len(),
        FIND_MOST as usize,
        "no more looks"
    );
    let kept = desk.lock().get(&handoff.id).cloned().unwrap();
    assert_eq!(kept.steps.len(), steps + 1);
    let last = kept.steps.last().unwrap().text.clone().unwrap_or_default();
    // In the language set: the count, and that the person has it.
    assert!(last.contains(&FIND_MOST.to_string()), "{last}");
    assert!(
        last.contains("交常浩") || last.contains("left to the person"),
        "{last}"
    );
    assert!(kept.unsure() && !kept.auto, "still not known");
    assert!(desk.tell(&lines, look(FIND_MOST) + 1));
    let told = sent_as(&lines, "reply");
    assert_eq!(told.len(), 1, "{told:?}");
    assert!(
        told[0].1.contains("送达状态未知") && told[0].1.contains("30 次"),
        "{}",
        told[0].1
    );
    assert!(!desk.tell(&lines, look(FIND_MOST) + 2), "told once");
    // Given up once: not again.
    desk.reread(&lines, look(FIND_MOST + 5));
    assert_eq!(desk.lock().get(&handoff.id).unwrap().steps.len(), steps + 1);
}

#[test]
fn a_look_the_extension_never_got_does_not_count() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let (handoff, _) = unsure(&desk, &lines);
    lines.find_fails.set(true);
    for n in 0..FIND_MOST + 3 {
        desk.reread(&lines, look(n));
    }
    lines.find_fails.set(false);
    let steps = desk.lock().get(&handoff.id).unwrap().steps.len();
    let base = FIND_MOST + 3;
    for n in 0..FIND_MOST {
        desk.reread(&lines, look(base + n));
    }
    assert_eq!(
        desk.lock().get(&handoff.id).unwrap().steps.len(),
        steps,
        "30 looks got"
    );
    desk.reread(&lines, look(base + FIND_MOST));
    assert_eq!(desk.lock().get(&handoff.id).unwrap().steps.len(), steps + 1);
}

#[test]
fn the_looks_are_counted_across_a_restart() {
    let (temp, desk) = desk();
    let lines = Fake::default();
    let (handoff, _) = unsure(&desk, &lines);
    for n in 0..FIND_MOST - 1 {
        desk.reread(&lines, look(n));
    }
    drop(desk);
    let mut desk = Desk::new(Some(temp.path().join("data")));
    desk.since = 0;
    let steps = desk.lock().get(&handoff.id).unwrap().steps.len();
    let finds = sent_as(&lines, "find").len();
    desk.reread(&lines, look(FIND_MOST - 1));
    assert_eq!(sent_as(&lines, "find").len(), finds + 1, "the 30th look");
    desk.reread(&lines, look(FIND_MOST));
    assert_eq!(sent_as(&lines, "find").len(), finds + 1, "no 31st");
    assert_eq!(desk.lock().get(&handoff.id).unwrap().steps.len(), steps + 1);
}

/// Looked for as often as they may be, and the next look due: given up.
fn lost(desk: &Desk, lines: &Fake) {
    for n in 0..FIND_MOST {
        desk.reread(lines, look(n));
    }
    desk.reread(lines, look(FIND_MOST));
}

// Review of #524, P2: a restart after giving up said the words were pending
// again, with a stop and a second notice.
#[test]
fn given_up_words_are_not_told_of_again_after_a_restart() {
    let (temp, desk) = desk();
    let lines = Fake::default();
    let (handoff, _) = unsure(&desk, &lines);
    lost(&desk, &lines);
    assert!(desk.tell(&lines, look(FIND_MOST) + 1));
    let steps = desk.lock().get(&handoff.id).unwrap().steps.len();
    drop(desk);
    let mut desk = Desk::new(Some(temp.path().join("data")));
    desk.since = 0;
    assert_eq!(desk.lock().get(&handoff.id).unwrap().steps.len(), steps);
    assert!(!desk.tell(&lines, look(FIND_MOST) + 2), "told once");
}

// Review of #524, P3: giving up needs nothing from the extension, so it is
// not put off while the extension is away.
#[test]
fn words_are_given_up_while_the_extension_is_away() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let (handoff, _) = unsure(&desk, &lines);
    for n in 0..FIND_MOST {
        desk.reread(&lines, look(n));
    }
    let steps = desk.lock().get(&handoff.id).unwrap().steps.len();
    let away = Fake {
        offline: true,
        ..Fake::default()
    };
    desk.reread(&away, look(FIND_MOST));
    assert_eq!(desk.lock().get(&handoff.id).unwrap().steps.len(), steps + 1);
}

// Review of #524, P2: words found absent put back an earlier review still
// not known to have gone in; the round trip stays stopped, and the session
// is not told it goes on.
#[test]
fn words_found_absent_under_an_earlier_unsure_review_say_the_round_trip_stays_stopped() {
    let temp = tempfile::tempdir().unwrap();
    book::set_review_limit(&temp.path().join("data"), 5).unwrap();
    let mut desk = Desk::new(Some(temp.path().join("data")));
    desk.since = 0;
    let lines = Fake::default();
    let (handoff, _) = unsure(&desk, &lines);
    desk.observe(&reply_as(asked(), PASS, "m2"), 7);
    lines.send_fails.set(true);
    assert!(ruled(&desk, &lines, "s1", "L2", None, 8).is_err());
    lines.send_fails.set(false);
    let second = lines.requests.borrow().last().unwrap().clone();
    desk.tell(&lines, 9);
    lines.sent.borrow_mut().clear();
    assert!(found(&desk, &second, "absent", 50_000));
    assert!(!desk.lock().get(&handoff.id).unwrap().auto);
    assert!(desk.tell(&lines, 50_001));
    let told = sent_as(&lines, "reply");
    assert_eq!(told.len(), 1, "{told:?}");
    assert!(
        told[0].1.contains("查明没送到") && told[0].1.contains("自动往返仍停着"),
        "{}",
        told[0].1
    );
}
