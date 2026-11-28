//! A turn's closing lines, the owner's 「收尾三项」 (CLAUDE.md §12):
//! 「**本次完成**」, 「**当前状态**：〔状态词〕…」 and 「**下一步**」. A reply that
//! asks the owner to act becomes a next-step card of its own (#562).
use super::live::{DesktopAsk, DesktopAskOption, LiveLog};

/// The closing lines of a turn's last message.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Closing {
    /// The status word inside 〔〕: 已结束, 等你决定, 等你操作, 后台进行中, 受阻.
    pub status: String,
    /// The status line after its word.
    pub state: String,
    pub done: Option<String>,
    pub next: String,
    /// What the next step tells the owner to reply: each 「回复『X』」.
    pub choices: Vec<String>,
}

const MARKS: [&str; 4] = ["**主线**", "**本次完成**", "**当前状态**", "**下一步**"];

/// From the first closing line to the end of `text`, whole: the last
/// paragraph a reply shows, which the 240-character cut would leave without
/// its next step. None when `text` has no 「**当前状态**」 line.
pub fn closing_block(text: &str) -> Option<String> {
    let lines = text.lines().collect::<Vec<_>>();
    let state = lines.iter().rposition(|line| line.contains(MARKS[2]))?;
    let start = (0..=state)
        .rev()
        .take_while(|&at| {
            MARKS.iter().any(|mark| lines[at].contains(mark)) || lines[at].trim().is_empty()
        })
        .last()
        .unwrap_or(state);
    let block = lines[start..]
        .iter()
        .map(|line| line.trim())
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join("\n");
    Some(block.chars().take(1200).collect())
}

/// A turn's last paragraph, what its reply shows: cut at 240 characters,
/// but the owner's closing lines whole.
pub fn last_paragraph(text: &str) -> Option<String> {
    // The owner's closing lines stay whole, next step and all (#562).
    if let Some(block) = closing_block(text) {
        return Some(block);
    }
    let mut lines = Vec::new();
    for line in text.lines().rev() {
        if line.trim().is_empty() {
            if !lines.is_empty() {
                break;
            }
        } else {
            lines.push(line);
        }
    }
    lines.reverse();
    let joined = lines.join("\n");
    let last = joined.trim();
    if last.is_empty() {
        return None;
    }
    if last.chars().count() <= 240 {
        Some(last.to_owned())
    } else {
        let prefix: String = last.chars().take(240).collect();
        Some(format!("{}…", prefix.trim_end()))
    }
}

/// The cards a Claude session stands as: its question, a handoff card it
/// proposed (#245), and a reply waiting on the owner (#562).
pub fn standing_asks(log: &LiveLog) -> impl Iterator<Item = DesktopAsk> {
    let activity = log.activity.as_ref();
    [
        activity.and_then(|activity| activity.desktop_ask.clone()),
        activity.and_then(|activity| activity.handoff.clone()),
        reply_ask(log),
    ]
    .into_iter()
    .flatten()
}

/// The closing lines of `message`, when it has a status line.
pub fn closing(message: &str) -> Option<Closing> {
    let field = |mark: &str| {
        message
            .lines()
            .rev()
            .find_map(|line| line.trim().strip_prefix(mark))
            .map(|rest| rest.trim_start_matches([':', '：', ' ']).trim().to_owned())
    };
    let state = field(MARKS[2])?;
    let status = state
        .strip_prefix('〔')?
        .split('〕')
        .next()?
        .trim()
        .to_owned();
    let state = state
        .split_once('〕')
        .map_or("", |(_, rest)| rest)
        .trim()
        .to_owned();
    let next = field(MARKS[3]).unwrap_or_default();
    Some(Closing {
        choices: choices(&next),
        done: field(MARKS[1]).filter(|done| !done.is_empty()),
        status,
        state,
        next,
    })
}

/// Whether the owner has something to do: decide, act, or unblock it.
pub fn asks_owner(status: &str) -> bool {
    matches!(status, "等你决定" | "等你操作" | "受阻")
}

/// Each X the next step tells the owner to reply with: 「回复『X』」,
/// 「回复「X」」, 「回『X』」.
fn choices(next: &str) -> Vec<String> {
    let mut found = Vec::new();
    for (at, _) in next.match_indices('回') {
        let rest = next[at + '回'.len_utf8()..].trim_start_matches('复');
        let rest = rest.trim_start();
        let Some(open) = rest.chars().next().filter(|c| matches!(c, '『' | '「')) else {
            continue;
        };
        let close = if open == '『' { '』' } else { '」' };
        let body = &rest[open.len_utf8()..];
        if let Some(end) = body.find(close) {
            let word = body[..end].trim().to_owned();
            if !word.is_empty() && !found.contains(&word) {
                found.push(word);
            }
        }
    }
    found
}

/// The card a finished turn stands as when its closing asks the owner to act
/// and the turn put no next-step box of its own up (#562): its next step as
/// the question, what it did and where it stands as the small text, and each
/// reply its next step names as a button.
pub fn reply_ask(log: &LiveLog) -> Option<DesktopAsk> {
    let turn = log.turns.back().filter(|turn| !turn.running)?;
    if turn.outcome.as_deref() != Some("completed") {
        return None;
    }
    let asked = log
        .activity
        .as_ref()
        .is_some_and(|activity| activity.desktop_ask.is_some());
    let closing = closing(turn.message.as_deref()?)
        .filter(|c| asks_owner(&c.status) && !c.next.is_empty())?;
    if asked {
        return None;
    }
    let state = format!("〔{}〕{}", closing.status, closing.state);
    let elsewhere = super::elsewhere::elsewhere(&closing.next).is_some();
    Some(DesktopAsk {
        id: format!("reply:{}", turn.id.as_deref().unwrap_or("turn")),
        response: None,
        kind: "reply".into(),
        question: closing.next,
        recap: Some(match closing.done {
            Some(done) => format!("{done}\n{state}"),
            None => state,
        }),
        // A step done in another session offers no answer here (2026-11-28).
        options: closing
            .choices
            .into_iter()
            .filter(|_| !elsewhere)
            .map(|label| DesktopAskOption {
                label,
                message: None,
            })
            .collect(),
        at: turn.observed,
        offset: None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const ENDING: &str = "改好了，见下。\n\n**主线**：侧栏｜✅1\n**本次完成**：去掉虚线签，PR #561。\n**当前状态**：〔等你决定〕代码好了，差装机。\n**下一步**：#558 做完后回「做完了，装机合并」；还没做完回『先等等』。";

    #[test]
    fn a_closing_block_is_kept_whole_from_its_first_line() {
        let block = closing_block(ENDING).unwrap();
        assert!(block.starts_with("**主线**"), "{block}");
        assert!(block.ends_with("回『先等等』。"), "{block}");
        assert!(!block.contains("改好了"));
        assert_eq!(closing_block("Done."), None);
    }

    #[test]
    fn a_closing_gives_its_status_next_step_and_the_replies_it_names() {
        let c = closing(ENDING).unwrap();
        assert_eq!(c.status, "等你决定");
        assert_eq!(c.state, "代码好了，差装机。");
        assert_eq!(c.done.as_deref(), Some("去掉虚线签，PR #561。"));
        assert!(c.next.starts_with("#558 做完后"));
        assert_eq!(c.choices, ["做完了，装机合并", "先等等"]);
        assert!(asks_owner(&c.status));
        assert!(!asks_owner("已结束") && !asks_owner("后台进行中"));
        let ended = closing("**当前状态**：〔已结束〕全做完。").unwrap();
        assert_eq!((ended.status.as_str(), ended.next.as_str()), ("已结束", ""));
        assert_eq!(closing("Done."), None);
    }
}
