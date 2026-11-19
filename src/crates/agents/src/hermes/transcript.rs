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

/// What the person last asked in the session: their latest message with
/// words of their own, past the gateway's `[System note: …]` messages.
pub fn last_prompt(db: &Connection, session: &str) -> Option<String> {
    let mut statement = db
        .prepare(
            "SELECT content FROM messages WHERE session_id=?1 AND role='user' \
             AND content IS NOT NULL ORDER BY id DESC LIMIT 10",
        )
        .ok()?;
    let texts = statement
        .query_map([session], |row| row.get::<_, String>(0))
        .ok()?
        .flatten()
        .collect::<Vec<_>>();
    texts.into_iter().find_map(|text| {
        let own = own_words(&text);
        (!own.is_empty()).then(|| own.to_owned())
    })
}

/// Whether the bot has answered what it was last asked.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Answer {
    /// A reply with words came after the question.
    Answered,
    /// The gateway holds the session's turn lease: it is answering now.
    Replying,
    /// Nothing has come back yet.
    Waiting,
}

/// Something the person (or a colleague, in a group) last asked the bot in
/// one Feishu chat.
#[derive(Debug, Clone, PartialEq)]
pub struct Ask {
    /// The session's own id in the database.
    pub session: String,
    /// Feishu's chat type: `dm`, `group` or `thread`.
    pub chat: Option<String>,
    /// Feishu's id of the chat (`oc_…`), where it opens.
    pub chat_id: Option<String>,
    /// Who asked: their open id for the bot's app (`ou_…`).
    pub user: Option<String>,
    /// The session's title, or the question's first line when it has none.
    pub title: String,
    /// When it was asked (ms).
    pub at: i64,
    pub answer: Answer,
}

/// The latest `limit` Feishu chats with a question of the person's own
/// words, newest first, at `now` (ms). Cron and one-shot sessions are not
/// asks; a database without the columns it needs has none.
pub fn recent_asks(db: &Connection, now: i64, limit: usize) -> rusqlite::Result<Vec<Ask>> {
    let s = sql_columns(db, "sessions")?;
    let m = sql_columns(db, "messages")?;
    if !s.contains("source") || !m.contains("timestamp") || !m.contains("session_id") {
        return Ok(Vec::new());
    }
    let mut statement = db.prepare(&format!(
        "SELECT s.id,{},{},{},{} FROM sessions s JOIN messages m ON m.session_id=s.id \
         WHERE s.source='feishu' AND m.role='user' GROUP BY s.id ORDER BY max(m.timestamp) DESC LIMIT ?1",
        sql_column(&s, "s", "chat_type", "NULL"),
        sql_column(&s, "s", "title", "NULL"),
        sql_column(&s, "s", "chat_id", "NULL"),
        sql_column(&s, "s", "user_id", "NULL"),
    ))?;
    let chats = statement
        .query_map([(limit * 3) as i64], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, Option<String>>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, Option<String>>(4)?,
            ))
        })?
        .flatten()
        .collect::<Vec<_>>();
    let held = leases(db, now)?
        .into_iter()
        .map(|lease| lease.session)
        .collect::<Vec<_>>();
    let mut asks = chats
        .into_iter()
        .filter_map(|(session, chat, title, chat_id, user)| {
            let (id, words, at) = last_question(db, &session)?;
            let answered = db
                .query_row(
                    "SELECT count(*) FROM messages WHERE session_id=?1 AND role='assistant' \
                     AND id>?2 AND content IS NOT NULL AND length(content)>0",
                    rusqlite::params![session, id],
                    |row| row.get::<_, i64>(0),
                )
                .ok()?
                > 0;
            let answer = if held.contains(&session) {
                Answer::Replying
            } else if answered {
                Answer::Answered
            } else {
                Answer::Waiting
            };
            let title = title
                .map(|title| title.trim().to_string())
                .filter(|title| !title.is_empty())
                .unwrap_or_else(|| words.lines().next().unwrap_or_default().trim().to_string());
            Some(Ask {
                session,
                chat,
                chat_id,
                user,
                title,
                at,
                answer,
            })
        })
        .collect::<Vec<_>>();
    asks.sort_by(|a, b| b.at.cmp(&a.at));
    asks.truncate(limit);
    Ok(asks)
}

/// The session's latest question of the person's own words: its message
/// id, words and time (ms).
fn last_question(db: &Connection, session: &str) -> Option<(i64, String, i64)> {
    let mut statement = db
        .prepare(
            "SELECT id, content, timestamp FROM messages WHERE session_id=?1 AND role='user' \
             AND content IS NOT NULL ORDER BY id DESC LIMIT 10",
        )
        .ok()?;
    let rows = statement
        .query_map([session], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, f64>(2)?,
            ))
        })
        .ok()?
        .flatten()
        .collect::<Vec<_>>();
    rows.into_iter().find_map(|(id, text, at)| {
        let own = own_words(&text);
        (!own.is_empty()).then(|| (id, own.to_owned(), (at * 1000.0) as i64))
    })
}

/// What a bot has done in Feishu: the person's turns since a moment, and
/// when it last replied. Its cron and one-shot sessions are not counted.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct Activity {
    /// The person's messages with words of their own since `since`.
    pub turns: u32,
    /// The bot's latest Feishu reply with words in it (ms).
    pub last_reply: Option<i64>,
}

/// The bot's Feishu activity since `since` (ms). A database without the
/// columns it needs has none.
pub fn activity(db: &Connection, since: i64) -> rusqlite::Result<Activity> {
    let s = sql_columns(db, "sessions")?;
    let m = sql_columns(db, "messages")?;
    if !s.contains("source") || !m.contains("timestamp") || !m.contains("session_id") {
        return Ok(Activity::default());
    }
    let mut statement = db.prepare(
        "SELECT m.content FROM messages m JOIN sessions s ON s.id=m.session_id \
         WHERE s.source='feishu' AND m.role='user' AND m.timestamp>=?1 AND m.content IS NOT NULL",
    )?;
    let turns = statement
        .query_map([since as f64 / 1000.0], |row| row.get::<_, String>(0))?
        .flatten()
        .filter(|text| !own_words(text).is_empty())
        .count() as u32;
    let last_reply = db.query_row(
        "SELECT max(m.timestamp) FROM messages m JOIN sessions s ON s.id=m.session_id \
         WHERE s.source='feishu' AND m.role='assistant' AND m.content IS NOT NULL AND length(m.content)>0",
        [],
        |row| row.get::<_, Option<f64>>(0),
    )?;
    Ok(Activity {
        turns,
        last_reply: last_reply.map(|at| (at * 1000.0) as i64),
    })
}

/// A user message without the system notes the gateway puts before it.
fn own_words(text: &str) -> &str {
    let mut rest = text.trim();
    while let Some(note) = rest.strip_prefix("[System note:") {
        rest = match note.find(']') {
            Some(end) => note[end + 1..].trim_start(),
            None => "",
        };
    }
    rest.trim()
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
    fn a_bots_activity_counts_its_feishu_turns_and_last_reply() {
        let db = Connection::open_in_memory().unwrap();
        db.execute_batch(
            "CREATE TABLE sessions (id TEXT PRIMARY KEY, source TEXT, started_at REAL);
             CREATE TABLE messages (id INTEGER PRIMARY KEY, session_id TEXT, role TEXT, content TEXT, timestamp REAL);
             INSERT INTO sessions VALUES ('chat','feishu',0),('job','cron',0);
             INSERT INTO messages (session_id,role,content,timestamp) VALUES
               ('chat','user','昨天的话',90),
               ('chat','user','周报为什么没发',110),
               ('chat','user','[System note: 群里]  再看一下',120),
               ('chat','user','[System note: 只有提示]',130),
               ('chat','assistant','好的',140),
               ('chat','assistant','',150),
               ('job','user','日报',160),
               ('job','assistant','日报写好了',170);",
        )
        .unwrap();
        assert_eq!(
            activity(&db, 100_000).unwrap(),
            Activity {
                turns: 2,
                last_reply: Some(140_000)
            }
        );
        let bare = Connection::open_in_memory().unwrap();
        bare.execute_batch("CREATE TABLE sessions (id TEXT); CREATE TABLE messages (id INTEGER);")
            .unwrap();
        assert_eq!(activity(&bare, 0).unwrap(), Activity::default());
    }

    #[test]
    fn the_latest_asks_say_where_from_and_whether_answered() {
        let db = Connection::open_in_memory().unwrap();
        db.execute_batch(
            "CREATE TABLE sessions (id TEXT PRIMARY KEY, source TEXT, chat_type TEXT, title TEXT, started_at REAL, chat_id TEXT, user_id TEXT);
             CREATE TABLE messages (id INTEGER PRIMARY KEY, session_id TEXT, role TEXT, content TEXT, timestamp REAL);
             CREATE TABLE session_turn_leases (conversation_id TEXT PRIMARY KEY, holder TEXT, acquired_at REAL, expires_at REAL);
             INSERT INTO sessions VALUES
               ('dm','feishu','dm','查找最近未回复的提问',0,'oc_dm','ou_me'),
               ('grp','feishu','group',NULL,0,'oc_grp','ou_me'),
               ('busy','feishu','thread','',0,NULL,NULL),
               ('old','feishu','dm','很早的',0,'oc_old','ou_me'),
               ('job','cron',NULL,'日报',0,NULL,NULL);
             INSERT INTO messages (session_id,role,content,timestamp) VALUES
               ('old','user','很早',10),
               ('dm','user','帮我查一下',100),
               ('dm','assistant','查到了',110),
               ('dm','user','[System note: The previous turn was interrupted.]',120),
               ('grp','user','[System note: 群里] 周报怎么写\n第二行',200),
               ('grp','assistant','',210),
               ('busy','user','带教周会改到哪天',300),
               ('job','user','日报',400);
             INSERT INTO session_turn_leases VALUES ('busy','gw',300,1000);",
        )
        .unwrap();
        let asks = recent_asks(&db, 500_000, 3).unwrap();
        assert_eq!(
            asks.iter()
                .map(|a| (
                    a.session.as_str(),
                    a.chat.as_deref(),
                    a.title.as_str(),
                    a.at,
                    a.answer
                ))
                .collect::<Vec<_>>(),
            vec![
                (
                    "busy",
                    Some("thread"),
                    "带教周会改到哪天",
                    300_000,
                    Answer::Replying
                ),
                ("grp", Some("group"), "周报怎么写", 200_000, Answer::Waiting),
                (
                    "dm",
                    Some("dm"),
                    "查找最近未回复的提问",
                    100_000,
                    Answer::Answered
                ),
            ]
        );
        assert_eq!(
            asks.iter()
                .map(|a| (a.chat_id.as_deref(), a.user.as_deref()))
                .collect::<Vec<_>>(),
            vec![
                (None, None),
                (Some("oc_grp"), Some("ou_me")),
                (Some("oc_dm"), Some("ou_me"))
            ]
        );
        // A database from before Hermes kept the chat still lists its asks.
        let older = Connection::open_in_memory().unwrap();
        older
            .execute_batch(
                "CREATE TABLE sessions (id TEXT PRIMARY KEY, source TEXT, chat_type TEXT, title TEXT);
                 CREATE TABLE messages (id INTEGER PRIMARY KEY, session_id TEXT, role TEXT, content TEXT, timestamp REAL);
                 INSERT INTO sessions VALUES ('dm','feishu','dm','问');
                 INSERT INTO messages (session_id,role,content,timestamp) VALUES ('dm','user','问',1);",
            )
            .unwrap();
        let asks = recent_asks(&older, 0, 3).unwrap();
        assert_eq!((asks.len(), asks[0].chat_id.clone()), (1, None));
        let bare = Connection::open_in_memory().unwrap();
        bare.execute_batch("CREATE TABLE sessions (id TEXT); CREATE TABLE messages (id INTEGER);")
            .unwrap();
        assert_eq!(recent_asks(&bare, 0, 3).unwrap(), Vec::new());
    }

    #[test]
    fn a_profiles_sessions_carry_its_name() {
        assert_eq!(
            session_id(
                &std::env::temp_dir().join(".hermes").join("state.db"),
                "20261105_1"
            ),
            "hermes:20261105_1"
        );
        assert_eq!(
            session_id(
                &std::env::temp_dir().join(".hermes/profiles/agumon/state.db"),
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
        db.execute_batch(
            "INSERT INTO messages (session_id, role, content) VALUES
               ('a','user','[System note: The previous turn was interrupted.]');",
        )
        .unwrap();
        assert_eq!(last_prompt(&db, "a").as_deref(), Some("问"));
        assert_eq!(own_words("[System note: x] 你好"), "你好");
    }
}
