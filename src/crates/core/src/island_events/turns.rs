//! A session's turn that ended: told once, as news, when it ended after the
//! app started and no later than now. A finished turn is a reply
//! (`completion`); a failed or limited one is told by `failures`.
use super::*;

/// A turn that ended, as its session's `liveFacts` says: when, how
/// (`outcome`), its key (`source:session:turn`), and the session.
pub(super) struct Ended<'a> {
    pub at: i64,
    pub outcome: &'a str,
    pub key: String,
    pub session: &'a Value,
}

/// The sessions' ended turns whose outcome is one of `outcomes`, oldest first.
pub(super) fn ended<'a>(sessions: &'a [Value], outcomes: &[&str]) -> Vec<Ended<'a>> {
    let mut turns = sessions
        .iter()
        .filter_map(|session| {
            let facts = &session["liveFacts"];
            let outcome = facts["outcome"].as_str().filter(|o| outcomes.contains(o))?;
            let at = date(&facts["endedAt"])?;
            let turn = facts["turnId"].as_str()?;
            let source = session["source"].as_str()?;
            let id = session["id"].as_str()?;
            Some(Ended {
                at,
                outcome,
                key: format!("{source}:{id}:{turn}"),
                session,
            })
        })
        .collect::<Vec<_>>();
    turns.sort_by(|a, b| (a.at, &a.key).cmp(&(b.at, &b.key)));
    turns
}

impl Tracker {
    /// Whether a turn ended at `at` is news now: after the app started, not
    /// in the future, and not told before under `key`.
    pub(super) fn fresh(&mut self, key: &str, at: i64, now: i64) -> bool {
        at > self.started && at <= now && self.seen.insert(key.into(), at).is_none()
    }

    /// Each finished turn, told once as a reply.
    pub(super) fn completions(&mut self, sessions: &[Value], now: i64) {
        for Ended {
            at, key, session, ..
        } in ended(sessions, &["completed"])
        {
            if !self.fresh(&key, at, now) {
                continue;
            }
            let facts = &session["liveFacts"];
            self.push(&key,json!({"kind":"completion","at":iso(at),"startedAt":facts["turnStartedAt"],"source":session["source"],"sessionId":session["id"],"turnId":facts["turnId"],"title":session["title"],"model":session["model"],"message":facts["message"],"prompt":facts["prompt"],"navigationTarget":session["navigationTarget"],"cwd":session["cwd"],"logPath":session["logPath"]}));
        }
    }
}
