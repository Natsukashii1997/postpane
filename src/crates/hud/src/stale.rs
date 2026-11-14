//! 「待核对」 (ADR-0001): a session waiting on requests its log still holds
//! open but has heard nothing of for half an hour. Ported from
//! src/packages/hud/src/stale.ts.
use serde_json::Value;

/// Waiting, and every request it waits on is stale. A request card from a
/// hook is evidence enough, so the callers that know of cards check them.
pub fn is_stale(session: &Value) -> bool {
    let requests = session["liveFacts"]["requests"].as_array();
    session["state"] == "waiting"
        && requests.is_some_and(|requests| {
            !requests.is_empty() && requests.iter().all(|request| request["stale"] == true)
        })
}

/// Running, or waiting on a request not 「待核对」: work in flight.
pub fn busy(session: &Value) -> bool {
    session["state"] == "running" || (session["state"] == "waiting" && !is_stale(session))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn waiting(stale: &[bool]) -> Value {
        let requests: Vec<Value> = stale
            .iter()
            .map(|stale| json!({"id": "r", "kind": "question", "stale": stale}))
            .collect();
        json!({"state": "waiting", "liveFacts": {"requests": requests}})
    }

    #[test]
    fn a_session_is_stale_only_when_every_request_it_waits_on_is() {
        assert!(is_stale(&waiting(&[true])));
        assert!(!is_stale(&waiting(&[true, false])));
        assert!(!is_stale(&waiting(&[])));
        assert!(!is_stale(
            &json!({"state": "running", "liveFacts": {"requests": [{"stale": true}]}})
        ));
        assert!(!busy(&waiting(&[true])));
        assert!(busy(&waiting(&[false])));
        assert!(busy(&json!({"state": "running"})));
        assert!(!busy(&json!({"state": "idle"})));
    }
}
