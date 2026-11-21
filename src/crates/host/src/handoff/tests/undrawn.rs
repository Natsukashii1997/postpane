//! #457 (2026-11-20, #439 round 2): ChatGPT answered in 14 minutes, but the
//! tab it was in drew nothing (its window not on screen), the extension told
//! nothing, and the handoff waited out its 30 minutes. What each read again
//! found is written down now, and two reads in a row that find the answer
//! there but not drawn leave it to the person at once, saying so.
use super::super::undrawn::undrawn_halt;
use super::*;

fn reread(outcome: &str) -> Value {
    json!({"type":"reread","conversation":"c-new","outcome":outcome,
        "hidden":true,"active":true,"minimized":false,"fronted":false})
}

fn turn_lines(temp: &tempfile::TempDir) -> Vec<Value> {
    let path = turns_path(&temp.path().join("data"));
    std::fs::read_to_string(path)
        .unwrap_or_default()
        .lines()
        .map(|line| serde_json::from_str(line).unwrap())
        .collect()
}

#[test]
fn what_a_read_again_found_is_written_down_with_the_tab_it_found() {
    let (temp, desk) = desk();
    let lines = Fake::default();
    opened(&desk, &lines);
    desk.observe(&reread("unanswered"), 5);
    let line = turn_lines(&temp).pop().expect("a line for the read");
    assert_eq!(line["phase"], "reread");
    assert_eq!(line["outcome"], "unanswered");
    assert_eq!(line["conversation"], "c-new");
    assert_eq!(line["hidden"], true);
    assert_eq!(line["active"], true);
    assert_eq!(line["minimized"], false);
    assert_eq!(line["fronted"], false);
    assert_eq!(line["at"], 5);
}

#[test]
fn two_reads_in_a_row_finding_the_answer_undrawn_leave_it_to_the_person() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    assert!(!desk.observe(&reread("undrawn"), 5), "once may be passing");
    assert_eq!(desk.projection(5)[0]["auto"], true);
    assert!(desk.observe(&reread("undrawn"), 6));
    let shown = desk.projection(6);
    assert_eq!(shown[0]["auto"], false);
    assert_eq!(shown[0]["halt"], undrawn_halt());
    // The session is told once what to do.
    assert!(desk.tell(&lines, 7));
    let told = sent_as(&lines, "reply");
    assert_eq!(told.len(), 1);
    assert!(
        told[0].1.contains("标签页没画出回信") && told[0].1.contains("点开"),
        "{}",
        told[0].1
    );
    assert!(!desk.tell(&lines, 8), "told once");
    // The person opens the tab: the answer is taken and goes back.
    desk.observe(&turn("complete", "1. 少一项\n结论：需修改"), 9);
    assert_eq!(desk.lock().get(&handoff.id).unwrap().phase, Phase::Replied);
    // No second stop: the 30 minutes no longer apply to it.
    assert!(!desk.late(2 + book::REPLY_WAIT_MS + 1));
}

#[test]
fn a_read_that_finds_something_else_starts_the_count_again() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    opened(&desk, &lines);
    desk.observe(&reread("undrawn"), 5);
    desk.observe(&reread("streaming"), 6);
    assert!(!desk.observe(&reread("undrawn"), 7));
    assert_eq!(desk.projection(7)[0]["auto"], true);
    // One for a conversation of no handoff is only written down.
    let other = json!({"type":"reread","conversation":"c-other","outcome":"undrawn"});
    assert!(!desk.observe(&other, 8));
    assert!(!desk.observe(&other, 9));
}
