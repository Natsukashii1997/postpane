//! The extension's version against the one this app was built with (#493).
//! The extension is loaded unpacked from the repository and the app is built
//! from the same repository, so a running pair that differs means one side
//! was not brought up to date: Chrome still runs the old extension after a
//! new app was installed, or the app is older than the extension's files.
//! Nothing is refused for it; Settings and the relay say so.
use serde_json::{json, Value};
use std::sync::OnceLock;

/// The extension's manifest in this app's own build.
const MANIFEST: &str = include_str!("../../../../../apps/chrome-extension/manifest.json");

/// The extension version this app was built with.
pub fn expected() -> &'static str {
    static VERSION: OnceLock<String> = OnceLock::new();
    VERSION.get_or_init(|| {
        serde_json::from_str::<Value>(MANIFEST)
            .ok()
            .and_then(|manifest| manifest["version"].as_str().map(str::to_owned))
            .unwrap_or_default()
    })
}

/// How the version the extension reported stands against `expected`:
/// "same", "older" (reload the extension), "newer" (reinstall the app), or
/// "unknown" when it reported none or one that is not dotted numbers.
pub fn fit(reported: Option<&str>) -> &'static str {
    compare(reported, expected())
}

/// What to tell whoever hands work to ChatGPT while the versions differ;
/// None while they match or cannot be told apart.
pub fn note(reported: Option<&str>) -> Option<String> {
    note_to(reported, expected())
}

/// `fit` against `wanted`.
fn compare(reported: Option<&str>, wanted: &str) -> &'static str {
    let parts = |version: &str| -> Option<Vec<u64>> {
        let mut parts = version
            .split('.')
            .map(|part| part.parse().ok())
            .collect::<Option<Vec<u64>>>()?;
        while parts.last() == Some(&0) {
            parts.pop();
        }
        Some(parts)
    };
    match (reported.and_then(parts), parts(wanted)) {
        (Some(reported), Some(wanted)) => match reported.cmp(&wanted) {
            std::cmp::Ordering::Equal => "same",
            std::cmp::Ordering::Less => "older",
            std::cmp::Ordering::Greater => "newer",
        },
        _ => "unknown",
    }
}

/// `note` against `wanted`.
fn note_to(reported: Option<&str>, wanted: &str) -> Option<String> {
    let reported = reported?;
    match compare(Some(reported), wanted) {
        "older" => Some(if agent_hud_core::l10n::chinese() {
            format!(
                "提醒：Chrome 里的驿窗插件是 {reported}，这版驿窗要的是 {wanted}。请常浩在 chrome://extensions 点驿窗插件的重新加载按钮，否则接力可能送不出去或认不出回信。"
            )
        } else {
            format!(
                "Note: Chrome runs the PostPane extension {reported}; this PostPane expects {wanted}. Ask the person to reload the PostPane extension in chrome://extensions, or the relay may not send or may miss the answer."
            )
        }),
        "newer" => Some(if agent_hud_core::l10n::chinese() {
            format!(
                "提醒：Chrome 里的驿窗插件 {reported} 比这版驿窗（{wanted}）新。驿窗该从最新 main 重新打包、重装，否则接力可能送不出去或认不出回信。"
            )
        } else {
            format!(
                "Note: Chrome runs the PostPane extension {reported}, newer than this PostPane ({wanted}). PostPane should be rebuilt from the latest main and reinstalled, or the relay may not send or may miss the answer."
            )
        }),
        _ => None,
    }
}

/// What the extension said of itself on connecting, kept for the status;
/// a version that does not match is written to the app's log.
pub(super) fn hello(message: &Value) -> Value {
    let version = message["version"].as_str();
    if matches!(fit(version), "older" | "newer") {
        agent_hud_core::note!(
            "The ChatGPT extension connected as {}; this app was built with {}",
            version.unwrap_or("?"),
            expected()
        );
    }
    json!({"version":message["version"],"extensionId":message["extensionId"]})
}

#[cfg(test)]
mod tests {
    use super::*;

    /// `fit` against a given expected version.
    fn fit_to(reported: Option<&str>, wanted: &str) -> &'static str {
        compare(reported, wanted)
    }

    #[test]
    fn the_expected_version_is_the_extensions_own_manifest() {
        let manifest: Value = serde_json::from_str(MANIFEST).unwrap();
        assert_eq!(Some(expected()), manifest["version"].as_str());
        assert!(expected()
            .split('.')
            .all(|part| part.parse::<u64>().is_ok()));
    }

    #[test]
    fn versions_compare_part_by_part_as_numbers() {
        assert_eq!(fit_to(Some("0.2.5"), "0.2.5"), "same");
        assert_eq!(fit_to(Some("0.2.4"), "0.2.5"), "older");
        assert_eq!(fit_to(Some("0.2.10"), "0.2.9"), "newer");
        assert_eq!(fit_to(Some("0.3"), "0.2.9"), "newer");
        assert_eq!(fit_to(Some("0.2"), "0.2.0"), "same");
        assert_eq!(fit_to(None, "0.2.5"), "unknown");
        assert_eq!(fit_to(Some("dev"), "0.2.5"), "unknown");
        assert_eq!(fit(Some(expected())), "same");
    }

    #[test]
    fn a_relay_is_told_which_side_to_bring_up_to_date() {
        let older = note_to(Some("0.2.4"), "0.2.5").unwrap();
        assert!(
            older.contains("0.2.4") && older.contains("0.2.5"),
            "{older}"
        );
        assert!(older.contains("chrome://extensions"), "{older}");
        let newer = note_to(Some("0.2.6"), "0.2.5").unwrap();
        assert!(
            newer.contains("0.2.6") && newer.contains("0.2.5"),
            "{newer}"
        );
        assert!(
            newer.contains("重装") || newer.contains("reinstall"),
            "{newer}"
        );
        assert_eq!(note_to(Some("0.2.5"), "0.2.5"), None);
        assert_eq!(note_to(None, "0.2.5"), None);
        assert_eq!(note(Some(expected())), None);
    }

    #[test]
    fn hello_keeps_the_version_and_the_id() {
        let kept = hello(&json!({"type":"hello","version":"0.2.5","extensionId":"abc"}));
        assert_eq!(kept, json!({"version":"0.2.5","extensionId":"abc"}));
        let bare = hello(&json!({"type":"hello"}));
        assert_eq!(bare, json!({"version":null,"extensionId":null}));
    }
}
