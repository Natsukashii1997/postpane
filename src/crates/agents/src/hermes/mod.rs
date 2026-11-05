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
