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

    /// Each finished turn, told once as a reply. An ending whose turn was
    /// not known (`turnKnown: false`) borrows the log's turn, which can be an
    /// older one already told, or change as the log catches up, while the
    /// ending's time stays the Stop's: that ending is told by its own time,
    /// once, and each name it borrows counts as told, so the log ending the
    /// turn itself later is not told again (postpane#560 P2-02). Other endings
    /// go by their turn alone: two turns can end within one second of a log
    /// without fractions.
    pub(super) fn completions(&mut self, sessions: &[Value], now: i64) {
        for Ended {
            at, key, session, ..
        } in ended(sessions, &["completed"])
        {
            let fresh = if session["liveFacts"]["turnKnown"] == false {
                let ending = format!(
                    "{}:{}@ended:{at}",
                    session["source"].as_str().unwrap_or(""),
                    session["id"].as_str().unwrap_or("")
                );
                let fresh = self.fresh(&ending, at, now);
                self.seen.entry(key.clone()).or_insert(at);
                fresh
            } else {
                self.fresh(&key, at, now)
            };
            if !fresh || stands_as_card(session) {
                continue;
            }
            let facts = &session["liveFacts"];
            self.push(&key,json!({"kind":"completion","at":iso(at),"startedAt":facts["turnStartedAt"],"source":session["source"],"sessionId":session["id"],"turnId":facts["turnId"],"title":session["title"],"model":session["model"],"message":facts["message"],"prompt":facts["prompt"],"navigationTarget":session["navigationTarget"],"cwd":session["cwd"],"logPath":session["logPath"]}));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::hook_events::HookEvidence;
    use agent_hud_agents::HookEvent;

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

    /// An Antigravity Stop that could not tell its turn takes the log's,
    /// and a log that catches up later names it again: one reply is told
    /// for that one ending, not one per name (postpane#560 P2-02, round 2).
    #[test]
    fn a_completion_renamed_by_a_log_that_caught_up_is_told_once() {
        let mut tracker = Tracker::new();
        let at = tracker.started + 10_000;
        let mut evidence = HookEvidence::default();
        let stop = HookEvent {
            source: "antigravity".into(),
            session_id: "antigravity:a1".into(),
            kind: "completion".into(),
            at_ms: at,
            data: json!({"turnId":"stop-1","turnKnown":false,"message":"好了"}),
        };
        assert!(evidence.ingest(&[stop], at));
        let look = |tracker: &mut Tracker, turn: &str, started: i64, now: i64| {
            let mut session = json!({"source":"antigravity","id":"antigravity:a1","state":"running",
                "updatedAt":iso(started),"liveFacts":{"turnId":turn,"turnStartedAt":iso(started),"lastEventAt":iso(started)}});
            evidence.overlay(&mut session, now, None, None);
            assert_eq!(
                session["liveFacts"]["turnId"], turn,
                "the log's turn stands"
            );
            tracker.update(&[session], &[], &[], &[], now);
            tracker
                .events
                .iter()
                .filter(|event| event["kind"] == "completion")
                .count()
        };
        // The log still shows the turn before; then it reads the new prompt,
        // its last line still older than the Stop.
        assert_eq!(look(&mut tracker, "step-0", at - 9_000, at + 1_000), 1);
        assert_eq!(look(&mut tracker, "step-2", at - 2_000, at + 2_000), 1);
        // The log then ends step-2 itself, later: that name was told already.
        let logged = json!({"source":"antigravity","id":"antigravity:a1","liveFacts":{"turnId":"step-2",
            "outcome":"completed","endedAt":iso(at + 3_000)}});
        tracker.update(&[logged], &[], &[], &[], at + 4_000);
        let told = tracker.events.iter().filter(|e| e["kind"] == "completion");
        assert_eq!(told.count(), 1);
    }

    fn replies(tracker: &Tracker) -> usize {
        tracker
            .events
            .iter()
            .filter(|event| event["kind"] == "completion")
            .count()
    }

    fn unknown_stop(at: i64) -> HookEvidence {
        let mut evidence = HookEvidence::default();
        let stop = HookEvent {
            source: "antigravity".into(),
            session_id: "antigravity:a1".into(),
            kind: "completion".into(),
            at_ms: at,
            data: json!({"turnId":format!("stop-{at}"),"turnKnown":false,"message":"好了"}),
        };
        assert!(evidence.ingest(&[stop], at));
        evidence
    }

    fn look(
        evidence: &HookEvidence,
        tracker: &mut Tracker,
        turn: Value,
        started: i64,
        now: i64,
    ) -> Value {
        let mut session = json!({"source":"antigravity","id":"antigravity:a1","state":"running",
            "updatedAt":iso(started),"liveFacts":{"turnId":turn,"turnStartedAt":iso(started),"lastEventAt":iso(started)}});
        evidence.overlay(&mut session, now, None, None);
        tracker.update(&[session.clone()], &[], &[], &[], now);
        session["liveFacts"]["turnId"].clone()
    }

    /// The log's turn was told before; a new turn ends while the log still
    /// shows the old one: the new ending is told, by its own time, once
    /// (postpane#560 P2-02, round 4).
    #[test]
    fn a_new_ending_borrowing_a_turn_told_before_is_still_told_once() {
        let mut tracker = Tracker::new();
        let at = tracker.started + 20_000;
        let before = json!({"source":"antigravity","id":"antigravity:a1","liveFacts":{"turnId":"step-0",
            "outcome":"completed","endedAt":iso(at - 10_000)}});
        tracker.update(&[before], &[], &[], &[], at - 9_000);
        assert_eq!(replies(&tracker), 1, "step-0 told on its own");
        let evidence = unknown_stop(at);
        assert_eq!(
            look(
                &evidence,
                &mut tracker,
                json!("step-0"),
                at - 12_000,
                at + 1_000
            ),
            "step-0"
        );
        assert_eq!(
            replies(&tracker),
            2,
            "the new ending is told though it borrows step-0"
        );
        assert_eq!(
            look(
                &evidence,
                &mut tracker,
                json!("step-2"),
                at - 2_000,
                at + 2_000
            ),
            "step-2"
        );
        assert_eq!(replies(&tracker), 2, "and not again once the log names it");
    }

    /// A Stop that could not tell its turn, before the log names any: it
    /// keeps its own id for now and is still marked unknown, so the log
    /// naming the turn later does not tell it again (postpane#560 P2-02,
    /// round 4).
    #[test]
    fn an_unknown_ending_before_the_log_names_a_turn_is_told_once() {
        let mut tracker = Tracker::new();
        let at = tracker.started + 20_000;
        let evidence = unknown_stop(at);
        let own = format!("stop-{at}");
        assert_eq!(
            look(&evidence, &mut tracker, Value::Null, at - 3_000, at + 1_000),
            json!(own)
        );
        assert_eq!(replies(&tracker), 1);
        assert_eq!(
            look(
                &evidence,
                &mut tracker,
                json!("step-2"),
                at - 2_000,
                at + 2_000
            ),
            "step-2"
        );
        assert_eq!(replies(&tracker), 1);
    }

    /// Two turns of one session that ended within one second, from a log
    /// whose times have no fraction of a second, are two replies: only an
    /// ending whose turn was not known is told once by its time
    /// (postpane#560 P2-02, round 3).
    #[test]
    fn two_turns_ending_in_the_same_second_are_both_told() {
        let mut tracker = Tracker::new();
        let at = (tracker.started / 1_000 + 10) * 1_000;
        let session = |turn: &str| {
            json!({"source":"claude","id":"s1","title":"t","liveFacts":{"turnId":turn,
                "outcome":"completed","endedAt":iso(at),"turnStartedAt":iso(at - 5_000)}})
        };
        tracker.update(&[session("turn-a")], &[], &[], &[], at + 1_000);
        tracker.update(&[session("turn-b")], &[], &[], &[], at + 2_000);
        let told = tracker
            .events
            .iter()
            .filter(|event| event["kind"] == "completion")
            .map(|event| event["turnId"].clone())
            .collect::<Vec<_>>();
        assert_eq!(told, [json!("turn-a"), json!("turn-b")]);
    }
}
