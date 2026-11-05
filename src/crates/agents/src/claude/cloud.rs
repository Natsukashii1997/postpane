//! Claude's cloud sessions: those that run on Anthropic's servers rather
//! than on this computer, so no transcript of theirs is here to read. They
//! are listed by the same service `claude --cloud` starts them on, with
//! Claude Code's own sign-in, and only the ones at work or waiting on the
//! user come back, as session rows for the panel's sessions in progress.
//! A session this computer runs with Remote Control is listed there too
//! (`bridge`); its transcript is here, so it is left out.
use super::account::{config_dir, profile};
use crate::account::{
    read_json, Answer, Host, HttpFailure, HttpRequest, Provider, Reading, Unread,
};
use crate::l10n;
use serde_json::{json, Value};
use std::time::Duration;

pub static PROVIDER: Provider = Provider {
    // What runs in the cloud changes by the minute, whatever this computer does.
    local_work: false,
    every: Some(60),
    ..Provider::new(ID, read)
};
/// The reading's provider id; read whenever Claude Code is enabled.
pub const ID: &str = "claude-cloud";

/// Where Claude Code keeps its sign-in on macOS.
const STORED: &str = "Claude Code-credentials";
const SESSIONS: &str = "https://api.anthropic.com/v1/sessions?limit=50";

pub fn read(host: &dyn Host) -> Result<Reading, Unread> {
    let signed_out = || {
        Unread::SignedOut(l10n::text(
            "Claude Code 未登录，读不到云端会话",
            "Claude Code is signed out, so its cloud sessions can't be read",
        ))
    };
    let credentials = match host.secret(STORED) {
        Answer::Found(text) => serde_json::from_str::<Value>(&text).ok(),
        _ => read_json(host, &config_dir(host).join(".credentials.json")),
    }
    .ok_or_else(signed_out)?;
    let token = credentials["claudeAiOauth"]["accessToken"]
        .as_str()
        .filter(|token| !token.is_empty())
        .ok_or_else(signed_out)?;
    let organization = profile(host)["organizationUuid"]
        .as_str()
        .unwrap_or_default()
        .to_owned();
    let authorization = format!("Bearer {token}");
    let body = host
        .http_json(&HttpRequest {
            url: SESSIONS,
            secrets: &[("Authorization", authorization.as_str())],
            headers: &[
                ("Accept", "application/json"),
                ("anthropic-version", "2023-06-01"),
                ("anthropic-beta", "ccr-byoc-2025-07-29"),
                ("x-organization-uuid", organization.as_str()),
            ],
            body: None,
            timeout: Duration::from_secs(15),
        })
        .map_err(|failure| match failure {
            // Claude Code renews its sign-in as it works; until then, nothing.
            HttpFailure::Status(401 | 403) => signed_out(),
            failure => failure.unread(),
        })?;
    let mut reading = Reading::empty(ID);
    reading.live_sessions = body["data"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(row)
        .collect();
    Ok(reading)
}

/// A cloud session at work or waiting on the user, as a session row.
fn row(session: &Value) -> Option<Value> {
    if session["environment_kind"] != "anthropic_cloud" {
        return None;
    }
    let state = match (
        session["session_status"].as_str(),
        session["status_bucket"].as_str(),
    ) {
        (Some("running"), _) => "running",
        (_, Some("blocked")) => "waiting",
        _ => return None,
    };
    let id = session["id"].as_str().filter(|id| cloud_id(id))?;
    let at = session["updated_at"].as_str().unwrap_or_default();
    Some(json!({
        "id": id,
        "source": "claude",
        "client": "claude-cloud",
        "title": session["title"].as_str().unwrap_or_default(),
        "model": session["configured_model"].as_str().unwrap_or("Unknown"),
        "cwd": null,
        "updatedAt": at,
        "lastMessageAt": at,
        "state": state,
        "tokens": 0,
        "cost": null,
        "contextPercent": null,
        "logPath": null,
        "parentId": null,
        "usageStatus": "unavailable",
        "evidence": "cloud-session",
        "navigationTarget": {"kind": "claude-cloud-session", "id": id},
    }))
}

/// A cloud session's id: `session_` and letters and digits.
pub fn cloud_id(id: &str) -> bool {
    id.len() <= 128
        && id
            .strip_prefix("session_")
            .is_some_and(|rest| !rest.is_empty() && rest.bytes().all(|b| b.is_ascii_alphanumeric()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::account::fake::FakeHost;

    fn session(id: &str, kind: &str, status: &str, bucket: &str) -> Value {
        json!({"id": id, "title": format!("t {id}"), "environment_kind": kind,
            "session_status": status, "status_bucket": bucket,
            "updated_at": "2026-11-05T04:46:18Z", "configured_model": "claude-opus-5-5"})
    }

    fn signed_in(body: Result<Value, HttpFailure>) -> FakeHost {
        let mut host = FakeHost::new("/home/u")
            .file(
                "/home/u/.claude.json",
                r#"{"oauthAccount":{"organizationUuid":"org-1"}}"#,
            )
            .answer(SESSIONS, body);
        host.secrets.insert(
            STORED.into(),
            Answer::Found(r#"{"claudeAiOauth":{"accessToken":"tok"}}"#.into()),
        );
        host
    }

    #[test]
    fn only_cloud_sessions_at_work_or_waiting_come_back() {
        let host = signed_in(Ok(json!({"data": [
            session("session_01run", "anthropic_cloud", "running", "working"),
            session("session_01ask", "anthropic_cloud", "idle", "blocked"),
            session("session_01done", "anthropic_cloud", "idle", "review_ready"),
            session("session_01here", "bridge", "running", "working"),
            session("../evil", "anthropic_cloud", "running", "working"),
        ]})));
        let reading = read(&host).unwrap();
        let rows = &reading.live_sessions;
        assert_eq!(rows.len(), 2);
        assert_eq!(rows[0]["id"], "session_01run");
        assert_eq!(rows[0]["state"], "running");
        assert_eq!(rows[0]["source"], "claude");
        assert_eq!(
            rows[0]["navigationTarget"],
            json!({"kind": "claude-cloud-session", "id": "session_01run"})
        );
        assert_eq!(rows[1]["state"], "waiting");
        assert!(reading.quotas.is_empty() && reading.session_records.is_empty());
        let asked = host.asked.borrow();
        assert_eq!(asked[0].1.as_deref(), Some("Bearer tok"));
        let headers = &host.headers.borrow()[0];
        assert!(headers.contains(&("x-organization-uuid".into(), "org-1".into())));
        assert!(headers.contains(&("anthropic-beta".into(), "ccr-byoc-2025-07-29".into())));
    }

    #[test]
    fn no_sign_in_or_a_refused_one_reads_as_signed_out() {
        let host = FakeHost::new("/home/u");
        assert!(matches!(read(&host), Err(Unread::SignedOut(_))));
        let host = signed_in(Err(HttpFailure::Status(401)));
        assert!(matches!(read(&host), Err(Unread::SignedOut(_))));
        let host = signed_in(Err(HttpFailure::Status(503)));
        assert!(matches!(read(&host), Err(Unread::Transient { .. })));
    }
}
