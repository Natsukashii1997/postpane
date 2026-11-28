//! #544 (E6, E7, E8): the wait for ChatGPT's answer ends saying why it went
//! unread, as the reads found it: the conversation's tab closed, a tab that
//! does not answer (signed out, an error page), the extension not
//! connected. Before, every such wait ended as "ChatGPT did not answer in
//! 30 minutes", and the session was told to wait for ChatGPT.
use super::*;

fn read(outcome: &str) -> Value {
    json!({"type":"reread","conversation":"c-new","outcome":outcome})
}

/// Opened at 2, read again once quiet: the reads count in its phase.
fn waiting(desk: &Desk, lines: &Fake) -> i64 {
    let handoff = opened(desk, lines);
    let at = desk.lock().get(&handoff.id).unwrap().phase_at;
    let quiet = at + super::super::reread::QUIET_MS;
    assert_eq!(desk.reread(lines, quiet), 1);
    quiet
}

/// What the session is told once the wait ends.
fn told_at_the_end(desk: &Desk, lines: &Fake) -> String {
    assert!(desk.late(2 + book::REPLY_WAIT_MS + 1));
    assert!(desk.tell(lines, 2 + book::REPLY_WAIT_MS + 2));
    let told = sent_as(lines, "reply");
    assert_eq!(told.len(), 1);
    told[0].1.clone()
}

#[test]
fn a_closed_tab_is_said_to_be_closed() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let at = waiting(&desk, &lines);
    desk.observe(&read("closed"), at + 1);
    let told = told_at_the_end(&desk, &lines);
    assert!(told.contains("标签页已经关了"), "{told}");
    assert!(told.contains("重新打开那个 ChatGPT 对话"), "{told}");
    assert!(!told.contains("分钟没回信"), "{told}");
}

#[test]
fn a_tab_that_does_not_answer_may_be_signed_out() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let at = waiting(&desk, &lines);
    desk.observe(&read("unreachable"), at + 1);
    let told = told_at_the_end(&desk, &lines);
    assert!(
        told.contains("不应答") && told.contains("重新登录"),
        "{told}"
    );
}

#[test]
fn the_extension_not_connected_is_said_so() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let at = waiting(&desk, &lines);
    let offline = Fake {
        offline: true,
        ..Fake::default()
    };
    assert_eq!(desk.reread(&offline, at + 1), 0);
    let told = told_at_the_end(&desk, &lines);
    assert!(told.contains("Chrome 插件没连上"), "{told}");
}

// A tab read fine since (the page there, ChatGPT not answering yet): what
// was found before no longer holds.
#[test]
fn a_page_read_since_is_chatgpt_not_answering_again() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let at = waiting(&desk, &lines);
    desk.observe(&read("closed"), at + 1);
    desk.observe(&read("waiting"), at + 2);
    let told = told_at_the_end(&desk, &lines);
    assert!(told.contains("30 分钟没回信"), "{told}");
}
