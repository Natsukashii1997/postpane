//! A read again that found the answer in ChatGPT but not drawn (#457): on
//! 2026-11-20 #439's answer stayed in a tab whose window was off screen, and
//! the handoff waited out its 30 minutes with nothing said. What each read
//! found goes in `turns.jsonl`; reads in a row that find the answer there,
//! not drawn, stop the auto round trip and leave it to the person, saying
//! that opening the tab takes it in.
use super::Desk;
use agent_hud_runtime::l10n;
use serde_json::{json, Value};

/// How many reads in a row must find the answer undrawn, or the page
/// lacking what PostPane reads (#548), two minutes apart
/// (`reread::AGAIN_MS`): one may catch a tab put in front a moment late, or
/// a page still drawing its history.
pub(super) const UNDRAWN_TIMES: u32 = 2;

impl Desk {
    /// The extension read a conversation again and says what it found
    /// (`outcome`) and how its tab stood. Whether a handoff stopped.
    pub(super) fn heard_reread(&self, message: &Value, now: i64) -> bool {
        let missing = missing(message);
        let mut line = json!({
            "at": now,
            "conversation": message["conversation"],
            "phase": "reread",
            "outcome": message["outcome"],
            "hidden": message["hidden"],
            "active": message["active"],
            "minimized": message["minimized"],
            "fronted": message["fronted"],
            "reloaded": message["reloaded"],
        });
        if !missing.is_empty() {
            line["missing"] = json!(missing);
        }
        self.append_turn(&line);
        let conversation = message["conversation"].as_str().unwrap_or("");
        let Some(id) = self
            .lock()
            .for_conversation(conversation)
            .map(|h| h.id.clone())
        else {
            return false;
        };
        let changed = self.change(|book| book.reread_result(&id, message["outcome"].as_str(), now));
        // The same outcome, read after read: one may be passing.
        let outcome = message["outcome"].as_str().unwrap_or("");
        let times = {
            let mut rows = self.undrawn.lock().unwrap_or_else(|p| p.into_inner());
            if !matches!(outcome, "undrawn" | "changed") {
                rows.remove(&id);
                return changed;
            }
            let row = rows
                .entry(id.clone())
                .or_insert_with(|| (outcome.to_owned(), 0));
            if row.0 != outcome {
                *row = (outcome.to_owned(), 0);
            }
            row.1 += 1;
            row.1
        };
        if times < UNDRAWN_TIMES {
            return changed;
        }
        self.undrawn
            .lock()
            .unwrap_or_else(|p| p.into_inner())
            .remove(&id);
        if outcome == "changed" {
            let reason = changed_halt(&missing);
            return self.change(|book| book.page_changed(&id, &reason, now)) || changed;
        }
        self.change(|book| book.stop_undrawn(&id, &undrawn_halt(), now)) || changed
    }
}

/// What the page check found missing (#548): its codes, as many as make
/// sense to tell.
fn missing(message: &Value) -> Vec<String> {
    message["missing"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|code| code.as_str())
        .filter(|code| code.len() <= 32)
        .take(8)
        .map(str::to_owned)
        .collect()
}

/// Why the round trip stopped: the page lacks what PostPane reads (#548),
/// named as the person sees it.
pub(super) fn changed_halt(missing: &[String]) -> String {
    let names: Vec<&str> = missing
        .iter()
        .map(|code| match code.as_str() {
            "composer" => "输入框",
            "turns" => "对话轮次",
            "prompt-ids" => "提问编号",
            "answers" => "回答格子",
            "bubbles" => "提问文字",
            other => other,
        })
        .collect();
    l10n::text(
        &format!(
            "ChatGPT 页面改版：驿窗认不出{}，读不到回信，自动往返停下，交还常浩；要先修驿窗的 Chrome 插件",
            names.join("、")
        ),
        &format!(
            "The ChatGPT page changed: PostPane cannot find {}, so it cannot read the answer; left to you: PostPane's Chrome extension needs fixing",
            missing.join(", ")
        ),
    )
}

/// Why the round trip stopped: the answer is there, its tab drew nothing.
pub(super) fn undrawn_halt() -> String {
    l10n::text(
        "ChatGPT 已答完，但标签页没画出回信，自动往返停下，交还常浩；点开那个 ChatGPT 标签页就能收回",
        "ChatGPT has answered, but its tab drew nothing; left to you: open that ChatGPT tab to take it in",
    )
}
