//! The ChatGPT relay's settings, read and set from Settings' 「智能体插件」
//! page: where new review conversations open, and how many reviews one
//! leave of the person's gives (#409).
use super::{demo, Desk};
use crate::handoff::book;
use serde_json::{json, Value};
use tauri::Manager;

impl Desk {
    /// Sets the review cap, 1 to `LIMIT_MAX` (#409); the next review asked
    /// counts against it, the ones under way keep theirs.
    pub(crate) fn set_review_limit(&self, limit: u32) -> Result<u32, String> {
        let data = self.data.as_deref().ok_or_else(demo)?;
        book::set_review_limit(data, limit)
    }
}

/// Only Settings sets these.
fn from_settings(window: &tauri::WebviewWindow, what: &str) -> Result<(), String> {
    if window.label() == "main" {
        Ok(())
    } else {
        Err(format!("The ChatGPT {what} is set in Settings"))
    }
}

/// Settings' 「新会话放进项目」: the project page, read (no `project`) or set.
#[tauri::command]
pub fn chatgpt_project(
    window: tauri::WebviewWindow,
    app: tauri::AppHandle,
    project: Option<String>,
) -> Result<Value, String> {
    from_settings(&window, "project")?;
    let desk = app.try_state::<Desk>().ok_or_else(demo)?;
    let project = match project {
        Some(text) => desk.set_project(&text)?,
        None => desk.project(),
    };
    Ok(json!({ "project": project }))
}

/// Settings' 「审核轮数上限」: the cap, read (no `limit`) or set, with the
/// range the setting takes (#409).
#[tauri::command]
pub fn chatgpt_review_limit(
    window: tauri::WebviewWindow,
    app: tauri::AppHandle,
    limit: Option<u32>,
) -> Result<Value, String> {
    from_settings(&window, "review cap")?;
    let desk = app.try_state::<Desk>().ok_or_else(demo)?;
    let limit = match limit {
        Some(limit) => desk.set_review_limit(limit)?,
        None => desk.review_limit(),
    };
    Ok(json!({ "limit": limit, "max": book::LIMIT_MAX, "default": book::LIMIT }))
}
