//! Claude Code's own record of its last usage answer: `cachedUsageUtilization`
//! in `.claude.json`, `{accountUuid, fetchedAtMs, utilization}`.
//!
//! Every usage read Claude Code makes with its own sign-in (`/usage`, or the
//! `get_usage` PostPane asks its engine for) writes the server's answer here
//! for the account the same file's `oauthAccount` names; signing out clears
//! it. `utilization` is the object `get_usage` answers as `rate_limits`, so
//! its windows read exactly as the engine's do (upstream Agent HUD 5482ba7,
//! after QuotaView, MIT). PostPane reads it only when a reading fails and
//! nothing read before is kept (`account::kept`).
use crate::l10n;
use serde_json::Value;

/// How old a record can be and still be shown when a reading fails: as long
/// as a window Claude stops reporting keeps its last reading.
pub const KEPT_MS: i64 = 30 * 86_400_000;

/// A record Claude Code fetched at `fetched_ms`.
pub struct Record<'a> {
    pub fetched_ms: i64,
    /// The usage answer, shaped as `get_usage`'s `rate_limits`.
    pub utilization: &'a Value,
}
impl Record<'_> {
    pub fn age_ms(&self, now_ms: i64) -> i64 {
        now_ms - self.fetched_ms
    }
    /// Says that the windows shown are this record's, and how old it is.
    pub fn shown(&self, now_ms: i64) -> String {
        let age = age(self.age_ms(now_ms));
        if l10n::chinese() {
            format!("显示的是 Claude Code {age} 前记下的读数")
        } else {
            format!("Showing Claude Code's own reading from {age} ago")
        }
    }
}

/// The record in a parsed `.claude.json`, when it is of the account the same
/// file is signed in to and was fetched at most `KEPT_MS` before `now_ms`,
/// not after. A record that names no account is not taken for anyone's.
pub fn read(config: &Value, now_ms: i64) -> Option<Record<'_>> {
    let record = &config["cachedUsageUtilization"];
    let account = config["oauthAccount"]["accountUuid"]
        .as_str()
        .filter(|account| !account.is_empty())?;
    if record["accountUuid"].as_str() != Some(account) || !record["utilization"].is_object() {
        return None;
    }
    let fetched_ms = record["fetchedAtMs"]
        .as_f64()
        .filter(|ms| ms.is_finite() && *ms > 0.0)? as i64;
    let record = Record {
        fetched_ms,
        utilization: &record["utilization"],
    };
    (0..KEPT_MS)
        .contains(&record.age_ms(now_ms))
        .then_some(record)
}

/// An age in its largest unit, as the panel words one: "45s", "5m", "2h", "3d".
fn age(ms: i64) -> String {
    let seconds = ms.max(0) / 1000;
    match seconds {
        0..60 => format!("{seconds}s"),
        60..3600 => format!("{}m", seconds / 60),
        3600..86_400 => format!("{}h", seconds / 3600),
        _ => format!("{}d", seconds / 86_400),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    const NOW: i64 = 1_800_000_000_000;

    fn config(record: Value) -> Value {
        json!({"oauthAccount": {"accountUuid": "user-1"}, "cachedUsageUtilization": record})
    }

    #[test]
    fn a_record_is_read_only_for_the_account_the_file_names() {
        let utilization = json!({"five_hour": {"utilization": 12}});
        let mine = config(
            json!({"accountUuid": "user-1", "fetchedAtMs": NOW - 5_000, "utilization": utilization}),
        );
        let record = read(&mine, NOW).unwrap();
        assert_eq!(record.fetched_ms, NOW - 5_000);
        assert_eq!(record.utilization["five_hour"]["utilization"], 12);

        for other in [
            json!({"accountUuid": "user-2", "fetchedAtMs": NOW, "utilization": {}}),
            json!({"fetchedAtMs": NOW, "utilization": {}}),
            json!({"accountUuid": "user-1", "fetchedAtMs": NOW, "utilization": null}),
            json!({"accountUuid": "user-1", "utilization": {}}),
            Value::Null,
        ] {
            assert!(read(&config(other), NOW).is_none());
        }
        // A file signed in to no account owns no record.
        let anonymous = json!({"cachedUsageUtilization": {"fetchedAtMs": NOW, "utilization": {}}});
        assert!(read(&anonymous, NOW).is_none());
    }

    #[test]
    fn a_record_is_kept_for_thirty_days_and_never_from_the_future() {
        let at = |fetched: i64| {
            config(json!({"accountUuid": "user-1", "fetchedAtMs": fetched, "utilization": {}}))
        };
        assert!(read(&at(NOW - KEPT_MS + 1), NOW).is_some());
        assert!(read(&at(NOW - KEPT_MS), NOW).is_none());
        assert!(
            read(&at(NOW + 1), NOW).is_none(),
            "a record from the future is not believed"
        );
    }

    #[test]
    fn its_age_is_said_in_its_largest_unit() {
        assert_eq!(age(45_000), "45s");
        assert_eq!(age(5 * 60_000 + 59_000), "5m");
        assert_eq!(age(2 * 3_600_000), "2h");
        assert_eq!(age(3 * 86_400_000 + 1), "3d");
        let record = Record {
            fetched_ms: NOW - 2 * 3_600_000,
            utilization: &Value::Null,
        };
        assert!(record.shown(NOW).contains("2h"));
    }
}
