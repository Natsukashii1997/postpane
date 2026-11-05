//! Hermes SQLite session reader (`state.db`).
use crate::transcript::{sql_column, sql_columns, sql_count, sql_model, sql_text, sql_time};
use crate::{
    transcript::records::{Page, Record},
    Usage,
};
use rusqlite::Connection;
use serde_json::{json, Value};
use std::path::Path;

pub fn read(db: &Connection, path: &Path, cursor: &Value) -> rusqlite::Result<Page> {
    let s = sql_columns(db, "sessions")?;
    if !s.contains("id") || !s.contains("started_at") {
        return Err(rusqlite::Error::InvalidQuery);
    }
    let u = sql_columns(db, "session_model_usage")?;
    let fields = [
        "title",
        "cwd",
        "source",
        "model",
        "billing_provider",
        "billing_base_url",
        "billing_mode",
        "input_tokens",
        "output_tokens",
        "cache_read_tokens",
        "cache_write_tokens",
        "ended_at",
        "last_activity_at",
    ]
    .map(|key| sql_column(&s, "s", key, "NULL"));
    let scan = cursor["scan"]
        .as_i64()
        .or_else(|| cursor.as_i64())
        .unwrap_or(0);
    let rowid_after = cursor["rowid_after"].as_i64().unwrap_or(0);
    let ts_after = cursor["ts_after"].as_i64().unwrap_or(0);
    let mut max_rowid = cursor["max_rowid"].as_i64().unwrap_or(rowid_after);
    let mut max_ts = cursor["max_ts"].as_i64().unwrap_or(ts_after);
    let mut statement = db.prepare(&format!(
        "SELECT s.rowid,s.id,s.started_at,{} FROM sessions s WHERE s.rowid>?1 ORDER BY s.rowid LIMIT 100",
        fields.join(",")
    ))?;
    let mut rows = statement.query([scan])?;
    let mut records = Vec::new();
    let mut last = scan;
    let mut seen = 0;
    while let Some(row) = rows.next()? {
        seen += 1;
        last = row.get(0)?;
        max_rowid = max_rowid.max(last);
        let Some(raw) = sql_text(row, 1) else {
            continue;
        };
        let Some(started) = sql_time(row, 2, true) else {
            continue;
        };
        let updated = sql_time(row, 14, true)
            .into_iter()
            .chain(sql_time(row, 15, true))
            .chain(Some(started))
            .max()
            .unwrap_or(started);
        max_ts = max_ts.max(updated);
        if last <= rowid_after && updated <= ts_after {
            continue;
        }
        let id = session_id(path, &raw);
        let title = sql_text(row, 3);
        let cwd = sql_text(row, 4);
        let title_fallback = sql_text(row, 5).map(|source| format!("Hermes · {source}"));
        let mut any = false;
        if u.contains("session_id") && u.contains("model") {
            let fields = [
                "model",
                "billing_provider",
                "billing_base_url",
                "billing_mode",
                "task",
                "input_tokens",
                "output_tokens",
                "cache_read_tokens",
                "cache_write_tokens",
                "first_seen",
            ]
            .map(|key| sql_column(&u, "u", key, "NULL"));
            let mut statement = db.prepare(&format!(
                "SELECT {} FROM session_model_usage u WHERE u.session_id=?1 LIMIT 501",
                fields.join(",")
            ))?;
            let mut usage = statement.query([&raw])?;
            let mut limit = 0;
            while let Some(row) = usage.next()? {
                limit += 1;
                if limit > 500 {
                    return Err(rusqlite::Error::InvalidQuery);
                }
                any = true;
                let parts = (0..5)
                    .map(|i| sql_text(row, i).unwrap_or_default())
                    .collect::<Vec<_>>();
                let key = format!("usage:{id}:{}", serde_json::to_string(&parts).unwrap());
                records.push(Record {
                    id: id.clone(),
                    title: title.clone(),
                    title_fallback: title_fallback.clone(),
                    cwd: cwd.clone(),
                    model: routed(
                        sql_model(sql_text(row, 0)),
                        sql_text(row, 1),
                        sql_text(row, 2),
                    ),
                    key,
                    at: sql_time(row, 9, true).unwrap_or(started),
                    usage: Usage {
                        input: sql_count(row, 5)?,
                        output: sql_count(row, 6)?,
                        read: sql_count(row, 7)?,
                        write: sql_count(row, 8)?,
                        reasoning: 0,
                    },
                    parent: None,
                    archived: Some(false),
                    updated: None,
                    duration_ms: None,
                });
            }
        }
        if !any {
            let parts = (6..10)
                .map(|i| {
                    sql_text(row, i).unwrap_or_else(|| {
                        if i == 6 {
                            "unknown".into()
                        } else {
                            String::new()
                        }
                    })
                })
                .chain(Some(String::new()))
                .collect::<Vec<_>>();
            records.push(Record {
                id: id.clone(),
                title,
                title_fallback,
                cwd,
                model: routed(
                    sql_model(sql_text(row, 6)),
                    sql_text(row, 7),
                    sql_text(row, 8),
                ),
                key: format!("usage:{}:{}", id, serde_json::to_string(&parts).unwrap()),
                at: started,
                usage: Usage {
                    input: sql_count(row, 10)?,
                    output: sql_count(row, 11)?,
                    read: sql_count(row, 12)?,
                    write: sql_count(row, 13)?,
                    reasoning: 0,
                },
                parent: None,
                archived: Some(false),
                updated: None,
                duration_ms: None,
            });
        }
        if let Some(record) = records.last_mut() {
            record.updated = Some(updated);
        }
    }
    Ok(Page {
        records,
        cursor: (seen == 100).then(|| {
            json!({
                "scan": last,
                "rowid_after": rowid_after,
                "ts_after": ts_after,
                "max_rowid": max_rowid,
                "max_ts": max_ts,
            })
        }),
        watermark: (seen < 100).then(|| {
            json!({
                "scan": 0,
                "rowid_after": max_rowid,
                "ts_after": max_ts,
            })
        }),
    })
}

/// The id a session of the database at `path` is listed under: a
/// profile's sessions carry its name (`hermes:agumon:…`).
pub fn session_id(path: &Path, raw: &str) -> String {
    let folder = path.parent().unwrap_or(Path::new(""));
    let profile = folder
        .parent()
        .and_then(Path::file_name)
        .filter(|s| *s == "profiles")
        .and_then(|_| folder.file_name())
        .map(|s| format!("{}:", s.to_string_lossy()))
        .unwrap_or_default();
    format!("hermes:{profile}{raw}")
}

/// A turn the gateway is running: it holds the session's turn lease
/// (`session_turn_leases`) from the user's message until the reply is
/// written, and drops it then.
#[derive(Debug, Clone, PartialEq)]
pub struct Lease {
    /// The session's own id in the database.
    pub session: String,
    /// When the turn took the lease (ms).
    pub acquired: i64,
}

/// The leases held at `now` (ms). A database without the table has none.
pub fn leases(db: &Connection, now: i64) -> rusqlite::Result<Vec<Lease>> {
    if !sql_columns(db, "session_turn_leases")?.contains("conversation_id") {
        return Ok(Vec::new());
    }
    let mut statement = db.prepare(
        "SELECT conversation_id, acquired_at FROM session_turn_leases WHERE expires_at > ?1 LIMIT 50",
    )?;
    let rows = statement.query_map([now as f64 / 1000.0], |row| {
        Ok(Lease {
            session: row.get(0)?,
            acquired: (row.get::<_, f64>(1)? * 1000.0) as i64,
        })
    })?;
    rows.collect()
}

/// The session's latest reply with words in it, for the new-reply card.
pub fn last_reply(db: &Connection, session: &str) -> Option<String> {
    db.query_row(
        "SELECT content FROM messages WHERE session_id=?1 AND role='assistant' \
         AND content IS NOT NULL AND length(content)>0 ORDER BY id DESC LIMIT 1",
        [session],
        |row| row.get::<_, String>(0),
    )
    .ok()
}

/// A Hermes model with the route its billing provider and address name
/// (`endpoints::provider_route`), so a relay is not priced at a vendor's list.
fn routed(model: String, provider: Option<String>, base_url: Option<String>) -> String {
    match crate::endpoints::provider_route(provider.as_deref(), base_url.as_deref()) {
        Some(route) => format!("{model}#{route}"),
        None => model,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_profiles_sessions_carry_its_name() {
        assert_eq!(
            session_id(Path::new("/h/.hermes/state.db"), "20261105_1"),
            "hermes:20261105_1"
        );
        assert_eq!(
            session_id(
                Path::new("/h/.hermes/profiles/agumon/state.db"),
                "20261105_1"
            ),
            "hermes:agumon:20261105_1"
        );
    }

    #[test]
    fn a_held_lease_is_a_running_turn_and_the_latest_reply_has_words() {
        let db = Connection::open_in_memory().unwrap();
        assert_eq!(leases(&db, 0).unwrap(), Vec::new());
        db.execute_batch(
            "CREATE TABLE session_turn_leases (conversation_id TEXT PRIMARY KEY, holder TEXT, acquired_at REAL, expires_at REAL);
             INSERT INTO session_turn_leases VALUES ('a','gw',100.5,400), ('b','gw',90,95);
             CREATE TABLE messages (id INTEGER PRIMARY KEY, session_id TEXT, role TEXT, content TEXT);
             INSERT INTO messages (session_id, role, content) VALUES ('a','user','问'),('a','assistant','答一'),('a','assistant','');",
        )
        .unwrap();
        assert_eq!(
            leases(&db, 200_000).unwrap(),
            vec![Lease {
                session: "a".into(),
                acquired: 100_500
            }]
        );
        assert_eq!(last_reply(&db, "a").as_deref(), Some("答一"));
        assert_eq!(last_reply(&db, "b"), None);
    }
}
