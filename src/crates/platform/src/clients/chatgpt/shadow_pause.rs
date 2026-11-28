//! The shadow reads pausing on a refusal and going on again (#544): each is a
//! line of postpane.log, beside its line of shadow.jsonl.
use serde_json::Value;

/// The line of postpane.log the reads pausing or going on again make.
pub(in crate::clients::chatgpt) fn said(message: &Value) -> Option<String> {
    if message["why"] != "pause" || message.get("conversation").is_some() {
        return None;
    }
    let status = message["status"]
        .as_u64()
        .filter(|status| (100..600).contains(status));
    let status = status.map_or("an answer".to_string(), |status| format!("HTTP {status}"));
    match message["outcome"].as_str()? {
        "paused" => Some(match message["until"].as_i64().and_then(chrono::DateTime::from_timestamp_millis) {
            Some(until) => format!(
                "Shadow read paused: chatgpt.com answered {status}; one read tries again after {}",
                agent_hud_core::app_log::stamp_of(&until.with_timezone(&chrono::Local))
            ),
            None => format!("Shadow read paused: chatgpt.com answered {status}; reads wait for the page to sign in anew"),
        }),
        "resumed" => Some(format!("Shadow read resumed: a read tried again after {status} was not refused")),
        _ => None,
    }
}
