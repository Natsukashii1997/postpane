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
        // Words on their way meanwhile: told at the next look.
        let Ok(_sending) = self.claim(id) else {
            return false;
        };
        // Still so, now that nothing else moves it (review of #318, P2-03):
        // a retry or the auto round trip on again since makes it out of date.
        let Some(handoff) = self
            .lock()
            .get(id)
            .filter(|h| h.untold(self.since).as_ref() == Some(&(at, trouble.clone())))
            .cloned()
        else {
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
        let how = by_doer(&how, Some(doer));
        self.change(|book| book.told(id, at, &how, now))
    }
}

/// What the session is told: what went wrong, how the handoff stands, and
/// what to do — not to hand it over again by itself.
fn notice_text(handoff: &Handoff, trouble: &Trouble) -> String {
    let what = match trouble {
        // The extension may still report it opened (`opened_late`), and the
        // handoff carries on: not told there will be no answer (P2-01).
        Trouble::NotOpened(error) => format!("驿窗没能确认 ChatGPT 审核会话已打开（{error}），这次送审目前记为失败，先别等它的回信。Chrome 插件之后若报来打开成功，驿窗会接回这次接力，回信照常转回这里。先不要再调用 relay_to_chatgpt：常浩可以在驿窗接力卡上点「重试」，重试成功后回信也照常转回这里；常浩让你重送时再调用。请向常浩说明送审目前没发出去。"),
        Trouble::NoAnswer => {
            // A 思维评审's pass waits for the person too (#209).
            let later = if handoff.thinking() {
                "要常浩在接力卡上点「转回 Claude」或「继续自动」才会转过来"
            } else {
                "写「通过」会自动转回这里，其他结论要常浩在接力卡上点「转回 Claude」或「继续自动」才会转过来"
            };
            // The card's button names the doer (「转回 Codex」).
            let later = by_doer(later, handoff.doer.as_deref());
            format!(
                "ChatGPT {} 分钟没回信，驿窗的自动往返已经停下，这次接力交常浩处理。ChatGPT 之后回信，驿窗仍会收下：{later}。先不要再调用 relay_to_chatgpt 重送，请向常浩说明还在等 ChatGPT 回信。",
                handoffs::REPLY_WAIT_MS / 60_000
            )
        }
    };
    format!("驿窗接力「{}」出错：{what}", handoff.title)
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
