//! The ChatGPT channel (docs/chatgpt-channel.md): the socket the PostPane
//! Chrome extension connects to while the app runs, what the app and its
//! local tools ask of it, and Settings → Agent plugins' row, which registers
//! the native host manifest Chrome needs. The manifest is written and removed
//! only when the user asks there.
use agent_hud_runtime::chatgpt::{self as channel, Channel};
use agent_hud_runtime::l10n;
use serde_json::{json, Value};
use std::{
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::Manager;

pub struct ChatGpt {
    channel: Option<Channel>,
    /// Why the channel is not listening, when it is not.
    error: Option<String>,
    owner: Mutex<()>,
}

impl ChatGpt {
    /// Listens in `data`; none in the demo, which reaches no browser.
    pub(crate) fn start(data: Option<PathBuf>) -> Self {
        let (channel, error) = match data.map(Channel::start) {
            Some(Ok(channel)) => (Some(channel), None),
            Some(Err(error)) => (None, Some(error)),
            None => (None, Some("Not available in the demo".into())),
        };
        Self {
            channel,
            error,
            owner: Mutex::new(()),
        }
    }
    pub(crate) fn channel(&self) -> Result<&Channel, String> {
        self.channel.as_ref().ok_or_else(|| {
            let reason = self.error.as_deref().unwrap_or("");
            if l10n::chinese() {
                format!("ChatGPT 通道没有打开：{reason}")
            } else {
                format!("The ChatGPT channel is not open: {reason}")
            }
        })
    }
    /// Whether the extension is connected now.
    pub(crate) fn connected(&self) -> bool {
        self.channel
            .as_ref()
            .is_some_and(|channel| channel.status()["connected"] == true)
    }
    /// Whether the user registered the extension's native host (Settings),
    /// so Claude may reach it through the local tools channel.
    pub(crate) fn registered(&self) -> bool {
        self.channel.is_some()
            && channel::manifest_directory()
                .is_ok_and(|directory| channel::manifest_path(&directory).is_file())
    }
    fn status(&self) -> Value {
        match &self.channel {
            Some(channel) => channel.status(),
            None => {
                json!({"connected":false,"extensionVersion":null,"extensionId":null,"lastSeen":null,"tabs":null,"watched":[],"notice":self.error})
            }
        }
    }
}

/// What the app's local tools ask of the channel (`chatgpt_open`,
/// `chatgpt_send`, `chatgpt_status`). Opening waits up to 90 s and sending
/// up to 30 s for the extension's answer.
pub(crate) fn tool(app: &tauri::AppHandle, method: &str, params: &Value) -> Result<Value, String> {
    let state = app
        .try_state::<ChatGpt>()
        .ok_or("The ChatGPT channel is unavailable")?;
    let text = || {
        params["text"]
            .as_str()
            .ok_or_else(|| l10n::text("缺少要发出的文字", "Text is required"))
    };
    match method {
        "chatgpt_status" => Ok(state.status()),
        "chatgpt_open" => state.channel()?.open(text()?, params["project"].as_str()),
        "chatgpt_send" => state.channel()?.send(
            params["conversation"]
                .as_str()
                .ok_or_else(|| l10n::text("缺少会话 id", "Conversation is required"))?,
            text()?,
        ),
        _ => Err("Unknown ChatGPT tool".into()),
    }
}

/// The relay packaged in this app, when this is the fixed installed app:
/// only that copy may be named in Chrome's manifest.
fn helper(app: &tauri::AppHandle) -> Option<PathBuf> {
    let options = app.state::<super::HostOptions>();
    let fixed = options.canonical_executable.as_ref()?;
    if std::env::current_exe().ok().as_ref() != Some(fixed) {
        return None;
    }
    let engine = super::cli::resource("agent-hud-engine")?
        .canonicalize()
        .ok()?;
    (!channel::transient(&engine)).then_some(engine)
}

/// Settings' row: whether Chrome's manifest is there and names this app's
/// relay, whether there is a relay to name, and the extension's connection.
fn settings_status(directory: Option<&Path>, helper: Option<&Path>, connection: Value) -> Value {
    let (installed, current) = directory
        .map(|directory| channel::manifest_state(directory, helper))
        .unwrap_or((false, false));
    json!({
        "supported": directory.is_some(),
        "manifestInstalled": installed,
        "manifestCurrent": current,
        "helperFound": helper.is_some(),
        "connected": connection["connected"],
        "extensionVersion": connection["extensionVersion"],
        "lastSeen": connection["lastSeen"],
        "watched": connection["watched"],
    })
}

#[tauri::command]
pub async fn native_chatgpt_extension(
    window: tauri::WebviewWindow,
    app: tauri::AppHandle,
    action: String,
) -> Result<Value, String> {
    if window.label() != "main" {
        return Err("The ChatGPT extension is set up in Settings".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<ChatGpt>();
        let _owner = state
            .owner
            .lock()
            .map_err(|_| "The ChatGPT channel's owner is unavailable")?;
        let directory = channel::manifest_directory();
        let helper = helper(&app);
        match action.as_str() {
            "status" => {}
            "install" => {
                let directory = directory.as_ref().map_err(Clone::clone)?;
                let engine = helper.as_deref().ok_or_else(|| {
                    l10n::text(
                        "登记需要从指定安装位置运行的驿窗和它打包的转接程序。",
                        "Registering needs PostPane at its approved location with its packaged relay.",
                    )
                })?;
                channel::install_manifest(directory, engine)?;
            }
            "remove" => channel::remove_manifest(directory.as_ref().map_err(Clone::clone)?)?,
            _ => return Err("Unknown ChatGPT extension action".into()),
        }
        if action != "status" {
            // Registering opens the local tools channel for relay_to_chatgpt.
            if let Some(service) = app.try_state::<super::Service>() {
                if let Ok(mut backend) = service.backend.lock() {
                    backend.refresh_tools(&app);
                }
            }
        }
        Ok(settings_status(
            directory.as_deref().ok(),
            helper.as_deref(),
            state.status(),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn chatgpt_open(
    app: tauri::AppHandle,
    text: String,
    project: Option<String>,
) -> Result<Value, String> {
    let params = json!({"text":text,"project":project});
    tauri::async_runtime::spawn_blocking(move || tool(&app, "chatgpt_open", &params))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn chatgpt_send(
    app: tauri::AppHandle,
    conversation: String,
    text: String,
) -> Result<Value, String> {
    let params = json!({"conversation":conversation,"text":text});
    tauri::async_runtime::spawn_blocking(move || tool(&app, "chatgpt_send", &params))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn chatgpt_status(app: tauri::AppHandle) -> Result<Value, String> {
    tool(&app, "chatgpt_status", &Value::Null)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_settings_row_reads_the_manifest_and_the_connection() {
        let temp = tempfile::tempdir().unwrap();
        let directory = temp.path().join("hosts");
        let engine = temp.path().join("agent-hud-engine");
        std::fs::write(&engine, b"").unwrap();
        let connection =
            json!({"connected":true,"extensionVersion":"0.1.0","lastSeen":5,"watched":[]});
        let before = settings_status(Some(&directory), Some(&engine), connection.clone());
        assert_eq!(
            before,
            json!({"supported":true,"manifestInstalled":false,"manifestCurrent":false,"helperFound":true,"connected":true,"extensionVersion":"0.1.0","lastSeen":5,"watched":[]})
        );
        channel::install_manifest(&directory, &engine).unwrap();
        let after = settings_status(Some(&directory), Some(&engine), connection.clone());
        assert_eq!(after["manifestInstalled"], true);
        assert_eq!(after["manifestCurrent"], true);
        // Without this app's relay, a manifest is there but not this app's.
        let other = settings_status(Some(&directory), None, connection.clone());
        assert_eq!(other["manifestCurrent"], false);
        assert_eq!(other["helperFound"], false);
        let unsupported = settings_status(None, None, connection);
        assert_eq!(unsupported["supported"], false);
        assert_eq!(unsupported["manifestInstalled"], false);
    }

    #[test]
    fn a_channel_that_did_not_open_says_why() {
        let demo = ChatGpt::start(None);
        assert_eq!(demo.status()["connected"], false);
        assert!(demo.channel().is_err());
    }
}
