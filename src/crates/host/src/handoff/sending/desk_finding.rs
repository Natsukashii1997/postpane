//! Looking for a review's words never known to have gone in (#509): the
//! extension loads the conversation's tab again and reads its newest prompt
//! (`find`), and what it found is booked (`book_finding.rs`).
use super::super::{guard, Desk, Lines};
use serde_json::Value;

impl Desk {
    /// Asks the extension to look for each review due a look.
    pub(in crate::handoff) fn find_unsure(&self, lines: &dyn Lines, now: i64) {
        let due = self.lock().to_find(now);
        for (conversation, request) in due {
            if let Err(error) = lines.find(&conversation, &request) {
                agent_hud_runtime::note!("{error}");
            }
        }
    }
    /// The extension looked for the words asked as `request`. There, they
    /// went in: as word of them in this run makes it (`went_in`), or from
    /// what was kept with them. Absent, they did not go: the handoff is as
    /// before they were asked, the words kept to send are dropped, and the
    /// same words may go again. Not told, nothing changes. Whether the card
    /// changed.
    pub(in crate::handoff) fn heard_found(&self, message: &Value, now: i64) -> bool {
        let text = |key: &str| message[key].as_str().unwrap_or("");
        let (conversation, request) = (text("conversation"), text("request"));
        let id = request.rsplit_once('~').map_or("", |(id, _)| id);
        if !self.lock().looked_for(id, conversation, request) {
            return false;
        }
        match text("outcome") {
            "there" => {
                self.went_in(request, now, None)
                    || self.change(|book| book.found_late(id, request, now))
            }
            "absent" => {
                self.asking().retain(|_, asking| asking.request != request);
                self.change(|book| book.found_absent(id, request, &guard::found_absent(), now))
            }
            _ => false,
        }
    }
}
