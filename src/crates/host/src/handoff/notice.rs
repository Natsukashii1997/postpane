//! Trouble before any answer came (#318): the conversation could not open,
//! or ChatGPT did not answer in time. Such trouble used to stay on the
//! sidebar, and the session that handed its work over waited on, unaware;
//! now it is told once, through the way words go back to it, and the
//! card's line for the trouble says whether it was.
use super::{Desk, Lines, Unsent, CLAUDE};
use agent_hud_runtime::chatgpt::handoffs::{self, by_doer, Handoff, Trouble};
use agent_hud_runtime::l10n;

impl Desk {
    /// Tells each session of trouble its handoff ran into since the app
    /// started, once: openings that took too long and waits gone too long
    /// are found first. Nothing runs in the background for it: a session
    /// that cannot take it now finds it in its queue. Whether anything changed.
    pub(crate) fn tell(&self, lines: &dyn Lines, now: i64) -> bool {
        let mut changed = self.late(now);
        let untold = self.lock().untold(self.since);
        for (id, at, trouble) in untold {
            changed |= self.tell_one(lines, &id, at, &trouble, now);
        }
        changed
    }
    /// Tells `id`'s session of `trouble` at step `at`. Whether it did.
    pub(super) fn tell_one(
        &self,
        lines: &dyn Lines,
        id: &str,
        at: usize,
        trouble: &Trouble,
        now: i64,
    ) -> bool {
        let (how, conversation) = {
            // Words on their way meanwhile: told at the next look.
            let Ok(_sending) = self.claim(id) else {
                return false;
            };
            // The book's other changes wait till the words are out.
            let _telling = Telling::begin(self);
            // Still so (review of #318, P2-03): a retry, the auto round trip
            // on again or a newer handoff since makes it out of date.
            let handoff = {
                let book = self.lock();
                let still = book.untold_of(id, self.since).as_ref() == Some(&(at, trouble.clone()));
                book.get(id).filter(|_| still).cloned()
            };
            let Some(handoff) = handoff else {
                return false;
            };
            let (doer, session) = (
                handoff.doer.as_deref().unwrap_or(CLAUDE),
                &handoff.claude_session,
            );
            let text = notice_text(&handoff, trouble);
            // Its own id: told again after a restart, it leaves no second copy.
            let prompt = format!("{id}-n{at}");
            let sent = lines
                .reaches(doer, session)
                .map_err(Unsent::Failed)
                .and_then(|()| lines.reply(doer, session, &prompt, &text));
            let how = match sent {
                Ok(()) | Err(Unsent::Again) => told(),
                Err(Unsent::Failed(_)) => match lines.queue(doer, session, &prompt, &text) {
                    Ok(()) | Err(Unsent::Again) => told_queued(),
                    Err(Unsent::Failed(error)) => not_told(&error),
                },
            };
            (by_doer(&how, Some(doer)), handoff.chatgpt_conversation)
        };
        let told = self.change(|book| book.told(id, at, &how, now));
        // Turns ChatGPT reported meanwhile were held back, words being on
        // their way (`turn_waits`): taken now, in order.
        let caught = conversation.is_some_and(|conversation| self.caught_up(&conversation));
        told | caught
    }
}

/// A session being told of trouble: the book's other changes wait
/// (`Desk::quiet`) till it is dropped.
struct Telling<'a>(&'a Desk);
impl<'a> Telling<'a> {
    fn begin(desk: &'a Desk) -> Self {
        *desk.telling.lock().unwrap_or_else(|p| p.into_inner()) += 1;
        Self(desk)
    }
}
impl Drop for Telling<'_> {
    fn drop(&mut self) {
        *self.0.telling.lock().unwrap_or_else(|p| p.into_inner()) -= 1;
        self.0.told_out.notify_all();
    }
}

/// What the session is told: what went wrong, how the handoff stands, and
/// what to do — not to hand it over again by itself.
fn notice_text(handoff: &Handoff, trouble: &Trouble) -> String {
    let what = match trouble {
        // The extension may still report it opened (`opened_late`), and the
        // handoff carries on: not told there will be no answer (P2-01).
        Trouble::NotOpened(error) => format!("驿窗没能确认 ChatGPT 审核会话已打开（{error}），这次送审目前记为失败，先别等它的回信。Chrome 插件之后若报来打开成功，驿窗会接回这次接力，回信照常转回这里。先不要再调用 relay_to_chatgpt：常浩可以在驿窗接力卡上点「重试」，重试成功后回信也照常转回这里；常浩让你重送时再调用。请向常浩说明送审目前没发出去。"),
        Trouble::NoAnswer => format!(
            "ChatGPT {} 分钟没回信，驿窗的自动往返已经停下，这次接力交常浩处理。ChatGPT 之后回信，驿窗仍会收下：{}。先不要再调用 relay_to_chatgpt 重送，请向常浩说明还在等 ChatGPT 回信。",
            handoffs::REPLY_WAIT_MS / 60_000,
            later(handoff)
        ),
        // Answered all the same: the person opening the tab draws it (#457).
        Trouble::Undrawn => format!(
            "ChatGPT 已经答完，但它所在的标签页没画出回信（那个 Chrome 窗口多半不在屏幕上），驿窗读不到，自动往返已经停下，这次接力交常浩处理。常浩点开那个 ChatGPT 标签页，驿窗就能收下回信：{}。先不要再调用 relay_to_chatgpt 重送，请向常浩说明回信已在 ChatGPT 里，点开那个标签页就能收回。",
            later(handoff)
        ),
        // Not a failure: it may well have gone in (round 4 P1-14).
        Trouble::Unconfirmed => "驿窗没确认这一轮送审送到了 ChatGPT（送出后没收到确认，或确认前驿窗重启），送达状态未知，自动往返已经停下，这次接力交常浩处理。ChatGPT 若已收到并回信，驿窗仍会收下、照算一轮，但不按通过结束。先不要换一段话再送，也不要当成审查已通过；请向常浩说明这一轮送审状态未知。".to_owned(),
    };
    format!("驿窗接力「{}」出错：{what}", handoff.title)
}

/// What becomes of an answer that comes after the stop: it goes back all
/// the same (#410 S1); what comes next is the person's, but for a pass,
/// which ends the handoff.
fn later(handoff: &Handoff) -> &'static str {
    if handoff.thinking() {
        "回信会照样转回这里，收口以外的结论会写明下一步等常浩决定"
    } else {
        "回信会照样转回这里；写「通过」的驿窗结束接力，其他结论会写明下一步等常浩决定"
    }
}

/// What the card's line for the trouble ends with: sent, not yet taken up
/// (review of #318, P3-03).
pub(super) fn told() -> String {
    l10n::text("已发到 Claude 会话", "sent to the Claude session")
}
pub(super) fn told_queued() -> String {
    l10n::text(
        "已排进 Claude 会话的待发送队列",
        "queued for the Claude session",
    )
}
pub(super) fn not_told(error: &str) -> String {
    l10n::text(
        &format!("没能通知 Claude：{error}"),
        &format!("Claude could not be notified: {error}"),
    )
}
