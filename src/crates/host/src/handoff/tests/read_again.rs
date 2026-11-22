//! Reading a quiet review again (#356) and telling its answer from another
//! prompt's.
use super::*;

// #356: a finished turn whose word was lost leaves the handoff waiting;
// the conversation is read again after three quiet minutes, every two.
#[test]
fn a_quiet_review_is_read_again_and_its_answer_taken_once() {
    use super::super::reread::{AGAIN_MS, QUIET_MS};
    let (temp, desk) = desk();
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    let at = desk.lock().get(&handoff.id).unwrap().phase_at;
    assert_eq!(desk.reread(&lines, at + QUIET_MS - 1), 0, "not quiet yet");
    assert_eq!(desk.reread(&lines, at + QUIET_MS), 1);
    assert_eq!(
        lines.sent.borrow().last().unwrap(),
        &("reread".into(), "c-new".into(), String::new())
    );
    let first = at + QUIET_MS;
    assert_eq!(desk.reread(&lines, first + AGAIN_MS - 1), 0, "asked lately");
    assert_eq!(desk.reread(&lines, first + AGAIN_MS), 1);
    // The app started again: what the last one asked is not kept, and
    // the phase began before, so the conversation is read at once.
    let restarted = Desk::new(Some(temp.path().join("data")));
    assert_eq!(restarted.reread(&lines, first + AGAIN_MS + 1), 1);
    // ChatGPT starts: three minutes from now on.
    let started = first + AGAIN_MS + 2;
    assert!(desk.observe(&turn("start", ""), started));
    assert_eq!(desk.reread(&lines, started + QUIET_MS - 1), 0);
    assert_eq!(desk.reread(&lines, started + QUIET_MS), 1);
    // The answer told again is taken, once by its message id.
    let told = json!({"type":"turn","phase":"complete","conversation":"c-new","prompt":asked(),
        "reply":"1. 少一项\n结论：需修改","messageId":"m9","reread":true,"prompt":asked()});
    let answered = started + QUIET_MS + 1;
    assert!(desk.observe(&told, answered));
    assert!(!desk.observe(&told, answered + 1), "the same answer twice");
    let book = desk.lock();
    let kept = book.get(&handoff.id).unwrap();
    assert_eq!(kept.phase, Phase::Replied);
    let replies = kept.steps.iter().filter(|s| s.kind == StepKind::Reply);
    assert_eq!(replies.count(), 1);
    drop(book);
    // Answered: nothing to read again.
    let quiet = answered + QUIET_MS + AGAIN_MS;
    let asked = sent_as(&lines, "reread").len();
    assert_eq!(desk.reread(&lines, quiet), 0);
    assert_eq!(sent_as(&lines, "reread").len(), asked);
}

// #356: with no extension connected there is no one to ask.
#[test]
fn a_quiet_review_is_not_read_again_without_the_extension() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    let at = desk.lock().get(&handoff.id).unwrap().phase_at;
    let offline = Fake {
        offline: true,
        ..Fake::default()
    };
    let late = at + super::super::reread::QUIET_MS;
    assert_eq!(desk.reread(&offline, late), 0);
    assert!(sent_as(&offline, "reread").is_empty());
    // Once connected it is asked at once: the miss did not count.
    assert_eq!(desk.reread(&lines, late + 1), 1);
}

// #356 P1-01: the review's answer went unreported and the person chatted
// on in the same conversation; their own turn's answer is not the
// review's, nor one whose prompt could not be read. The review's answer,
// read again, still counts.
#[test]
fn another_prompts_answer_is_not_taken_as_the_review() {
    let (temp, desk) = desk();
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    let review = asked();
    let theirs = json!({"type":"turn","phase":"complete","conversation":"c-new","prompt":asked(),
        "prompt":"顺便问一下，周末天气怎么样？","reply":"晴。","messageId":"a4"});
    assert!(!desk.observe(&theirs, 3));
    let unread = json!({"type":"turn","phase":"complete","conversation":"c-new","prompt":asked(),
        "prompt":null,"reply":"1. 少一项\n结论：需修改","messageId":"a5"});
    assert!(!desk.observe(&unread, 4));
    assert_eq!(
        desk.lock().get(&handoff.id).unwrap().phase,
        Phase::Delivered
    );
    let log = std::fs::read_to_string(turns_path(&temp.path().join("data"))).unwrap();
    assert_eq!(log.matches("\"outcome\":\"unmatched\"").count(), 2);
    let ours = json!({"type":"turn","phase":"complete","conversation":"c-new","prompt":asked(),
        "prompt":review,"reply":"1. 少一项\n结论：需修改","messageId":"a3","reread":true});
    assert!(desk.observe(&ours, 5));
    assert_eq!(desk.lock().get(&handoff.id).unwrap().phase, Phase::Replied);
}

// #356 P1-01 (round 2): the words are held to as far as they are kept,
// not their first hundred characters: a prompt of the person's own that
// starts like them is not the review's, a long brief still is.
#[test]
fn a_prompt_counts_only_as_the_whole_words_kept() {
    let complete = |prompt: &str, id: &str| {
        json!({"type":"turn","phase":"complete","conversation":"c-new","prompt":asked(),
            "prompt":prompt,"reply":"1. 少一项\n结论：需修改","messageId":id})
    };
    let open = |desk: &Desk, lines: &Fake, brief: &str| {
        let Started::Opening { handoff, .. } = desk
            .start(lines, "s1", Some("/w"), "t", None, brief, false, 1)
            .unwrap()
        else {
            panic!("a first brief opens a conversation")
        };
        desk.open(lines, &handoff.id, brief, None, || 2).unwrap();
        handoff
    };
    let phase = |desk: &Desk, id: &str| desk.lock().get(id).unwrap().phase;
    // Short words: the same start and more after is another prompt.
    let (_one, first) = desk();
    let lines = Fake::default();
    let short = open(&first, &lines, "检查这个 PR");
    assert!(!first.observe(&complete("检查这个 PR，顺便看看命名", "a4"), 3));
    assert!(
        first.observe(&complete("检查 这个PR", "a3"), 4),
        "spaces aside"
    );
    assert_eq!(phase(&first, &short.id), Phase::Replied);
    // Long words sharing their first hundred characters and more.
    let common = "共同的开头".repeat(30);
    let (_two, second) = desk();
    let lines = Fake::default();
    let shared = open(&second, &lines, &format!("{common}\n只看 A"));
    assert!(!second.observe(&complete(&format!("{common}\n只看 B"), "b4"), 3));
    assert_eq!(phase(&second, &shared.id), Phase::Delivered);
    // Words past what a step keeps: held to the kept start.
    let long = format!("{}\n末尾这段不在摘录里", "长".repeat(700));
    let (_three, third) = desk();
    let lines = Fake::default();
    let cut = open(&third, &lines, &long);
    assert!(!third.observe(&complete(&"长".repeat(500), "c4"), 3));
    assert!(third.observe(&complete(&long, "c3"), 4));
    assert_eq!(phase(&third, &cut.id), Phase::Replied);
}

// A brief naming code: the page draws `Desk::open` as code, so the prompt
// it reports has no backticks. Still the review's; another prompt is not.
#[test]
fn a_prompt_drawn_without_its_inline_code_marks_is_still_the_review() {
    let complete = |prompt: &str, id: &str| {
        json!({"type":"turn","phase":"complete","conversation":"c-new",
            "prompt":prompt,"reply":"1. 少一项\n结论：需修改","messageId":id})
    };
    let open = |desk: &Desk, lines: &Fake, brief: &str| {
        let Started::Opening { handoff, .. } = desk
            .start(lines, "s1", Some("/w"), "t", None, brief, false, 1)
            .unwrap()
        else {
            panic!("a first brief opens a conversation")
        };
        desk.open(lines, &handoff.id, brief, None, || 2).unwrap();
        handoff
    };
    let phase = |desk: &Desk, id: &str| desk.lock().get(id).unwrap().phase;
    // Short words, kept in full.
    let (_one, first) = desk();
    let lines = Fake::default();
    let short = open(&first, &lines, "看 `Desk::open` 当场失败那条");
    assert!(!first.observe(&complete("看 Desk::open 当场失败那条，顺便看命名", "a4"), 3));
    assert!(first.observe(&complete("看 Desk::open 当场失败那条", "a3"), 4));
    assert_eq!(phase(&first, &short.id), Phase::Replied);
    // Long words, held to the kept start.
    let long = format!("{}\n末尾这段不在摘录里", "改了 `Book::expire`。".repeat(60));
    let (_two, second) = desk();
    let lines = Fake::default();
    let cut = open(&second, &lines, &long);
    assert!(second.observe(&complete(&long.replace('`', ""), "b3"), 3));
    assert_eq!(phase(&second, &cut.id), Phase::Replied);
}

// #410: a brief with a fenced block early on. One page draws the block as
// code, without its fence lines (```python and all); another shows the
// words as typed, its line breaks lost. Both are the review's; a prompt
// of other words with the same block is not.
#[test]
fn a_prompt_drawn_without_its_code_fences_is_still_the_review() {
    let complete = |prompt: &str, id: &str| {
        json!({"type":"turn","phase":"complete","conversation":"c-new",
            "prompt":prompt,"reply":"1. 少一项\n结论：需修改","messageId":id})
    };
    let open = |desk: &Desk, lines: &Fake, brief: &str| {
        let Started::Opening { handoff, .. } = desk
            .start(lines, "s1", Some("/w"), "t", None, brief, false, 1)
            .unwrap()
        else {
            panic!("a first brief opens a conversation")
        };
        desk.open(lines, &handoff.id, brief, None, || 2).unwrap();
        handoff
    };
    let phase = |desk: &Desk, id: &str| desk.lock().get(id).unwrap().phase;
    let code = "```python\ndef send_pending(path=None):\n    with tx(path) as con:\n```\n";
    let long = format!("## 1. 竞态\n{code}{}", "说明这一处怎么改的。".repeat(80));
    let drawn = format!(
        "## 1. 竞态\ndef send_pending(path=None):\n    with tx(path) as con:\n{}",
        "说明这一处怎么改的。".repeat(80)
    );
    let typed = long.replace('\n', "");
    for (n, prompt) in [drawn, typed].into_iter().enumerate() {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        let cut = open(&desk, &lines, &long);
        let other = format!("## 2. 别的\n{code}");
        assert!(!desk.observe(&complete(&other, "a4"), 3));
        assert!(desk.observe(&complete(&prompt, "a3"), 4), "page {n}");
        assert_eq!(phase(&desk, &cut.id), Phase::Replied);
    }
    // Short words kept in full, the fence cut off at the page.
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let short = open(&desk, &lines, "看这段\n```diff\n-a\n+b\n```");
    assert!(desk.observe(&complete("看这段\n-a\n+b", "b3"), 3));
    assert_eq!(phase(&desk, &short.id), Phase::Replied);
}

// #356 P2-04: a handoff with no words kept cannot be held to them; its
// conversation's turns are not taken.
#[test]
fn a_handoff_with_no_words_kept_takes_no_answer() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    desk.lock()
        .list
        .iter_mut()
        .for_each(|h| h.steps.retain(|step| step.kind != StepKind::Ask));
    assert!(!desk.observe(&turn("complete", "1. 少一项\n结论：需修改"), 3));
    assert_eq!(
        desk.lock().get(&handoff.id).unwrap().phase,
        Phase::Delivered
    );
}

// #356 P2-03: connected when checked, the read did not get through; it
// is tried again in seconds, not after the two minutes of one that did.
#[test]
fn a_read_again_that_did_not_get_through_is_tried_again_soon() {
    use super::super::reread::{AGAIN_MS, QUIET_MS, RETRY_MS};
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    let late = desk.lock().get(&handoff.id).unwrap().phase_at + QUIET_MS;
    lines.reread_fails.set(true);
    assert_eq!(desk.reread(&lines, late), 0);
    assert_eq!(
        desk.reread(&lines, late + RETRY_MS - 1),
        0,
        "not every refresh"
    );
    lines.reread_fails.set(false);
    assert_eq!(desk.reread(&lines, late + RETRY_MS), 1);
    assert_eq!(desk.reread(&lines, late + RETRY_MS + AGAIN_MS - 1), 0);
    assert_eq!(
        sent_as(&lines, "reread").len(),
        2,
        "one failed try, one passed on"
    );
}

// #507: 2026-11-21 a conversation whose tab was gone was read 128 times, two
// minutes apart, each `unreachable`. Reads that reach nothing come further
// apart, up to a limit; one that reaches the page brings them back.
#[test]
fn reads_that_reach_nothing_come_further_apart() {
    use super::super::reread::{AGAIN_MS, MISSES_MOST, QUIET_MS};
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    let mut now = desk.lock().get(&handoff.id).unwrap().phase_at + QUIET_MS;
    let heard = |outcome: &str, now: i64| {
        desk.observe(
            &json!({"type":"reread","conversation":"c-new","outcome":outcome}),
            now,
        )
    };
    assert_eq!(desk.reread(&lines, now), 1);
    for missed in 1..=MISSES_MOST + 2 {
        heard(
            if missed % 2 == 0 {
                "unopened"
            } else {
                "unreachable"
            },
            now + 1,
        );
        let wait = AGAIN_MS << missed.min(MISSES_MOST);
        assert_eq!(desk.reread(&lines, now + wait - 1), 0, "after {missed}");
        now += wait;
        assert_eq!(desk.reread(&lines, now), 1, "after {missed}");
    }
    // The page was reached: every two minutes again.
    heard("streaming", now + 1);
    assert_eq!(desk.reread(&lines, now + AGAIN_MS - 1), 0);
    assert_eq!(desk.reread(&lines, now + AGAIN_MS), 1);
}
