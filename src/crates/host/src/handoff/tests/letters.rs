//! The paper planes the HUD flies for a handoff's steps.
use super::*;

#[test]
fn the_latest_step_that_moved_words_picks_the_letter() {
    // Nothing new, or nothing that moved words: no letter.
    assert_eq!(toss(&steps(&["work", "ask"]), 2), None);
    assert_eq!(toss(&steps(&["work", "ask", "back", "end"]), 2), None);
    assert_eq!(toss(&steps(&["work", "ask"]), 1), Some(Toss::ToChatGPT));
    assert_eq!(
        toss(&steps(&["work", "ask", "reply"]), 2),
        Some(Toss::ToClaude)
    );
    // Two moves since the last look: the latest one flies.
    assert_eq!(
        toss(&steps(&["work", "ask", "reply"]), 0),
        Some(Toss::ToClaude)
    );
    // A second round goes to ChatGPT again.
    assert_eq!(
        toss(
            &steps(&["work", "ask", "reply", "back", "again", "work", "ask"]),
            5
        ),
        Some(Toss::ToChatGPT)
    );
}

#[test]
fn a_failure_falls_the_way_the_words_were_going() {
    // The review could not be opened.
    assert_eq!(
        toss(&steps(&["work", "fail"]), 1),
        Some(Toss::FallsToChatGPT)
    );
    // The answer could not go back to Claude.
    assert_eq!(
        toss(&steps(&["work", "ask", "reply", "fail"]), 3),
        Some(Toss::FallsToClaude)
    );
    // Round two could not reach ChatGPT.
    assert_eq!(
        toss(
            &steps(&["work", "ask", "reply", "back", "again", "fail"]),
            5
        ),
        Some(Toss::FallsToChatGPT)
    );
    // ChatGPT had the words and did not answer: nothing flew, nothing falls.
    assert_eq!(toss(&steps(&["work", "ask", "fail"]), 2), None);
}

#[test]
fn letters_fly_once_each_way_and_not_again_after_a_restart() {
    let (temp, desk) = desk();
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    let flights = desk.tosses();
    assert_eq!(flights.len(), 1);
    let sent = &flights[0];
    assert_eq!(
        (sent.from.as_str(), sent.to.as_str()),
        ("claude", "chatgpt")
    );
    assert!(sent.from_left && !sent.falls);
    assert_eq!(sent.lane, format!("relay:{}:claude", handoff.id));
    // Looked at again with nothing new: no letter.
    assert!(desk.tosses().is_empty());
    assert!(desk.observe(&turn("start", ""), 3));
    assert!(desk.tosses().is_empty(), "ChatGPT starting moves no words");
    assert!(desk.observe(
        &turn("complete", "1. 要超时\n审查出口：返修\n结论：需修改"),
        4
    ));
    let back = desk.tosses();
    assert_eq!(back.len(), 1);
    assert_eq!(
        (back[0].from.as_str(), back[0].to.as_str()),
        ("chatgpt", "claude")
    );
    assert!(!back[0].from_left);
    // The steps kept from before a restart flew already.
    let again = Desk::new(Some(temp.path().join("data")));
    assert!(again.tosses().is_empty());
}
