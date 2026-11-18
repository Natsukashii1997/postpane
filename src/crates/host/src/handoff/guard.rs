//! What keeps a review's count and its commit whole on the host (#347, L3
//! round 2): one way back for a pass, checked against the pull request's
//! commit however it goes (P1-01, P1-09), and the words when a review is
//! refused for a review still with ChatGPT (P1-04) or a cap reached here
//! and not settled (P1-08).
use super::back::held_back_text;
use super::{back_text, Desk, Lines};
use agent_hud_runtime::chatgpt::handoffs::{Handoff, Next};
use agent_hud_runtime::l10n;

/// Why a pass or a close was held back, and whether Claude sending the
/// pull request's current commit again sets it right: then the round trip
/// goes on, not left to the person (Fable review #8, MA-02 §4).
#[derive(Clone, Debug, PartialEq)]
pub(super) struct Held {
    pub why: String,
    pub resend: bool,
}

impl Desk {
    /// The words back for `handoff`'s newest answer `reply`, and, for a
    /// pass that does not hold for the commit under review, why: every
    /// way back, by hand or by itself, says the same.
    pub(super) fn back_words(
        &self,
        lines: &dyn Lines,
        handoff: &Handoff,
        reply: &str,
    ) -> (String, Option<Held>) {
        // A 思维评审's close ends it as a pass does: words never known to
        // have gone in hold it back too (L3 P1-10).
        let blocked = matches!(handoff.outcome(), Next::Pass | Next::Close)
            .then(|| self.pass_blocked(lines, handoff))
            .flatten();
        // Not the pass's words with a word against them: words that say it
        // did not pass (L3 P1-09).
        let text = match &blocked {
            Some(held) => held_back_text(handoff, held),
            None => back_text(handoff, reply),
        };
        (text, blocked)
    }
}

/// A review of a pull request with no commit kept (from before the
/// review gate): no pass of it can be checked (P1-01).
pub(super) fn no_anchor(pr: &str) -> String {
    l10n::text(
        &format!("这张接力送审 {pr} 时没记受审提交（审核门之前开的），驿窗核对不了通过的是不是 PR 现在的版本，没有按通过结束：请用当前提交（head 填 40 位 SHA）重新送审"),
        &format!("This review of {pr} kept no commit (it began before the review gate), so PostPane cannot check the pass holds for the pull request now; not ended as a pass. Send the current commit (head, 40 digits) again"),
    )
}
/// The chain's newest handoff still waits on ChatGPT (P1-04).
pub(super) fn chain_busy(chain: &str, waiting: &str) -> String {
    l10n::text(
        &format!("审查链 {chain} 上一张接力（{waiting}）还在等 ChatGPT 回信，没有发出：等那封回信到了、算进轮数再接着送；不要了的话，请常浩先在侧栏结束那张接力。"),
        &format!("Review chain {chain}'s handoff {waiting} still waits on ChatGPT; nothing was sent. Send once its answer is in and counted, or have the person end that handoff first."),
    )
}
/// A review here reached its cap and is not settled (P1-08).
pub(super) fn top_unsettled(chain: &str) -> String {
    l10n::text(
        &format!("这个会话或工作目录里的审查链 {chain} 已审到顶、还没了结，没有发出：接着审同一个目标，请常浩在会话里说一句，再填 chain 和 extra 送；确实是新的验收目标，也请常浩在会话里说一句再送（或由常浩在侧栏结束那张接力）。"),
        &format!("Review chain {chain} reached its cap in this session or working directory and is not settled; nothing was sent. To go on with it, have the person say so, then give chain and extra; for a new acceptance goal too, have the person say so in the session (or end that handoff), then send again."),
    )
}
/// The person's 「转回 Claude」 on a pass did not go: another send held
/// it (L3 P2-09).
pub(super) fn back_not_done() -> String {
    l10n::text(
        "这次没有转回：驿窗正在转这封回信，稍后看接力卡；还没转出去再点一次。",
        "Not sent back: PostPane is sending this answer; check the card shortly, and try again if it has not gone.",
    )
}
/// A review sent and not known to have gone in (L3 P1-10).
pub(super) fn unconfirmed() -> String {
    l10n::text(
        "这一轮送审驿窗没确认送到 ChatGPT（送出后没收到确认，或确认前驿窗重启），不知道这封回信审的是哪一版，没有按通过结束：请用当前提交（head 填 40 位 SHA）重新送审",
        "PostPane never heard this review went in to ChatGPT (no word after it was sent, or a restart first), so what the answer reviewed is not known; not ended as a pass. Send the current commit (head, 40 digits) again",
    )
}
/// Other words while a review waits on ChatGPT, or was never known to
/// have gone in (L3 P1-10).
pub(super) fn still_waiting() -> String {
    l10n::text(
        "这张接力上一段送审还在等 ChatGPT 回信（或没确认送到），没有发出：等回信到了再送；同一段话重送不会重复发。",
        "This handoff's review still waits on ChatGPT (or was never known to have gone in); nothing was sent. Send once the answer is in; the same words again are not sent twice.",
    )
}
/// Why the round trip stopped: words sent and never known to have gone in
/// (L3 P1-10).
pub(super) fn send_unconfirmed() -> String {
    l10n::text(
        "送审没确认送到 ChatGPT，自动往返停下，交还常浩：回信到了照样计一轮，但不按通过结束",
        "The review was never known to have gone in to ChatGPT; the auto round trip stopped, left to you: an answer counts, and cannot pass",
    )
}
/// What Claude hears when its words were never known to have gone in.
pub(super) fn sent_unknown(error: &str) -> String {
    l10n::text(
        &format!("驿窗没确认这段话送到了 ChatGPT（{error}），自动往返已停下交常浩。不要换一段话再送：同一段话重送不会重复发；它的回信到了也不会按通过结束。"),
        &format!("PostPane never heard these words went in to ChatGPT ({error}); the auto round trip stopped, left to the person. Do not send other words: the same words again are not sent twice, and an answer to them cannot pass."),
    )
}
/// Word that a review went in, come after its answer (L3 P1-12).
pub(super) fn confirmed_late() -> String {
    l10n::text(
        "插件随后确认这一轮送审已送到；回信先到了，仍不按通过结束",
        "The extension later said this review went in; its answer came first, and still cannot pass",
    )
}
/// Words that must be on disk before they go could not be kept.
pub(super) fn not_kept(error: &str) -> String {
    l10n::text(
        &format!("驿窗没能把这一轮送审记到磁盘（{error}），没有发出：稍后再送"),
        &format!("PostPane could not keep this review on disk ({error}); nothing was sent. Send again later"),
    )
}
/// What a restart says of words pending (L3 P1-10), in the language
/// stored (Core does not follow the setting yet then).
pub(super) fn pending_at_restart(chinese: bool) -> String {
    if chinese {
        "驿窗重启时这一轮送审还没确认送到 ChatGPT，自动往返停下，交还常浩：回信到了照样计一轮，但不按通过结束".to_owned()
    } else {
        "PostPane restarted before this review was known to have gone in; the auto round trip stopped, left to you: its answer counts, and cannot pass".to_owned()
    }
}
