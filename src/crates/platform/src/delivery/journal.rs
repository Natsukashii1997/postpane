//! The receipt journal: one private file per request, named by a digest of
//! its identity and written before any client is asked. It keeps the
//! request's fingerprint and receipt, never the message text.
//!
//! A receipt that maintenance can no longer change is kept for `KEEP_MS`
//! after its request was sent, then removed. While it is kept, the same
//! request identity is answered from it and never goes to a client again;
//! after that the identity is free (callers' identities are single-use, and
//! `known_receipts` already stops showing a receipt at that age).
use super::*;
use sha2::{Digest, Sha256};
use std::{collections::HashSet, fs, path::Path, sync::PoisonError};

/// How long a settled receipt is kept, and `known_receipts` shows one.
const KEEP_MS: u64 = 7 * 86_400_000;

#[derive(Serialize, Deserialize)]
pub(super) struct Attempt {
    pub(super) fingerprint: String,
    pub(super) receipt: Receipt,
}

impl LocalClients {
    /// Receipt facts remain the durable source for native turn ↔ client request
    /// identity. This does not read any client transcript or create a new writer.
    pub fn known_receipts(&self) -> Result<Vec<Receipt>> {
        let cutoff = millis(SystemTime::now()).saturating_sub(KEEP_MS);
        let mut rows = Vec::new();
        for entry in fs::read_dir(&self.paths.receipts)? {
            let path = entry?.path();
            if owned_attempt(&path).is_none() {
                continue;
            }
            if let Some(attempt) = read_attempt(&path)? {
                if attempt.receipt.at_ms >= cutoff {
                    rows.push(attempt.receipt);
                }
            }
        }
        rows.sort_by_key(|row| row.at_ms);
        Ok(rows)
    }
    pub fn sweep_plugin(&self, now: SystemTime) -> Result<()> {
        if let Some(channel) = &self.deepseek {
            channel.sweep(now);
        }
        ClaudeChannel::new(self.paths.claude_channel.clone()).sweep(now)
    }
    /// Follows the receipts plugins can still move, before their 60-second
    /// taken-file cleanup, and lets settled ones go after `KEEP_MS`. A
    /// settled receipt is read once: later looks only see its file's time,
    /// and read it again only when it was written since. Explicit
    /// housekeeping, never a new collector.
    pub fn maintain(&self, now: SystemTime) -> Result<()> {
        let cutoff = millis(now).saturating_sub(KEEP_MS);
        let mut settled = self.settled.lock().unwrap_or_else(PoisonError::into_inner);
        let mut listed = HashSet::new();
        for entry in fs::read_dir(&self.paths.receipts)? {
            let entry = entry?;
            let file = entry.path();
            let Some(name) = owned_attempt(&file) else {
                continue;
            };
            let Ok(modified) = entry.metadata().and_then(|m| m.modified()) else {
                continue;
            };
            listed.insert(name.clone());
            let at_ms = match settled.get(&name) {
                Some((seen, at_ms)) if *seen == modified => *at_ms,
                _ => match self.follow_receipt(&file, now)? {
                    Some(at_ms) => at_ms,
                    None => continue,
                },
            };
            // The time from before the read: a write since then (this
            // refresh's own too) has the file read once more next time.
            if at_ms < cutoff && fs::remove_file(&file).is_ok() {
                settled.remove(&name);
            } else {
                settled.insert(name, (modified, at_ms));
            }
        }
        settled.retain(|name, _| listed.contains(name));
        drop(settled);
        self.sweep_plugin(now)
    }
    /// Refreshes the receipt in `file` if a plugin can still move it; when
    /// sent, if it is settled now.
    fn follow_receipt(&self, file: &Path, now: SystemTime) -> Result<Option<u64>> {
        let Some(attempt) = read_attempt(file)? else {
            return Ok(None);
        };
        if !maintained(&attempt.receipt) {
            return Ok(Some(attempt.receipt.at_ms));
        }
        let gate = self.gate(attempt.receipt.provider, &attempt.receipt.session_id);
        let _guard = gate.lock().unwrap_or_else(PoisonError::into_inner);
        let Some(latest) = read_attempt(file)? else {
            return Ok(None);
        };
        let receipt = self.refresh_receipt(latest, file, now)?;
        Ok((!maintained(&receipt)).then_some(receipt.at_ms))
    }
    pub(super) fn refresh_receipt(
        &self,
        mut attempt: Attempt,
        file: &Path,
        now: SystemTime,
    ) -> Result<Receipt> {
        if maintained(&attempt.receipt) {
            let (session, request) = (&attempt.receipt.session_id, &attempt.receipt.request_id);
            let read = match (attempt.receipt.provider, &self.deepseek) {
                (Provider::DeepSeek, Some(channel)) => channel.state(session, request, now)?,
                (Provider::DeepSeek, None) => None,
                _ => ClaudeChannel::new(self.paths.claude_channel.clone())
                    .state(session, request, now)?,
            };
            if let Some((state, reason)) = read {
                if attempt.receipt.state != state || attempt.receipt.reason != reason {
                    attempt.receipt.state = state;
                    attempt.receipt.reason = reason;
                    write_attempt(file, &attempt, false)?;
                }
            } else if millis(now).saturating_sub(attempt.receipt.at_ms) > 3_600_000 {
                attempt.receipt.state = DeliveryState::Expired;
                write_attempt(file, &attempt, false)?;
            }
        }
        Ok(attempt.receipt)
    }
    pub(super) fn attempt_path(&self, provider: Provider, session: &str, request: &str) -> PathBuf {
        self.paths.receipts.join(format!(
            "{}.json",
            digest(format!("{provider:?}\0{session}\0{request}").as_bytes())
        ))
    }
}

pub(super) fn digest(value: &[u8]) -> String {
    format!("{:x}", Sha256::digest(value))
}
pub(super) fn read_attempt(path: &Path) -> Result<Option<Attempt>> {
    match fs::read(path) {
        Ok(bytes) => serde_json::from_slice(&bytes)
            .map(Some)
            .map_err(|e| Failure::Protocol(e.to_string())),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.into()),
    }
}
pub(super) fn write_attempt(path: &Path, attempt: &Attempt, create: bool) -> Result<()> {
    if create {
        use std::io::Write;
        let mut file = host::new_file_options().open(path)?;
        file.write_all(
            &serde_json::to_vec(attempt).map_err(|e| Failure::Protocol(e.to_string()))?,
        )?;
        file.sync_all()?;
        Ok(())
    } else {
        atomic_json(path, attempt)
    }
}
/// Whether a plugin can still move this receipt, so maintenance follows it.
fn maintained(receipt: &Receipt) -> bool {
    matches!(receipt.provider, Provider::Claude | Provider::DeepSeek)
        && matches!(
            receipt.state,
            DeliveryState::Waiting
                | DeliveryState::Taken
                | DeliveryState::CancelRequested
                | DeliveryState::Uncertain
        )
}
/// The file's name when it is one of the journal's receipts.
fn owned_attempt(path: &Path) -> Option<String> {
    let name = path.file_name()?.to_str()?;
    let stem = name.strip_suffix(".json")?;
    (stem.len() == 64 && stem.bytes().all(|b| b.is_ascii_hexdigit()) && path.is_file())
        .then(|| name.to_owned())
}
