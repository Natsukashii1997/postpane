//! Handoffs (relay 1c, docs/chatgpt-channel.md): a Claude Code session and the
//! ChatGPT conversation that reviews its work, bound together so words go
//! back and forth between the two. Kept in `<data>/chatgpt/handoffs.json`,
//! with the ChatGPT project new review conversations open in
//! (`<data>/chatgpt/config.json`).
use super::{folder, write_private};
use agent_hud_agents::chatgpt as agent;
use agent_hud_core::l10n;
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
};

/// How many handoffs are kept, newest first.
pub const KEEP: usize = 200;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Status {
    /// The review conversation is being opened.
    Opening,
    /// Bound to its conversation; words go back and forth.
    Open,
    /// The conversation could not be opened (`error` says why).
    Failed,
    /// A newer review of the same session took its place.
    Closed,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Handoff {
    pub id: String,
    /// The task's name, which the review conversation is about.
    pub title: String,
    /// The Claude Code session doing the work.
    pub claude_session: String,
    #[serde(default)]
    pub cwd: Option<String>,
    /// The ChatGPT conversation reviewing it, once open.
    #[serde(default)]
    pub chatgpt_conversation: Option<String>,
    pub status: Status,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    /// How many times words went either way after the first.
    #[serde(default)]
    pub rounds: u32,
}

impl Handoff {
    /// Opening or open: the handoff a session or conversation belongs to.
    pub fn live(&self) -> bool {
        matches!(self.status, Status::Opening | Status::Open)
    }
}

/// The handoffs, oldest first.
#[derive(Clone, Debug, Default, PartialEq)]
pub struct Book {
    pub list: Vec<Handoff>,
}

impl Book {
    pub fn get(&self, id: &str) -> Option<&Handoff> {
        self.list.iter().find(|handoff| handoff.id == id)
    }
    /// The live handoff `session` belongs to.
    pub fn for_session(&self, session: &str) -> Option<&Handoff> {
        self.list
            .iter()
            .rev()
            .find(|handoff| handoff.live() && handoff.claude_session == session)
    }
    /// The live handoff `conversation` belongs to.
    pub fn for_conversation(&self, conversation: &str) -> Option<&Handoff> {
        self.list.iter().rev().find(|handoff| {
            handoff.live() && handoff.chatgpt_conversation.as_deref() == Some(conversation)
        })
    }
    fn get_mut(&mut self, id: &str) -> Option<&mut Handoff> {
        self.list.iter_mut().find(|handoff| handoff.id == id)
    }
    /// A new handoff for `session`, opening; one the session had before is
    /// closed, so a session belongs to one handoff at a time.
    pub fn begin(&mut self, session: &str, cwd: Option<&str>, title: &str, now: i64) -> Handoff {
        for handoff in &mut self.list {
            if handoff.live() && handoff.claude_session == session {
                handoff.status = Status::Closed;
                handoff.updated_at = now;
            }
        }
        let handoff = Handoff {
            id: new_id(now),
            title: title.trim().to_owned(),
            claude_session: session.to_owned(),
            cwd: cwd.filter(|cwd| !cwd.is_empty()).map(str::to_owned),
            chatgpt_conversation: None,
            status: Status::Opening,
            error: None,
            created_at: now,
            updated_at: now,
            rounds: 0,
        };
        self.list.push(handoff.clone());
        self.trim();
        handoff
    }
    /// The review conversation opened: the handoff is bound to it, and any
    /// other handoff that held it lets it go.
    pub fn opened(&mut self, id: &str, conversation: &str, now: i64) -> bool {
        if self
            .get(id)
            .is_none_or(|handoff| handoff.status != Status::Opening)
        {
            return false;
        }
        for handoff in &mut self.list {
            if handoff.id != id
                && handoff.live()
                && handoff.chatgpt_conversation.as_deref() == Some(conversation)
            {
                handoff.status = Status::Closed;
                handoff.updated_at = now;
            }
        }
        let handoff = self.get_mut(id).expect("checked above");
        handoff.chatgpt_conversation = Some(conversation.to_owned());
        handoff.status = Status::Open;
        handoff.error = None;
        handoff.updated_at = now;
        true
    }
    /// The review conversation could not be opened.
    pub fn failed(&mut self, id: &str, error: &str, now: i64) -> bool {
        let Some(handoff) = self.get_mut(id).filter(|h| h.status == Status::Opening) else {
            return false;
        };
        handoff.status = Status::Failed;
        handoff.error = Some(error.to_owned());
        handoff.updated_at = now;
        true
    }
    /// Words went across once more.
    pub fn round(&mut self, id: &str, now: i64) -> bool {
        let Some(handoff) = self.get_mut(id).filter(|h| h.live()) else {
            return false;
        };
        handoff.rounds += 1;
        handoff.updated_at = now;
        true
    }
    /// Keeps the newest `KEEP`.
    fn trim(&mut self) {
        if self.list.len() > KEEP {
            let extra = self.list.len() - KEEP;
            self.list.drain(..extra);
        }
    }
}

fn new_id(now: i64) -> String {
    use std::sync::atomic::{AtomicU32, Ordering};
    static SEQUENCE: AtomicU32 = AtomicU32::new(0);
    let sequence = SEQUENCE.fetch_add(1, Ordering::Relaxed) & 0xff;
    format!("h{:x}{sequence:02x}", now.max(0))
}

fn handoffs_path(data: &Path) -> PathBuf {
    folder(data).join("handoffs.json")
}
fn config_path(data: &Path) -> PathBuf {
    folder(data).join("config.json")
}

/// A small private JSON file in the channel's folder, when it is there and readable.
fn read_small(path: &Path) -> Option<Vec<u8>> {
    let metadata = fs::symlink_metadata(path).ok()?;
    if !metadata.is_file() || metadata.len() > 4 * 1024 * 1024 {
        return None;
    }
    fs::read(path).ok()
}

/// The handoffs kept; none when there are none or they cannot be read.
pub fn load(data: &Path) -> Book {
    let mut list = read_small(&handoffs_path(data))
        .and_then(|bytes| serde_json::from_slice::<Vec<Handoff>>(&bytes).ok())
        .unwrap_or_default();
    list.retain(|handoff| {
        crate::claude_plugin::valid_name(&handoff.claude_session)
            && handoff
                .chatgpt_conversation
                .as_deref()
                .is_none_or(agent::conversation_id)
    });
    let mut book = Book { list };
    book.trim();
    book
}
/// Replaces the kept handoffs, privately and at once.
pub fn save(data: &Path, book: &Book) -> Result<(), String> {
    let bytes = serde_json::to_vec_pretty(&book.list).map_err(|_| "Handoffs unavailable")?;
    write_private(data, "handoffs", &bytes, &handoffs_path(data))
        .map_err(|_| "The handoffs could not be saved".into())
}

/// The ChatGPT project page new review conversations open in, when one is set.
pub fn project(data: &Path) -> Option<String> {
    let bytes = read_small(&config_path(data))?;
    let config: serde_json::Value = serde_json::from_slice(&bytes).ok()?;
    config["project"]
        .as_str()
        .and_then(|url| project_url(url).ok().flatten())
}
/// Sets (or, with an empty text, clears) the project; the saved address.
pub fn set_project(data: &Path, text: &str) -> Result<Option<String>, String> {
    let project = project_url(text)?;
    let bytes = serde_json::to_vec_pretty(&serde_json::json!({ "project": project }))
        .map_err(|_| "Project unavailable")?;
    write_private(data, "config", &bytes, &config_path(data))
        .map_err(|_| l10n::text("项目没能保存", "The project could not be saved"))?;
    Ok(project)
}
/// A ChatGPT project page's address (`https://chatgpt.com/g/<id>/project`),
/// as pasted: None for an empty text.
pub fn project_url(text: &str) -> Result<Option<String>, String> {
    let text = text.trim();
    if text.is_empty() {
        return Ok(None);
    }
    let refused = || {
        l10n::text(
            "要填 ChatGPT 项目页的网址，形如 https://chatgpt.com/g/…/project",
            "Paste a ChatGPT project page address, like https://chatgpt.com/g/…/project",
        )
    };
    let address = text.split(['?', '#']).next().unwrap_or("");
    let address = address.strip_suffix('/').unwrap_or(address);
    let id = address
        .strip_prefix("https://chatgpt.com/g/")
        .and_then(|rest| rest.strip_suffix("/project"))
        .ok_or_else(refused)?;
    let valid = !id.is_empty()
        && id.len() <= 200
        && id
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_' | b'%'));
    if !valid {
        return Err(refused());
    }
    Ok(Some(format!("https://chatgpt.com/g/{id}/project")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_session_and_a_conversation_belong_to_one_live_handoff() {
        let mut book = Book::default();
        let first = book.begin("s1", Some("/w"), " 修登录 ", 10);
        assert_eq!(first.status, Status::Opening);
        assert_eq!(first.title, "修登录");
        assert_eq!(book.for_session("s1").unwrap().id, first.id);
        assert!(book.opened(&first.id, "c1", 11));
        assert!(
            !book.opened(&first.id, "c2", 12),
            "only an opening one opens"
        );
        assert_eq!(book.for_conversation("c1").unwrap().id, first.id);
        assert!(book.round(&first.id, 13));
        assert_eq!(book.get(&first.id).unwrap().rounds, 1);
        // A new review of the same session closes the one before.
        let second = book.begin("s1", Some("/w"), "修登录", 20);
        assert_ne!(second.id, first.id);
        assert_eq!(book.get(&first.id).unwrap().status, Status::Closed);
        assert!(book.for_conversation("c1").is_none());
        assert!(!book.round(&first.id, 21));
        assert_eq!(book.for_session("s1").unwrap().id, second.id);
        // Another session's handoff that ends up with the same conversation
        // takes it from the one before.
        let other = book.begin("s2", None, "别的", 30);
        assert!(book.opened(&second.id, "c9", 31));
        assert!(book.opened(&other.id, "c9", 32));
        assert_eq!(book.get(&second.id).unwrap().status, Status::Closed);
        assert_eq!(book.for_conversation("c9").unwrap().id, other.id);
    }

    #[test]
    fn a_review_that_did_not_open_says_why_and_frees_the_session() {
        let mut book = Book::default();
        let handoff = book.begin("s1", None, "t", 1);
        assert!(book.failed(&handoff.id, "timeout", 2));
        let failed = book.get(&handoff.id).unwrap();
        assert_eq!(failed.status, Status::Failed);
        assert_eq!(failed.error.as_deref(), Some("timeout"));
        assert!(book.for_session("s1").is_none());
        assert!(!book.failed(&handoff.id, "again", 3));
    }

    #[test]
    fn handoffs_are_kept_between_runs_newest_two_hundred() {
        let temp = tempfile::tempdir().unwrap();
        let data = temp.path().join("data");
        assert!(load(&data).list.is_empty());
        let mut book = Book::default();
        for at in 0..(KEEP as i64 + 5) {
            book.begin(&format!("s{at}"), None, "t", at);
        }
        assert_eq!(book.list.len(), KEEP);
        assert_eq!(book.list[0].claude_session, "s5");
        let last = book.list.last().unwrap().id.clone();
        assert!(book.opened(&last, "c-1", 999));
        save(&data, &book).unwrap();
        assert_eq!(load(&data), book);
        // A handoff naming a session or conversation that cannot be one is dropped.
        let mut forged = book.clone();
        forged.list[0].claude_session = "../x".into();
        save(&data, &forged).unwrap();
        assert_eq!(load(&data).list.len(), KEEP - 1);
    }

    #[test]
    fn the_project_is_a_chatgpt_project_page() {
        let temp = tempfile::tempdir().unwrap();
        let data = temp.path().join("data");
        assert_eq!(project(&data), None);
        let page = "https://chatgpt.com/g/g-p-0123abcd-review/project";
        assert_eq!(project_url(page).unwrap().as_deref(), Some(page));
        assert_eq!(
            project_url(&format!("  {page}/?tab=chats#x "))
                .unwrap()
                .as_deref(),
            Some(page)
        );
        assert_eq!(project_url("  ").unwrap(), None);
        for wrong in [
            "http://chatgpt.com/g/g-p-1/project",
            "https://chatgpt.com/c/68a1",
            "https://chatgpt.com/g//project",
            "https://chatgpt.com/g/a/b/project",
            "https://evil.example/g/g-p-1/project",
            "https://chatgpt.com.evil.example/g/g-p-1/project",
        ] {
            assert!(project_url(wrong).is_err(), "{wrong}");
        }
        assert_eq!(set_project(&data, page).unwrap().as_deref(), Some(page));
        assert_eq!(project(&data).as_deref(), Some(page));
        assert!(set_project(&data, "https://chatgpt.com/c/1").is_err());
        assert_eq!(project(&data).as_deref(), Some(page), "a refusal keeps it");
        assert_eq!(set_project(&data, "").unwrap(), None);
        assert_eq!(project(&data), None);
    }
}
