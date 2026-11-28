//! #544 gaps 6, 7: where an answer goes that comes once its handoff closed.
use super::*;

fn last_turn(temp: &tempfile::TempDir) -> Value {
    let kept = std::fs::read_to_string(turns_path(&temp.path().join("data"))).unwrap();
    serde_json::from_str(kept.lines().last().unwrap()).unwrap()
}

// Gap 6: ended (by the person, a pass, or a day idle), its answer is not
// taken nor sent back; only the turn log keeps it, held in case a handoff
// binds the conversation, as `early`.
#[test]
fn an_answer_after_its_handoff_ended_goes_nowhere_but_the_turn_log() {
    let (temp, desk) = desk();
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    desk.act(&lines, &handoff.id, "end", 3).unwrap();
    let sent = lines.sent.borrow().len();
    assert!(!desk.observe(&turn("complete", "审查出口：通过\n结论：通过"), 4));
    desk.drive(&lines, 5);
    assert_eq!(lines.sent.borrow().len(), sent, "nothing goes back");
    let kept = desk.lock().get(&handoff.id).cloned().unwrap();
    assert!(!kept.steps.iter().any(|s| s.kind == StepKind::Reply));
    assert_eq!(last_turn(&temp)["outcome"], "early");
}

// Gap 7: taken over by a handoff of another session that bound its
// conversation (#544 gap 15), an answer to the old words is not the new
// one's, and the closed one takes nothing; the new one's answer is its own.
#[test]
fn an_answer_after_its_conversation_was_taken_over_is_not_the_new_ones() {
    let (temp, desk) = desk();
    let lines = Fake::default();
    let first = opened(&desk, &lines);
    let old_words = asked();
    let Started::Opening {
        handoff: second,
        project,
    } = desk
        .start(
            &lines,
            "s2",
            Some("/w2"),
            "修注册",
            None,
            "另一份改动",
            false,
            3,
        )
        .unwrap()
    else {
        panic!()
    };
    desk.open(&lines, &second.id, "另一份改动", project.as_deref(), || 4)
        .unwrap();
    let get = |id: &str| desk.lock().get(id).cloned().unwrap();
    assert_eq!(get(&first.id).status, Status::Closed);
    assert!(!desk.observe(
        &reply_as(old_words, "审查出口：返修\n结论：需修改", "m1"),
        5
    ));
    assert_eq!(last_turn(&temp)["outcome"], "unmatched");
    let replies = |id: &str| {
        get(id)
            .steps
            .iter()
            .filter(|s| s.kind == StepKind::Reply)
            .count()
    };
    assert_eq!((replies(&first.id), replies(&second.id)), (0, 0));
    assert!(desk.observe(&reply_as(asked(), "审查出口：返修\n结论：需修改", "m2"), 6));
    assert_eq!((replies(&first.id), replies(&second.id)), (0, 1));
}
