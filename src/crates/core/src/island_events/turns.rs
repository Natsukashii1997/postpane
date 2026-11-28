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
/// A subagent (a session with a parent) is not a task of its own: its parent
/// tells how the work went, so the sidebar shows one line per task session.
pub(super) fn ended<'a>(sessions: &'a [Value], outcomes: &[&str]) -> Vec<Ended<'a>> {
    let mut turns = sessions
        .iter()
        .filter(|session| session["parentId"].is_null())
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

/// Whether a Claude turn that ended stands on the sidebar as a card already:
/// a next-step box of its own, or a reply whose closing waits on the owner
/// (#562). Its card is the news; a reply beside it would tell it twice.
fn stands_as_card(session: &Value) -> bool {
    use agent_hud_agents::transcript::closing::{asks_owner, closing};
    let facts = &session["liveFacts"];
    session["source"] == agent_hud_agents::claude::AGENT.id
        && (facts["requests"]
            .as_array()
            .is_some_and(|asks| asks.iter().any(|ask| ask["kind"] == "question"))
            || facts["message"]
                .as_str()
                .and_then(closing)
                .is_some_and(|c| asks_owner(&c.status) && !c.next.is_empty()))
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
            let facts = &session["liveFacts"];
            if !self.fresh(&key, at, now) || stands_as_card(session) {
                continue;
            }
            self.push(&key,json!({"kind":"completion","at":iso(at),"startedAt":facts["turnStartedAt"],"source":session["source"],"sessionId":session["id"],"turnId":facts["turnId"],"title":session["title"],"model":session["model"],"message":facts["message"],"prompt":facts["prompt"],"navigationTarget":session["navigationTarget"],"cwd":session["cwd"],"logPath":session["logPath"]}));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ended(source: &str, id: &str, message: &str, requests: Value, at: i64) -> Value {
        json!({"id": id, "source": source, "title": id, "liveFacts": {"turnId": "t1", "outcome": "completed",
            "endedAt": iso(at), "message": message, "requests": requests}})
    }

    #[test]
    fn a_claude_turn_that_stands_as_a_card_is_not_told_again_as_a_reply() {
        let mut tracker = Tracker::new();
        let at = tracker.started + 1_000;
        let waits = "**本次完成**：改好。\n**当前状态**：〔等你决定〕差装机。\n**下一步**：回「装机合并」。";
        let done =
            "**本次完成**：改好。\n**当前状态**：〔已结束〕全做完。\n**下一步**：本任务已结束。";
        let sessions = [
            ended("claude", "waits", waits, json!([]), at),
            ended("claude", "boxed", done, json!([{"kind": "question"}]), at),
            ended("claude", "done", done, json!([]), at),
            ended("codex", "codex", waits, json!([]), at),
        ];
        tracker.completions(&sessions, at + 1_000);
        let told = tracker
            .events
            .iter()
            .map(|e| e["sessionId"].as_str().unwrap().to_owned())
            .collect::<Vec<_>>();
        assert_eq!(told, ["done", "codex"]);
    }
    fn turn(id: &str, parent: Option<&str>, outcome: &str, at: i64) -> Value {
        json!({"id":id,"parentId":parent,"source":"claude","title":"盲测执行","liveFacts":{"turnId":"t1","outcome":outcome,"endedAt":iso(at)}})
    }
    fn told(tracker: &mut Tracker, sessions: &[Value], now: i64) -> Vec<Value> {
        tracker.update(sessions, &[], &[], &[], now)["items"]
            .as_array()
            .unwrap()
            .iter()
            .filter(|event| event["kind"] == "completion" || event["kind"] == "turn-failed")
            .cloned()
            .collect()
    }

    #[test]
    fn a_subagent_that_answers_or_fails_is_not_a_line_of_its_own() {
        let mut tracker = Tracker::new();
        let at = tracker.started + 1_000;
        let sessions = [
            turn("parent", None, "completed", at),
            turn("agent-a1", Some("parent"), "completed", at),
            turn("agent-a2", Some("parent"), "completed", at + 1),
            turn("agent-a3", Some("parent"), "failed", at + 2),
        ];
        let events = told(&mut tracker, &sessions, at + 5);
        let ids = events
            .iter()
            .map(|e| e["sessionId"].as_str().unwrap())
            .collect::<Vec<_>>();
        assert_eq!(ids, ["parent"]);
        assert_eq!(events[0]["kind"], "completion");
    }
}
