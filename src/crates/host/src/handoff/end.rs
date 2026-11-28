//! Ending handoffs from an agent session (#439): `relay_list` names the
//! handoffs still open and the session that began each, `relay_end` ends
//! them as the card's 结束接力 does — only when the person began the
//! calling session's current turn, so no agent ends a review (or settles
//! a cap) on its own.
use super::*;
use std::collections::HashSet;

impl Desk {
    /// The handoffs `relay_end` can end, newest change first.
    pub(crate) fn endable(&self, now: i64) -> Vec<Value> {
        let book = self.lock();
        let mut open: Vec<&Handoff> = book.list.iter().filter(|h| endable(h)).collect();
        open.sort_by_key(|h| std::cmp::Reverse(h.updated_at));
        open.into_iter()
            .map(|h| {
                json!({
                    "id": h.id,
                    "title": h.title,
                    "session": h.claude_session,
                    "client": h.doer.as_deref().unwrap_or(CLAUDE),
                    "cwd": h.cwd,
                    "pr": h.pr,
                    "phase": h.phase,
                    "halt": h.halt,
                    "auto": h.auto,
                    "counted": h.counted(),
                    "budget": h.budget(),
                    "quietMinutes": (now - h.updated_at).max(0) / 60_000,
                })
            })
            .collect()
    }

    /// Ends `ids` for `doer`'s `session`, when the person began its current
    /// turn: which ended, and which did not and why. Refused whole when the
    /// person's word cannot be told.
    pub(crate) fn end_asked(
        &self,
        lines: &dyn Lines,
        doer: &str,
        session: &str,
        ids: &[String],
        reason: &str,
        now: i64,
    ) -> Result<Value, String> {
        let reason = reason.trim();
        if ids.is_empty() || reason.is_empty() {
            return Err(l10n::text(
                "要写明结束哪几张（ids）和为什么（reason）。",
                "Name the handoffs to end (ids) and why (reason).",
            ));
        }
        let turn = lines.opener(doer, session);
        // Words on their way to the calling session go in before they are
        // written down (`Book::returned` follows the send), so the turn they
        // began reads as the person's meanwhile (#439 review P1-01): refused
        // whole while any are. Looked at before the book: words still on
        // their way after the turn was read are told by this, and words that
        // arrived before are in the book by then.
        if self.sending_to(doer, session) {
            return Err(end_busy());
        }
        if !self.lock().person_began(turn.as_ref()) {
            return Err(end_unheard());
        }
        let text = ended_by(doer, session, reason);
        let (mut ended, mut refused) = (vec![], vec![]);
        let mut seen = HashSet::new();
        for id in ids.iter().filter(|id| seen.insert(id.as_str())) {
            match self.end_one(id, &text, now) {
                Ok(()) => ended.push(id.clone()),
                Err(why) => refused.push(json!({"id": id, "why": why})),
            }
        }
        Ok(json!({"ended": ended, "refused": refused}))
    }

    /// Whether words of any handoff are on their way to `doer`'s `session`
    /// (a claim of `claim` or `claim_back`): words back, a trouble notice.
    fn sending_to(&self, doer: &str, session: &str) -> bool {
        let ids: Vec<String> = self
            .sending
            .lock()
            .unwrap_or_else(|p| p.into_inner())
            .keys()
            .cloned()
            .collect();
        let book = self.lock();
        ids.iter()
            .filter_map(|id| book.get(id))
            .any(|h| h.claude_session == session && h.doer.as_deref().unwrap_or(CLAUDE) == doer)
    }

    fn end_one(&self, id: &str, text: &str, now: i64) -> Result<(), String> {
        let gone = || l10n::text("这次接力已经结束", "This handoff has ended");
        match self.lock().get(id).map(endable) {
            None => return Err(l10n::text("找不到这次接力", "No such handoff")),
            Some(false) => return Err(gone()),
            Some(true) => {}
        }
        // Not while words are on their way, as the card's button (`act`).
        let _sending = self.claim(id)?;
        if self.change(|book| book.end_said(id, Some(text), now)) {
            Ok(())
        } else {
            Err(gone())
        }
    }
}

/// What `Book::end` takes: live, or failed and not closed.
fn endable(h: &Handoff) -> bool {
    h.live() || h.status == Status::Failed
}

/// The card's words for an end an agent made.
fn ended_by(doer: &str, session: &str, reason: &str) -> String {
    let client = if doer == CODEX {
        "Codex"
    } else {
        "Claude Code"
    };
    let reason: String = reason.chars().take(200).collect();
    l10n::text(
        &format!("{client} 会话 {session} 按常浩授权结束：{reason}"),
        &format!("Ended by {client} session {session} at the person's word: {reason}"),
    )
}

pub(super) fn end_busy() -> String {
    l10n::text(
        "驿窗正往这个会话送话，这一轮是谁开的头现在核实不了，没有结束任何接力。等这段话送到、常浩在会话里说一句要结束哪几张，再调用。",
        "PostPane is sending words to this session, so who began this turn cannot be told now. Nothing was ended. Once they are in, ask the person to say in this session which handoffs to end, then call again.",
    )
}

pub(super) fn end_unheard() -> String {
    l10n::text(
        "驿窗核实不到这一轮是常浩开的头（他在会话里打的字，或经驿窗插件送进来、不带智能体来源标签的话才算；别的智能体转达的不算），没有结束任何接力。请常浩在这个会话里说一句要结束哪几张，再调用。",
        "PostPane could not tell the person began this turn (their own words in the session, or words Agent HUD's plugin brought in without an agent's label; another agent passing it on does not count). Nothing was ended. Ask the person to say in this session which handoffs to end, then call again.",
    )
}

/// The calling client, as `relay`: Claude Code or Codex, whose turns can be
/// told.
fn doer_of(caller: &Value) -> Result<&'static str, String> {
    match caller["client"].as_str() {
        Some(CODEX) => Ok(CODEX),
        Some(CLAUDE) => Ok(CLAUDE),
        _ => Err(l10n::text(
            "只有 Claude Code 和 Codex 会话能结束接力。",
            "Only a Claude Code or Codex session can end handoffs.",
        )),
    }
}

/// `relay_list`.
pub(crate) fn relay_list(app: &tauri::AppHandle) -> Result<Value, String> {
    let desk = app.try_state::<Desk>().ok_or_else(demo)?;
    Ok(json!({"relays": desk.endable(now_ms())}))
}

/// `relay_end`: ends handoffs at the person's word (`Desk::end_asked`).
pub(crate) fn relay_end(app: &tauri::AppHandle, params: &Value) -> Result<Value, String> {
    let caller = &params["caller"];
    let doer = doer_of(caller)?;
    let session = caller_session(caller).ok_or_else(|| {
        l10n::text(
            "认不出是哪个会话在调用（调用里没有会话 id），没有结束任何接力。",
            "Could not tell which session is calling (the call names none); nothing was ended.",
        )
    })?;
    let ids: Vec<String> = params["ids"]
        .as_array()
        .map(|ids| {
            ids.iter()
                .filter_map(Value::as_str)
                .map(str::to_owned)
                .collect()
        })
        .unwrap_or_default();
    let reason = params["reason"].as_str().unwrap_or("");
    let desk = app.try_state::<Desk>().ok_or_else(demo)?;
    let answer = desk.end_asked(&AppLines(app), doer, &session, &ids, reason, now_ms())?;
    if answer["ended"]
        .as_array()
        .is_some_and(|ended| !ended.is_empty())
    {
        republish(app);
    }
    Ok(answer)
}
