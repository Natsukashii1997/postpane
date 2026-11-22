//! A review's words never known to have gone in are looked for in their
//! conversation (#509, owner 2026-11-22). Till then nothing looked: the
//! round trip stopped on them, no other words went, and the same words sent
//! again were not sent (two handoffs stood so for a day). They begin with a
//! line naming their request, so the conversation's newest prompt tells:
//! there, they went in, as word of them would have said; another prompt and
//! nothing being written, they did not go, as when send was never pressed
//! (#466). Not told, they stay as they are.
//!
//! Only a review's: PostPane's own ask to mend is not looked for.
use super::{Book, Handoff, Pending};

/// How long after words went out they are first looked for: past the wait
/// for word of them (`SEND_TIME`, 30 s), and the extension's own time to
/// press send.
pub const FIND_AFTER_MS: i64 = 40 * 1000;
/// How long between two looks for the same words.
pub const FIND_EVERY_MS: i64 = 2 * 60 * 1000;
/// How often the same words are looked for in a run: an hour of looks.
const FIND_MOST: u32 = 30;

/// When the words asked as `request` went out: its request names the time.
fn asked_at(request: &str) -> Option<i64> {
    request.rsplit_once("~send")?.1.parse().ok()
}

impl Handoff {
    /// The review asked as `request`, never known to have gone in and not
    /// answered.
    fn unsure_of(&self, request: &str) -> Option<&Pending> {
        let pending = self.gate.pending.as_ref()?;
        (pending.request == request && !pending.answered).then_some(pending)
    }
}

impl Book {
    /// The reviews to look for now, each as its conversation and request:
    /// unsure, unanswered, out `FIND_AFTER_MS`, and not looked for within
    /// `FIND_EVERY_MS`. They count as looked for.
    pub fn to_find(&mut self, now: i64) -> Vec<(String, String)> {
        let due = |handoff: &mut Handoff| {
            let conversation = handoff.chatgpt_conversation.clone()?;
            let pending = handoff.gate.pending.as_mut().filter(|p| !p.answered)?;
            let (at, times) = pending.looked;
            let waited = now - asked_at(&pending.request)? >= FIND_AFTER_MS;
            let again = times == 0 || now - at >= FIND_EVERY_MS;
            (waited && again && times < FIND_MOST).then(|| {
                pending.looked = (now, times + 1);
                (conversation, pending.request.clone())
            })
        };
        self.list
            .iter_mut()
            .filter(|handoff| handoff.live())
            .filter_map(due)
            .collect()
    }
    /// Whether `request` is a review of `id`'s, in `conversation`, still
    /// unsure and unanswered: what a look for it may change.
    pub fn looked_for(&self, id: &str, conversation: &str, request: &str) -> bool {
        self.get(id).is_some_and(|handoff| {
            handoff.live()
                && handoff.chatgpt_conversation.as_deref() == Some(conversation)
                && handoff.unsure_of(request).is_some()
        })
    }
    /// The review asked as `request` is in the conversation, and nothing
    /// kept in this run says what it was (a restart since): it went in, with
    /// the pull request, commit and cap kept with it, and its words as they
    /// were kept. Whether the card changed.
    pub fn found_late(&mut self, id: &str, request: &str, now: i64) -> bool {
        let Some(pending) = self
            .live_mut(id)
            .and_then(|handoff| handoff.unsure_of(request).cloned())
        else {
            return false;
        };
        self.confirm_pending(id, request);
        self.set_limit(id, pending.limit);
        self.set_head(id, pending.head.as_deref());
        if let Some(pr) = &pending.pr {
            self.set_pr(id, pr);
        }
        self.asked(id, None, pending.words.as_deref().unwrap_or(""), now)
    }
    /// The review asked as `request` is not in the conversation: it did not
    /// go (`not_sent`), `note` on the card, and the round trip that stopped
    /// on it goes on once nothing else is unsure.
    pub fn found_absent(&mut self, id: &str, request: &str, note: &str, now: i64) -> bool {
        if !self.not_sent(id, request, note, now) {
            return false;
        }
        if let Some(handoff) = self.live_mut(id).filter(|handoff| !handoff.unsure()) {
            handoff.resume_for_ask(now);
        }
        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_request_names_when_its_words_went_out() {
        assert_eq!(asked_at("h1a2~send1795233002405"), Some(1795233002405));
        assert_eq!(asked_at("h1a2~format1795233002405"), None);
        assert_eq!(asked_at("pp-1-2"), None);
    }
}
