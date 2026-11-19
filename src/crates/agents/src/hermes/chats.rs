//! Where in Feishu a Hermes ask or session opens: the chat it was in, when
//! the bot's owner may open it, or where its scheduled task delivers.
use super::{feishu_chat_id, transcript, Gateway};
use crate::transcript::{sql_column, sql_columns};
use rusqlite::Connection;
use std::collections::HashMap;

impl Gateway {
    /// Its `config.yaml`'s Feishu home channel
    /// (`platforms.feishu.home_channel`): who its bot answers to
    /// (`user_id`) and their private chat with it (`chat_id`).
    fn home_channel(&self) -> HomeChannel {
        let config = std::fs::read_to_string(self.home.join("config.yaml"))
            .ok()
            .and_then(|text| serde_saphyr::from_str::<serde_json::Value>(&text).ok())
            .unwrap_or_default();
        let field = |key: &str| {
            config["platforms"]["feishu"]["home_channel"][key]
                .as_str()
                .map(str::trim)
                .filter(|id| !id.is_empty())
                .map(str::to_string)
        };
        HomeChannel {
            owner: field("user_id"),
            chat: field("chat_id"),
        }
    }

    /// The latest `limit` asks at `now` (ms), each with the chat it opens
    /// (`HomeChannel::opens`).
    pub fn asks_with_chats(
        &self,
        now: i64,
        limit: usize,
    ) -> Vec<(transcript::Ask, Option<String>)> {
        let home = self.home_channel();
        self.asks(now, limit)
            .into_iter()
            .map(|ask| {
                let chat = home.opens(ask.chat.as_deref(), ask.chat_id.as_deref(), &ask.user);
                (ask, chat)
            })
            .collect()
    }

    /// Where each of its sessions opens in Feishu, by the id it is listed
    /// under (`hermes:…`): a Feishu chat as an ask's (`HomeChannel::opens`),
    /// and a scheduled task's run (`cron_<job id>_<time>`) the chat its task
    /// delivers to. Other runs have no chat (#424).
    pub fn session_chats(&self) -> HashMap<String, String> {
        let database = self.home.join("state.db");
        let places = crate::sqlite::ReadOnlyDatabase::open(&database)
            .and_then(|db| places(&db.connection))
            .unwrap_or_default();
        let home = self.home_channel();
        let jobs = self.cron_jobs().unwrap_or_default();
        places
            .into_iter()
            .filter_map(|place| {
                let chat = if place.source == "cron" {
                    let run = place.session.strip_prefix("cron_")?;
                    jobs.iter()
                        .find(|job| {
                            run.strip_prefix(job.id.as_str())
                                .is_some_and(|rest| rest.starts_with('_'))
                        })?
                        .delivers_to
                        .clone()
                } else {
                    home.opens(place.chat.as_deref(), place.chat_id.as_deref(), &place.user)
                }?;
                Some((transcript::session_id(&database, &place.session), chat))
            })
            .collect()
    }
}

/// A bot's Feishu home channel: its owner and their private chat with it.
struct HomeChannel {
    owner: Option<String>,
    chat: Option<String>,
}

impl HomeChannel {
    /// The chat a Feishu session opens, when the owner may open it: a group
    /// or topic, or a private chat of theirs, by their id or by being the
    /// private chat the config names (Hermes once recorded them under
    /// another id, #424). A colleague's private chat with the bot is theirs.
    fn opens(
        &self,
        chat: Option<&str>,
        chat_id: Option<&str>,
        user: &Option<String>,
    ) -> Option<String> {
        let id = chat_id.filter(|id| feishu_chat_id(id))?;
        let mine = chat != Some("dm")
            || (self.owner.is_some() && *user == self.owner)
            || self.chat.as_deref() == Some(id);
        mine.then(|| id.to_string())
    }
}

/// A Feishu chat or scheduled task's run in the database: what decides
/// where in Feishu it opens.
#[derive(Debug, Clone, PartialEq)]
struct Place {
    /// The session's own id in the database.
    session: String,
    /// `feishu` or `cron`.
    source: String,
    chat: Option<String>,
    chat_id: Option<String>,
    user: Option<String>,
}

/// Every Feishu chat and scheduled task's run in the database; a database
/// without the columns it needs has none.
fn places(db: &Connection) -> rusqlite::Result<Vec<Place>> {
    let s = sql_columns(db, "sessions")?;
    if !s.contains("source") {
        return Ok(Vec::new());
    }
    let mut statement = db.prepare(&format!(
        "SELECT s.id,s.source,{},{},{} FROM sessions s WHERE s.source IN ('feishu','cron')",
        sql_column(&s, "s", "chat_type", "NULL"),
        sql_column(&s, "s", "chat_id", "NULL"),
        sql_column(&s, "s", "user_id", "NULL"),
    ))?;
    let places = statement
        .query_map([], |row| {
            Ok(Place {
                session: row.get(0)?,
                source: row.get(1)?,
                chat: row.get(2)?,
                chat_id: row.get(3)?,
                user: row.get(4)?,
            })
        })?
        .flatten()
        .collect();
    Ok(places)
}
