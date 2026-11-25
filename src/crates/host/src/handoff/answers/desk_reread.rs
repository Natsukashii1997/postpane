//! 静默会话的自动重读：有退避、有上限，重启不清零（#356、#507、#433）。
use super::{Desk, Lines, Phase};

pub(super) const QUIET_MS: i64 = 3 * 60 * 1000;
pub(super) const AGAIN_MS: i64 = 2 * 60 * 1000;
pub(super) const MISSES_MOST: u32 = 4;
pub(super) const RETRY_MS: i64 = 15 * 1000;
/// 待常浩定：给页面多次恢复机会，又不让答不上的接力空转一整天。
pub(super) const READ_MOST: u32 = 5;

impl Desk {
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
