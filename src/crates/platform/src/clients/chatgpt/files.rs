//! The channel's own small files that the host's handoff book shares (7a):
//! `<data>/chatgpt/config.json` (the project, the review cap, the shadow
//! switch) and private folders, made here where the system's modes are known.
use super::{folder, write_private};
use serde_json::{json, Value};
use std::{
    fs,
    path::{Path, PathBuf},
};

pub fn config_path(data: &Path) -> PathBuf {
    folder(data).join("config.json")
}

/// A small private JSON file in the channel's folder, when it is there and readable.
pub fn read_small(path: &Path) -> Option<Vec<u8>> {
    let metadata = fs::symlink_metadata(path).ok()?;
    if !metadata.is_file() || metadata.len() > 4 * 1024 * 1024 {
        return None;
    }
    fs::read(path).ok()
}

/// The config, `{}` when it is not there or not an object.
pub fn config(data: &Path) -> Value {
    read_small(&config_path(data))
        .and_then(|bytes| serde_json::from_slice(&bytes).ok())
        .filter(Value::is_object)
        .unwrap_or_else(|| json!({}))
}

/// Sets one key of the config, keeping the others.
pub fn set_config(data: &Path, name: &str, value: Value) -> Result<(), String> {
    let mut config = config(data);
    config[name] = value;
    let bytes = serde_json::to_vec_pretty(&config).map_err(|e| e.to_string())?;
    write_private(data, "config", &bytes, &config_path(data))
}

/// Whether the shadow read (#488) is switched on (`dataShadow: true`).
pub fn data_shadow(data: &Path) -> bool {
    config(data)["dataShadow"] == true
}

/// Makes `path` a folder only this user can read and write.
pub fn private_directory(path: &Path) -> Result<(), String> {
    crate::os::private_directory(path)
}
