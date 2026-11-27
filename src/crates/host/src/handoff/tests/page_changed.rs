//! #548: the page lacks what PostPane reads (a redesign renamed what it
//! finds answers by). Before, it read on and stopped at 30 minutes saying
//! ChatGPT did not answer; now two reads in a row that say what is missing
//! stop the round trip at once, naming it, and the session is told this is
//! not ChatGPT being slow.
use super::super::undrawn::changed_halt;
use super::*;

fn changed(missing: &[&str]) -> Value {
    json!({"type":"reread","conversation":"c-new","outcome":"changed",
        "missing":missing,"hidden":false,"active":true,"minimized":false,"fronted":false})
}

#[test]
fn two_reads_in_a_row_that_cannot_find_the_answers_stop_and_say_what() {
    let (temp, desk) = desk();
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    assert!(
        !desk.observe(&changed(&["answers"]), 5),
        "once may be the page loading"
    );
    assert_eq!(desk.projection(5)[0]["auto"], true);
    assert!(desk.observe(&changed(&["answers"]), 6));
    let shown = desk.projection(6);
    assert_eq!(shown[0]["auto"], false);
    let halt = changed_halt(&["answers".to_owned()]);
    assert_eq!(shown[0]["halt"], halt);
    let line = std::fs::read_to_string(turns_path(&temp.path().join("data")))
        .unwrap()
        .lines()
        .last()
        .map(|l| serde_json::from_str::<Value>(l).unwrap())
        .unwrap();
    assert_eq!(line["missing"], json!(["answers"]));
    // The session is told once, and not that ChatGPT did not answer.
    assert!(desk.tell(&lines, 7));
    let told = sent_as(&lines, "reply");
    assert_eq!(told.len(), 1);
    assert!(
        told[0].1.contains(&halt) && told[0].1.contains("不是 ChatGPT 没回信"),
        "{}",
        told[0].1
    );
    assert!(!desk.tell(&lines, 8), "told once");
    // No second stop at 30 minutes.
    assert!(!desk.late(2 + book::REPLY_WAIT_MS + 1));
    assert_eq!(
        desk.lock().get(&handoff.id).unwrap().phase,
        Phase::Delivered
    );
}

#[test]
fn a_read_that_finds_the_page_whole_starts_the_count_again() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    opened(&desk, &lines);
    desk.observe(&changed(&["composer"]), 5);
    desk.observe(&reread_outcome("streaming"), 6);
    assert!(!desk.observe(&changed(&["composer"]), 7));
    desk.observe(&reread_outcome("undrawn"), 8);
    assert!(!desk.observe(&changed(&["composer"]), 9));
    assert_eq!(desk.projection(9)[0]["auto"], true);
}

#[test]
fn a_round_trip_already_stopped_still_gets_the_reason_once() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    // ChatGPT seemed not to answer in 30 minutes; the session was told so.
    assert!(desk.late(2 + book::REPLY_WAIT_MS + 1));
    let now = 2 + book::REPLY_WAIT_MS + 2;
    assert!(desk.tell(&lines, now));
    desk.observe(&changed(&["prompt-ids", "answers"]), now + 1);
    assert!(desk.observe(&changed(&["prompt-ids", "answers"]), now + 2));
    let steps = desk.lock().get(&handoff.id).unwrap().steps.clone();
    let last = steps.last().unwrap();
    assert_eq!(last.kind, StepKind::Fail);
    let reason = changed_halt(&["prompt-ids".to_owned(), "answers".to_owned()]);
    assert_eq!(last.text.as_deref(), Some(reason.as_str()));
    // Told the real reason once more, then no more.
    assert!(desk.tell(&lines, now + 3));
    assert!(sent_as(&lines, "reply").last().unwrap().1.contains(&reason));
    desk.observe(&changed(&["prompt-ids", "answers"]), now + 4);
    assert!(!desk.observe(&changed(&["prompt-ids", "answers"]), now + 5));
    assert!(!desk.tell(&lines, now + 6));
}

fn reread_outcome(outcome: &str) -> Value {
    json!({"type":"reread","conversation":"c-new","outcome":outcome})
}
