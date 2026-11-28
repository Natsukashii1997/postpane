//! #539 round 4 (2026-11-26): the round's prompt never reached ChatGPT, and
//! the newest answer on the page was round 3's. Each read again told that
//! answer, which was not taken, and the "told" reset the count: the
//! conversation was read every two minutes for over twelve hours, past the
//! five reads #433 allows. A told answer that is not taken brings nothing.
use super::*;

#[test]
fn reads_that_tell_only_an_older_answer_stop_at_the_limit() {
    use super::super::reread::{AGAIN_MS, QUIET_MS};
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    let mut now = desk.lock().get(&handoff.id).unwrap().phase_at + QUIET_MS;
    for attempt in 0..5 {
        assert_eq!(desk.reread(&lines, now), 1, "read {attempt}");
        // The page tells its newest answer again; it is not this round's.
        desk.observe(
            &json!({"type":"reread","conversation":"c-new","outcome":"told"}),
            now + 1,
        );
        now += AGAIN_MS << (attempt + 1).min(4);
    }
    assert_eq!(sent_as(&lines, "reread").len(), 5);
    assert_eq!(desk.reread(&lines, now), 0, "no sixth read");
    let kept = desk.lock().get(&handoff.id).cloned().unwrap();
    assert!(!kept.auto);
    assert_eq!(kept.phase, Phase::Delivered);
}

#[test]
fn a_read_that_finds_the_answer_being_written_still_starts_the_count_again() {
    use super::super::reread::{AGAIN_MS, QUIET_MS};
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    let mut now = desk.lock().get(&handoff.id).unwrap().phase_at + QUIET_MS;
    for attempt in 0..6 {
        assert_eq!(desk.reread(&lines, now), 1, "read {attempt}");
        let outcome = if attempt == 3 { "streaming" } else { "told" };
        desk.observe(
            &json!({"type":"reread","conversation":"c-new","outcome":outcome}),
            now + 1,
        );
        // Past the longest backoff, so each read is due.
        now += AGAIN_MS << 4;
    }
    assert!(desk.lock().get(&handoff.id).unwrap().auto, "still reading");
}
