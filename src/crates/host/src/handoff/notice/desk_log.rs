//! 驿窗自己停下、自己放弃的每一步都写一行 `postpane.log`（#544 第 5 步）：只此
//! 一处，每次改账本之后比对各接力新增的步骤（`Desk::change`），不在各个停下的地方
//! 各写各的。原来只有页面改版那一种写了日志，其余停下只在卡上，事后查不到。
use super::book::{Book, StepKind};
use super::Desk;
use std::collections::HashMap;

/// 日志里一步说明最多留这么多字。
const LOGGED_CHARS: usize = 200;

/// 每张接力现有几步：起点之前的不算新增（启动时读进来的、飞信已飞过的）。
pub(super) fn counts(book: &Book) -> HashMap<String, usize> {
    book.list
        .iter()
        .map(|handoff| (handoff.id.clone(), handoff.steps.len()))
        .collect()
}

impl Desk {
    /// 把上次比对之后新增的、驿窗自动做的停下（`Stop`）和失败（`Fail`）各写一行。
    pub(super) fn log_stops(&self, book: &Book) {
        let mut logged = self.logged.lock().unwrap_or_else(|p| p.into_inner());
        for line in new_stops(&mut logged, book) {
            agent_hud_runtime::note!("{line}");
        }
    }
}

/// `logged` 之后新增的自动停下和失败，一步一行；`logged` 跟着更新到现在。
fn new_stops(logged: &mut HashMap<String, usize>, book: &Book) -> Vec<String> {
    let mut lines = vec![];
    for handoff in &book.list {
        let seen = logged.entry(handoff.id.clone()).or_insert(0);
        let new = handoff.steps.get(*seen..).unwrap_or_default();
        for step in new.iter().filter(|step| step.auto) {
            let what = match step.kind {
                StepKind::Stop => "stopped",
                StepKind::Fail => "gave up on",
                _ => continue,
            };
            let text = step.text.as_deref().unwrap_or_default();
            let text: String = text.chars().take(LOGGED_CHARS).collect();
            lines.push(format!("PostPane {what} handoff {}: {text}", handoff.id));
        }
        *seen = handoff.steps.len();
    }
    logged.retain(|id, _| book.list.iter().any(|handoff| &handoff.id == id));
    lines
}

#[cfg(test)]
mod tests {
    use super::*;

    fn asked(book: &mut Book) -> String {
        let handoff = book.begin("s1", None, "修登录", None, "请审核", 1);
        book.opened(&handoff.id, "c1", 2);
        handoff.id
    }

    #[test]
    fn each_stop_postpane_makes_itself_is_logged_once() {
        let mut book = Book::default();
        let old = asked(&mut book);
        // Stopped before the start: not new.
        book.stop(&old, "常浩暂停", false, 3);
        let mut logged = counts(&book);
        let id = asked(&mut book);
        assert!(new_stops(&mut logged, &book).is_empty());
        // The person's stop is not PostPane's.
        book.stop(&id, "常浩暂停", false, 4);
        assert!(new_stops(&mut logged, &book).is_empty());
        assert!(book.resume(&id, 5));
        assert!(book.overdue(
            6 + super::super::book::REPLY_WAIT_MS,
            "ChatGPT 30 分钟没回信",
            "排队没人领"
        ));
        let lines = new_stops(&mut logged, &book);
        assert_eq!(lines.len(), 1, "{lines:?}");
        assert!(
            lines[0].contains(&id) && lines[0].contains("30 分钟没回信"),
            "{lines:?}"
        );
        assert!(lines[0].starts_with("PostPane stopped handoff"));
        // Told once.
        assert!(new_stops(&mut logged, &book).is_empty());
    }

    #[test]
    fn rereads_given_up_are_logged_as_a_failure() {
        let mut book = Book::default();
        let id = asked(&mut book);
        let mut logged = counts(&book);
        let mut now = 2 + 3 * 60 * 1000;
        for _ in 0..12 {
            book.read_again(&id, now, || Ok(()));
            now += 40 * 60 * 1000;
        }
        let lines = new_stops(&mut logged, &book);
        assert!(
            lines
                .iter()
                .any(|line| line.starts_with("PostPane gave up on handoff")),
            "{lines:?}"
        );
    }
}
