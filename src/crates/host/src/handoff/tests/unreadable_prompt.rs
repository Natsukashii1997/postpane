//! Unreadable user turns cannot become review answers, even with known ids.
use super::*;

fn hint() -> String {
    l10n::text(
        "提问读不到（可能是附件）",
        "The prompt could not be read (possibly an attachment)",
    )
}

fn unreadable() -> Value {
    let mut message = turn("complete", "不该收下的附件回答");
    message["prompt"] = Value::Null;
    message["promptId"] = json!("p-known");
    message["messageId"] = json!("attachment-answer");
    message["unreadable"] = json!(true);
    message
}

#[test]
fn unreadable_prompt_is_not_accepted_even_when_its_id_matches() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    *lines.asked_as.borrow_mut() = Some("p-known".into());
    let handoff = opened(&desk, &lines);
    assert!(
        desk.observe(&unreadable(), 3),
        "the card changes immediately"
    );
    let shown = desk.projection(4);
    assert_eq!(shown[0]["halt"], hint());
    assert_eq!(shown[0]["auto"], false);
    assert!(desk.lock().get(&handoff.id).unwrap().last_reply().is_none());
    assert!(!desk.observe(&unreadable(), 5), "no duplicate stop step");
    assert!(!desk.catch_up(&lines, 6));
    assert_eq!(replies(&lines), 0);
}

#[test]
fn unreadable_prompt_does_not_overwrite_a_persons_pause() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    desk.act(&lines, &handoff.id, "pause", 3).unwrap();
    let halt = desk.lock().get(&handoff.id).unwrap().halt.clone();
    assert!(desk.observe(&unreadable(), 4));
    let kept = desk.lock().get(&handoff.id).unwrap().clone();
    assert_eq!(kept.halt, halt);
    assert_eq!(
        kept.steps.last().unwrap().text.as_deref(),
        Some(hint().as_str())
    );
    assert!(!kept.auto);
    assert!(!desk.observe(&unreadable(), 5));
}

#[test]
fn unreadable_own_chat_after_return_does_not_pause_the_review() {
    let (_temp, desk) = desk_of(5);
    let lines = Fake::default();
    let handoff = opened(&desk, &lines);
    desk.observe(&turn("complete", "审查出口：返修\n结论：需修改"), 3);
    desk.catch_up(&lines, 4);
    assert!(!desk.observe(&unreadable(), 5));
    assert!(desk.lock().get(&handoff.id).unwrap().auto);
}

#[test]
fn turn_log_has_a_unicode_prompt_fingerprint_but_no_prompt_words() {
    let (temp, desk) = desk();
    let lines = Fake::default();
    opened(&desk, &lines);
    let mut message = turn("complete", "自己的回答");
    let prompt = format!("{}尾巴", "密😀".repeat(40));
    message["prompt"] = json!(prompt);
    desk.observe(&message, 3);
    desk.observe(&message, 4);
    desk.observe(&unreadable(), 5);
    let log = std::fs::read_to_string(turns_path(&temp.path().join("data"))).unwrap();
    let rows: Vec<Value> = log
        .lines()
        .map(|s| serde_json::from_str(s).unwrap())
        .collect();
    assert_eq!(
        rows[0]["promptFingerprint"]["chars"],
        prompt.chars().count()
    );
    assert_eq!(
        rows[0]["promptFingerprint"]["headHash"]
            .as_str()
            .unwrap()
            .len(),
        16
    );
    assert_eq!(rows[0]["promptFingerprint"], rows[1]["promptFingerprint"]);
    assert!(rows[2]["promptFingerprint"]["chars"].is_null());
    assert!(rows[2]["promptUnreadable"].as_bool().unwrap());
    assert_eq!(rows[2]["outcome"], "unreadable");
    assert!(!log.contains("密😀") && !log.contains("不该收下"));
}
