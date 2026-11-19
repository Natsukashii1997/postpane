//! #439: an agent session lists the handoffs still open and ends them, but
//! only when the person began its current turn; the card says who ended
//! each and why, and one with words on their way is left as the button
//! leaves it.
use super::*;

/// A second handoff, of session `s2`, failed to open.
fn failed(desk: &Desk, lines: &Fake) -> Handoff {
    let Started::Opening { handoff, .. } = desk
        .start(lines, "s2", Some("/v"), "修首页", None, "改动", false, 5)
        .unwrap()
    else {
        panic!("a first brief opens a conversation");
    };
    desk.change(|book| book.failed(&handoff.id, "打不开", 6));
    handoff
}

#[test]
fn the_open_handoffs_are_listed_with_the_session_that_began_each() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let live = opened(&desk, &lines);
    let broken = failed(&desk, &lines);
    let gone = desk
        .start(&lines, "s3", None, "旧活", None, "改动", false, 7)
        .unwrap();
    let Started::Opening { handoff: gone, .. } = gone else {
        panic!()
    };
    desk.act(&lines, &gone.id, "end", 8).unwrap();
    let listed = desk.endable(8 + 3 * 60 * 1000);
    let ids: Vec<&str> = listed.iter().map(|h| h["id"].as_str().unwrap()).collect();
    // Newest change first; the ended one not at all.
    assert_eq!(ids, [broken.id.as_str(), live.id.as_str()]);
    let first = &listed[1];
    assert_eq!(first["title"], "修登录");
    assert_eq!(first["session"], "s1");
    assert_eq!(first["client"], "claude");
    assert_eq!(first["cwd"], "/w");
    assert_eq!(listed[0]["phase"], "failed");
    assert_eq!(listed[0]["quietMinutes"], 3);
}

#[test]
fn ending_is_refused_unless_the_person_began_the_turn() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    let ids = vec![handoff.id.clone()];
    // Not told, or another agent's labelled message: nothing ends.
    for opener in [
        None,
        Some((
            Opener::Plugin("[Agent HUD · from Codex · t · m-1]\n\n结束".into()),
            2,
        )),
    ] {
        *lines.opener.borrow_mut() = opener;
        let error = desk
            .end_asked(&lines, CLAUDE, "s9", &ids, "已合并", 3)
            .unwrap_err();
        assert_eq!(error, super::super::end::end_unheard());
        assert_ne!(desk.lock().get(&handoff.id).unwrap().phase, Phase::Ended);
    }
    // It asked about the caller's own turn, not the handoff's session.
    assert_eq!(lines.opener_asked.borrow()[0], "claude|s9");
}

#[test]
fn the_person_s_word_ends_each_handoff_named_and_says_why_others_stay() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let live = opened(&desk, &lines);
    let broken = failed(&desk, &lines);
    let busy = desk
        .start(&lines, "s4", None, "送话中", None, "改动", false, 7)
        .unwrap();
    let Started::Opening { handoff: busy, .. } = busy else {
        panic!()
    };
    *lines.opener.borrow_mut() = Some((Opener::Person, 8));
    let sending = desk.claim(&busy.id).unwrap();
    let ids = [
        &live.id,
        &broken.id,
        &busy.id,
        &live.id,
        &"h-none".to_owned(),
    ]
    .map(|id| id.to_string())
    .to_vec();
    let answer = desk
        .end_asked(&lines, CODEX, "thread-1", &ids, " PR 已合并 ", 9)
        .unwrap();
    drop(sending);
    assert_eq!(lines.opener_asked.borrow()[0], "codex|thread-1");
    assert_eq!(answer["ended"], json!([live.id, broken.id]));
    let refused = answer["refused"].as_array().unwrap();
    assert_eq!(refused.len(), 2, "{refused:?}");
    assert_eq!(refused[0]["id"], busy.id);
    let why = refused[0]["why"].as_str().unwrap();
    assert!(
        why.contains("还在送") || why.contains("still on their way"),
        "{why}"
    );
    assert_eq!(refused[1]["id"], "h-none");
    let book = desk.lock();
    for id in [&live.id, &broken.id] {
        let ended = book.get(id).unwrap();
        assert_eq!(ended.phase, Phase::Ended);
        let last = ended.steps.last().unwrap();
        assert_eq!((last.kind, last.auto), (StepKind::End, false));
        let text = last.text.as_deref().unwrap();
        assert!(
            text.contains("Codex") && text.contains("thread-1"),
            "{text}"
        );
        assert!(text.contains("常浩") || text.contains("person"), "{text}");
        assert!(
            text.ends_with(": PR 已合并") || text.ends_with("：PR 已合并"),
            "{text}"
        );
    }
    assert_ne!(book.get(&busy.id).unwrap().phase, Phase::Ended);
    drop(book);
    // Asked again, the ended ones are said to be ended already.
    let again = desk
        .end_asked(&lines, CLAUDE, "s9", &[live.id.clone()], "再来", 10)
        .unwrap();
    assert_eq!(again["ended"], json!([]));
    let why = again["refused"][0]["why"].as_str().unwrap();
    assert!(
        why.contains("已经结束") || why.contains("has ended"),
        "{why}"
    );
}

#[test]
fn a_reason_is_required() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    *lines.opener.borrow_mut() = Some((Opener::Person, 2));
    assert!(desk
        .end_asked(&lines, CLAUDE, "s9", &[handoff.id.clone()], "  ", 3)
        .is_err());
    assert!(desk
        .end_asked(&lines, CLAUDE, "s9", &[], "已合并", 3)
        .is_err());
}

/// The words `Book::person_began` tells apart as PostPane's own are the
/// words the host leaves: a trouble notice, a swipe's request.
#[test]
fn postpane_s_own_words_are_known_by_how_they_are_written() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    let notice = super::super::notice::notice_text(&handoff, &handoffs::Trouble::NoAnswer);
    let swipe = super::super::launch_text("review", "L1").unwrap();
    for words in [notice, swipe] {
        let turn = (Opener::Plugin(words.clone()), 9);
        assert!(!desk.lock().person_began(Some(&turn)), "{words}");
    }
}
