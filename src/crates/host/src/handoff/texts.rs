//! The timeline's words for the auto round trip and its stops, moved out of
//! handoff.rs for the 300-line ratchet (#282). They name the doer as
//! Claude; `by_doer` gives a Codex handoff's as Codex.

use agent_hud_runtime::chatgpt::handoffs::{self, Flaw};
use agent_hud_runtime::l10n;

pub(super) fn passed(chinese: bool) -> String {
    in_language(
        chinese,
        "结论：通过，自动结束接力",
        "Passed; the handoff ended",
    )
}
/// How an end's answer went to Claude (#316): the review's result and
/// this are both on the card, one not in place of the other.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(super) enum Sent {
    /// It reached the session (or a background run of it).
    Back,
    /// It waits in the session's queue: not there yet.
    Queued,
    /// Tried twice and queued, and it could not go.
    Failed,
}
fn sent(how: Sent) -> (&'static str, &'static str) {
    match how {
        Sent::Back => ("回信已转回 Claude", "the answer went back to Claude"),
        Sent::Queued => (
            "回信已排进 Claude 会话的待发送队列，还没送到",
            "the answer is queued for the Claude session, not there yet",
        ),
        Sent::Failed => (
            "回信没能转回 Claude，请告诉它审查结论",
            "the answer could not go back to Claude; tell it the outcome",
        ),
    }
}
/// A pass, its answer sent `how`, then the handoff ended (#316).
pub(super) fn passed_back(how: Sent) -> String {
    let (zh, en) = sent(how);
    l10n::text(
        &format!("结论：通过，{zh}，自动结束接力"),
        &format!("Passed; {en}; the handoff ended"),
    )
}
/// The newest words back that the plugin gave up after the handoff ended
/// (#316): the session never had them. Not only an end's answer — the
/// person may have ended it with an answer or an ask to hand over again
/// on its way — so it does not say which.
pub(super) fn end_undelivered(state: &str) -> String {
    let (zh, en) = match state {
        "refused" => ("被插件拒收", "were refused"),
        "expired" => ("1 小时没被领走、已过期", "expired untaken after an hour"),
        _ => ("被取消", "were cancelled"),
    };
    l10n::text(
        &format!("接力已结束，但最后一条转给 Claude 的话{zh}，会话没收到：请看看要不要自己告诉它"),
        &format!(
            "The handoff ended, but the last words for Claude {en}; the session never had them. See whether to tell it yourself"
        ),
    )
}
pub(super) fn thinking_closed() -> String {
    l10n::text(
        "思维评审收口，回信已转回 Claude，自动结束接力",
        "The thinking review settled; its answer went back to Claude and the handoff ended",
    )
}
pub(super) fn evidence_paused() -> String {
    l10n::text(
        "证据不足暂停，等 Claude 取证",
        "Paused for evidence; Claude is to gather it",
    )
}
pub(super) fn escalated() -> String {
    l10n::text(
        "决策升级：已请 Claude 整理选项，自动往返停下，交常浩裁决",
        "Escalated: Claude is to lay out the options; left to you to decide",
    )
}
pub(super) fn invalid_tail(flaw: Flaw, how: Sent) -> String {
    let (zh, en) = sent(how);
    l10n::text(
        &format!(
            "思维评审回信末两行无效：{}；{zh}，自动往返停下，交还常浩",
            flaw_text(flaw)
        ),
        &format!(
            "The thinking review's last two lines do not hold: {}; {en}, left to you",
            flaw_text_en(flaw)
        ),
    )
}
/// What is wrong with a 思维评审 answer's last two lines, for Claude and the card.
pub(super) fn flaw_text(flaw: Flaw) -> &'static str {
    match flaw {
        Flaw::NoVerdict => "最后一行不是「结论：…」",
        Flaw::UnknownVerdict => "结论只认 通过 / 需修改 / 交常浩裁决",
        Flaw::NoExit => "倒数第二行不是「评审出口：…」",
        Flaw::UnknownExit => {
            "评审出口只认 成熟退出 / 继续深化 / 证据不足暂停 / 决策升级 / 转其他路径"
        }
        Flaw::Mismatch => "评审出口与结论对不上",
    }
}
pub(super) fn flaw_text_en(flaw: Flaw) -> &'static str {
    match flaw {
        Flaw::NoVerdict => "the last line is not 「结论：…」",
        Flaw::UnknownVerdict => "the verdict is none of 通过 / 需修改 / 交常浩裁决",
        Flaw::NoExit => "the line before it is not 「评审出口：…」",
        Flaw::UnknownExit => "the way out is none of the five",
        Flaw::Mismatch => "the way out and the verdict do not go together",
    }
}
pub(super) fn back_retry(error: &str) -> String {
    l10n::text(
        &format!("自动转回 Claude 失败：{error}；马上重试一次"),
        &format!("Could not send it back to Claude: {error}; trying once more"),
    )
}
pub(super) fn retry_failed(error: &str) -> String {
    l10n::text(
        &format!("重试仍失败：{error}"),
        &format!("Failed again: {error}"),
    )
}
pub(super) fn queued_instead(error: &str) -> String {
    l10n::text(
        &format!("重试仍失败：{error}；改为排进这个会话的待发送队列，会话一直不在线就在后台续接"),
        &format!(
            "Failed again: {error}; queued for the session instead, to run in the background if it stays quiet"
        ),
    )
}
/// Why the person has a handoff whose words back the plugin gave up (#257).
pub(super) fn undelivered(state: &str, reason: Option<&str>) -> String {
    match state {
        "refused" => l10n::text(
            &format!(
                "Claude 会话的插件拒收了转回的话（{}），交还常浩",
                reason.unwrap_or("没说原因")
            ),
            &format!(
                "The Claude session's plugin refused the words back ({}); left to you",
                reason.unwrap_or("no reason given")
            ),
        ),
        "expired" => l10n::text(
            "转回的话 1 小时没被 Claude 会话领走，已过期，交还常浩",
            "The words back were not taken up by the Claude session within an hour; left to you",
        ),
        _ => l10n::text(
            "转回的话被取消了，交还常浩",
            "The words back were cancelled; left to you",
        ),
    }
}
pub(super) fn no_wake() -> String {
    l10n::text(
        &format!(
            "转回的意见排队 {} 分钟没被会话领走，自动往返停下，交还常浩",
            handoffs::QUEUE_WAIT_MS / 60_000
        ),
        "The queued answer was not taken up within an hour; left to you",
    )
}
pub(super) fn idle_end() -> String {
    l10n::text(
        &format!(
            "等常浩处理 {} 小时没动静，驿窗自动结束接力",
            handoffs::IDLE_END_MS / 3_600_000
        ),
        "Untouched for a day after it was left to you; PostPane ended it",
    )
}
pub(super) fn no_answer() -> String {
    l10n::text(
        &format!(
            "ChatGPT {} 分钟没回信，自动往返停下，交还常浩",
            handoffs::REPLY_WAIT_MS / 60_000
        ),
        "ChatGPT has not answered in 30 minutes; left to you",
    )
}
pub(super) fn no_handover() -> String {
    l10n::text(
        &format!(
            "Claude {} 小时没交回复审，自动往返停下，交还常浩",
            handoffs::FIX_WAIT_MS / 3_600_000
        ),
        "Claude has not handed it over again in 2 hours; left to you",
    )
}
pub(super) fn paused() -> String {
    l10n::text("常浩暂停", "Paused by the person")
}
pub(super) fn at_limit(budget: u32, how: Sent) -> String {
    let (zh, en) = sent(how);
    l10n::text(
        &format!("已审 {budget} 轮仍需修改，{zh}，自动往返停下，交还常浩"),
        &format!("Still to fix after {budget} rounds; {en}, left to you"),
    )
}
pub(super) fn no_rounds_left(budget: u32) -> String {
    l10n::text(
        &format!(
            "已审满 {budget} 轮，自动往返没有可做的了：要再审，请让 Claude 重新送审（工程审查要你授权，Claude 调用时填 extra），或结束接力"
        ),
        &format!(
            "All {budget} rounds are used; nothing is left for the auto round trip. Have Claude send it for review afresh (an engineering review needs your leave, given as extra), or end the handoff"
        ),
    )
}
pub(super) fn settled() -> String {
    l10n::text(
        "L1 审查预算用完：意见已转回 Claude 改完收口，自动结束接力",
        "L1's one review is used: the answer went back to Claude to fix and close; the handoff ended",
    )
}
pub(super) fn l0_refused() -> String {
    l10n::text(
        "L0 只做机械检查，不送审；确实要审，risk 改填 L1。",
        "L0 gets mechanical checks only and is not sent for review; to have it reviewed, give risk L1.",
    )
}
pub(super) fn bad_risk(text: &str) -> String {
    l10n::text(
        &format!("risk 只认 L1 / L2 / L3，收到的是「{text}」，没有发出。"),
        &format!("risk takes L1 / L2 / L3, not 「{text}」; nothing was sent."),
    )
}
pub(super) fn budget_spent(counted: u32) -> String {
    l10n::text(
        &format!(
            "这个 PR 已审 {counted} 轮，审查预算用完了，没有发出：请先问常浩。常浩明确授权再审一次时，调用时 extra 写明谁授权、为什么。"
        ),
        &format!(
            "This pull request had {counted} reviews and its budget is used; nothing was sent. Ask the person first; with their leave for one more, give extra saying who allowed it and why."
        ),
    )
}
pub(super) fn bad_review_tail(flaw: Flaw, how: Sent) -> String {
    let (zh, en) = sent(how);
    l10n::text(
        &format!(
            "审查出口与结论对不上：{}；{zh}，自动往返停下，交还常浩",
            review_flaw_text(flaw)
        ),
        &format!(
            "The review's way out and verdict do not hold together: {}; {en}, left to you",
            review_flaw_text(flaw)
        ),
    )
}
/// What is wrong with an engineering answer's 「审查出口」 and verdict (#217).
pub(super) fn review_flaw_text(flaw: Flaw) -> &'static str {
    match flaw {
        Flaw::NoVerdict => "审查出口下面一行不是「结论：…」",
        Flaw::UnknownVerdict => "结论只认 通过 / 需修改",
        Flaw::NoExit | Flaw::UnknownExit => "审查出口只认 通过 / 返修 / 证据不足暂停 / 决策升级",
        Flaw::Mismatch => "审查出口与结论对不上（通过配通过，其余配需修改）",
    }
}
pub(super) fn no_verdict(how: Sent) -> String {
    let (zh, en) = sent(how);
    l10n::text(
        &format!("回信没写结论，{zh}，自动往返停下，交还常浩"),
        &format!("The answer has no verdict; {en}, left to you"),
    )
}
pub(super) fn back_failed() -> String {
    l10n::text(
        "转回 Claude 失败两次，自动往返停下，交还常浩",
        "Could not send it back to Claude twice; left to you",
    )
}
pub(super) fn timed_out() -> String {
    l10n::text(
        "ChatGPT 新会话两分钟没打开",
        "The ChatGPT conversation did not open within two minutes",
    )
}
pub(super) fn interrupted(chinese: bool) -> String {
    in_language(
        chinese,
        "驿窗重启时 ChatGPT 新会话还在打开",
        "PostPane restarted while the ChatGPT conversation was opening",
    )
}
/// The text in Chinese or not, whatever the app's language now.
pub(super) fn in_language(chinese: bool, zh: &str, en: &str) -> String {
    if chinese { zh } else { en }.to_owned()
}
