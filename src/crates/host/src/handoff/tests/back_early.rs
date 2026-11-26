//! Turns arriving while an answer goes back must leave early, even on failure.
use super::*;
use std::rc::Rc;

fn returning(mode: &str, fails: bool) {
    let (_temp, desk) = desk_of(5);
    let desk = Rc::new(desk);
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    if mode == "held" {
        desk.act(&lines, &handoff.id, "pause", 3).unwrap();
    }
    let mut answer = turn("complete", "审查出口：返修\n结论：需修改");
    answer["messageId"] = json!("review-answer");
    assert!(desk.observe(&answer, 4));
    let during = Rc::clone(&desk);
    let lines = Fake {
        on_reply: Some(Box::new(move || {
            assert!(
                during.claim(&handoff.id).is_err(),
                "still excludes parallel sending"
            );
            during.observe(&answer, 5); // Duplicate reread of the review.
            let mut own = turn("complete", "自己的回答");
            own["prompt"] = json!("常浩自己的提问");
            own["messageId"] = json!("own-answer");
            during.observe(&own, 6);
        })),
        ..lines
    };
    if fails {
        lines.reply_fails.set(10);
        lines.leave_fails.set(true);
    }
    let id = desk.lock().list[0].id.clone();
    if mode == "manual" {
        let _ = desk.act(&lines, &id, "back", 7);
    } else {
        desk.catch_up(&lines, 7);
    }
    assert!(
        desk.early.lock().unwrap().is_empty(),
        "turns must not wait for another send"
    );
    assert!(desk.sending.lock().unwrap().is_empty());
    assert_eq!(
        desk.lock()
            .get(&id)
            .unwrap()
            .steps
            .iter()
            .filter(|s| s.kind == StepKind::Reply)
            .count(),
        1,
        "neither duplicate nor own answer is accepted"
    );
    let log = std::fs::read_to_string(turns_path(desk.data.as_deref().unwrap())).unwrap();
    assert!(log.contains("unmatched"), "own answer was examined");
}

#[test]
fn auto_back_drains_early_turns() {
    returning("auto", false);
}
#[test]
fn manual_back_drains_early_turns() {
    returning("manual", false);
}
#[test]
fn held_back_drains_early_turns() {
    returning("held", false);
}
#[test]
fn failed_auto_back_drains_early_turns() {
    returning("auto", true);
}
#[test]
fn failed_manual_back_drains_early_turns() {
    returning("manual", true);
}
#[test]
fn failed_held_back_drains_early_turns() {
    returning("held", true);
}
