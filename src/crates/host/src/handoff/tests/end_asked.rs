//! #439: an agent session lists the handoffs still open and ends them; the
//! card says who ended each and why, and one with words on their way is
//! left as the button leaves it. #587: without the person's word the agent
//! still ends them, on its own, which settles no cap.
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

/// Past the wait for an answer to words delivered at 2.
const LATE: i64 = 3 + book::REPLY_WAIT_MS;

#[test]
fn without_the_person_s_word_an_agent_ends_it_on_its_own() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let live = opened(&desk, &lines);
    let broken = failed(&desk, &lines);
    // Not told, or another agent's labelled message: ended all the same,
    // said to be the agent's own doing.
    for (handoff, opener) in [
        (&live, None),
        (
            &broken,
            Some((
                Opener::Plugin("[Agent HUD · from Codex · t · m-1]\n\n结束".into()),
                2,
            )),
        ),
    ] {
        *lines.opener.borrow_mut() = opener;
        // Past the wait: no longer a review awaited (#587 review P1-02).
        let answer = desk
            .end_asked(
                &lines,
                CLAUDE,
                "s9",
                &[handoff.id.clone()],
                "回信是空的",
                LATE,
            )
            .unwrap();
        assert_eq!(answer["ended"], json!([handoff.id]));
        assert_eq!(answer["byPerson"], false);
        let book = desk.lock();
        let ended = book.get(&handoff.id).unwrap();
        assert_eq!(ended.phase, Phase::Ended);
        let last = ended.steps.last().unwrap();
        assert_eq!(
            (last.kind, last.auto, last.agent),
            (StepKind::End, false, true)
        );
        let text = last.text.as_deref().unwrap();
        assert!(text.contains("s9"), "{text}");
        assert!(
            text.contains("自行结束") || text.contains("on its own"),
            "{text}"
        );
        assert!(!text.contains("常浩") && !text.contains("person"), "{text}");
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
    assert_eq!(answer["byPerson"], true);
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
        assert_eq!(
            (last.kind, last.auto, last.agent),
            (StepKind::End, false, false)
        );
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
    let notice =
        super::super::notice::notice_text(&handoff, &crate::handoff::book::Trouble::Unconfirmed);
    let swipe = super::super::launch_text("review", "L1").unwrap();
    for words in [notice, swipe] {
        let turn = (Opener::Plugin(words.clone()), 9);
        assert!(!desk.lock().person_began(Some(&turn)), "{words}");
    }
}

/// #439 review P1-01: words back go in before the book writes them down, so
/// a turn they began reads as the person's meanwhile. The session calling
/// then ends only on its own (#587): not its handoff with words on their
/// way, and the other one with no cap settled.
#[test]
fn words_on_their_way_to_the_caller_are_not_the_person_s_word() {
    let (_temp, desk) = desk();
    let desk: &'static Desk = Box::leak(Box::new(desk));
    let mut lines = Fake::default();
    let own = opened(desk, &lines);
    let other = failed(desk, &lines);
    desk.observe(
        &turn("complete", "1. 少一项\n审查出口：返修\n结论：需修改"),
        4,
    );
    let ids: &'static [String] =
        Box::leak(vec![own.id.clone(), other.id.clone()].into_boxed_slice());
    let answer: &'static RefCell<Option<Result<Value, String>>> =
        Box::leak(Box::new(RefCell::new(None)));
    lines.on_reply = Some(Box::new(move || {
        // The session took the words up: its turn begins with them, not
        // yet in the book, unlabelled as a sidebar reply.
        let caller = Fake::default();
        *caller.opener.borrow_mut() = Some((
            Opener::Plugin("ChatGPT 对「修登录」的审核意见：1. 少一项".into()),
            4,
        ));
        *answer.borrow_mut() = Some(desk.end_asked(&caller, CLAUDE, "s1", ids, "都结束", 4));
    }));
    assert!(desk.drive(&lines, 4));
    lines.on_reply = None;
    let answer = answer
        .borrow_mut()
        .take()
        .expect("asked while sending")
        .unwrap();
    assert_eq!(answer["byPerson"], false);
    assert_eq!(answer["ended"], json!([other.id]));
    assert_eq!(answer["refused"][0]["id"], own.id);
    let book = desk.lock();
    assert_ne!(book.get(&own.id).unwrap().phase, Phase::Ended);
    assert!(book.get(&other.id).unwrap().steps.last().unwrap().agent);
    // Once written down, the same words are PostPane's: on its own still.
    drop(book);
    let back = lines
        .sent
        .borrow()
        .iter()
        .find(|(how, ..)| how == "reply")
        .map(|(.., text)| text.clone())
        .unwrap();
    let caller = Fake::default();
    *caller.opener.borrow_mut() = Some((Opener::Plugin(back), 5));
    let answer = desk
        .end_asked(&caller, CLAUDE, "s1", ids, "都结束", 5)
        .unwrap();
    assert_eq!(answer["byPerson"], false);
    assert_eq!(answer["ended"], json!([own.id]));
    assert!(
        desk.lock()
            .get(&own.id)
            .unwrap()
            .steps
            .last()
            .unwrap()
            .agent
    );
}

/// #587 review P1-02: a review ChatGPT is still answering, within the wait,
/// is no agent's to end on its own: its answer would be lost. Past the wait,
/// or at the person's word, it ends.
#[test]
fn a_review_still_awaited_is_not_ended_by_an_agent_on_its_own() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let awaited = opened(&desk, &lines);
    let ids = vec![awaited.id.clone()];
    let answer = desk
        .end_asked(&lines, CLAUDE, "s9", &ids, "看着卡住了", 3)
        .unwrap();
    assert_eq!(answer["ended"], json!([]));
    assert_eq!(answer["refused"][0]["id"], awaited.id);
    let why = answer["refused"][0]["why"].as_str().unwrap();
    assert!(why.contains("ChatGPT"), "{why}");
    assert_ne!(desk.lock().get(&awaited.id).unwrap().phase, Phase::Ended);
    // At the person's word it ends.
    *lines.opener.borrow_mut() = Some((Opener::Person, 3));
    let answer = desk
        .end_asked(&lines, CLAUDE, "s9", &ids, "常浩说不要了", 4)
        .unwrap();
    assert_eq!(answer["ended"], json!([awaited.id]));
    // Another one, past the wait, ends on the agent's own.
    let (_temp, desk) = super::desk();
    let lines = Fake::default();
    let late = opened(&desk, &lines);
    let answer = desk
        .end_asked(&lines, CLAUDE, "s9", &[late.id.clone()], "等到头了", LATE)
        .unwrap();
    assert_eq!(answer["ended"], json!([late.id]), "{answer}");
}

/// #587 review P2-01: words on their way to ChatGPT for a handoff of the
/// calling session are not words to it: the person's word stands.
#[test]
fn words_on_their_way_to_chatgpt_leave_the_person_s_word_as_it_is() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let own = opened(&desk, &lines);
    let other = failed(&desk, &lines);
    let _sending = desk.claim(&own.id).unwrap();
    *lines.opener.borrow_mut() = Some((Opener::Person, 8));
    let answer = desk
        .end_asked(&lines, CLAUDE, "s1", &[other.id.clone()], "不要了", 9)
        .unwrap();
    assert_eq!(answer["byPerson"], true);
    assert_eq!(answer["ended"], json!([other.id]));
    assert!(
        !desk
            .lock()
            .get(&other.id)
            .unwrap()
            .steps
            .last()
            .unwrap()
            .agent
    );
}
