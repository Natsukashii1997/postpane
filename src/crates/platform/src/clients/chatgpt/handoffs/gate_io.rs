//! What the review gate reads and keeps (#347): an answer's problem ledger
//! and the commit it says it reviewed, the brief's commit, the review cap
//! set in `<data>/chatgpt/config.json`, and every answer kept in full.
use super::gate::{LIMIT, LIMIT_MAX};
use super::{config_path, folder, key, read_small, write_private};
use std::path::Path;

/// The longest problem ledger carried into the next review.
const LEDGER_KEPT: usize = 32 * 1024;

/// An answer's problem ledger: the part headed 「问题台账」 up to the next
/// heading or its last lines; the whole answer when it has none.
pub fn ledger(reply: &str) -> String {
    let lines = reply.lines().collect::<Vec<_>>();
    let heading = |line: &str| line.trim_start().starts_with('#');
    let text = match lines.iter().position(|l| l.contains("问题台账")) {
        Some(start) => {
            let end = lines[start + 1..]
                .iter()
                .position(|l| heading(l) || l.trim().starts_with("受审版本"))
                .map_or(lines.len(), |at| start + 1 + at);
            lines[start..end].join("\n")
        }
        None => reply.to_owned(),
    };
    let text = text.trim();
    if text.chars().count() <= LEDGER_KEPT {
        return text.to_owned();
    }
    let cut = text.chars().take(LEDGER_KEPT).collect::<String>();
    format!("{cut}…（过长，已截断）")
}

/// The commit an answer says it reviewed: 「受审版本：<sha>」 among its last lines.
pub fn reviewed_commit(reply: &str) -> Option<String> {
    reply
        .lines()
        .rev()
        .map(|l| l.replace("**", "").replace('`', ""))
        .filter(|l| !l.trim().is_empty())
        .take(6)
        .find_map(|l| {
            let rest = l.trim().strip_prefix("受审版本")?;
            commit_in(rest)
        })
}

/// The commit a brief names for review: a full hash on a line about the head.
pub fn head_in(brief: &str) -> Option<String> {
    brief
        .lines()
        .filter(|l| l.to_ascii_lowercase().contains("head"))
        .find_map(|l| commit_in(l).filter(|c| c.len() == 40))
}

/// The first commit hash in `text`, 7 to 40 hex digits.
fn commit_in(text: &str) -> Option<String> {
    text.split(|c: char| !c.is_ascii_hexdigit())
        .find(|w| (7..=40).contains(&w.len()) && w.chars().any(|c| c.is_ascii_digit()))
        .map(str::to_ascii_lowercase)
}

/// Whether two hashes name the same commit: one starts the other, seven
/// digits at least.
pub fn same_commit(a: &str, b: &str) -> bool {
    let (a, b) = (a.to_ascii_lowercase(), b.to_ascii_lowercase());
    a.len().min(b.len()) >= 7 && (a.starts_with(&b) || b.starts_with(&a))
}

/// The cap set in `<data>/chatgpt/config.json` (`reviewLimit`); `LIMIT` unset.
pub fn review_limit(data: &Path) -> u32 {
    config(data)["reviewLimit"]
        .as_u64()
        .and_then(|n| u32::try_from(n).ok())
        .filter(|n| (1..=LIMIT_MAX).contains(n))
        .unwrap_or(LIMIT)
}
/// Sets the cap, 1 to `LIMIT_MAX`.
pub fn set_review_limit(data: &Path, limit: u32) -> Result<u32, String> {
    if !(1..=LIMIT_MAX).contains(&limit) {
        return Err(format!("接力审核上限要在 1 到 {LIMIT_MAX} 之间"));
    }
    set_config(data, "reviewLimit", serde_json::json!(limit))?;
    Ok(limit)
}
pub(super) fn config(data: &Path) -> serde_json::Value {
    read_small(&config_path(data))
        .and_then(|bytes| serde_json::from_slice(&bytes).ok())
        .filter(serde_json::Value::is_object)
        .unwrap_or_else(|| serde_json::json!({}))
}
/// Sets one key of the config, keeping the others.
pub(super) fn set_config(data: &Path, name: &str, value: serde_json::Value) -> Result<(), String> {
    let mut config = config(data);
    config[name] = value;
    let bytes = serde_json::to_vec_pretty(&config).map_err(|e| e.to_string())?;
    write_private(data, "config", &bytes, &config_path(data))
}

/// Keeps answer `n` of handoff `id` in full, in `<data>/chatgpt/replies/`.
pub fn archive(data: &Path, id: &str, n: usize, reply: &str) -> Result<(), String> {
    let directory = folder(data).join("replies");
    crate::os::private_directory(&directory)?;
    let name = format!("{id}-{n:02}-{}.md", &key(reply)[..8]);
    write_private(data, "reply", reply.as_bytes(), &directory.join(name))
}
/// Ended handoffs keep their answers as excerpts (#347), so the file stays
/// small enough to read back: each kept whole in `replies/` first, and
/// one that cannot be kept stays whole (P2-05).
pub fn slim_kept(data: &Path, book: &mut super::Book) {
    for h in book.list.iter_mut().filter(|h| !h.live()) {
        let replies = h
            .steps
            .iter_mut()
            .filter(|s| s.kind == super::StepKind::Reply);
        for (n, step) in replies.enumerate() {
            let Some(text) = step
                .text
                .as_mut()
                .filter(|t| t.chars().count() > super::EXCERPT)
            else {
                continue;
            };
            if archived(data, &h.id, n + 1).is_some() || archive(data, &h.id, n + 1, text).is_ok() {
                *text = super::excerpt(text, super::EXCERPT);
            }
        }
    }
}
/// Answer `n` of handoff `id` as kept in full, when it is.
pub fn archived(data: &Path, id: &str, n: usize) -> Option<String> {
    let prefix = format!("{id}-{n:02}-");
    // Kept twice (an answer cut before it was kept, L3 P2-10): the whole
    // one is the longest.
    std::fs::read_dir(folder(data).join("replies"))
        .ok()?
        .flatten()
        .filter(|e| e.file_name().to_string_lossy().starts_with(&prefix))
        .filter_map(|e| std::fs::read_to_string(e.path()).ok())
        .max_by_key(String::len)
}
/// Moves an unreadable `handoffs.json` aside, beside it, so it is never
/// written over: what it held stays for the person to look at.
pub(super) fn set_aside(path: &Path) {
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_or(0, |d| d.as_secs());
    let aside = path.with_file_name(format!("handoffs.unreadable-{stamp}.json"));
    match std::fs::rename(path, &aside) {
        Ok(()) => eprintln!(
            "handoffs.json could not be read; kept as {}",
            aside.display()
        ),
        Err(error) => eprintln!("handoffs.json could not be read nor set aside: {error}"),
    }
}
