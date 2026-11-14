//! What keeps a review's count and its commit whole on the host (#347, L3
//! round 2): one way back for a pass, checked against the pull request's
//! commit however it goes (P1-01, P1-09), and the words when a review is
//! refused for a review still with ChatGPT (P1-04) or a cap reached here
//! and not settled (P1-08).
use super::{back_text, Desk, Lines};
use agent_hud_runtime::chatgpt::handoffs::{Handoff, Next};
use agent_hud_runtime::l10n;

impl Desk {
    /// The words back for `handoff`'s newest answer `reply`, and, for a
    /// pass that does not hold for the commit under review, why: every
    /// way back, by hand or by itself, says the same.
    pub(super) fn back_words(
        &self,
        lines: &dyn Lines,
        handoff: &Handoff,
        reply: &str,
    ) -> (String, Option<String>) {
        let blocked = (handoff.outcome() == Next::Pass && !handoff.thinking())
            .then(|| self.pass_blocked(lines, handoff))
            .flatten();
        let text = match &blocked {
            Some(why) => format!(
                "{}\n\n驿窗没有按通过结束：{why}。",
                back_text(handoff, reply)
            ),
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
