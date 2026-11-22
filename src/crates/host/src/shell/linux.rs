//! Linux: the app keeps its panel entry, and the global shortcut is not
//! implemented yet (macOS uses ⌘⌥H to show Settings; the tray menu does here).

pub(crate) fn install(_app: &tauri::AppHandle) {}

pub(crate) fn window_opened(_app: &tauri::AppHandle) {}

pub(crate) fn windows_changed(_app: &tauri::AppHandle) {}

/// No Dock: Settings opens from the tray menu.
pub(crate) fn reopened(_event: &tauri::RunEvent) -> bool {
    false
}

pub(crate) fn statistics_chrome<'a>(
    builder: tauri::WebviewWindowBuilder<'a, tauri::Wry, tauri::AppHandle>,
) -> tauri::WebviewWindowBuilder<'a, tauri::Wry, tauri::AppHandle> {
    builder
}

/// WebKitGTK does not report an ended content process through Tauri.
pub(crate) fn web_content_hooks(builder: tauri::Builder<tauri::Wry>) -> tauri::Builder<tauri::Wry> {
    builder
}

pub(crate) fn system_prefers_chinese() -> bool {
    ["LANGUAGE", "LC_ALL", "LC_MESSAGES", "LANG"]
        .iter()
        .find_map(|key| std::env::var(key).ok().filter(|value| !value.is_empty()))
        .is_some_and(|value| value.starts_with("zh"))
}

/// Not drawn yet: GTK is not running before Tauri starts, so the message
/// goes to standard error.
pub(crate) fn alert(title: &str, body: &str, _ok: &str) {
    eprintln!("{title}: {body}");
}

/// Opens `url` in the default browser.
pub(crate) fn open_in_browser(url: &str) -> Result<(), String> {
    std::process::Command::new("xdg-open")
        .arg(url)
        .spawn()
        .map(|_| ())
        .map_err(|error| error.to_string())
}
