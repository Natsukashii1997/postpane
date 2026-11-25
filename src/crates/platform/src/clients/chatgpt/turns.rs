//! A turn the extension reported, as the hook event it becomes: its start,
//! and its completion. Moved from `mod.rs` as it was (#526).
use super::Watched;
use agent_hud_agents::{chatgpt as agent, HookEvent};
use serde_json::{json, Value};

/// A turn's conversation, and when it happened (never later than now).
fn turn_at(message: &Value, now: i64) -> Option<(&str, i64)> {
    let conversation = message["conversation"]
        .as_str()
        .filter(|id| agent::conversation_id(id))?;
    let at = message["at"]
        .as_i64()
        .filter(|at| *at > 0)
        .unwrap_or(now)
        .min(now);
    Some((conversation, at))
}

/// The name a turn's conversation goes by: the tab's title first, unless
/// PostPane named the conversation (a handoff's title).
fn turn_title<'a>(message: &'a Value, watched: Option<&'a Watched>) -> Option<&'a str> {
    let watched_title = watched
        .map(|w| w.title.as_str())
        .filter(|title| !title.trim().is_empty());
    let tab_title = message["title"]
        .as_str()
        .filter(|title| !title.trim().is_empty());
    if watched.is_some_and(|w| w.named) {
        watched_title.or(tab_title)
    } else {
        tab_title.or(watched_title)
    }
}

/// The running observation a turn that starts becomes, so the sidebar shows
/// the conversation answering. `review` says PostPane opened it (a relay's
/// conversation); every other conversation is the owner's own chat. None for
/// a new chat that has no address yet.
pub fn started(message: &Value, watched: Option<&Watched>, now: i64) -> Option<HookEvent> {
    let (conversation, at) = turn_at(message, now)?;
    Some(HookEvent {
        source: agent::AGENT.id.into(),
        session_id: agent::session_id(conversation),
        kind: "session-observation".into(),
        at_ms: at,
        data: json!({
            "state": "running",
            "turnId": format!("start-{at}"),
            "startedAtMs": at,
            "title": turn_title(message, watched),
            "prompt": message["prompt"].as_str().filter(|text| !text.is_empty()),
            "review": watched.is_some(),
            "navigationTarget": agent::navigation_target(conversation),
        }),
    })
}

/// The completion event a finished turn becomes: the reply in full, the
/// prompt, the conversation's title, whether it is a review (as `started`)
/// and its way back. None for a turn that names no conversation.
pub fn completion(message: &Value, watched: Option<&Watched>, now: i64) -> Option<HookEvent> {
    let (conversation, at) = turn_at(message, now)?;
    let turn = message["messageId"]
        .as_str()
        .filter(|id| !id.is_empty())
        .map(str::to_owned)
        .unwrap_or_else(|| at.to_string());
    let title = turn_title(message, watched);
    Some(HookEvent {
        source: agent::AGENT.id.into(),
        session_id: agent::session_id(conversation),
        kind: "completion".into(),
        at_ms: at,
        data: json!({
            "turnId": turn,
            "title": title,
            "prompt": message["prompt"].as_str().filter(|text| !text.is_empty()),
            "message": message["reply"].as_str().filter(|text| !text.is_empty()),
            "review": watched.is_some(),
            "navigationTarget": agent::navigation_target(conversation),
        }),
    })
}
