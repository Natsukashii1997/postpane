//! Ending handoffs from an agent session (#439): `relay_list` names the
//! handoffs still open and the session that began each, `relay_end` ends
//! them as the card's 结束接力 does. Any agent may (#587, 常浩 2026-11-28:
//! no hand of his needed); only when the person began the calling
//! session's current turn does the end settle a cap, so no agent lets a
//! capped review go on by ending it.
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

    /// Ends `ids` for `doer`'s `session`: which ended, and which did not and
    /// why, and whether at the person's word (`byPerson`, #587) — the
    /// person began its current turn — which alone settles a cap.
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
        // began reads as the person's meanwhile (#439 review P1-01): not the
        // person's while any are. Looked at before the book: words still on
        // their way after the turn was read are told by this, and words that
        // arrived before are in the book by then.
        let heard = !self.sending_to(doer, session) && self.lock().person_began(turn.as_ref());
        let text = ended_by(doer, session, reason, heard);
        let (mut ended, mut refused) = (vec![], vec![]);
        let mut seen = HashSet::new();
        for id in ids.iter().filter(|id| seen.insert(id.as_str())) {
            match self.end_one(id, &text, heard, now) {
                Ok(()) => ended.push(id.clone()),
                Err(why) => refused.push(json!({"id": id, "why": why})),
            }
        }
        Ok(json!({"ended": ended, "refused": refused, "byPerson": heard}))
    }

    /// Whether words back of any handoff are on their way to `doer`'s
    /// `session` (`claim_back`). Not words toward ChatGPT (`claim`, #587
    /// review P2-01); a trouble notice goes under `claim` too, yet its words
    /// are told apart by how they begin (`Book::person_began`).
    fn sending_to(&self, doer: &str, session: &str) -> bool {
        let ids: Vec<String> = self
            .sending
            .lock()
            .unwrap_or_else(|p| p.into_inner())
            .iter()
            .filter(|(_, toward_chatgpt)| !**toward_chatgpt)
            .map(|(id, _)| id.clone())
            .collect();
        let book = self.lock();
        ids.iter()
            .filter_map(|id| book.get(id))
            .any(|h| h.claude_session == session && h.doer.as_deref().unwrap_or(CLAUDE) == doer)
    }

    fn end_one(&self, id: &str, text: &str, heard: bool, now: i64) -> Result<(), String> {
        let gone = || l10n::text("这次接力已经结束", "This handoff has ended");
        match self.lock().get(id) {
            None => return Err(l10n::text("找不到这次接力", "No such handoff")),
            Some(h) if !endable(h) => return Err(gone()),
            Some(h) if !heard && awaited(h, now) => return Err(still_awaited()),
            Some(_) => {}
        }
        // Not while words are on their way, as the card's button (`act`).
        let _sending = self.claim(id)?;
        let ended = self.change(|book| match heard {
            true => book.end_said(id, Some(text), now),
            false => book.end_by_agent(id, text, now),
        });
        if ended {
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

/// Still with ChatGPT and within the wait PostPane gives it, not stopped:
/// ended by an agent on its own, its answer would be lost (#587 review
/// P1-02). Once the wait is over, or PostPane stopped it, it is stuck.
fn awaited(h: &Handoff, now: i64) -> bool {
    h.in_flight() && h.halt.is_none() && h.wait_over(now).is_none()
}

fn still_awaited() -> String {
    l10n::text(
        "ChatGPT 还在答这张，驿窗正常等着回信，智能体不能自行结束（回信会丢）：等它答完、或驿窗等到头停下后再结束；常浩说要结束的照结。",
        "ChatGPT is still answering this one and PostPane is waiting as usual; an agent cannot end it on its own (the answer would be lost). End it once answered or once PostPane stops waiting; at the person's word it ends.",
    )
}

/// The card's words for an end an agent made, at the person's word
/// (`heard`) or on its own.
fn ended_by(doer: &str, session: &str, reason: &str, heard: bool) -> String {
    let client = if doer == CODEX {
        "Codex"
    } else {
        "Claude Code"
    };
    let reason: String = reason.chars().take(200).collect();
    if heard {
        l10n::text(
            &format!("{client} 会话 {session} 按常浩授权结束：{reason}"),
            &format!("Ended by {client} session {session} at the person's word: {reason}"),
        )
    } else {
        l10n::text(
            &format!("{client} 会话 {session} 自行结束：{reason}"),
            &format!("Ended by {client} session {session} on its own: {reason}"),
        )
    }
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

/// `relay_end`: ends handoffs for an agent (`Desk::end_asked`).
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
