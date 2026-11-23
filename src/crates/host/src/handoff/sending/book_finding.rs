//! A review's words never known to have gone in are looked for in their
//! conversation (#509, owner 2026-11-22). Till then nothing looked: the
//! round trip stopped on them, no other words went, and the same words sent
//! again were not sent (two handoffs stood so for a day). They begin with a
//! line naming their request, so the conversation's prompts tell: one so,
//! they went in, as word of them would have said, as that prompt (round 1
//! P1-02); none past the last prompt known to have gone in, and nothing
//! being written, they did not go, as when send was never pressed (#466).
//! Not told, they stay as they are.
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
    /// The reviews to look for now, each as its conversation, request and
    /// the last prompt of the handoff's known to have gone in (round 1
    /// P1-01: past it the history must reach for the words to be absent):
    /// unsure, unanswered, out `FIND_AFTER_MS`, and not looked for within
    /// `FIND_EVERY_MS`. They count as looked for.
    pub fn to_find(&mut self, now: i64) -> Vec<(String, String, Option<String>)> {
        let due = |handoff: &mut Handoff| {
            let conversation = handoff.chatgpt_conversation.clone()?;
            let after = handoff.steps.iter().rev().find_map(|s| s.asked_id.clone());
            let pending = handoff.gate.pending.as_mut().filter(|p| !p.answered)?;
            let (at, times) = pending.looked;
            let waited = now - asked_at(&pending.request)? >= FIND_AFTER_MS;
            let again = times == 0 || now - at >= FIND_EVERY_MS;
            (waited && again && times < FIND_MOST).then(|| {
                pending.looked = (now, times + 1);
                (conversation, pending.request.clone(), after)
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
    /// The review asked as `request` is in the conversation, as prompt
    /// `asked_id` when the page told it, and nothing kept in this run says
    /// what it was (a restart since): it went in, with the pull request,
    /// commit and cap kept with it, its words as they were kept, and the
    /// prompt an answer is held to by (#437, round 1 P1-02), as any words
    /// that went in. Whether the card changed.
    pub fn found_late(
        &mut self,
        id: &str,
        request: &str,
        asked_id: Option<&str>,
        now: i64,
    ) -> bool {
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
        let asked = self.asked(id, None, pending.words.as_deref().unwrap_or(""), now);
        self.asked_as(id, asked_id);
        asked
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

    // Round 2: the last prompt known to have gone in may be PostPane's ask
    // to mend the last lines; it went before the review looked for, which
    // is asked only after the answer it mended.
    #[test]
    fn a_look_past_a_mending_names_its_prompt() {
        let mut book = Book::default();
        let handoff = book.begin("s1", None, "修登录", None, "请审核", 1);
        book.opened(&handoff.id, "c1", 2);
        book.asked_as(&handoff.id, Some("p1"));
        book.replied("c1", "意见", Some("m1"), 3);
        assert!(book.format_asked(&handoff.id, "请补末尾四行", 4));
        assert!(book.asked_as(&handoff.id, Some("p2")));
        book.replied("c1", "意见（补了末尾）", Some("m2"), 5);
        let request = format!("{}~send6", handoff.id);
        let pending = Pending {
            request: request.clone(),
            ..Pending::default()
        };
        assert!(book.ask_pending(&handoff.id, pending));
        let due = book.to_find(6 + FIND_AFTER_MS);
        assert_eq!(due, [("c1".to_owned(), request, Some("p2".to_owned()))]);
    }

    #[test]
    fn a_request_names_when_its_words_went_out() {
        assert_eq!(asked_at("h1a2~send1795233002405"), Some(1795233002405));
        assert_eq!(asked_at("h1a2~format1795233002405"), None);
        assert_eq!(asked_at("pp-1-2"), None);
    }
}
