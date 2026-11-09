//! A Codex thread's turns, read from the end of its rollout in
//! `<Codex's folder>/sessions/<year>/<month>/<day>/rollout-…-<thread>.jsonl`
//! (#283): when each began, how (`composer` when the person typed it,
//! `queue` for words handed in through its queue), and its first words.
//! A relay a Codex thread started counts its rounds from one again once the
//! person spoke up there, and follows its words back until a turn began
//! with them.
use crate::claude_plugin::{tail, valid_name, Opener};
use agent_hud_agents::codex::transcript::user_words;
use agent_hud_agents::transcript::metering::date_ms;
use serde_json::Value;
use std::{
    fs,
    path::{Path, PathBuf},
};

/// One turn whose beginning the rollout's end holds.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Turn {
    /// When it began, in milliseconds.
    pub at: i64,
    /// How it began, as Codex names it (`composer`, `queue`, `exec`, …).
    pub trigger: Option<String>,
    /// The user's first words in it, when within reach.
    pub words: Option<String>,
}

/// The thread's rollout, newest day first; None when there is none.
pub fn rollout(codex_home: &Path, thread: &str) -> Option<PathBuf> {
    if !valid_name(thread) {
        return None;
    }
    let suffix = format!("-{thread}.jsonl");
    let mut days = folders(&codex_home.join("sessions"))
        .iter()
        .flat_map(|year| folders(year))
        .flat_map(|month| folders(&month))
        .collect::<Vec<_>>();
    days.sort();
    days.iter().rev().find_map(|day| {
        fs::read_dir(day)
            .ok()?
            .flatten()
            .map(|entry| entry.path())
            .find(|path| {
                path.file_name()
                    .and_then(|name| name.to_str())
                    .is_some_and(|name| name.starts_with("rollout-") && name.ends_with(&suffix))
            })
    })
}

fn folders(path: &Path) -> Vec<PathBuf> {
    fs::read_dir(path)
        .map(|entries| {
            entries
                .flatten()
                .map(|entry| entry.path())
                .filter(|path| path.is_dir())
                .collect()
        })
        .unwrap_or_default()
}

/// The turns whose beginning the end of `file` holds, oldest first.
pub fn turns(file: &Path) -> Vec<Turn> {
    let Some(tail) = tail(file) else {
        return vec![];
    };
    let mut turns: Vec<Turn> = vec![];
    // Only the lines a turn's beginning is told by are parsed: the tail is
    // read each time words wait for the thread.
    let wanted =
        |line: &&str| line.contains("\"task_started\"") || line.contains("\"role\":\"user\"");
    for value in tail
        .lines()
        .filter(wanted)
        .filter_map(|line| serde_json::from_str::<Value>(line).ok())
    {
        let payload = &value["payload"];
        if value["type"] == "event_msg" && payload["type"] == "task_started" {
            let Some(at) = value["timestamp"].as_str().and_then(date_ms) else {
                continue;
            };
            let trigger = payload["turn_attribution"]["turn_trigger"].as_str();
            turns.push(Turn {
                at,
                trigger: trigger.map(str::to_owned),
                words: None,
            });
        } else if value["type"] == "response_item"
            && payload["type"] == "message"
            && payload["role"] == "user"
            && user_words(&value)
        {
            if let Some(turn) = turns.last_mut().filter(|turn| turn.words.is_none()) {
                turn.words = Some(text(payload));
            }
        }
    }
    turns
}

fn text(payload: &Value) -> String {
    payload["content"]
        .as_array()
        .into_iter()
        .flatten()
        .filter(|part| part["type"] == "input_text")
        .filter_map(|part| part["text"].as_str())
        .collect()
}

/// Who began the thread's current turn and when: the person, typed in
/// Codex, or words handed in through its queue (PostPane's or another
/// agent's) as they read. None when it cannot be told.
pub fn current_turn(codex_home: &Path, thread: &str) -> Option<(Opener, i64)> {
    let turn = turns(&rollout(codex_home, thread)?).pop()?;
    let opener = match turn.trigger.as_deref()? {
        "composer" => Opener::Person,
        "queue" => Opener::Plugin(turn.words?),
        _ => return None,
    };
    Some((opener, turn.at))
}

/// Whether a turn of the thread began with `words`, as PostPane handed them
/// in through its queue (a label may come before them).
pub fn began_with(codex_home: &Path, thread: &str, words: &str) -> bool {
    let words = words.trim();
    !words.is_empty()
        && rollout(codex_home, thread).is_some_and(|file| {
            turns(&file)
                .iter()
                .filter_map(|turn| turn.words.as_deref())
                .any(|said| said.trim() == words || said.contains(words))
        })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    const THREAD: &str = "01a1be3c-e125-7411-a308-4169ce8921a9";

    fn started(at: &str, trigger: &str) -> Value {
        json!({"timestamp": at, "type": "event_msg", "payload": {
            "type": "task_started",
            "turn_attribution": {"turn_id": "t", "turn_trigger": trigger}}})
    }
    fn said(at: &str, text: &str) -> Value {
        json!({"timestamp": at, "type": "response_item", "payload": {
            "type": "message", "role": "user",
            "content": [{"type": "input_text", "text": text}]}})
    }
    /// A rollout as Codex writes it, on the day it began.
    fn rollout_of(lines: &[Value]) -> (tempfile::TempDir, PathBuf) {
        let temp = tempfile::tempdir().unwrap();
        let day = temp.path().join("sessions/2026/11/09");
        fs::create_dir_all(&day).unwrap();
        let text = lines
            .iter()
            .map(Value::to_string)
            .collect::<Vec<_>>()
            .join("\n");
        fs::write(
            day.join(format!("rollout-2026-11-09T10-57-03-{THREAD}.jsonl")),
            text,
        )
        .unwrap();
        let home = temp.path().to_owned();
        (temp, home)
    }

    #[test]
    fn a_turn_the_person_typed_is_theirs() {
        let (_temp, home) = rollout_of(&[
            started("2026-11-09T02:57:05.395Z", "queue"),
            said(
                "2026-11-09T02:57:05.400Z",
                "# AGENTS.md instructions\n<INSTRUCTIONS>…",
            ),
            said("2026-11-09T02:57:05.401Z", "驿窗转回的意见"),
            started("2026-11-09T03:20:00.000Z", "composer"),
            said("2026-11-09T03:20:00.010Z", "先别改，等我看看"),
        ]);
        let (opener, at) = current_turn(&home, THREAD).unwrap();
        assert_eq!(opener, Opener::Person);
        assert_eq!(at, date_ms("2026-11-09T03:20:00.000Z").unwrap());
    }

    #[test]
    fn a_queued_turn_reads_as_its_words_past_the_context_codex_adds() {
        let (_temp, home) = rollout_of(&[
            started("2026-11-09T03:16:31.592Z", "queue"),
            said(
                "2026-11-09T03:16:31.600Z",
                "<environment_context>…</environment_context>",
            ),
            said("2026-11-09T03:16:31.601Z", "ChatGPT 对「修登录」的审核意见"),
        ]);
        assert_eq!(
            current_turn(&home, THREAD).unwrap().0,
            Opener::Plugin("ChatGPT 对「修登录」的审核意见".into())
        );
        assert!(began_with(
            &home,
            THREAD,
            "ChatGPT 对「修登录」的审核意见\n"
        ));
        assert!(!began_with(&home, THREAD, "另一段话"));
    }

    #[test]
    fn words_after_a_label_still_count_as_begun() {
        let (_temp, home) = rollout_of(&[
            started("2026-11-09T04:45:21.629Z", "queue"),
            said(
                "2026-11-09T04:45:21.700Z",
                "[Agent HUD · 来自驿窗]\n\n请把这一轮交给 ChatGPT 审核",
            ),
        ]);
        assert!(began_with(&home, THREAD, "请把这一轮交给 ChatGPT 审核"));
    }

    #[test]
    fn nothing_is_told_without_a_rollout_or_a_known_trigger() {
        let (_temp, home) = rollout_of(&[started("2026-11-09T05:00:00.000Z", "exec")]);
        assert_eq!(current_turn(&home, THREAD), None);
        assert_eq!(
            current_turn(&home, "01a0aaaa-0000-0000-0000-000000000000"),
            None
        );
        assert_eq!(current_turn(&home, "../x"), None);
        assert!(!began_with(&home, THREAD, ""));
    }
}
