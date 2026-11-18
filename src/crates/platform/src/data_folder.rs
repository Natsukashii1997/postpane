//! Agent HUD's data folder, named after the app's identifier on each system.
//! Every edition of the app uses the same one.
//!
//! PostPane's first launch moved Agent HUD's folder (`app.agenthud.*`) to its
//! own (docs/ROADMAP.md, stage 2). That move is done and its code is gone
//! (#391): the app no longer looks at the earlier folder, so whatever another
//! app writes there never joins this one's data.

/// The folder's name on each system: the app's identifier there, as the
/// desktop app's Tauri configuration gives it. A build uses its own system's
/// name; the test below checks all three on every system.
#[allow(dead_code)]
pub(crate) const MAC: &str = "app.postpane.mac";
#[allow(dead_code)]
pub(crate) const WINDOWS: &str = "app.postpane.windows";
#[allow(dead_code)]
pub(crate) const LINUX: &str = "app.postpane.linux";
/// The file every collector locks in the folder it uses.
pub(crate) const LOCK: &str = "instance.lock";

#[cfg(test)]
mod tests {
    use super::*;
    use std::{fs, path::Path};

    #[test]
    fn each_name_is_the_apps_identifier_on_its_system() {
        let tauri = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../apps/desktop/src-tauri");
        for (file, name) in [
            ("tauri.conf.json", MAC),
            ("tauri.windows.conf.json", WINDOWS),
            ("tauri.linux.conf.json", LINUX),
        ] {
            let text = fs::read_to_string(tauri.join(file)).unwrap();
            let config: serde_json::Value = serde_json::from_str(&text).unwrap();
            assert_eq!(config["identifier"], name, "{file}");
        }
    }

    #[test]
    fn another_apps_folder_beside_it_is_neither_used_nor_touched() {
        // `AGENTHUD_DATA_DIR` names the folder outright; nothing to check then.
        if std::env::var_os("AGENTHUD_DATA_DIR").is_some() {
            return;
        }
        let home = tempfile::tempdir().unwrap();
        let parent = crate::os::data_parent(home.path());
        // Agent HUD's folders, which this app once moved to its own. This
        // app's folder has no lock yet: it has never been used.
        let mut files = Vec::new();
        for name in [
            "app.agenthud.mac",
            "app.agenthud.windows",
            "app.agenthud.linux",
        ] {
            let file = parent.join(name).join("hooks/inbox/event.json");
            fs::create_dir_all(file.parent().unwrap()).unwrap();
            fs::write(&file, "event").unwrap();
            files.push(file);
        }
        let platform = crate::NativePlatform {
            home: home.path().to_owned(),
        };
        let own = parent.join(crate::os::DATA_FOLDER);
        assert_eq!(platform.data_dir(), own);
        assert_eq!(platform.instance_lock(), own.join(LOCK));
        for file in files {
            assert_eq!(fs::read_to_string(file).unwrap(), "event");
        }
        assert!(!own.join("hooks").exists());
    }
}
