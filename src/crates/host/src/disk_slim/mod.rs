//! 磁盘瘦身 (disk-slim, a separate app on this machine), hung under the notes
//! pendant as its broom ball (#155). PostPane draws the pendant; a click asks
//! the app to open its own panel beside it. The two speak only through the
//! app's status file and its `diskslim://` link, never a network port (see
//! disk-slim's docs/PRD.md 3.5). Each host file provides:
//!   status_file()   where the app writes status.json, if this host has one
//!   installed()     whether the app is on this machine
//!   open_link(url)  hands the link to the app without bringing it forward
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use tauri::WebviewWindow;

#[cfg(target_os = "macos")]
#[path = "macos.rs"]
mod host;
#[cfg(target_os = "windows")]
#[path = "windows.rs"]
mod host;
#[cfg(target_os = "linux")]
#[path = "linux.rs"]
mod host;

/// A status older than this is not shown: the app is not running, or its
/// writes fail (it rewrites the file at least every five minutes).
const STALE_SECONDS: i64 = 3600;

#[derive(Clone, Copy, Debug, PartialEq, Deserialize)]
pub(crate) struct Rect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

/// What the app last wrote; fields this side does not use are ignored.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StatusFile {
    available_bytes: i64,
    level: String,
    updated_at: DateTime<Utc>,
    #[serde(default)]
    panel_open: bool,
}

/// What the pendant needs: whether to hang at all, and the badge's reading.
#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DiskSlimStatus {
    pub installed: bool,
    /// Free space in bytes, when the status is fresh.
    pub available_bytes: Option<i64>,
    /// "ok", "low" or "critical", when the status is fresh.
    pub level: Option<String>,
    /// The app's panel is showing (the pendant's halo).
    pub panel_open: bool,
}

/// Reads the status file's text as of `now`. A stale, unreadable or unknown
/// status leaves the reading empty, so the pendant hangs without a badge.
fn reading(installed: bool, text: Option<&str>, now: DateTime<Utc>) -> DiskSlimStatus {
    let mut status = DiskSlimStatus {
        installed,
        ..DiskSlimStatus::default()
    };
    let Some(file) = text.and_then(|text| serde_json::from_str::<StatusFile>(text).ok()) else {
        return status;
    };
    let age = now.signed_duration_since(file.updated_at).num_seconds();
    if !(-60..STALE_SECONDS).contains(&age) {
        return status;
    }
    if matches!(file.level.as_str(), "ok" | "low" | "critical") && file.available_bytes >= 0 {
        status.available_bytes = Some(file.available_bytes);
        status.level = Some(file.level);
    }
    status.panel_open = file.panel_open;
    status
}

/// The link that opens or hides the app's panel beside the ball at `ball`
/// (points, the main screen's top-left as origin).
fn toggle_link(ball: Rect) -> String {
    format!(
        "diskslim://panel/toggle?x={:.1}&y={:.1}&w={:.1}&h={:.1}",
        ball.x, ball.y, ball.width, ball.height
    )
}

#[tauri::command]
pub(crate) async fn disk_slim_status() -> DiskSlimStatus {
    let text = host::status_file().and_then(|path| std::fs::read_to_string(path).ok());
    reading(host::installed(), text.as_deref(), Utc::now())
}

/// Opens or hides the app's panel beside the ball at `anchor` (points, in the
/// calling HUD window's page).
#[tauri::command]
pub(crate) async fn toggle_disk_slim(window: WebviewWindow, anchor: Rect) -> Result<(), String> {
    let scale = window.scale_factor().map_err(|error| error.to_string())?;
    let origin = window
        .inner_position()
        .map_err(|error| error.to_string())?
        .to_logical::<f64>(scale);
    host::open_link(&toggle_link(Rect {
        x: origin.x + anchor.x,
        y: origin.y + anchor.y,
        ..anchor
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn at(text: &str) -> DateTime<Utc> {
        text.parse().unwrap()
    }

    const FILE: &str = r#"{"availableBytes":30965669888,"level":"critical","panelOpen":true,"totalBytes":494332366848,"updatedAt":"2026-11-06T06:25:18Z","version":1}"#;

    #[test]
    fn a_fresh_status_gives_the_badge_its_reading_and_the_halo() {
        let status = reading(true, Some(FILE), at("2026-11-06T06:30:00Z"));
        assert_eq!(
            status,
            DiskSlimStatus {
                installed: true,
                available_bytes: Some(30_965_669_888),
                level: Some("critical".into()),
                panel_open: true,
            }
        );
    }

    #[test]
    fn a_status_an_hour_old_hangs_the_pendant_without_a_badge() {
        let status = reading(true, Some(FILE), at("2026-11-06T07:25:18Z"));
        assert_eq!(status.available_bytes, None);
        assert_eq!(status.level, None);
        assert!(!status.panel_open);
        assert!(status.installed);
        // A clock a little behind the app's still reads it.
        assert!(reading(true, Some(FILE), at("2026-11-06T06:24:50Z"))
            .level
            .is_some());
        // One far ahead of now does not.
        assert!(reading(true, Some(FILE), at("2026-11-06T06:00:00Z"))
            .level
            .is_none());
    }

    #[test]
    fn a_missing_broken_or_odd_status_shows_no_badge() {
        let now = at("2026-11-06T06:30:00Z");
        assert_eq!(reading(true, None, now).level, None);
        assert_eq!(reading(true, Some("{half"), now).level, None);
        let odd = FILE.replace("critical", "dire");
        assert_eq!(reading(true, Some(&odd), now).level, None);
        let negative = FILE.replace("30965669888", "-1");
        assert_eq!(reading(true, Some(&negative), now).level, None);
        // An older file without panelOpen reads as closed.
        let old = r#"{"availableBytes":5,"level":"low","updatedAt":"2026-11-06T06:25:18Z"}"#;
        assert!(!reading(true, Some(old), now).panel_open);
        assert_eq!(reading(true, Some(old), now).level.as_deref(), Some("low"));
    }

    #[test]
    fn not_installed_says_so_whatever_the_file() {
        assert!(!reading(false, Some(FILE), at("2026-11-06T06:30:00Z")).installed);
    }

    #[test]
    fn the_link_carries_the_ball_in_points() {
        let link = toggle_link(Rect {
            x: 1413.25,
            y: 300.0,
            width: 49.0,
            height: 49.0,
        });
        assert_eq!(
            link,
            "diskslim://panel/toggle?x=1413.2&y=300.0&w=49.0&h=49.0"
        );
    }
}
