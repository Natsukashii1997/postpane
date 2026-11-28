//! 自动重读的账本：连续次数与截止时间写盘；每个新阶段重新计数（#433）。
//! 也记最近一次读到 ChatGPT「在写」的时间：等回信看信号，不只看钟（#544）。
use super::super::super::reread::{AGAIN_MS, MISSES_MOST, READ_MOST, RETRY_MS};
use super::super::{Book, Handoff, Phase, Step, StepKind, REPLY_WAIT_MS};
use agent_hud_runtime::l10n;
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Reading {
    pub epoch: i64,
    pub at: i64,
    pub attempts: u32,
    pub stopped: bool,
    /// 这一阶段最近一次重读报「在写」的时间；0 是没报过。
    #[serde(default)]
    pub streamed: i64,
}

/// 最近这么久内报过「在写」就算还在写：在写时每 2 分钟重读一次（`AGAIN_MS`），
/// 错过一次也还算。侧栏 `relay-stamps.ts` 用同一个数。
pub const WRITING_FRESH_MS: i64 = 5 * 60 * 1000;
/// 在写也最多等这么久（常浩 2026-11-27 回「改」：在写不超时，另设 2 小时总上限）。
pub const REPLY_MOST_MS: i64 = 2 * 60 * 60 * 1000;

/// 等回信等到头时 ChatGPT 是什么样：一直没写、写到一半没了动静、写满总上限。
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Waited {
    Silent,
    Quiet,
    TooLong,
}

impl Handoff {
    /// 这一阶段最近一次读到「在写」的时间。
    pub fn writing_at(&self) -> Option<i64> {
        let read = &self.gate.rereading;
        (read.epoch == self.phase_at && read.streamed != 0).then_some(read.streamed)
    }
    /// 到 `now` 为止，等 ChatGPT 回信是不是等到头了。满 `REPLY_WAIT_MS` 后，最近
    /// `WRITING_FRESH_MS` 内在写就接着等，最多等到 `REPLY_MOST_MS`（11-24 #319
    /// 写了 54 分钟，30 分钟时被当成没回信）。通知在停下的同一拍里按停下时刻再判一次
    /// （`Desk::tell` 先 `late` 后 `untold`），说法和停因一致。
    pub fn wait_over(&self, now: i64) -> Option<Waited> {
        let waited = now - self.phase_at;
        if waited <= REPLY_WAIT_MS {
            return None;
        }
        if waited > REPLY_MOST_MS {
            return Some(Waited::TooLong);
        }
        match self.writing_at() {
            None => Some(Waited::Silent),
            Some(at) if now - at <= WRITING_FRESH_MS => None,
            Some(_) => Some(Waited::Quiet),
        }
    }
    /// 等到头了的停下说法（`no_answer`：一直没写的那种）。
    pub fn waited_out(&self, now: i64, no_answer: &str) -> Option<String> {
        Some(match self.wait_over(now)? {
            Waited::Silent => no_answer.to_owned(),
            Waited::Quiet => l10n::text(
                &format!("{}，自动往返停下，交还常浩", Waited::Quiet.why()),
                "ChatGPT stopped writing midway (not writing for 5 minutes); left to you",
            ),
            Waited::TooLong => l10n::text(
                &format!("{}，自动往返停下，交还常浩", Waited::TooLong.why()),
                "ChatGPT has been writing for 2 hours and has not finished; left to you",
            ),
        })
    }
}

impl Waited {
    /// 发给会话的那句开头（会话里只说中文）。
    pub fn why(self) -> String {
        match self {
            Waited::Silent => format!("ChatGPT {} 分钟没回信", REPLY_WAIT_MS / 60_000),
            Waited::Quiet => format!(
                "ChatGPT 写到一半没了动静（{} 分钟没在写）",
                WRITING_FRESH_MS / 60_000
            ),
            Waited::TooLong => format!("ChatGPT 写了 {} 小时还没写完", REPLY_MOST_MS / 3_600_000),
        }
    }
}

impl Book {
    /// 返回（账本是否变化、是否确实交给插件）；发送只写本机通道，不等网页。
    pub fn read_again(
        &mut self,
        id: &str,
        now: i64,
        send: impl FnOnce() -> Result<(), String>,
    ) -> (bool, bool) {
        let Some(h) = self
            .get_mut(id)
            .filter(|h| h.live() && matches!(h.phase, Phase::Delivered | Phase::Working))
        else {
            return (false, false);
        };
        let mut read = h.gate.rereading;
        if read.epoch != h.phase_at {
            read = Reading {
                epoch: h.phase_at,
                ..Default::default()
            };
        }
        if read.stopped {
            return (false, false);
        }
        let wait = AGAIN_MS << read.attempts.min(MISSES_MOST);
        if read.at != 0 && now - read.at < wait {
            return (false, false);
        }
        if read.attempts >= READ_MOST {
            return (stop_reading(h, now), false);
        }
        let sent = match send() {
            Err(error) => {
                agent_hud_runtime::note!("{error}");
                read.at = now - wait + RETRY_MS;
                false
            }
            Ok(()) => {
                read.at = now;
                read.attempts += 1;
                true
            }
        };
        h.gate.rereading = read;
        (true, sent)
    }

    pub fn reread_result(&mut self, id: &str, outcome: Option<&str>, now: i64) -> bool {
        let Some(h) = self
            .get_mut(id)
            .filter(|h| h.live() && matches!(h.phase, Phase::Delivered | Phase::Working))
        else {
            return false;
        };
        let read = &mut h.gate.rereading;
        if read.epoch != h.phase_at || read.stopped {
            return false;
        }
        // An answer told and taken moved the phase on (checked above); one
        // told but not taken is an older round's and brings nothing (#539
        // round 4, 2026-11-26: read for twelve hours past the limit).
        if outcome == Some("streaming") {
            read.streamed = now;
            read.attempts = 0;
            return true;
        }
        if read.attempts >= READ_MOST {
            return stop_reading(h, now);
        }
        false
    }
}

fn stop_reading(h: &mut Handoff, now: i64) -> bool {
    let reason = l10n::text(
        &format!("驿窗连续 {READ_MOST} 次没能读回 ChatGPT 回信，已停止自动重读。请打开对应的 ChatGPT 标签页核对；需要再读时，在接力卡点「继续自动」。"),
        &format!("PostPane could not read back the ChatGPT answer in {READ_MOST} attempts and stopped automatic rereads. Please check its ChatGPT tab; choose Resume auto on the handoff card to try again."),
    );
    h.gate.rereading.stopped = true;
    if h.auto {
        h.halt = Some(reason.clone());
    }
    h.auto = false;
    h.steps
        .push(Step::new(now, StepKind::Fail, Some(&reason)).by_auto());
    h.updated_at = now;
    true
}

#[cfg(test)]
mod tests {
    use super::super::super::{Book, Cause, Trouble};
    use super::*;

    const SILENT: &str = "ChatGPT 30 分钟没回信";
    const MIN: i64 = 60 * 1000;

    /// Asked at 2: a review ChatGPT has, read again and found writing at `at`.
    fn asked() -> (Book, String) {
        let mut book = Book::default();
        let handoff = book.begin("s1", None, "修登录", None, "请审核", 1);
        book.opened(&handoff.id, "c1", 2);
        (book, handoff.id)
    }
    fn writing(book: &mut Book, id: &str, at: i64) {
        book.list[0].gate.rereading.at = 0;
        book.read_again(id, at, || Ok(()));
        assert!(book.reread_result(id, Some("streaming"), at));
    }
    fn halt(book: &Book) -> String {
        book.list[0].halt.clone().unwrap_or_default()
    }

    // 11-24 #319: ChatGPT wrote for 54 minutes and was stopped at 30.
    #[test]
    fn writing_past_half_an_hour_is_waited_on_until_it_goes_quiet() {
        let (mut book, id) = asked();
        writing(&mut book, &id, 2 + 28 * MIN);
        assert!(!book.overdue(2 + 31 * MIN, SILENT, "没人领"));
        writing(&mut book, &id, 2 + 31 * MIN);
        assert!(!book.overdue(2 + 36 * MIN, SILENT, "没人领"));
        assert!(book.list[0].auto);
        // Five minutes with no word of writing: it stopped midway.
        assert!(book.overdue(2 + 37 * MIN, SILENT, "没人领"));
        assert!(halt(&book).contains("midway"), "{}", halt(&book));
        assert_eq!(
            book.list[0].steps.last().unwrap().cause,
            Some(Cause::NoAnswer)
        );
        let untold = book.untold(0);
        assert_eq!(untold[0].2, Trouble::NoAnswer(Waited::Quiet));
    }

    #[test]
    fn writing_on_and_on_stops_at_two_hours() {
        let (mut book, id) = asked();
        let mut at = 2 + 28 * MIN;
        while at < 2 + REPLY_MOST_MS {
            writing(&mut book, &id, at);
            assert!(!book.overdue(at + MIN, SILENT, "没人领"), "{at}");
            at += 2 * MIN;
        }
        writing(&mut book, &id, 2 + REPLY_MOST_MS);
        assert!(book.overdue(3 + REPLY_MOST_MS, SILENT, "没人领"));
        assert!(halt(&book).contains("2 hours"), "{}", halt(&book));
        assert_eq!(book.untold(0)[0].2, Trouble::NoAnswer(Waited::TooLong));
    }

    #[test]
    fn never_writing_stops_at_half_an_hour_as_before() {
        assert_eq!(
            Waited::Quiet.why(),
            "ChatGPT 写到一半没了动静（5 分钟没在写）"
        );
        assert_eq!(Waited::TooLong.why(), "ChatGPT 写了 2 小时还没写完");
        let (mut book, _) = asked();
        assert!(!book.overdue(2 + REPLY_WAIT_MS, SILENT, "没人领"));
        assert!(book.overdue(3 + REPLY_WAIT_MS, SILENT, "没人领"));
        assert!(halt(&book).starts_with(SILENT));
        assert_eq!(book.untold(0)[0].2, Trouble::NoAnswer(Waited::Silent));
    }

    // Writing heard in an earlier phase (before 「继续自动」) is not this wait's.
    #[test]
    fn writing_heard_before_the_wait_began_again_does_not_count() {
        let (mut book, id) = asked();
        writing(&mut book, &id, 2 + 29 * MIN);
        book.list[0].phase_at = 2 + 30 * MIN;
        let late = 2 + 30 * MIN + REPLY_WAIT_MS + 1;
        assert_eq!(book.list[0].wait_over(late), Some(Waited::Silent));
    }

    // A file written before the time was kept still reads.
    #[test]
    fn a_reading_kept_before_reads_with_no_writing() {
        let read: Reading =
            serde_json::from_str(r#"{"epoch":2,"at":5,"attempts":1,"stopped":false}"#).unwrap();
        assert_eq!(read.streamed, 0);
    }
}
