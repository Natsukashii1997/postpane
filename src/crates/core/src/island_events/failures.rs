//! A turn that failed or hit a limit, told once as news for its own
//! receipt in the sidebar (#359, ADR-0001 C6; owner chose 甲, 2026-11-14):
//! one line per source, session and kind of failure, with how many turns
//! in a row it failed. A turn the person interrupted is not a failure.
use super::turns::{ended, Ended};
use super::*;

impl Tracker {
    /// Each failed or limited turn, told once (`turn-failed`), its count
    /// the turns in a row its session failed so; a finished turn starts the
    /// session's count again.
    pub(super) fn failures(&mut self, sessions: &[Value], now: i64) {
        let turns = ended(sessions, &["completed", "failed", "limited"]);
        for Ended {
            at,
            outcome,
            key,
            session,
        } in turns
        {
            let (source, id) = (&session["source"], &session["id"]);
            let line = format!(
                "{}:{}:",
                source.as_str().unwrap_or(""),
                id.as_str().unwrap_or("")
            );
            if outcome == "completed" {
                self.failures.retain(|each, _| !each.starts_with(&line));
                continue;
            }
            // Apart from the replies' keys: a turn is one or the other.
            if !self.fresh(&format!("{key}:{outcome}"), at, now) {
                continue;
            }
            let count = self.failures.entry(format!("{line}{outcome}")).or_insert(0);
            *count += 1;
            let count = *count;
            let facts = &session["liveFacts"];
            self.push(&format!("{key}:{outcome}"),json!({"kind":"turn-failed","failure":outcome,"at":iso(at),"source":source,"sessionId":id,"turnId":facts["turnId"],"title":session["title"],"model":session["model"],"navigationTarget":session["navigationTarget"],"cwd":session["cwd"],"logPath":session["logPath"],"limitedUntil":facts["limitedUntil"],"count":count}));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn turn(id: &str, turn: &str, outcome: &str, at: i64, until: Option<i64>) -> Value {
        json!({"id":id,"source":"claude","title":"批量改测试","model":"claude-opus","cwd":"/work","logPath":null,"navigationTarget":{"kind":"terminal"},"liveFacts":{"turnId":turn,"turnStartedAt":null,"outcome":outcome,"endedAt":iso(at),"limitedUntil":until.map(iso).unwrap_or(Value::Null)}})
    }
    fn failures(tracker: &mut Tracker, sessions: &[Value], now: i64) -> Vec<Value> {
        tracker.update(sessions, &[], &[], &[], now)["items"]
            .as_array()
            .unwrap()
            .iter()
            .filter(|event| event["kind"] == "turn-failed")
            .cloned()
            .collect()
    }

    #[test]
    fn a_failed_turn_is_told_once_with_what_the_receipt_needs() {
        let mut tracker = Tracker::new();
        let at = tracker.started + 1_000;
        let told = failures(
            &mut tracker,
            &[turn("s1", "t1", "failed", at, None)],
            at + 5,
        );
        assert_eq!(told.len(), 1);
        let event = &told[0];
        assert_eq!(event["failure"], "failed");
        assert_eq!(event["source"], "claude");
        assert_eq!(event["sessionId"], "s1");
        assert_eq!(event["turnId"], "t1");
        assert_eq!(event["title"], "批量改测试");
        assert_eq!(event["model"], "claude-opus");
        assert_eq!(event["cwd"], "/work");
        assert_eq!(event["navigationTarget"]["kind"], "terminal");
        assert_eq!(event["at"], iso(at));
        assert_eq!(event["count"], 1);
        assert!(event["limitedUntil"].is_null());
        assert!(event["id"].as_str().unwrap().starts_with("event:"));
        // The same turn on the next look is not told again.
        let again = failures(
            &mut tracker,
            &[turn("s1", "t1", "failed", at, None)],
            at + 6,
        );
        assert_eq!(again.len(), 1);
    }

    #[test]
    fn a_limited_turn_says_until_when() {
        let mut tracker = Tracker::new();
        let at = tracker.started + 1_000;
        let until = at + 3_600_000;
        let told = failures(
            &mut tracker,
            &[turn("s1", "t1", "limited", at, Some(until))],
            at + 5,
        );
        assert_eq!(told.len(), 1);
        assert_eq!(told[0]["failure"], "limited");
        assert_eq!(told[0]["limitedUntil"], iso(until));
    }

    #[test]
    fn failing_again_counts_up_and_a_finished_turn_starts_over() {
        let mut tracker = Tracker::new();
        let at = tracker.started + 1_000;
        let counts = |events: &[Value]| -> Vec<u64> {
            events
                .iter()
                .map(|e| e["count"].as_u64().unwrap())
                .collect()
        };
        failures(
            &mut tracker,
            &[turn("s1", "t1", "failed", at, None)],
            at + 1,
        );
        let told = failures(
            &mut tracker,
            &[turn("s1", "t2", "failed", at + 10, None)],
            at + 11,
        );
        assert_eq!(counts(&told), vec![1, 2]);
        // Another kind of failure in the same session counts apart.
        let told = failures(
            &mut tracker,
            &[turn("s1", "t3", "limited", at + 20, Some(at + 9_000_000))],
            at + 21,
        );
        assert_eq!(counts(&told), vec![1, 2, 1]);
        // An interrupted turn is not a failure and keeps the count.
        let told = failures(
            &mut tracker,
            &[turn("s1", "t4", "interrupted", at + 30, None)],
            at + 31,
        );
        assert_eq!(told.len(), 3);
        let told = failures(
            &mut tracker,
            &[turn("s1", "t5", "failed", at + 40, None)],
            at + 41,
        );
        assert_eq!(counts(&told), vec![1, 2, 1, 3]);
        // A finished turn starts the session over.
        failures(
            &mut tracker,
            &[turn("s1", "t6", "completed", at + 50, None)],
            at + 51,
        );
        let told = failures(
            &mut tracker,
            &[turn("s1", "t7", "failed", at + 60, None)],
            at + 61,
        );
        assert_eq!(counts(&told), vec![1, 2, 1, 3, 1]);
        // Another session counts apart.
        let told = failures(
            &mut tracker,
            &[turn("s2", "t1", "failed", at + 70, None)],
            at + 71,
        );
        assert_eq!(told.last().unwrap()["count"], 1);
    }

    #[test]
    fn an_interrupted_turn_or_one_from_before_launch_is_not_told() {
        let mut tracker = Tracker::new();
        let start = tracker.started;
        let told = failures(
            &mut tracker,
            &[
                turn("s1", "t1", "interrupted", start + 1_000, None),
                turn("s2", "t1", "failed", start - 1_000, None),
                // Not yet ended by the clock it is read at.
                turn("s3", "t1", "failed", start + 9_000, None),
            ],
            start + 5_000,
        );
        assert!(told.is_empty(), "{told:?}");
        // A failure is not a reply either.
        let replies = tracker
            .events
            .iter()
            .filter(|e| e["kind"] == "completion")
            .count();
        assert_eq!(replies, 0);
    }
}
