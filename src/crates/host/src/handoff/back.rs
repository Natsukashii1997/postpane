//! What goes back to the session that handed its work over: ChatGPT's
//! answer in full and what to do with it. Every answer the auto round trip
//! acts on goes back, an end too (#316): a pass, the last round, no
//! verdict or a tail PostPane cannot read used to stop on the sidebar only,
//! and the session waited on, unaware.

use super::texts::{flaw_text, review_flaw_text};
use agent_hud_runtime::chatgpt::handoffs::{self, Exit, Handoff, Next, Review, Risk, Verdict};

/// 转回 Claude: ChatGPT's answer in full, and what to do with it. `next`
/// is what the auto round trip does with it; None for the person's button.
pub(super) fn back_text(handoff: &Handoff, reply: &str, next: Option<Next>) -> String {
    let text = if handoff.thinking() {
        thinking_back_text(handoff, reply, next)
    } else {
        review_back_text(handoff, reply, next)
    };
    // Ends that leave it to the person say so.
    match next {
        Some(Next::Limit | Next::NoVerdict | Next::BadTail(_) | Next::Invalid(_)) => {
            format!("{text}\n\n{}", LEFT_TO_PERSON)
        }
        _ => text,
    }
}

const LEFT_TO_PERSON: &str = "这是终局：驿窗的自动往返已经停下，这次接力交常浩决定。请向常浩汇报审查结论和你的建议，等常浩回话再动下一步。";

fn review_back_text(handoff: &Handoff, reply: &str, next: Option<Next>) -> String {
    let round = handoff.counted().max(1);
    let budget = handoff.budget();
    let way = handoffs::review_exit(reply);
    let verdict = match handoff.last_reply().and_then(|step| step.verdict) {
        Some(Verdict::Pass) => "通过",
        Some(Verdict::Revise) => "需修改",
        None => "未写",
    };
    // What the answer's 「审查出口」 and the budget left ask of Claude (#217).
    let ask = match way {
        _ if next == Some(Next::Pass) => "这是终局：审查已通过，驿窗已结束这次接力，审查预算不再消耗，不需要再调用 relay_to_chatgpt 送审。请收口：回信里的非阻断意见（P2、P3 等）合并前能顺手改的就改掉，不改的写明理由；然后向常浩汇报审查结论和这些意见的处理情况。".to_owned(),
        _ if next == Some(Next::NoVerdict) => "回信没写结论，驿窗判断不了是通过还是需修改：不要再调用 relay_to_chatgpt，也先不要按意见动手改。".to_owned(),
        Ok(Some(Review::NeedEvidence)) => "审查认为证据不足，先暂停：补齐证据（测试、复现、日志）后再调用 relay_to_chatgpt 送审，summary 写一句补了什么证据；补到证据前不要按意见动手改。".to_owned(),
        Ok(Some(Review::Escalate)) => "审查要求决策升级：请整理可选做法、各自的依据和你的推荐交给常浩，等常浩决定；不要再调用 relay_to_chatgpt，也不要先动手改。".to_owned(),
        Err(flaw) => format!("驿窗认不出审查出口（{}）：请先按意见处理，暂不调用 relay_to_chatgpt，等常浩决定下一步。", review_flaw_text(flaw)),
        _ if handoff.spent() && handoff.risk == Some(Risk::L1) => "L1 的审查预算已用完：请按意见修改，在 PR 上写「补改未复审」后收口，不要再调用 relay_to_chatgpt；如果还有没解决的 P0/P1，交常浩决定。".to_owned(),
        _ if handoff.spent() => format!("审查预算已用完（已审 {round} 轮，共 {budget} 轮）：请先按意见处理，不要再调用 relay_to_chatgpt，等常浩决定收缩范围、补证据，还是授权一次专项续审（授权后调用时 extra 写明谁授权、为什么）。"),
        _ => format!("请按意见处理；不同意的意见说明理由即可。改完后调用 relay_to_chatgpt 交回 ChatGPT 复审（最多 {budget} 轮，写「结论：通过」就停），summary 写一句这轮改了什么。"),
    };
    let tail = match way {
        Ok(Some(way)) => format!("审查出口：{}，结论：{verdict}", review_way(way)),
        _ => format!("结论：{verdict}"),
    };
    format!(
        "ChatGPT 对「{title}」的审核意见（第 {round} 轮，{tail}）：\n\n{reply}\n\n{ask}",
        title = handoff.title,
    )
}

fn review_way(way: Review) -> &'static str {
    match way {
        Review::Pass => "通过",
        Review::Fix => "返修",
        Review::NeedEvidence => "证据不足暂停",
        Review::Escalate => "决策升级",
    }
}

/// 转回 Claude for a 思维评审 (#209): ChatGPT's answer in full, and what
/// its way out asks of Claude.
fn thinking_back_text(handoff: &Handoff, reply: &str, next: Option<Next>) -> String {
    let round = handoff.reviews().max(1);
    let (tail, ask) = match handoffs::exit(reply) {
        Ok(exit) => {
            let (way, verdict, ask) = match exit {
                Exit::Mature => ("成熟退出", "通过", "这次思维评审已收口。请按回信收尾：把采纳的意见和最终结论写进决策记录，余下的意见记为执行建议；不要再调用 relay_to_chatgpt。".to_owned()),
                Exit::OtherPath => ("转其他路径", "通过", "这次思维评审已收口，建议转其他路径。请把为什么转、转去哪条路径写进决策记录，再按新路径继续；不要再调用 relay_to_chatgpt 送审本方案。".to_owned()),
                // Every round used: no more reviews by itself.
                Exit::Deepen if next == Some(Next::Limit) => ("继续深化", "需修改", format!("评审已用满 {max} 轮仍需深化：请逐条处理意见、更新决策记录，不要再调用 relay_to_chatgpt。", max = handoffs::ROUNDS)),
                Exit::Deepen => ("继续深化", "需修改", format!("请逐条处理意见：采纳；不采纳并给出反证；补证据；交常浩；或记为执行建议。然后更新决策记录，只针对「需深化」的项准备下一阶段送审包，再调用 relay_to_chatgpt 交回 ChatGPT 评审（最多 {max} 轮）；内容没有实质变化就不要重送。summary 写一句这轮深化了什么。", max = handoffs::ROUNDS)),
                Exit::NeedEvidence => ("证据不足暂停", "需修改", "评审认为证据不足，先暂停：请先取证——跑测试、做实验、查数据，或直接问常浩。拿到新证据前不要再调用 relay_to_chatgpt，也不要实施被评审的部分。取得新证据后再调用 relay_to_chatgpt 送审，summary 写一句补了什么证据。".to_owned()),
                Exit::Escalate => ("决策升级", "交常浩裁决", "评审要求决策升级：请整理可选方案、各自的依据和你的推荐，交给常浩，等常浩决定；不要再调用 relay_to_chatgpt，也不要先动手实施。".to_owned()),
            };
            (format!("评审出口：{way}，结论：{verdict}"), ask)
        }
        Err(flaw) => (
            format!("末两行无效：{}", flaw_text(flaw)),
            "驿窗认不出评审出口：请先按意见逐条处理并更新决策记录，暂不调用 relay_to_chatgpt，等常浩决定下一步。".to_owned(),
        ),
    };
    format!(
        "ChatGPT 对「{title}」的思维评审回信（第 {round} 轮，{tail}）：\n\n{reply}\n\n{ask}",
        title = handoff.title,
    )
}
