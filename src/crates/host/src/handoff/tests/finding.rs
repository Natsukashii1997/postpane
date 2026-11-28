//! Words never known to have gone in are looked for in their conversation
//! (#509). On 2026-11-21 two handoffs took no words for a day: the send of
//! a review had given up waiting, nothing ever looked whether it was there,
//! and the same words sent again came back as 「刚才已经送到」.
use super::*;
use crate::handoff::book::{FIND_AFTER_MS, FIND_EVERY_MS};

/// A handoff whose second review went out at 5 and was never known to have
/// gone in, with the request it went as.
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
    let kept = desk.lock().get(&handoff.id).cloned().unwrap();
    assert!(kept.unsure() && !kept.auto);
    (kept, request)
}

fn found(desk: &Desk, request: &str, outcome: &str, now: i64) -> bool {
    found_as(desk, request, outcome, None, now)
}

/// Word of a look, with the prompt the words were found as (round 1 P1-02).
fn found_as(desk: &Desk, request: &str, outcome: &str, prompt: Option<&str>, now: i64) -> bool {
    desk.observe(
        &json!({"type":"found","conversation":"c-new","request":request,"outcome":outcome,"promptId":prompt}),
        now,
    )
}

#[test]
fn words_never_known_to_have_gone_in_are_looked_for() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let (handoff, request) = unsure(&desk, &lines);
    let finds = || sent_as(&lines, "find");
    // Not while a send may still be waiting for word.
    desk.reread(&lines, 5 + FIND_AFTER_MS - 1);
    assert!(finds().is_empty());
    desk.reread(&lines, 5 + FIND_AFTER_MS);
    assert_eq!(finds(), [("c-new".to_owned(), request.clone())]);
    let first = 5 + FIND_AFTER_MS;
    desk.reread(&lines, first + FIND_EVERY_MS - 1);
    assert_eq!(finds().len(), 1, "asked lately");
    desk.reread(&lines, first + FIND_EVERY_MS);
    assert_eq!(finds().len(), 2);
    // Not known still: nothing moves.
    assert!(!found(&desk, &request, "unread", first + FIND_EVERY_MS + 1));
    let after = desk.lock().get(&handoff.id).cloned().unwrap();
    assert_eq!(
        (after.steps.len(), after.auto),
        (handoff.steps.len(), false)
    );
    assert!(after.unsure());
}

#[test]
fn words_found_in_the_conversation_went_in() {
    for restarted in [false, true] {
        let (temp, mut desk) = desk();
        let lines = Fake::default();
        let (handoff, request) = unsure(&desk, &lines);
        if restarted {
            drop(desk);
            desk = Desk::new(Some(temp.path().join("data")));
            desk.since = 0;
        }
        let asks = |desk: &Desk| {
            let book = desk.lock();
            let kept = book.get(&handoff.id).unwrap();
            kept.steps
                .iter()
                .filter(|s| s.kind == StepKind::Ask)
                .count()
        };
        let before = asks(&desk);
        assert!(found(&desk, &request, "there", 50_000), "{restarted}");
        let kept = desk.lock().get(&handoff.id).cloned().unwrap();
        assert!(!kept.unsure(), "{restarted}");
        assert!(kept.auto && kept.halt.is_none(), "{restarted}");
        assert_eq!(kept.phase, Phase::Delivered, "{restarted}");
        assert_eq!(asks(&desk), before + 1, "{restarted}");
        // Found again: nothing more.
        assert!(!found(&desk, &request, "there", 50_001));
        assert_eq!(asks(&desk), before + 1);
        // Its answer passes as any review's does.
        // A step after it sets right what the session heard (#544).
        let correction = kept.steps.last().unwrap();
        assert_eq!(
            correction.cause,
            Some(crate::handoff::book::Cause::Confirmed),
            "{restarted}"
        );
        let words = kept.last_asked().unwrap().text.clone();
        desk.observe(&reply_as(words, PASS, "m2"), 50_002);
        let kept = desk.lock().get(&handoff.id).cloned().unwrap();
        assert_eq!(kept.phase, Phase::Replied, "{restarted}");
        assert!(!kept.unsure());
    }
}

#[test]
fn words_not_in_the_conversation_did_not_go_and_may_go_again() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let (handoff, request) = unsure(&desk, &lines);
    let sends = lines.requests.borrow().len();
    assert!(found(&desk, &request, "absent", 50_000));
    let kept = desk.lock().get(&handoff.id).cloned().unwrap();
    assert!(!kept.unsure());
    assert!(
        kept.auto && kept.halt.is_none(),
        "it was this that stopped it"
    );
    assert_eq!(
        kept.steps.last().unwrap().kind,
        StepKind::Resume,
        "{:?}",
        kept.steps
    );
    assert_eq!(kept.phase, handoff.phase);
    // The same words again really go.
    let again = ruled(&desk, &lines, "s1", "L2", None, 50_001).unwrap();
    assert!(matches!(
        again,
        Started::Sent {
            repeated: false,
            ..
        }
    ));
    assert_eq!(lines.requests.borrow().len(), sends + 1);
}

#[test]
fn words_found_after_their_answer_still_cannot_pass() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let (handoff, request) = unsure(&desk, &lines);
    desk.observe(&reply_as(asked(), PASS, "m2"), 6);
    // Answered, they are looked for no more; word of them changes nothing.
    desk.reread(&lines, 5 + FIND_AFTER_MS);
    assert!(sent_as(&lines, "find").is_empty());
    let before = desk.lock().get(&handoff.id).cloned().unwrap();
    assert!(!found(&desk, &request, "absent", 50_000));
    assert!(!found(&desk, &request, "there", 50_001));
    let after = desk.lock().get(&handoff.id).cloned().unwrap();
    assert_eq!(after.steps.len(), before.steps.len());
    assert!(after.unsure());
}

// #509 round 1 P1-01: the words are absent only past the last prompt known
// to have gone in, so each look names it; none known, none named.
#[test]
fn a_look_names_the_last_prompt_known_to_have_gone_in() {
    for (known, named) in [(Some("p1"), Some("p1".to_owned())), (None, None)] {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        *lines.asked_as.borrow_mut() = known.map(str::to_owned);
        let (_, request) = unsure(&desk, &lines);
        desk.reread(&lines, 5 + FIND_AFTER_MS);
        assert_eq!(sent_as(&lines, "find"), [("c-new".to_owned(), request)]);
        // Nothing known: nothing named (the extension then never says absent).
        assert_eq!(*lines.afters.borrow(), [named]);
    }
}

// #509 round 1 P1-02: words found after a restart keep the prompt they were
// found as, so their answer is held to them by it (#437), as any words'.
#[test]
fn words_found_keep_the_prompt_they_were_found_as() {
    for restarted in [false, true] {
        let (temp, mut desk) = desk();
        let lines = Fake::default();
        let (handoff, request) = unsure(&desk, &lines);
        if restarted {
            drop(desk);
            desk = Desk::new(Some(temp.path().join("data")));
            desk.since = 0;
        }
        assert!(found_as(&desk, &request, "there", Some("p2"), 50_000));
        let kept = desk.lock().get(&handoff.id).cloned().unwrap();
        assert_eq!(
            kept.last_asked().unwrap().asked_id.as_deref(),
            Some("p2"),
            "{restarted}"
        );
        // Another prompt's answer is not theirs, whatever it says.
        let words = kept.last_asked().unwrap().text.clone();
        let other = json!({"type":"turn","phase":"complete","conversation":"c-new","prompt":words,"promptId":"p3","reply":PASS,"messageId":"m2"});
        desk.observe(&other, 50_001);
        let kept = desk.lock().get(&handoff.id).cloned().unwrap();
        assert_ne!(kept.phase, Phase::Replied, "{restarted}");
    }
}

// #509 round 1 P1-04: an earlier review answered and never known to have
// gone in stays unsure under a later one, across a restart: a look that
// finds the later did not go puts it back, and its answer still cannot pass.
#[test]
fn an_earlier_review_unsure_is_kept_across_a_restart() {
    let temp = tempfile::tempdir().unwrap();
    // Room for a third review.
    book::set_review_limit(&temp.path().join("data"), 5).unwrap();
    let mut desk = Desk::new(Some(temp.path().join("data")));
    desk.since = 0;
    let lines = Fake::default();
    let (handoff, first) = unsure(&desk, &lines);
    desk.observe(&reply_as(asked(), PASS, "m2"), 6);
    lines.send_fails.set(true);
    assert!(ruled(&desk, &lines, "s1", "L2", None, 7).is_err());
    lines.send_fails.set(false);
    let second = lines.requests.borrow().last().unwrap().clone();
    assert_ne!(first, second);
    drop(desk);
    let mut desk = Desk::new(Some(temp.path().join("data")));
    desk.since = 0;
    assert!(found(&desk, &second, "absent", 50_000));
    let kept = desk.lock().get(&handoff.id).cloned().unwrap();
    let pending = kept
        .gate
        .pending
        .as_ref()
        .expect("the earlier one, put back");
    assert_eq!(
        (pending.request.as_str(), pending.answered),
        (first.as_str(), true)
    );
    assert!(kept.unsure());
    assert!(!kept.auto, "still stopped on the earlier one");
    desk.drive(&lines, 50_001);
    let kept = desk.lock().get(&handoff.id).cloned().unwrap();
    assert_eq!(kept.status, Status::Open, "its answer did not pass");
}
