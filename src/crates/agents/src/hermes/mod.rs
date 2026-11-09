//! Hermes.
pub mod transcript;

use crate::Agent;
use crate::Discovery;
use crate::{Location, Source};
use std::path::Path;

static SOURCES: [Source; 1] = [Source {
    reads_as: "hermes",
    location: Location::home(&["HERMES_HOME"], &[".hermes"], ""),
}];
static DISCOVERY: Discovery = Discovery {
    storage: &[
        Location::home(&["HERMES_HOME"], &[".hermes"], "state.db"),
        Location::home(&["HERMES_HOME"], &[".hermes"], "profiles"),
    ],
    settings: &[
        Location::home(&["HERMES_HOME"], &[".hermes"], "config.yaml"),
        Location::home(&["HERMES_HOME"], &[".hermes"], "config.json"),
    ],
    sessions: &[
        Location::home(&["HERMES_HOME"], &[".hermes"], "state.db"),
        Location::home(&["HERMES_HOME"], &[".hermes"], "profiles"),
    ],
    commands: &["hermes"],
    ..Discovery::NONE
};

pub static AGENT: Agent = Agent {
    id: "hermes",
    name: "Hermes",
    sessions: true,
    hooks: None,
    observer: None,
    channel: None,
    program: None,
    replies: None,
    turns: None,
    items: None,
    sources: crate::everywhere(&SOURCES),
    discovery: &DISCOVERY,
};

/// Which Hermes bot a session belongs to: one `HERMES_HOME`, the default
/// one or a profile under `profiles/`, each its own gateway (a Feishu bot).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Bot {
    /// `default`, or the profile's folder name (`agumon`).
    pub id: String,
    /// What its `SOUL.md` calls it (`# 猛鬼兽 · SOUL`), else its id.
    pub name: String,
}

/// The bot behind a session read from `log_path`: its `state.db`, or a
/// session inside it (`state.db#hud-session-…`). None for other paths.
pub fn bot(log_path: &str) -> Option<Bot> {
    let db = Path::new(log_path.split('#').next()?);
    if db.file_name()? != "state.db" {
        return None;
    }
    let home = db.parent()?;
    let id = if home.parent().and_then(Path::file_name) == Some("profiles".as_ref()) {
        home.file_name()?.to_string_lossy().into_owned()
    } else {
        "default".to_owned()
    };
    let name = soul_name_cached(&home.join("SOUL.md")).unwrap_or_else(|| id.clone());
    Some(Bot { id, name })
}

/// Names are read once per file: a bot is renamed rarely, and the session
/// list is rebuilt often.
fn soul_name_cached(path: &Path) -> Option<String> {
    use std::collections::HashMap;
    use std::path::PathBuf;
    use std::sync::{Mutex, OnceLock, PoisonError};
    static NAMES: OnceLock<Mutex<HashMap<PathBuf, Option<String>>>> = OnceLock::new();
    let mut names = NAMES
        .get_or_init(Default::default)
        .lock()
        .unwrap_or_else(PoisonError::into_inner);
    names
        .entry(path.to_owned())
        .or_insert_with(|| {
            std::fs::read_to_string(path)
                .ok()
                .and_then(|t| soul_name(&t))
        })
        .clone()
}

/// The name in a `SOUL.md`'s first heading: `# 猛鬼兽 · SOUL` → `猛鬼兽`.
pub fn soul_name(text: &str) -> Option<String> {
    let heading = text.lines().find(|line| !line.trim().is_empty())?;
    let title = heading.trim().strip_prefix('#')?.trim_start_matches('#');
    let name = title.split('·').next()?.trim();
    (!name.is_empty()).then(|| name.to_owned())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_soul_heading_names_the_bot() {
        assert_eq!(
            soul_name("# 猛鬼兽 · SOUL\n\n你是猛鬼兽").as_deref(),
            Some("猛鬼兽")
        );
        assert_eq!(soul_name("\n# 亚古兽·SOUL").as_deref(), Some("亚古兽"));
        assert_eq!(soul_name("# Agumon").as_deref(), Some("Agumon"));
        assert_eq!(soul_name("你是猛鬼兽"), None);
        assert_eq!(soul_name("# · SOUL"), None);
        assert_eq!(soul_name(""), None);
    }

    #[test]
    fn a_profile_folder_is_its_own_bot() {
        let root = std::env::temp_dir().join(format!("hermes-bot-{}", std::process::id()));
        let profile = root.join("profiles").join("agumon");
        std::fs::create_dir_all(&profile).unwrap();
        std::fs::write(root.join("SOUL.md"), "# 猛鬼兽 · SOUL\n").unwrap();
        std::fs::write(profile.join("SOUL.md"), "# 亚古兽 · SOUL\n").unwrap();
        let main = format!("{}#hud-session-6869", root.join("state.db").display());
        assert_eq!(
            bot(&main),
            Some(Bot {
                id: "default".into(),
                name: "猛鬼兽".into()
            })
        );
        assert_eq!(
            bot(&profile.join("state.db").to_string_lossy()),
            Some(Bot {
                id: "agumon".into(),
                name: "亚古兽".into()
            })
        );
        let bare = root.join("profiles").join("nameless");
        std::fs::create_dir_all(&bare).unwrap();
        assert_eq!(
            bot(&bare.join("state.db").to_string_lossy()).map(|b| b.name),
            Some("nameless".into())
        );
        assert_eq!(bot("/tmp/other.db"), None);
        let _ = std::fs::remove_dir_all(&root);
    }
}

/// Why a Hermes gateway cannot answer, as its `gateway_state.json` says.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Down {
    /// Running, but its Feishu connection is not up or needs attention.
    Feishu,
    /// Not running, or silent for longer than it ever is while it runs.
    Stopped,
}

/// One Hermes gateway: a Feishu bot and whether it is down.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Gateway {
    pub bot: Bot,
    pub down: Option<Down>,
    /// Since when it has been down (ms), as far as its state says.
    pub down_since: Option<i64>,
    /// Its Hermes home, where its `state.db` is.
    pub home: std::path::PathBuf,
}

/// A running gateway rewrites its state every few seconds.
const SILENT_MS: i64 = 10 * 60_000;

/// The gateways under a Hermes home: its own and each profile's.
pub fn gateways(home: &Path, now: i64) -> Vec<Gateway> {
    let profiles = std::fs::read_dir(home.join("profiles"))
        .map(|dirs| dirs.flatten().map(|dir| dir.path()).collect::<Vec<_>>())
        .unwrap_or_default();
    let mut homes = vec![home.to_path_buf()];
    homes.extend(profiles);
    homes
        .into_iter()
        .filter_map(|dir| {
            let text = std::fs::read_to_string(dir.join("gateway_state.json")).ok()?;
            let state = serde_json::from_str::<serde_json::Value>(&text).ok()?;
            let down = down(&state, now);
            Some(Gateway {
                bot: bot(&dir.join("state.db").to_string_lossy())?,
                down,
                down_since: down_since(&state, down),
                home: dir,
            })
        })
        .collect()
}

/// The navigation kind of a Feishu chat: it opens in the Feishu app.
pub const NAVIGATION_KIND: &str = "feishu-chat";

/// Whether `id` is a Feishu chat id (`oc_` and letters, digits or `_`).
pub fn feishu_chat_id(id: &str) -> bool {
    id.len() <= 64
        && id.strip_prefix("oc_").is_some_and(|rest| {
            !rest.is_empty() && rest.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'_')
        })
}

/// Where a Feishu chat opens.
pub fn chat_target(id: &str) -> Option<serde_json::Value> {
    feishu_chat_id(id).then(|| serde_json::json!({"kind": NAVIGATION_KIND, "id": id}))
}

/// One Hermes scheduled task (`cron/jobs.json`) and how its last run went.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CronJob {
    pub id: String,
    pub name: String,
    pub enabled: bool,
    /// Its last run failed (`last_status` "error"); a task never run is not.
    pub failed: bool,
    /// When its last run was (ms).
    pub last_run_at: Option<i64>,
    /// When it runs next (ms).
    pub next_run_at: Option<i64>,
    /// How often it runs: its cron expression (`45 7 * * 1`), or the
    /// schedule as Hermes prints it when it has none.
    pub schedule: Option<String>,
}

fn millis(value: &serde_json::Value) -> Option<i64> {
    value
        .as_str()
        .and_then(|at| chrono::DateTime::parse_from_rfc3339(at).ok())
        .map(|at| at.timestamp_millis())
}

/// The scheduled tasks in a `cron/jobs.json` (`{"jobs": [...]}`); None when
/// it cannot be read, so a file caught mid-write is not taken for no tasks.
pub fn cron_jobs(text: &str) -> Option<Vec<CronJob>> {
    let value = serde_json::from_str::<serde_json::Value>(text).ok()?;
    let jobs = value["jobs"].as_array()?;
    Some(
        jobs.iter()
            .filter_map(|job| {
                Some(CronJob {
                    id: job["id"].as_str()?.to_string(),
                    name: job["name"].as_str().unwrap_or_default().to_string(),
                    enabled: job["enabled"].as_bool().unwrap_or(true),
                    failed: job["last_status"] == "error",
                    last_run_at: millis(&job["last_run_at"]),
                    next_run_at: millis(&job["next_run_at"]),
                    schedule: [
                        &job["schedule"]["expr"],
                        &job["schedule_display"],
                        &job["schedule"]["display"],
                    ]
                    .into_iter()
                    .find_map(|text| text.as_str().filter(|text| !text.trim().is_empty()))
                    .map(str::to_string),
                })
            })
            .collect(),
    )
}

impl Gateway {
    /// Its scheduled tasks; None when its `cron/jobs.json` cannot be read.
    pub fn cron_jobs(&self) -> Option<Vec<CronJob>> {
        cron_jobs(&std::fs::read_to_string(self.home.join("cron").join("jobs.json")).ok()?)
    }

    /// The latest `limit` things the person asked its bot in Feishu, at
    /// `now` (ms); none when its database cannot be read.
    pub fn asks(&self, now: i64, limit: usize) -> Vec<transcript::Ask> {
        crate::sqlite::ReadOnlyDatabase::open(&self.home.join("state.db"))
            .and_then(|db| transcript::recent_asks(&db.connection, now, limit))
            .unwrap_or_default()
    }

    /// Who its bot answers to: the open id its `config.yaml` names for the
    /// Feishu home channel (`platforms.feishu.home_channel.user_id`).
    pub fn owner(&self) -> Option<String> {
        let text = std::fs::read_to_string(self.home.join("config.yaml")).ok()?;
        let config = serde_saphyr::from_str::<serde_json::Value>(&text).ok()?;
        config["platforms"]["feishu"]["home_channel"]["user_id"]
            .as_str()
            .map(str::trim)
            .filter(|id| !id.is_empty())
            .map(str::to_string)
    }

    /// The latest `limit` asks at `now` (ms), each with the chat it opens:
    /// a group or topic, or a private chat the owner had with the bot. A
    /// colleague's private chat with the bot is theirs, not the owner's to
    /// open.
    pub fn asks_with_chats(
        &self,
        now: i64,
        limit: usize,
    ) -> Vec<(transcript::Ask, Option<String>)> {
        let owner = self.owner();
        self.asks(now, limit)
            .into_iter()
            .map(|ask| {
                let mine =
                    ask.chat.as_deref() != Some("dm") || (owner.is_some() && ask.user == owner);
                let chat = ask.chat_id.clone().filter(|id| mine && feishu_chat_id(id));
                (ask, chat)
            })
            .collect()
    }

    /// Its bot's Feishu activity since `since` (ms); none when its database
    /// cannot be read.
    pub fn activity(&self, since: i64) -> transcript::Activity {
        crate::sqlite::ReadOnlyDatabase::open(&self.home.join("state.db"))
            .and_then(|db| transcript::activity(&db.connection, since))
            .unwrap_or_default()
    }
}

/// Since when a gateway that is `down` has been: its Feishu connection's
/// retries or last change, or the gateway's last word when it stopped.
pub fn down_since(state: &serde_json::Value, down: Option<Down>) -> Option<i64> {
    let feishu = &state["platforms"]["feishu"];
    match down? {
        Down::Feishu => millis(&feishu["retrying_since"]).or_else(|| millis(&feishu["updated_at"])),
        Down::Stopped => millis(&state["updated_at"]),
    }
}

/// Whether a gateway state says it is down at `now` (ms).
pub fn down(state: &serde_json::Value, now: i64) -> Option<Down> {
    let updated = state["updated_at"]
        .as_str()
        .and_then(|at| chrono::DateTime::parse_from_rfc3339(at).ok())
        .map(|at| at.timestamp_millis());
    if state["gateway_state"] != "running" || updated.is_none_or(|at| now - at > SILENT_MS) {
        return Some(Down::Stopped);
    }
    let feishu = &state["platforms"]["feishu"];
    (feishu.is_object() && (feishu["state"] != "connected" || feishu["needs_attention"] == true))
        .then_some(Down::Feishu)
}

#[cfg(test)]
mod gateway_tests {
    use super::*;
    use serde_json::json;

    const NOW: i64 = 1_793_870_000_000;

    fn state(gateway: &str, feishu: &str, attention: bool, ago_ms: i64) -> serde_json::Value {
        let at = chrono::DateTime::from_timestamp_millis(NOW - ago_ms).unwrap();
        json!({"gateway_state": gateway, "updated_at": at.to_rfc3339(),
            "platforms": {"feishu": {"state": feishu, "needs_attention": attention}}})
    }

    #[test]
    fn a_gateway_is_down_when_feishu_drops_or_it_stops() {
        assert_eq!(
            down(&state("running", "connected", false, 5_000), NOW),
            None
        );
        assert_eq!(
            down(&state("running", "disconnected", false, 5_000), NOW),
            Some(Down::Feishu)
        );
        assert_eq!(
            down(&state("running", "connected", true, 5_000), NOW),
            Some(Down::Feishu)
        );
        assert_eq!(
            down(&state("stopped", "connected", false, 5_000), NOW),
            Some(Down::Stopped)
        );
        assert_eq!(
            down(&state("running", "connected", false, SILENT_MS + 1), NOW),
            Some(Down::Stopped)
        );
    }

    #[test]
    fn an_ask_opens_its_group_or_the_owners_own_private_chat() {
        let home = tempfile::tempdir().unwrap();
        std::fs::write(
            home.path().join("config.yaml"),
            "platforms:\n  feishu:\n    enabled: true\n    home_channel:\n      platform: feishu\n      chat_id: oc_mine\n      user_id: ou_me\n",
        )
        .unwrap();
        let db = rusqlite::Connection::open(home.path().join("state.db")).unwrap();
        db.execute_batch(
            "CREATE TABLE sessions (id TEXT PRIMARY KEY, source TEXT, chat_type TEXT, title TEXT, chat_id TEXT, user_id TEXT);
             CREATE TABLE messages (id INTEGER PRIMARY KEY, session_id TEXT, role TEXT, content TEXT, timestamp REAL);
             INSERT INTO sessions VALUES
               ('mine','feishu','dm','我问的','oc_mine','ou_me'),
               ('theirs','feishu','dm','同事问的','oc_theirs','ou_colleague'),
               ('grp','feishu','group','群里问的','oc_grp','ou_colleague'),
               ('odd','feishu','group','怪 id','oc_a/b','ou_me');
             INSERT INTO messages (session_id,role,content,timestamp) VALUES
               ('mine','user','我问的',40),('theirs','user','同事问的',30),
               ('grp','user','群里问的',20),('odd','user','怪 id',10);",
        )
        .unwrap();
        drop(db);
        let gateway = Gateway {
            bot: Bot {
                id: "default".into(),
                name: "猛鬼兽".into(),
            },
            down: None,
            down_since: None,
            home: home.path().to_path_buf(),
        };
        assert_eq!(gateway.owner().as_deref(), Some("ou_me"));
        let chats = gateway
            .asks_with_chats(NOW, 4)
            .into_iter()
            .map(|(ask, chat)| (ask.session, chat))
            .collect::<Vec<_>>();
        assert_eq!(
            chats,
            vec![
                ("mine".into(), Some("oc_mine".into())),
                ("theirs".into(), None),
                ("grp".into(), Some("oc_grp".into())),
                ("odd".into(), None),
            ]
        );
        // Without a home channel no private chat is known to be the owner's.
        std::fs::write(home.path().join("config.yaml"), "platforms: {}\n").unwrap();
        assert_eq!(gateway.asks_with_chats(NOW, 1)[0].1, None);
    }

    #[test]
    fn only_a_feishu_chat_id_becomes_a_target() {
        assert_eq!(
            chat_target("oc_08a1_B2"),
            Some(json!({"kind": "feishu-chat", "id": "oc_08a1_B2"}))
        );
        for id in [
            "",
            "oc_",
            "ou_08a1",
            "oc_a/b",
            "oc_a?x=1",
            "oc_a b",
            &format!("oc_{}", "a".repeat(62)),
        ] {
            assert_eq!(chat_target(id), None, "{id}");
        }
    }

    #[test]
    fn a_cron_job_failed_only_when_its_last_run_errored() {
        let text = json!({"jobs": [
            {"id": "a", "name": "周报", "enabled": true, "last_status": "error",
             "last_run_at": "2026-11-02T09:14:01.841135+08:00",
             "next_run_at": "2026-11-09T07:45:00+08:00"},
            {"id": "b", "name": "日报", "enabled": true, "last_status": "ok",
             "last_run_at": "2026-11-05T07:36:39+08:00"},
            {"id": "c", "name": "卡片", "enabled": true, "last_status": null, "last_run_at": null},
            {"name": "没有 id"}
        ], "updated_at": "2026-11-05T09:50:50+08:00"})
        .to_string();
        let jobs = cron_jobs(&text).unwrap();
        assert_eq!(
            jobs.iter()
                .map(|j| (j.id.as_str(), j.failed))
                .collect::<Vec<_>>(),
            vec![("a", true), ("b", false), ("c", false)]
        );
        assert_eq!(jobs[0].last_run_at, Some(1_793_582_041_841));
        assert_eq!(jobs[0].next_run_at, Some(1_794_181_500_000));
        assert_eq!(jobs[2].last_run_at, None);
        assert_eq!(cron_jobs("{\"jobs\": [{\"id\""), None);
    }

    #[test]
    fn a_cron_job_carries_its_schedule() {
        let text = json!({"jobs": [
            {"id": "a", "schedule": {"kind": "cron", "expr": "45 7 * * 1", "display": "45 7 * * 1"}},
            {"id": "b", "schedule_display": "every 30m"},
            {"id": "c"}
        ]})
        .to_string();
        let jobs = cron_jobs(&text).unwrap();
        assert_eq!(
            jobs.iter()
                .map(|j| j.schedule.as_deref())
                .collect::<Vec<_>>(),
            vec![Some("45 7 * * 1"), Some("every 30m"), None]
        );
    }

    #[test]
    fn a_down_gateway_says_since_when() {
        let mut feishu = state("running", "disconnected", false, 5_000);
        let at = |ago: i64| {
            chrono::DateTime::from_timestamp_millis(NOW - ago)
                .unwrap()
                .to_rfc3339()
        };
        feishu["platforms"]["feishu"]["updated_at"] = json!(at(720_000));
        assert_eq!(down_since(&feishu, Some(Down::Feishu)), Some(NOW - 720_000));
        feishu["platforms"]["feishu"]["retrying_since"] = json!(at(900_000));
        assert_eq!(down_since(&feishu, Some(Down::Feishu)), Some(NOW - 900_000));
        let stopped = state("running", "connected", false, SILENT_MS + 60_000);
        assert_eq!(
            down_since(&stopped, Some(Down::Stopped)),
            Some(NOW - SILENT_MS - 60_000)
        );
        assert_eq!(down_since(&stopped, None), None);
    }

    #[test]
    fn every_profile_has_its_own_gateway() {
        let root = std::env::temp_dir().join(format!("hermes-gw-{}", std::process::id()));
        let profile = root.join("profiles").join("agumon");
        std::fs::create_dir_all(&profile).unwrap();
        std::fs::write(root.join("SOUL.md"), "# 猛鬼兽 · SOUL\n").unwrap();
        std::fs::write(profile.join("SOUL.md"), "# 亚古兽 · SOUL\n").unwrap();
        let write = |dir: &Path, value: serde_json::Value| {
            std::fs::write(dir.join("gateway_state.json"), value.to_string()).unwrap()
        };
        write(&root, state("running", "connected", false, 1_000));
        write(&profile, state("running", "disconnected", false, 1_000));
        let mut found = gateways(&root, NOW);
        found.sort_by(|a, b| a.bot.id.cmp(&b.bot.id));
        assert_eq!(
            found
                .iter()
                .map(|g| (g.bot.name.as_str(), g.down))
                .collect::<Vec<_>>(),
            vec![("亚古兽", Some(Down::Feishu)), ("猛鬼兽", None)]
        );
        let _ = std::fs::remove_dir_all(&root);
    }
}
