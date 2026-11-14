//! The review gate's own doings on the host (#347, multi-agent MA-02
//! v0.3): asking ChatGPT once to mend an answer's last lines, reading a
//! pull request's current commit before a pass ends the handoff, and the
//! words for both. What the answers mean, PostPane does not judge.
use super::texts::Sent;
use super::{Desk, Lines};
use agent_hud_runtime::chatgpt::handoffs::{self, Handoff};
use agent_hud_runtime::l10n;
use std::time::Duration;

/// How long reading a pull request's current commit may take.
const READ_HEAD_WAIT: Duration = Duration::from_secs(20);

impl Desk {
    /// The review cap as set now (`reviewLimit`, #347).
    pub(super) fn review_limit(&self) -> u32 {
        self.data
            .as_deref()
            .map_or(handoffs::LIMIT, handoffs::review_limit)
    }
    /// The commit under review: as named, else the brief's (#347).
    pub(super) fn head(&self, rule: &super::Rule, brief: &str) -> Option<String> {
        let named = rule
            .head
            .as_deref()
            .map(str::trim)
            .filter(|h| !h.is_empty());
        named
            .map(str::to_owned)
            .or_else(|| handoffs::head_in(brief))
    }
    /// An engineering review of a pull request goes only with the full
    /// commit under review (MA-02 §4): else no pass could be checked.
    pub(super) fn head_needed(pr: Option<&str>, head: Option<&str>) -> Result<(), String> {
        let full = |h: &str| h.len() == 40 && h.chars().all(|c| c.is_ascii_hexdigit());
        match (pr, head) {
            (Some(_), Some(head)) if full(head) => Ok(()),
            (Some(pr), _) => Err(l10n::text(
                &format!("送审的是 {pr}，但没认出受审的完整提交，没有发出：调用时 head 填 40 位 SHA（或在 brief 里写一行「head_sha <40 位 SHA>」）。"),
                &format!("{pr} was sent with no full commit under review; nothing was sent. Give head as the 40-digit SHA (or a line 「head_sha <SHA>」 in the brief)."),
            )),
            (None, _) => Ok(()),
        }
    }
    /// Keeps the newest answer of handoff `id` in full (#347).
    pub(super) fn keep_answer(&self, book: &handoffs::Book, id: &str, reply: &str) {
        let Some(data) = &self.data else { return };
        let n = book.get(id).map_or(0, |handoff| {
            handoff
                .steps
                .iter()
                .filter(|s| s.kind == handoffs::StepKind::Reply)
                .count()
        });
        // As it came, before the handoff cuts it to its own length (#347).
        if let Err(error) = handoffs::archive(data, id, n, reply.trim()) {
            eprintln!("{error}");
        }
    }
    /// What PostPane adds to the next review of handoff `id` (#347), the
    /// ledger read from the answers kept in full.
    pub(super) fn carry(&self, book: &handoffs::Book, id: &str) -> String {
        let data = self.data.clone();
        book.carry(id, &move |h, n| {
            data.as_deref().and_then(|d| handoffs::archived(d, h, n))
        })
    }
    /// Asks ChatGPT, in the handoff's conversation, to mend only its newest
    /// answer's last lines (no review of its own, not counted). Once per
    /// answer: the mended one is taken as it comes. Whether it went.
    pub(super) fn ask_format(&self, lines: &dyn Lines, id: &str, now: i64) -> bool {
        let Ok(_sending) = self.claim(id) else {
            return false;
        };
        let Some(handoff) = self.lock().get(id).cloned() else {
            return false;
        };
        let Some(conversation) = handoff.chatgpt_conversation.clone() else {
            return false;
        };
        if handoff.next() != Some(handoffs::Next::Format) {
            return false;
        }
        let text = format_ask(&handoff);
        let request = format!("{id}~format{now}");
        // Recorded before it goes, so an answer quicker than the send's own
        // word is taken; and any that came early is caught up after.
        if !self.change(|book| book.format_asked(id, &text, now)) {
            return false;
        }
        match lines.send(&conversation, &text, &request) {
            Ok(()) => {
                self.caught_up(&conversation);
                true
            }
            Err(error) => self.change(|book| {
                book.trouble(id, &format_failed(&error), now);
                book.stop(id, &format_failed(&error), true, now)
            }),
        }
    }
    /// Whether a pass may end handoff `id`: the commit under review is still
    /// its pull request's. None when it may, or when it reviews no pull
    /// request; else why not.
    pub(super) fn pass_blocked(&self, lines: &dyn Lines, handoff: &Handoff) -> Option<String> {
        // Sent and not known to have gone in: what it reviewed is not
        // known (L3 P1-10).
        if handoff.gate.pending.is_some() {
            return Some(super::guard::unconfirmed());
        }
        let pr = handoff.pr.as_deref()?;
        // Kept with no commit (from before the gate): it cannot be checked,
        // so it does not pass (P1-01).
        let Some(head) = handoff.gate.head.as_deref() else {
            return Some(super::guard::no_anchor(pr));
        };
        match lines.pr_head(pr) {
            Ok(now) if handoffs::same_commit(&now, head) => None,
            Ok(now) => Some(moved_on(pr, head, &now)),
            Err(error) => Some(unread_head(pr, &error)),
        }
    }
}

/// A pull request's current commit, 「owner/repo#n」, as GitHub has it:
/// `git ls-remote`, with the person's own git credentials.
pub(super) fn read_pr_head(pr: &str) -> Result<String, String> {
    use std::process::{Command, Stdio};
    let (repo, number) = pr.split_once('#').ok_or("不是 PR")?;
    let url = format!("https://github.com/{repo}.git");
    let reference = format!("refs/pull/{number}/head");
    // Never asks anyone for credentials: what git has, or it fails.
    let mut child = Command::new("/usr/bin/git")
        .args([
            "-c",
            "credential.interactive=never",
            "ls-remote",
            &url,
            &reference,
        ])
        .env("GIT_TERMINAL_PROMPT", "0")
        .env("GIT_ASKPASS", "/usr/bin/false")
        .env("SSH_ASKPASS", "/usr/bin/false")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| error.to_string())?;
    let deadline = std::time::Instant::now() + READ_HEAD_WAIT;
    while child.try_wait().map_err(|e| e.to_string())?.is_none() {
        if std::time::Instant::now() > deadline {
            // Ended, not left behind (#347 review P2-03).
            let _ = child.kill();
            let _ = child.wait();
            return Err("读取超时".to_owned());
        }
        std::thread::sleep(Duration::from_millis(100));
    }
    let output = child
        .wait_with_output()
        .map_err(|error| error.to_string())?;
    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(error
            .lines()
            .next()
            .unwrap_or("git ls-remote 失败")
            .to_owned());
    }
    String::from_utf8_lossy(&output.stdout)
        .split_whitespace()
        .next()
        .filter(|commit| commit.len() == 40)
        .map(str::to_owned)
        .ok_or_else(|| "没找到这个 PR".to_owned())
}

/// What PostPane asks ChatGPT when an answer's last lines do not hold.
fn format_ask(handoff: &Handoff) -> String {
    if handoff.thinking() {
        return "（驿窗自动发送，不算一轮评审）上一封回信最后两行驿窗认不出。请不要改动任何判断，只把回信最后两行按格式重写一遍：倒数第二行「评审出口：成熟退出 / 继续深化 / 证据不足暂停 / 决策升级 / 转其他路径」（五选一），最后一行「结论：通过 / 需修改 / 交常浩裁决」，两行要对得上。出口与结论矛盾时以出口为准改结论；认不出原意时不要写通过。只回这两行。".to_owned();
    }
    let head = handoff
        .gate
        .head
        .as_deref()
        .map_or_else(|| "<实际审过的 commit SHA>".to_owned(), str::to_owned);
    format!("（驿窗自动发送，不算一轮审查）上一封回信末尾几行驿窗认不出。请不要改动任何判断、问题台账和已写明的审查出口，只把回信最后四行按格式重写一遍：\n受审版本：<实际审过的 commit SHA；送审的是 {head}>\n未决：P0 n，P1 n\n审查出口：通过 / 返修 / 证据不足暂停 / 决策升级\n结论：通过 / 需修改\n通过配通过，其余配需修改；出口与结论矛盾时以出口为准改结论；认不出原意时不要写通过。只回这四行。")
}
fn format_failed(error: &str) -> String {
    l10n::text(
        &format!("请 ChatGPT 补写末尾几行没发出去：{error}；自动往返停下，交还常浩"),
        &format!("Could not ask ChatGPT to mend its last lines: {error}; left to you"),
    )
}
fn moved_on(pr: &str, head: &str, now: &str) -> String {
    let (head, now) = (&head[..head.len().min(7)], &now[..now.len().min(7)]);
    l10n::text(
        &format!("审的是 {head}，{pr} 现在是 {now}：这次通过不能用于新提交，请用当前提交重新送审"),
        &format!("{head} was reviewed but {pr} is at {now} now: the pass does not hold for it; send the current commit again"),
    )
}
fn unread_head(pr: &str, error: &str) -> String {
    l10n::text(
        &format!("版本待核：读不到 {pr} 现在的提交（{error}），没有按通过结束，交还常浩"),
        &format!("Commit unverified: could not read {pr}'s current commit ({error}); not ended as a pass, left to you"),
    )
}
/// The pass did not hold for the commit under review (#347).
pub(super) fn stale(why: &str, how: Sent) -> String {
    let (zh, en) = super::texts::sent_words(how);
    l10n::text(
        &format!("{why}，{zh}，自动往返停下"),
        &format!("{why}; {en}; the auto round trip stopped"),
    )
}
/// A pass of another commit than the one sent for review (#347).
pub(super) fn stale_words() -> String {
    l10n::text(
        "回信写了通过，但受审版本和送审的提交对不上，这次通过不能用于当前提交",
        "The answer passed another commit than the one sent for review",
    )
}
/// A review chain named that PostPane does not know (#347).
pub(super) fn chain_unknown(chain: &str) -> String {
    l10n::text(
        &format!("驿窗没有审查链 {chain} 的记录，没有发出：请核对 chain 是否写对；确实是新的验收目标就不填 chain，拿不准就问常浩。"),
        &format!("PostPane has no review chain {chain}; nothing was sent. Check chain; leave it out only for a new acceptance goal, and ask the person when unsure."),
    )
}
