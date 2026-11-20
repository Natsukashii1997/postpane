//! #446: word that PostPane's ask to mend the last lines went in, come after
//! its send gave up waiting and before the mended answer, is taken as a
//! review's is (`asking`): the mending is no longer unsure, and the round
//! trip that stopped for it goes on. Only for a mending sent in this run,
//! and only its own request.
use super::*;
use agent_hud_runtime::chatgpt::handoffs::REPLY_WAIT_MS;

const PASS: &str = "全部关闭\n受审版本：0123456\n未决：P0 0，P1 0\n审查出口：通过\n结论：通过";
const FIX: &str = "1. 还差\n受审版本：0123456\n审查出口：返修\n结论：需修改";
const NO_VERDICT: &str = "1. 都好";

/// What the extension says once the words asked as `request` are in.
fn word(request: &str) -> Value {
    json!({"type":"sent","requestId":request,"ok":true,"conversation":"c-new"})
}

/// A review whose answer's last lines do not hold, and whose ask to mend
/// them gave up waiting for word at 4: the handoff, and the ask's request.
fn mending_unsure(desk: &Desk, lines: &Fake) -> (Handoff, String) {
    let Started::Opening { handoff, .. } = ruled(desk, lines, "s1", "L2", None, 1).unwrap() else {
        panic!()
    };
    desk.observe(&turn("complete", NO_VERDICT), 3);
    lines.send_fails.set(true);
    desk.drive(lines, 4);
    lines.send_fails.set(false);
    let request = lines.requests.borrow().last().unwrap().clone();
    assert!(request.contains("~format"), "{request}");
    let kept = desk.lock().get(&handoff.id).cloned().unwrap();
    assert!(kept.unsure() && !kept.auto, "stopped on it");
    (kept, request)
}

fn kept(desk: &Desk, handoff: &Handoff) -> Handoff {
    desk.lock().get(&handoff.id).cloned().unwrap()
}

fn notes(handoff: &Handoff, note: &str) -> usize {
    let noted = |s: &&Step| s.text.as_deref() == Some(note);
    handoff.steps.iter().filter(noted).count()
}

#[test]
fn late_word_of_a_mending_before_its_answer_lets_the_mended_pass() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let (handoff, request) = mending_unsure(&desk, &lines);
    assert!(desk.observe(&word(&request), 5), "the card changed");
    let after = kept(&desk, &handoff);
    assert!(!after.unsure(), "known to have gone in");
    assert!(after.auto, "the stop was for this: on again");
    assert_eq!(notes(&after, &guard::mending_confirmed_late()), 1);
    let resumed = after.steps.last().unwrap();
    assert_eq!((resumed.kind, resumed.auto), (StepKind::Resume, true));
    // The same word again changes nothing.
    assert!(!desk.observe(&word(&request), 6));
    assert_eq!(kept(&desk, &handoff).steps.len(), after.steps.len());
    // The mended answer ends the review as any pass does.
    desk.observe(&reply_as(asked(), PASS, "m2"), 7);
    desk.drive(&lines, 8);
    assert_eq!(status(&desk, 8).0, "closed");
}

/// Review of #446, P2-03: word of another request, of the same handoff,
/// is not this mending's.
#[test]
fn word_of_another_request_leaves_the_mending_unsure() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let (handoff, request) = mending_unsure(&desk, &lines);
    let before = kept(&desk, &handoff);
    assert!(!desk.observe(&word(&format!("{request}9")), 5));
    assert!(!desk.observe(&word(&format!("{}~format1", handoff.id)), 6));
    let after = kept(&desk, &handoff);
    assert!(after.unsure() && !after.auto);
    assert_eq!(after.steps.len(), before.steps.len());
    desk.observe(&reply_as(asked(), PASS, "m2"), 7);
    desk.drive(&lines, 8);
    assert_eq!(status(&desk, 8).0, "open");
}

/// Review of #446, P2-01: turned on again by the person, then stopped for
/// an answer that did not come in time: late word clears the mending, and
/// that later stop stays.
#[test]
fn late_word_of_a_mending_leaves_a_later_stop_as_it_is() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let (handoff, request) = mending_unsure(&desk, &lines);
    desk.act(&lines, &handoff.id, "resume", 5).unwrap();
    assert!(desk.late(5 + REPLY_WAIT_MS + 1));
    let stopped = kept(&desk, &handoff);
    assert!(!stopped.auto && stopped.unsure());
    assert!(desk.observe(&word(&request), 5 + REPLY_WAIT_MS + 2));
    let after = kept(&desk, &handoff);
    assert!(!after.unsure(), "known to have gone in");
    assert!(!after.auto, "stopped since for another reason: it stays");
    assert_eq!(notes(&after, &guard::mending_confirmed_late()), 1);
    assert!(after
        .steps
        .iter()
        .all(|s| s.kind != StepKind::Resume || !s.auto));
}

#[test]
fn late_word_of_a_mending_after_its_answer_still_only_goes_on_the_card() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let (handoff, request) = mending_unsure(&desk, &lines);
    desk.observe(&reply_as(asked(), PASS, "m2"), 5);
    desk.observe(&word(&request), 6);
    let after = kept(&desk, &handoff);
    assert!(after.unsure() && !after.auto);
    assert_eq!(notes(&after, &guard::confirmed_late()), 1);
    assert_eq!(notes(&after, &guard::mending_confirmed_late()), 0);
    desk.drive(&lines, 7);
    assert_eq!(status(&desk, 7).0, "open");
}

#[test]
fn late_word_of_a_mending_sent_before_a_restart_is_not_taken() {
    let (temp, desk) = desk();
    let lines = Fake::default();
    let (handoff, request) = mending_unsure(&desk, &lines);
    drop(desk);
    let desk = Desk::new(Some(temp.path().join("data")));
    assert!(!desk.observe(&word(&request), 5));
    let after = kept(&desk, &handoff);
    assert!(after.unsure() && !after.auto);
    assert_eq!(notes(&after, &guard::mending_confirmed_late()), 0);
}

#[test]
fn late_word_of_a_mending_never_clears_a_review_still_unsure() {
    let (_temp, desk) = desk_of(5);
    let lines = Fake::default();
    let Started::Opening { handoff, .. } = ruled(&desk, &lines, "s1", "L2", None, 1).unwrap()
    else {
        panic!()
    };
    desk.observe(&turn("complete", FIX), 3);
    desk.drive(&lines, 4);
    // The next review is never known to have gone in; its answer's last
    // lines do not hold, and the person turns the round trip on again.
    lines.send_fails.set(true);
    assert!(ruled(&desk, &lines, "s1", "L2", None, 5).is_err());
    desk.observe(&reply_as(asked(), NO_VERDICT, "m2"), 6);
    desk.act(&lines, &handoff.id, "resume", 7).unwrap();
    desk.drive(&lines, 8);
    lines.send_fails.set(false);
    let request = lines.requests.borrow().last().unwrap().clone();
    assert!(request.contains("~format"), "{request}");
    assert!(kept(&desk, &handoff).gate.mending.is_some());
    assert!(desk.observe(&word(&request), 9));
    let after = kept(&desk, &handoff);
    assert!(after.gate.mending.is_none() && after.gate.pending.is_some());
    assert!(!after.auto, "the review is unsure still: it stays stopped");
    assert_eq!(notes(&after, &guard::mending_confirmed_late()), 1);
    desk.observe(&reply_as(asked(), PASS, "m3"), 10);
    desk.drive(&lines, 11);
    assert_eq!(status(&desk, 11).0, "open");
}

/// The word is read while the send still waits, and the send gives up all
/// the same (the reading thread tells who listens after who waits): it went
/// in, and nothing stops.
#[test]
fn word_heard_just_as_the_send_gives_up_counts_as_gone_in() {
    let (_temp, desk) = desk();
    let desk: &'static Desk = Box::leak(Box::new(desk));
    let mut lines = Fake::default();
    let Started::Opening { handoff, .. } = ruled(desk, &lines, "s1", "L2", None, 1).unwrap() else {
        panic!()
    };
    desk.observe(&turn("complete", NO_VERDICT), 3);
    let id: &'static str = Box::leak(handoff.id.clone().into_boxed_str());
    lines.send_fails.set(true);
    lines.on_send = Some(Box::new(move || {
        let request = desk.lock().get(id).unwrap().gate.mending.clone();
        desk.observe(&word(&request.unwrap().request), 4);
    }));
    assert!(desk.drive(&lines, 4));
    lines.on_send = None;
    let after = kept(desk, &handoff);
    assert!(!after.unsure() && after.auto, "{:?}", after.steps.last());
    assert!(after.steps.iter().all(|s| s.kind != StepKind::Fail));
    assert_eq!(notes(&after, &guard::mending_confirmed_late()), 0);
    assert!(sent_as(&lines, "reply").is_empty(), "nothing to tell of");
}

/// Word in time, heard by who listens before the send returns: no late note.
#[test]
fn word_in_time_is_not_noted_as_late() {
    let (_temp, desk) = desk();
    let desk: &'static Desk = Box::leak(Box::new(desk));
    let mut lines = Fake::default();
    let Started::Opening { handoff, .. } = ruled(desk, &lines, "s1", "L2", None, 1).unwrap() else {
        panic!()
    };
    desk.observe(&turn("complete", NO_VERDICT), 3);
    let id: &'static str = Box::leak(handoff.id.clone().into_boxed_str());
    lines.on_send = Some(Box::new(move || {
        let request = desk.lock().get(id).unwrap().gate.mending.clone();
        desk.observe(&word(&request.unwrap().request), 4);
    }));
    assert!(desk.drive(&lines, 4));
    lines.on_send = None;
    let after = kept(desk, &handoff);
    assert!(!after.unsure() && after.auto);
    assert_eq!(notes(&after, &guard::mending_confirmed_late()), 0);
    assert_eq!(notes(&after, &guard::confirmed_late()), 0);
}
