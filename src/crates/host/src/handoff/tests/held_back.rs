//! #410 S1: an answer taken while the auto round trip is off goes back to
//! the session that asked, once, whatever stopped the round trip and
//! whatever the answer says; new words taken after a stop PostPane made
//! turn it on again, the person's pause not.
use super::*;
use crate::handoff::book::{FIX_WAIT_MS, REPLY_WAIT_MS};

const MIN: i64 = 60 * 1000;
const PASS: &str = "1. 都改好了\n审查出口：通过\n结论：通过";
const FIX: &str = "1. 还差测试\n审查出口：返修\n结论：需修改";
const ESCALATE: &str = "1. 要改方案\n审查出口：决策升级\n结论：需修改";
const NO_VERDICT: &str = "1. 还差一点，先这样";

/// Words handed over again by the session, as `relay_to_chatgpt` does.
fn again(desk: &Desk, lines: &Fake, at: i64) {
    let started = desk
        .start(
            lines,
            "s1",
            Some("/w"),
            "修登录",
            Some("按意见改完"),
            "下一轮",
            false,
            at,
        )
        .unwrap();
    assert!(matches!(started, Started::Sent { .. }), "taken at {at}");
}

/// ChatGPT answers `answer` at `at`, and PostPane drives what it does; an
/// answer whose last lines do not hold is asked once to be mended and
/// comes back the same. How many words went back to the session for it.
fn answer(desk: &Desk, lines: &Fake, answer: &str, at: i64) -> usize {
    let before = replies(lines);
    desk.observe(&turn("complete", answer), at);
    for _ in 0..3 {
        desk.catch_up(lines, at);
        let mending = lines
            .sent
            .borrow()
            .last()
            .is_some_and(|s| s.0 == "send" && s.2.contains("驿窗自动发送"));
        if mending {
            desk.observe(&turn("complete", answer), at);
        }
    }
    // Driven again later, nothing goes twice.
    desk.catch_up(lines, at + MIN);
    replies(lines) - before
}

fn last_back(lines: &Fake) -> String {
    let sent = lines.sent.borrow();
    sent.iter()
        .rev()
        .find(|s| s.0 == "reply")
        .unwrap()
        .2
        .clone()
}

/// What stopped the round trip before the answer came, as it happens.
#[derive(Clone, Copy, Debug)]
enum Stop {
    /// ChatGPT kept the words past `REPLY_WAIT_MS`.
    NoAnswer,
    /// The person paused it.
    Paused,
    /// Claude did not hand over again within `FIX_WAIT_MS`; it did later.
    NoHandover,
    /// The answer before had no verdict; Claude handed over again.
    NoVerdict,
    /// The answer before escalated; Claude handed over again.
    Escalated,
}

/// A handoff whose auto round trip `stop` stopped, with words now waiting
/// on ChatGPT's answer. When the next answer may come.
fn stopped(desk: &Desk, lines: &Fake, stop: Stop) -> (Handoff, i64) {
    let handoff = opened(desk, lines);
    let at = match stop {
        Stop::NoAnswer => {
            assert!(desk.late(2 + REPLY_WAIT_MS + 1));
            2 + REPLY_WAIT_MS + 2
        }
        Stop::Paused => {
            desk.act(lines, &handoff.id, "pause", 3).unwrap();
            4
        }
        Stop::NoHandover => {
            assert_eq!(answer(desk, lines, FIX, 3), 1);
            assert!(desk.late(3 + MIN + FIX_WAIT_MS + 1));
            let at = 3 + MIN + FIX_WAIT_MS + 2;
            again(desk, lines, at);
            at + 1
        }
        Stop::NoVerdict | Stop::Escalated => {
            let first = if matches!(stop, Stop::NoVerdict) {
                NO_VERDICT
            } else {
                ESCALATE
            };
            assert_eq!(answer(desk, lines, first, 3), 1);
            again(desk, lines, 10 * MIN);
            10 * MIN + 1
        }
    };
    let shown = desk.lock().get(&handoff.id).cloned().unwrap();
    // Before #410 these waited for the person's 「转回」 with the round trip
    // off; new words taken now turn it on, the person's pause not.
    let off = matches!(stop, Stop::NoAnswer | Stop::Paused);
    assert_eq!(shown.auto, !off, "{stop:?}");
    (handoff, at)
}

#[test]
fn an_answer_goes_back_once_whatever_stopped_the_round_trip() {
    let stops = [
        Stop::NoAnswer,
        Stop::Paused,
        Stop::NoHandover,
        Stop::NoVerdict,
        Stop::Escalated,
    ];
    for stop in stops {
        for said in [PASS, FIX, ESCALATE, NO_VERDICT] {
            let (_temp, desk) = desk_of(5);
            let lines = Fake::default();
            let (handoff, at) = stopped(&desk, &lines, stop);
            assert_eq!(answer(&desk, &lines, said, at), 1, "{stop:?} × {said}");
            let back = last_back(&lines);
            assert!(
                back.contains(said.lines().next().unwrap()),
                "{stop:?} × {said}: {back}"
            );
            let kept = desk.lock().get(&handoff.id).cloned().unwrap();
            if said == PASS {
                // A pass ends the handoff, on or off.
                assert_eq!(kept.status, Status::Closed, "{stop:?}");
            } else {
                assert_eq!(kept.phase, Phase::Returned, "{stop:?} × {said}");
            }
            // Off when it came: what comes next is the person's, and it
            // stays off.
            if matches!(stop, Stop::NoAnswer | Stop::Paused) && said != PASS {
                assert!(
                    back.contains("下一步交常浩决定"),
                    "{stop:?} × {said}: {back}"
                );
                assert!(!kept.auto, "{stop:?} × {said}");
            }
        }
    }
}

#[test]
fn new_words_after_a_stop_postpane_made_turn_the_round_trip_on_again() {
    let (_temp, desk) = desk_of(5);
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    assert_eq!(answer(&desk, &lines, FIX, 3), 1);
    assert!(desk.late(3 + MIN + FIX_WAIT_MS + 1));
    let stopped = desk.lock().get(&handoff.id).cloned().unwrap();
    assert!(!stopped.auto && stopped.halt.is_some());
    assert!(!stopped.paused_by_person());
    again(&desk, &lines, 3 * FIX_WAIT_MS);
    let kept = desk.lock().get(&handoff.id).cloned().unwrap();
    assert!(kept.auto && kept.halt.is_none());
    let tail: Vec<_> = kept
        .steps
        .iter()
        .rev()
        .take(3)
        .map(|s| (s.kind, s.auto))
        .collect();
    assert_eq!(
        tail,
        [
            (StepKind::Ask, false),
            (StepKind::Work, false),
            (StepKind::Resume, true)
        ],
        "turned on just before the words, marked as PostPane's"
    );
}

#[test]
fn the_persons_pause_holds_through_new_words() {
    let (_temp, desk) = desk_of(5);
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    assert_eq!(answer(&desk, &lines, FIX, 3), 1);
    desk.act(&lines, &handoff.id, "pause", 4).unwrap();
    assert!(desk.lock().get(&handoff.id).unwrap().paused_by_person());
    again(&desk, &lines, 5);
    let kept = desk.lock().get(&handoff.id).cloned().unwrap();
    assert!(!kept.auto);
    assert_eq!(kept.halt, Some(paused()));
    assert!(kept.steps.iter().all(|s| s.kind != StepKind::Resume));
    // What relay_to_chatgpt tells the session then: that the person paused it.
    assert!(kept.paused_by_person());
    let gate = super::super::held::relay_gate;
    assert_ne!(gate(true), gate(false));
    assert!(gate(true).contains("paused") || gate(true).contains("常浩暂停"));
}

#[test]
fn a_review_at_its_cap_is_not_turned_on_by_words_without_leave() {
    let (_temp, desk) = desk_of(1);
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    assert_eq!(answer(&desk, &lines, FIX, 3), 1);
    let top = desk.lock().get(&handoff.id).cloned().unwrap();
    assert!(!top.auto, "stopped at its cap");
    assert!(desk
        .start(
            &lines,
            "s1",
            Some("/w"),
            "修登录",
            Some("改完"),
            "下一轮",
            false,
            5
        )
        .is_err());
    let kept = desk.lock().get(&handoff.id).cloned().unwrap();
    assert!(!kept.auto && kept.halt == top.halt);
    assert!(kept.steps.iter().all(|s| s.kind != StepKind::Resume));
}

#[test]
fn a_held_answer_that_cannot_reach_the_session_is_not_tried_again_by_itself() {
    let (_temp, desk) = desk_of(5);
    let lines = Fake {
        unreachable: true,
        ..Fake::default()
    };
    let handoff = opened(&desk, &lines);
    desk.act(&lines, &handoff.id, "pause", 3).unwrap();
    lines.leave_fails.set(true);
    desk.observe(&turn("complete", FIX), 4);
    assert!(desk.catch_up(&lines, 5), "the card says so");
    let kept = desk.lock().get(&handoff.id).cloned().unwrap();
    assert_eq!(kept.phase, Phase::Replied);
    assert!(!kept.held_answer());
    assert!(!desk.catch_up(&lines, 6), "not tried again");
}

/// Three handoffs of the owner's that waited (Fable's count, #410), replayed
/// step by step with their own minutes: each answer goes back as it comes.
#[test]
fn the_owners_three_stuck_handoffs_replayed() {
    // h1a1f09f8a3f02: Claude past two hours, then handed over again.
    let (_temp, desk) = desk_of(5);
    let lines = Fake::default();
    opened(&desk, &lines);
    assert_eq!(answer(&desk, &lines, FIX, 24 * MIN), 1);
    assert!(desk.late(145 * MIN));
    again(&desk, &lines, 346 * MIN);
    assert_eq!(
        answer(&desk, &lines, FIX, 359 * MIN),
        1,
        "waited for the person"
    );

    // h1a1f1cdd3f600: no verdict, then 「审查出口:返修」 with ASCII colons.
    let (_temp, desk) = desk_of(5);
    let lines = Fake::default();
    opened(&desk, &lines);
    assert_eq!(answer(&desk, &lines, NO_VERDICT, 30 * MIN), 1);
    again(&desk, &lines, 67 * MIN);
    let ascii = "1. 还差场景\n审查出口:返修\n结论:需修改";
    assert_eq!(
        answer(&desk, &lines, ascii, 88 * MIN),
        1,
        "the person sent it at 147"
    );

    // h1a1f26a454202: escalated, then three more rounds to a pass.
    let (_temp, desk) = desk_of(5);
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    assert_eq!(answer(&desk, &lines, ESCALATE, 3 * MIN), 1);
    again(&desk, &lines, 26 * MIN);
    assert_eq!(answer(&desk, &lines, FIX, 75 * MIN), 1, "never went back");
    again(&desk, &lines, 167 * MIN);
    assert_eq!(answer(&desk, &lines, FIX, 172 * MIN), 1);
    again(&desk, &lines, 174 * MIN);
    assert_eq!(answer(&desk, &lines, PASS, 179 * MIN), 1);
    assert_eq!(desk.lock().get(&handoff.id).unwrap().status, Status::Closed);
}
