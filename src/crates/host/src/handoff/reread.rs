//! Reading a quiet review conversation again (#356): the extension tells a
//! finished turn once, and a word lost on the way (its script cut off by a
//! reload, the app restarting) left the answer in ChatGPT and the handoff
//! waiting. When ChatGPT has had the words a while with no word back, the
//! extension is asked to tell the newest reply again; a reply already taken
//! counts once by its message id (`Book::replied`), and one from before the
//! newest words is not told (the extension's `answered`).
use super::{Desk, Lines, Phase};

/// How long ChatGPT may be quiet on words it has before its conversation is
/// read again: a whole answer, once a word of it was lost.
pub(super) const QUIET_MS: i64 = 3 * 60 * 1000;
/// How long between two reads of the same handoff's conversation.
pub(super) const AGAIN_MS: i64 = 2 * 60 * 1000;
/// How soon a read the channel could not pass on is tried again: the
/// extension may be back at once, and the refresh comes every second.
pub(super) const RETRY_MS: i64 = 15 * 1000;

impl Desk {
    /// Asks the extension to read again each live handoff that has waited on
    /// ChatGPT (delivered or answering) `QUIET_MS` since its phase began,
    /// at most every `AGAIN_MS`. A restart reads them at once: the phase
    /// began before it. How many were asked.
    pub(crate) fn reread(&self, lines: &dyn Lines, now: i64) -> usize {
        if !lines.connected() {
            return 0;
        }
        let quiet = self
            .lock()
            .list
            .iter()
            .filter(|h| h.live() && matches!(h.phase, Phase::Delivered | Phase::Working))
            .filter(|h| now - h.phase_at >= QUIET_MS)
            .filter_map(|h| Some((h.id.clone(), h.chatgpt_conversation.clone()?)))
            .collect::<Vec<_>>();
        let mut asked = self.reread_at.lock().unwrap_or_else(|p| p.into_inner());
        asked.retain(|id, _| quiet.iter().any(|(quiet, _)| quiet == id));
        let mut count = 0;
        for (id, conversation) in quiet {
            if asked.get(&id).is_some_and(|at| now - at < AGAIN_MS) {
                continue;
            }
            // Passed on, it waits its two minutes; not, it is tried again
            // after `RETRY_MS` (counted as if asked that much earlier).
            if let Err(error) = lines.reread(&conversation) {
                eprintln!("{error}");
                asked.insert(id, now - AGAIN_MS + RETRY_MS);
                continue;
            }
            asked.insert(id, now);
            count += 1;
        }
        count
    }
}
