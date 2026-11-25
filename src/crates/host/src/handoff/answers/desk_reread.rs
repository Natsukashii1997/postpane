//! 静默会话的自动重读：有退避、有上限，重启不清零（#356、#507、#433）。
use super::{Desk, Lines, Phase};

/// How long ChatGPT may be quiet on words it has before its conversation is
/// read again: a whole answer, once a word of it was lost.
pub(super) const QUIET_MS: i64 = 3 * 60 * 1000;
/// How long between two reads of the same handoff's conversation, before
/// any backoff.
pub(super) const AGAIN_MS: i64 = 2 * 60 * 1000;
/// Reads in a row that brought nothing back double the time to the next,
/// this many times at most: every 32 minutes then (#507; on 2026-11-21 one
/// was read 128 times, two apart; #433 counts every fruitless read, not
/// only those that reached no page).
pub(super) const MISSES_MOST: u32 = 4;
/// How soon a read the channel could not pass on is tried again: the
/// extension may be back at once, and the refresh comes every second.
pub(super) const RETRY_MS: i64 = 15 * 1000;
/// 常浩 2026-11-25 定（按推荐）：给页面多次恢复机会，又不让答不上的接力空转一整天；
/// 到上限停读并暂停自动往返，在接力卡点「继续自动」重新计数。
pub(super) const READ_MOST: u32 = 5;

impl Desk {
    /// Asks the extension to read again each live handoff that has waited on
    /// ChatGPT (delivered or answering) `QUIET_MS` since its phase began; how
    /// often and how many times is kept in the book (`book_reread.rs`), so a
    /// restart does not start the count again. How many were asked.
    pub(crate) fn reread(&self, lines: &dyn Lines, now: i64) -> usize {
        self.lose_unfound(now);
        if !lines.connected() {
            return 0;
        }
        self.find_unsure(lines, now);
        let quiet = self
            .lock()
            .list
            .iter()
            .filter(|h| h.live() && matches!(h.phase, Phase::Delivered | Phase::Working))
            .filter(|h| now - h.phase_at >= QUIET_MS)
            .filter_map(|h| Some((h.id.clone(), h.chatgpt_conversation.clone()?)))
            .collect::<Vec<_>>();
        let mut count = 0;
        for (id, conversation) in quiet {
            let mut sent = false;
            // 与记账持同一把锁，快回报不会被发送后的计数覆盖。
            self.change(|book| {
                let (changed, posted) = book.read_again(&id, now, || lines.reread(&conversation));
                sent = posted;
                changed
            });
            count += usize::from(sent);
        }
        count
    }
}
