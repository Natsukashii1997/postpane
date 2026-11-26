//! The review gate's own doings on the host (#347, agent-kit review
//! contract): asking ChatGPT once to mend an answer's last lines, reading a
//! pull request's current commit before a pass ends the handoff, and the
//! words for both. What the answers mean, PostPane does not judge.
use super::guard::Held;
use super::texts::Sent;
use super::{Desk, Lines};
use crate::handoff::book::{self, Handoff};
use agent_hud_runtime::{chatgpt::SendFailed, l10n};

#[path = "desk_pr_head.rs"]
mod pr_head;
pub(super) use pr_head::read_pr_head;

impl Desk {
    /// Whether words may go into `id`'s `conversation` now, else why not:
    /// its review is with ChatGPT still, and other words would take its
    /// answer; or another answer is being written there (#507 review
    /// P1-04), and the conversation is read again, so a beginning heard
    /// with no end does not hold the same words the next time.
    pub(in crate::handoff) fn unheld(
        &self,
        lines: &dyn Lines,
        id: &str,
        conversation: &str,
        now: i64,
    ) -> Result<(), String> {
        let held = |handoff: &Handoff| (handoff.in_flight(), handoff.writing(now));
        let (waiting, writing) = self.lock().get(id).map_or((false, false), held);
        if waiting {
            return Err(super::guard::still_waiting());
        }
        if writing {
            if let Err(error) = lines.reread(conversation) {
                agent_hud_runtime::note!("{error}");
            }
            return Err(super::guard::writing_other());
        }
        Ok(())
    }
    /// The review cap as set now (`reviewLimit`, #347).
    pub(super) fn review_limit(&self) -> u32 {
        self.data.as_deref().map_or(book::LIMIT, book::review_limit)
    }
    /// The commit under review: as named, else the brief's (#347).
    pub(super) fn head(&self, rule: &super::Rule, brief: &str) -> Option<String> {
        let named = rule
            .head
            .as_deref()
            .map(str::trim)
            .filter(|h| !h.is_empty());
        named.map(str::to_owned).or_else(|| book::head_in(brief))
    }
    /// An engineering review of a pull request goes only with the full
    /// commit under review (review contract §4): else no pass could be checked.
    pub(super) fn head_needed(pr: Option<&str>, head: Option<&str>) -> Result<(), String> {
        let full = |h: &str| h.len() == 40 && h.chars().all(|c| c.is_ascii_hexdigit());
        match (pr, head) {
            (Some(_), Some(head)) if full(head) => Ok(()),
            (Some(pr), _) => Err(l10n::text(
                &format!("送审的是 {pr}，但没认出受审的完整提交，没有发出：调用时 head 填 40 位 SHA（或在 brief 里写一行「head_sha <40 位 SHA>」）。"),
                &format!("{pr} was sent with no full commit under review; nothing was sent. Give head as the 40-digit SHA (or a line 「head_sha <SHA>」 in the brief)."),
            )),
            (None, _) => Ok(()),
        }
    }
    /// Keeps the newest answer of handoff `id` in full (#347).
    pub(super) fn keep_answer(&self, book: &book::Book, id: &str, reply: &str) {
        let Some(data) = &self.data else { return };
        let n = book.get(id).map_or(0, |handoff| {
            handoff
                .steps
                .iter()
                .filter(|s| s.kind == book::StepKind::Reply)
                .count()
        });
        // As it came, before the handoff cuts it to its own length (#347).
        if let Err(error) = book::archive(data, id, n, reply.trim()) {
            agent_hud_runtime::note!("{error}");
        }
    }
    /// What PostPane adds to the next review of handoff `id` (#347), the
    /// ledger read from the answers kept in full.
    pub(super) fn carry(&self, book: &book::Book, id: &str) -> String {
        let data = self.data.clone();
        book.carry(id, &move |h, n| {
            data.as_deref().and_then(|d| book::archived(d, h, n))
        })
    }
    /// Asks ChatGPT, in the handoff's conversation, to mend only its newest
    /// answer's last lines (no review of its own, not counted). Once per
    /// answer: the mended one is taken as it comes. Whether it went.
    pub(super) fn ask_format(&self, lines: &dyn Lines, id: &str, now: i64) -> bool {
        let Ok(_sending) = self.claim(id) else {
            return false;
        };
        let Some(handoff) = self.lock().get(id).cloned() else {
            return false;
        };
        let Some(conversation) = handoff.chatgpt_conversation.clone() else {
            return false;
        };
        if handoff.next() != Some(book::Next::Format) || handoff.mending_waits(now) {
            return false;
        }
        let request = format!("{id}~format{now}");
        // Named by its request, so an earlier ask's answer never passes for
        // this one's (round 4 P1-11).
        let text = book::tagged(&request, &format_ask(&handoff));
        // On the card and kept apart from the review as one change, before
        // it goes (round 4 P1-10, P1-15): an answer quicker than the send's
        // own word is taken, and any that came early is caught up after.
        match self.change_kept(|book| book.ask_mending(id, &request, &text, now)) {
            Ok(true) => {}
            Ok(false) => return false,
            Err(error) => return self.change(|book| book.stop(id, &error, true, now)),
        }
        let done = match lines.send(&conversation, &text, &request) {
            Ok(asked_id) => {
                self.change(|book| {
                    book.confirm_pending(id, &request);
                    book.asked_as(id, asked_id.as_deref())
                });
                true
            }
            // Send never pressed: it did not go, and goes once more (#528).
            Err(SendFailed::NotPressed(error))
                if self.change(|book| {
                    let note = super::guard::mending_not_sent(&error);
                    book.mending_not_sent(id, &request, &note, now)
                }) =>
            {
                true
            }
            // Never known to have gone in: the session is told (P1-14).
            // Not when word of it was heard as the send gave up (#446).
            Err(failed) => self.change(|book| {
                if book.mending_gave_up(id, &request) {
                    book.trouble(id, &format_failed(failed.text()), now);
                    book.unconfirmed(id, &super::guard::send_unconfirmed(), true, now);
                }
                true
            }),
        };
        // Gone in or not known to have, ChatGPT may have answered before the
        // send gave its word: those turns are taken now (round 5 P1-17).
        self.caught_up(&conversation);
        done
    }
    /// Whether a pass may end handoff `id`: the commit under review is still
    /// its pull request's. None when it may, or when it reviews no pull
    /// request; else why not.
    pub(super) fn pass_blocked(&self, lines: &dyn Lines, handoff: &Handoff) -> Option<Held> {
        let held = |why: String, resend: bool| Some(Held { why, resend });
        // Sent and not known to have gone in: what it reviewed is not
        // known (L3 P1-10).
        if handoff.unsure() {
            return held(super::guard::unconfirmed(), false);
        }
        let pr = handoff.pr.as_deref()?;
        // Kept with no commit (from before the gate): it cannot be checked,
        // so it does not pass (P1-01); the current commit sent sets it right.
        let Some(head) = handoff.gate.head.as_deref() else {
            return held(super::guard::no_anchor(pr), true);
        };
        match lines.pr_head(pr) {
            Ok(now) if book::same_commit(&now, head) => None,
            // Commits after the one reviewed: common, as every round
            // touches CURRENT.md; the current one sent again goes on.
            Ok(now) => held(moved_on(pr, head, &now), true),
            Err(error) => held(unread_head(pr, &error), false),
        }
    }
}

/// What PostPane asks ChatGPT when an answer's last lines do not hold.
fn format_ask(handoff: &Handoff) -> String {
    if handoff.thinking() {
        return "（驿窗自动发送，不算一轮评审）上一封回信最后两行驿窗认不出。请不要改动任何判断，只把回信最后两行按格式重写一遍：倒数第二行「评审出口：成熟退出 / 继续深化 / 证据不足暂停 / 决策升级 / 转其他路径」（五选一），最后一行「结论：通过 / 需修改 / 交常浩裁决」，两行要对得上。出口与结论矛盾时以出口为准改结论；认不出原意时不要写通过。只回这两行。".to_owned();
    }
    let head = handoff
        .gate
        .head
        .as_deref()
        .map_or_else(|| "<实际审过的 commit SHA>".to_owned(), str::to_owned);
    format!("（驿窗自动发送，不算一轮审查）上一封回信末尾几行驿窗认不出。请不要改动任何判断、问题台账和已写明的审查出口，只把回信最后四行按格式重写一遍：\n受审版本：<实际审过的 commit SHA；送审的是 {head}>\n未决：P0 n，P1 n\n审查出口：通过 / 返修 / 证据不足暂停 / 决策升级\n结论：通过 / 需修改\n通过配通过，其余配需修改；出口与结论矛盾时以出口为准改结论；认不出原意时不要写通过。只回这四行。")
}
fn format_failed(error: &str) -> String {
    l10n::text(
        &format!("请 ChatGPT 补写末尾几行没确认送到：{error}"),
        &format!("Never heard the ask to mend its last lines went in: {error}"),
    )
}
fn moved_on(pr: &str, head: &str, now: &str) -> String {
    let (head, now) = (&head[..head.len().min(7)], &now[..now.len().min(7)]);
    l10n::text(
        &format!("审的是 {head}，{pr} 现在是 {now}：这次通过不能用于新提交，请用当前提交重新送审"),
        &format!("{head} was reviewed but {pr} is at {now} now: the pass does not hold for it; send the current commit again"),
    )
}
fn unread_head(pr: &str, error: &str) -> String {
    l10n::text(
        &format!("版本待核：读不到 {pr} 现在的提交（{error}），没有按通过结束，交还常浩"),
        &format!("Commit unverified: could not read {pr}'s current commit ({error}); not ended as a pass, left to you"),
    )
}
/// The pass did not hold for the commit under review (#347).
pub(super) fn stale(why: &str, how: Sent) -> String {
    let (zh, en) = super::texts::sent_words(how);
    l10n::text(
        &format!("{why}，{zh}，自动往返停下"),
        &format!("{why}; {en}; the auto round trip stopped"),
    )
}
/// A review chain named that PostPane does not know (#347).
pub(super) fn chain_unknown(chain: &str) -> String {
    l10n::text(
        &format!("驿窗没有审查链 {chain} 的记录，没有发出：请核对 chain 是否写对；确实是新的验收目标就不填 chain，拿不准就问常浩。"),
        &format!("PostPane has no review chain {chain}; nothing was sent. Check chain; leave it out only for a new acceptance goal, and ask the person when unsure."),
    )
}
