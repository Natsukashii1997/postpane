//! A session as the director reads it (src/packages/hud/src/bots/session-facts.ts).
use super::{coalesce, text, time, Facts, Request};
use crate::stale::is_stale;
use serde_json::Value;

/// Its phase and the requests it waits on: its log's and the mark's cards'.
/// One 「待核对」 (ADR-0001) is no call for the Bot to come looking: idle,
/// asking nothing, unless a card for it stands.
pub(super) fn of(session: &Value, cards: &[Request]) -> Facts {
    let id = text(&session["id"]);
    let live = session["liveFacts"].clone();
    let own_cards: Vec<&Request> = cards.iter().filter(|card| card.session_id == id).collect();
    let stale = own_cards.is_empty() && is_stale(session);
    let mut requests: Vec<Request> = live["requests"]
        .as_array()
        .into_iter()
        .flatten()
        .filter(|_| !stale)
        .map(|item| Request {
            id: text(&item["id"]),
            session_id: text(&item["sessionId"]),
            kind: text(&item["kind"]),
            at: time(&item["at"]).unwrap_or(0.0),
        })
        .collect();
    for card in own_cards {
        if !requests.iter().any(|item| item.id == card.id) {
            requests.push(card.clone());
        }
    }
    Facts {
        phase: if stale {
            "idle".into()
        } else {
            text(&session["state"])
        },
        observed_at: time(coalesce(&live["observedAt"], &session["updatedAt"])).unwrap_or(0.0),
        last_event_at: time(coalesce(&live["lastEventAt"], &session["updatedAt"])).unwrap_or(0.0),
        requests,
        id,
        live,
    }
}
