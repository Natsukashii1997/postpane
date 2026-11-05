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
    use std::sync::{Mutex, OnceLock};
    static NAMES: OnceLock<Mutex<HashMap<PathBuf, Option<String>>>> = OnceLock::new();
    let mut names = NAMES.get_or_init(Default::default).lock().ok()?;
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
            Some(Gateway {
                bot: bot(&dir.join("state.db").to_string_lossy())?,
                down: down(&state, now),
            })
        })
        .collect()
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
