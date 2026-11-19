//! What goes back to the session that handed its work over: ChatGPT's
//! answer in full and what to do with it. Every answer the auto round trip
//! acts on goes back, an end too (#316): a pass, the last round, no
//! verdict or a tail PostPane cannot read used to stop on the sidebar only,
//! and the session waited on, unaware. The words follow what the answer
//! comes to (`Handoff::outcome`), so the auto round trip and the person's
//! button send the same words, and they go once.

use super::guard::Held;
use super::texts::{flaw_text, review_flaw_text};
use agent_hud_runtime::chatgpt::handoffs::{self, Exit, Handoff, Next, Review, Verdict};

/// 转回 Claude: ChatGPT's answer in full, and what to do with it.
/// An answer that only mended its last lines goes with the one it mended (#347).
/// `held`: it came in while the auto round trip was off, and goes back all
/// the same (#410): what comes next is the person's.
pub(super) fn back_text(handoff: &Handoff, _reply: &str, held: bool) -> String {
    let reply = handoff.answer();
    let off = held.then(|| handoff.halt.clone().unwrap_or_default());
    if handoff.thinking() {
        thinking_back_text(handoff, &reply, off.as_deref())
    } else {
        review_back_text(handoff, &reply, None, off.as_deref())
    }
}

/// What an answer that came in while the auto round trip was off (`halt`
/// says why) asks of the session: read and sort, and wait on the person.
fn held_ask(halt: &str, meanwhile: &str, not_yet: &str) -> String {
    format!("驿窗的自动往返停着（{halt}），这封回信照样转给你，下一步交常浩决定。现在可以做：{meanwhile}。先不要做：{not_yet}。整理好后向常浩汇报审查结论和你的建议，等常浩回话。")
}

/// 转回 Claude for a pass PostPane did not let through (`why`, L3 P1-09):
/// ChatGPT's answer in full, and words that say it did not pass.
pub(super) fn held_back_text(handoff: &Handoff, held: &Held) -> String {
    let why = held.why.as_str();
    if !handoff.thinking() {
        return review_back_text(handoff, &handoff.answer(), Some(held), None);
    }
    // A 思维评审's close held back (L3 P1-10): it did not settle.
    let ask = left_to_person(&format!("评审回信写了收口，但驿窗没有放行：{why}。这次评审没有收口、没有结束，不要当成已收口汇报。"), "读意见、整理要点；可起草决策记录，待定的不记成已定", "再调用 relay_to_chatgpt 送审、按评审结论动手实施");
    format!(
        "ChatGPT 对「{title}」的评审意见（第 {round} 轮）：\n\n{reply}\n\n{ask}",
        title = handoff.title,
        round = handoff.counted().max(1),
        reply = handoff.answer(),
    )
}

/// What the next review is, by the person's leave (#347).
fn next_round(handoff: &Handoff) -> String {
    let budget = handoff.budget();
    if handoff.last_round_next() {
        format!("下一轮是本次授权周期的最后一轮（第 {budget} 轮）：那一轮还不通过，驿窗就停下请常浩介入")
    } else {
        format!("本次授权周期最多 {budget} 轮")
    }
}

/// An end left to the person: what Claude may do meanwhile, and what not.
fn left_to_person(why: &str, meanwhile: &str, not_yet: &str) -> String {
    format!("这是终局：{why}驿窗的自动往返已经停下，这次接力交常浩决定。现在可以做：{meanwhile}。先不要做：{not_yet}。整理好后向常浩汇报审查结论和你的建议，等常浩回话。")
}

const NOT_YET: &str = "动手改代码、再调用 relay_to_chatgpt 送审、合并 PR";

fn review_back_text(
    handoff: &Handoff,
    reply: &str,
    held: Option<&Held>,
    off: Option<&str>,
) -> String {
    let round = handoff.counted().max(1);
    let budget = handoff.budget();
    let verdict = match handoff.last_reply().and_then(|step| step.verdict) {
        Some(Verdict::Pass) => "通过",
        Some(Verdict::Revise) => "需修改",
        None => "未写",
    };
    // What the answer's 「审查出口」 and the cap left ask of Claude (#217, #347).
    let ask = match handoff.outcome() {
        Next::Pass if held.is_some_and(|h| h.resend) => format!("回信写了通过，但驿窗没有放行：{}。这次接力没有通过、没有结束，不要当成审查已通过汇报。请用 PR 当前的提交重新调用 relay_to_chatgpt 送审（head 填当前提交，summary 写一句这一版和受审版本差在哪），这一轮照样计数；自动往返没有停，{}。", held.map(|h| h.why.as_str()).unwrap_or_default(), next_round(handoff)),
        Next::Pass if held.is_some() => left_to_person(&format!("回信写了通过，但驿窗没有放行：{}。这次接力没有通过、没有结束，不要当成审查已通过汇报。", held.map(|h| h.why.as_str()).unwrap_or_default()), "核对 PR 当前的提交和这次的受审版本", &format!("{NOT_YET}。版本对上后，用 PR 当前的提交重新调用 relay_to_chatgpt（head 填当前提交），这一轮照样计数")),
        Next::Pass => "这是终局：审查已通过，驿窗已结束这次接力，不需要再调用 relay_to_chatgpt 送审。请收口：回信里的非阻断意见（P2、P3 等）合并前能顺手改的就改掉，不改的写明理由；改到功能的，改完重跑相关测试，不能因为审查已通过就省掉验证。然后向常浩汇报审查结论和这些意见的处理情况。".to_owned(),
        Next::NoVerdict | Next::Format => left_to_person("回信末尾几行驿窗认不出，判断不了是否通过。", "读意见、按严重程度整理要点", NOT_YET),
        Next::BadTail(flaw) => left_to_person(&format!("回信末尾几行补过一次格式仍认不出（{}），驿窗判断不了这次是否通过。", review_flaw_text(flaw)), "读意见、整理要点和返修方案", NOT_YET),
        Next::Stale => format!("回信写了通过，但受审版本和送审的提交对不上，这次通过不能用于当前提交，不要当成审查已通过汇报。请核对送审的提交和 PR 当前的提交，用当前提交重新调用 relay_to_chatgpt 送审（head 填当前提交），这一轮照样计数；自动往返没有停，{}。", next_round(handoff)),
        Next::Limit => left_to_person(&format!("到顶：本次授权周期已审满 {budget} 轮（审查链累计 {total} 轮）仍未通过，驿窗已停下并请常浩介入确认。", total = handoff.total()), "读意见、分类、整理返修方案和风险，写清这几轮每轮解决了什么、还卡在哪", &format!("{NOT_YET}。常浩可能定收缩范围、重新设计、补证据，或授权继续（授权后调用时 extra 写明谁授权、为什么，轮数从 1 重新计）")),
        Next::Pause => format!("审查认为证据不足，先暂停：补齐证据（测试、复现、日志）后再调用 relay_to_chatgpt 送审，summary 写一句补了什么证据；补到证据前不要按意见动手改。这一轮照样计数，{}。", next_round(handoff)),
        Next::Escalate => "审查要求决策升级：请整理可选做法、各自的依据和你的推荐交给常浩，等常浩决定；不要再调用 relay_to_chatgpt，也不要先动手改。".to_owned(),
        _ => format!("请按意见处理：逐条写处理（已修并附证据 / 提议判定不成立并附反证 / 提议转单并附已建好的 issue），不同意的说明理由。改完后调用 relay_to_chatgpt 交回 ChatGPT 复审，head 填改完的提交，summary 写一句这轮改了什么；{}。", next_round(handoff)),
    };
    // Off when it came in (#410): a pass still ends; the rest waits on the person.
    let ask = match off {
        Some(halt) if handoff.outcome() != Next::Pass => {
            held_ask(halt, "读意见、按严重程度整理要点和返修方案", NOT_YET)
        }
        _ => ask,
    };
    let tail = match handoffs::review_exit(reply) {
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
fn thinking_back_text(handoff: &Handoff, reply: &str, off: Option<&str>) -> String {
    let round = handoff.counted().max(1);
    // Drafting is fine; what is undecided is not recorded as decided.
    let draft = "逐条整理意见、起草决策记录（待常浩裁决的写成待定，不要记成已定决策）";
    let not_yet = "实施被评审的方案、再调用 relay_to_chatgpt 送审";
    let (tail, ask) = match handoffs::exit(reply) {
        Ok(exit) => {
            let (way, verdict, ask) = match exit {
                Exit::Mature => ("成熟退出", "通过", "这次思维评审已收口。请按回信收尾：把采纳的意见和最终结论写进决策记录，余下的意见记为执行建议；不要再调用 relay_to_chatgpt。".to_owned()),
                Exit::OtherPath => ("转其他路径", "通过", "这次思维评审已收口，建议转其他路径。请把为什么转、转去哪条路径写进决策记录，再按新路径继续；不要再调用 relay_to_chatgpt 送审本方案。".to_owned()),
                // Every round used: no more reviews by itself.
                Exit::Deepen | Exit::NeedEvidence if handoff.outcome() == Next::Limit => (if exit == Exit::Deepen { "继续深化" } else { "证据不足暂停" }, "需修改", left_to_person(&format!("到顶：本次授权周期已评审满 {} 轮仍没有收口，驿窗已停下并请常浩介入确认。", handoff.budget()), draft, not_yet)),
                Exit::Deepen => ("继续深化", "需修改", format!("请逐条处理意见：采纳；不采纳并给出反证；补证据；交常浩；或记为执行建议。然后更新决策记录，只针对「需深化」的项准备下一阶段送审包，再调用 relay_to_chatgpt 交回 ChatGPT 评审（{}）；内容没有实质变化就不要重送。summary 写一句这轮深化了什么。", next_round(handoff))),
                Exit::NeedEvidence => ("证据不足暂停", "需修改", "评审认为证据不足，先暂停：请先取证——跑测试、做实验、查数据，或直接问常浩。拿到新证据前不要再调用 relay_to_chatgpt，也不要实施被评审的部分。取得新证据后再调用 relay_to_chatgpt 送审，summary 写一句补了什么证据。".to_owned()),
                Exit::Escalate => ("决策升级", "交常浩裁决", "评审要求决策升级：请整理可选方案、各自的依据和你的推荐，交给常浩，等常浩决定；不要再调用 relay_to_chatgpt，也不要先动手实施。".to_owned()),
            };
            (format!("评审出口：{way}，结论：{verdict}"), ask)
        }
        Err(flaw) => (
            format!("末两行无效：{}", flaw_text(flaw)),
            left_to_person(
                &format!("驿窗认不出评审出口（{}）。", flaw_text(flaw)),
                draft,
                not_yet,
            ),
        ),
    };
    // Off when it came in (#410): a close still closes; the rest waits on the person.
    let ask = match off {
        Some(halt) if handoff.outcome() != Next::Close => held_ask(halt, draft, not_yet),
        _ => ask,
    };
    format!(
        "ChatGPT 对「{title}」的思维评审回信（第 {round} 轮，{tail}）：\n\n{reply}\n\n{ask}",
        title = handoff.title,
    )
}
