//! #542: the extension is told which conversations and handoffs ended, to
//! close their tabs; the snapshot that ends a handoff (24 hours idle) tells
//! it at once (review P2-03), and a failed one is told once ended, though it
//! never had a conversation (review P1-01).
use super::*;
use crate::handoff::book::IDLE_END_MS;

fn last(lines: &Fake) -> (Vec<String>, Vec<String>) {
    lines
        .told_ended
        .borrow()
        .last()
        .cloned()
        .unwrap_or_default()
}

#[test]
fn the_snapshot_that_ends_an_idle_handoff_tells_its_tab_to_close() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    {
        let mut book = desk.lock();
        let kept = book.list.iter_mut().find(|h| h.id == handoff.id).unwrap();
        kept.phase = Phase::Replied;
        kept.phase_at = 2;
        kept.updated_at = 2;
    }
    desk.projection_told(&lines, 3);
    assert_eq!(last(&lines), (vec![], vec![]), "open still");
    // Not told first by anything else that ends idle ones.
    desk.projection_told(&lines, 3 + IDLE_END_MS);
    assert_eq!(last(&lines), (vec!["c-new".into()], vec![handoff.id]));
}

#[test]
fn a_failed_handoff_ended_by_the_person_tells_its_tab_to_close() {
    let (_temp, desk) = desk();
    let lines = Fake {
        open_fails: true,
        ..Fake::default()
    };
    let Started::Opening { handoff, project } = desk
        .start(
            &lines,
            "s1",
            Some("/w"),
            "修登录",
            None,
            "改动如下",
            false,
            1,
        )
        .unwrap()
    else {
        panic!("a first brief opens a conversation");
    };
    assert!(desk
        .open(&lines, &handoff.id, "改动如下", project.as_deref(), || 2)
        .is_err());
    desk.projection_told(&lines, 3);
    assert_eq!(last(&lines), (vec![], vec![]), "failed: kept to look at");
    assert!(desk.lock().end(&handoff.id, 4));
    desk.projection_told(&lines, 5);
    assert_eq!(last(&lines), (vec![], vec![handoff.id]), "no conversation");
}
