//! 自动重读的账本：连续次数与截止时间写盘；每个新阶段重新计数（#433）。
use super::super::super::reread::{AGAIN_MS, MISSES_MOST, READ_MOST, RETRY_MS};
use super::super::{Book, Handoff, Phase, Step, StepKind};
use agent_hud_runtime::l10n;
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Reading {
    pub epoch: i64,
    pub at: i64,
    pub attempts: u32,
    pub stopped: bool,
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
        if matches!(outcome, Some("told" | "streaming")) {
            if read.attempts == 0 {
                return false;
            }
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
