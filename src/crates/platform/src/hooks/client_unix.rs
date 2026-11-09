//! Whether a waiting permission hook still has a client to answer (#251): the
//! client settled the request in its own window, or the client that ran the
//! hook is gone. A client killed outright (`kill -9`, a crash) leaves its hook
//! waiting with no one to hand the answer to, and launchd takes the hook in,
//! so its parent changes. Ending the wait closes the socket, and PostPane
//! takes the card off the sidebar.
use super::super::transcript::Transcript;
use std::sync::OnceLock;

/// The process that ran this hook, as first seen while it waited.
static PARENT: OnceLock<i32> = OnceLock::new();

/// Whether the wait is over for the client: it settled the request itself,
/// or it is gone.
pub(super) fn ended(transcript: &mut Option<Transcript>) -> bool {
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
