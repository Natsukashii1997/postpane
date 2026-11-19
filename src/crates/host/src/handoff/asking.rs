//! Words on their way into a review conversation (`Asking`), booked once
//! they went in, with the prompt ChatGPT shows them as (#410).
use super::{Asking, Desk};
use std::collections::HashMap;
use std::sync::MutexGuard;

impl Desk {
    pub(super) fn asking(&self) -> MutexGuard<'_, HashMap<String, Asking>> {
        self.asking.lock().unwrap_or_else(|p| p.into_inner())
    }
    /// Words asked as `request` went into ChatGPT (as prompt `asked_id`,
    /// #410): into the book once, whichever of `ask` and the extension's
    /// late word comes first.
    pub(super) fn went_in(&self, request: &str, now: i64, asked_id: Option<&str>) -> bool {
        let id = request.rsplit_once('~').map_or("", |(id, _)| id);
        let asking = {
            let mut asking = self.asking();
            if !asking.get(id).is_some_and(|a| a.request == request) {
                drop(asking);
                // No review asked in this run. A mending's word (#446):
                // late, and before its answer, it went in all the same.
                // Else (a restart since) word after its answer still goes
                // on the card (round 4 P2-16).
                let mended = super::guard::mending_confirmed_late();
                return self.change(|book| match book.mending_heard(id, request, &mended, now) {
                    Some(changed) => book.asked_as(id, asked_id) || changed,
                    None => book.confirmed_late(id, request, &super::guard::confirmed_late(), now),
                });
            }
            asking.remove(id)
        };
        let Some(asking) = asking else {
            return false;
        };
        self.change(|book| {
            // After its answer: only goes on the card (L3 P1-12).
            if book.confirmed_late(id, request, &super::guard::confirmed_late(), now) {
                return true;
            }
            book.confirm_pending(id, request);
            asking.anchor.set(book, id);
            // Taken words turn a self-stopped round trip on again (#410),
            // evidence paused for among them; `evidence_in` is left the rest.
            let asked = book.asked(id, asking.summary.as_deref(), &asking.brief, now);
            book.asked_as(id, asked_id);
            if asking.evidence {
                book.evidence_in(id, now);
            }
            asked
        })
    }
}
