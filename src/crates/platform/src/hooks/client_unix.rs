//! Whether a waiting permission hook still has a client to answer (#251): the
//! client settled the request in its own window, or the client that ran the
//! hook is gone. A client killed outright (`kill -9`, a crash) leaves its hook
//! waiting with no one to hand the answer to, and launchd takes the hook in,
//! so its parent changes. Ending the wait closes the socket, and PostPane
//! takes the card off the sidebar. A Codex request whose turn ended is
//! declined instead, so the call never runs late (#286).
use super::super::transcript::Transcript;
use serde_json::Value;
use std::sync::OnceLock;

#[path = "turn_end.rs"]
mod turn_end;

/// The process that ran this hook, as first seen while it waited.
static PARENT: OnceLock<i32> = OnceLock::new();

/// What a waiting hook follows besides PostPane's answer.
pub(super) struct Watch {
    transcript: Option<Transcript>,
    turn: Option<turn_end::TurnEnd>,
    source: String,
    payload: Value,
}

impl Watch {
    pub fn new(source: &str, payload: &Value) -> Self {
        Self {
            transcript: super::super::settles_in_transcript(source)
                .then(|| Transcript::new(payload))
                .flatten(),
            turn: turn_end::TurnEnd::new(source, payload),
            source: source.to_owned(),
            payload: payload.clone(),
        }
    }

    /// None while the client still waits; once it does not, what to hand it:
    /// nothing when it settled the request itself, is gone or `until` passed,
    /// a decline when the turn that asked has ended.
    pub fn ended(&mut self, until: std::time::Instant) -> Option<Option<Value>> {
        if self.turn.as_mut().is_some_and(|turn| turn.ended()) {
            return Some(turn_end::declined(&self.source, &self.payload));
        }
        (ended(&mut self.transcript) || std::time::Instant::now() >= until).then_some(None)
    }
}

/// Whether the wait is over for the client: it settled the request itself,
/// or it is gone.
fn ended(transcript: &mut Option<Transcript>) -> bool {
    transcript.as_mut().is_some_and(|watch| watch.settled()) || parent_gone()
}

fn parent_gone() -> bool {
    // SAFETY: getppid has no preconditions and cannot fail.
    let now = unsafe { libc::getppid() };
    left(*PARENT.get_or_init(|| now), now)
}

/// Whether the parent first seen has left: the hook now belongs to another
/// process, or it had already been handed to launchd (pid 1) when first seen.
fn left(first: i32, now: i32) -> bool {
    first <= 1 || now != first
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_hook_whose_client_went_away_stops_waiting() {
        // Its client still runs it.
        assert!(!left(41107, 41107));
        // The client was killed and launchd took the hook in.
        assert!(left(41107, 1));
        // Its client was already gone when the hook first looked.
        assert!(left(1, 1));
    }

    #[test]
    fn a_hook_whose_client_runs_keeps_waiting() {
        let mut none = None;
        assert!(
            !ended(&mut none),
            "the test runner is this hook's live parent"
        );
        assert!(!ended(&mut none), "and still is on the next look");
    }
}
