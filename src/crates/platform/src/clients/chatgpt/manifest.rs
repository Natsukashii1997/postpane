//! The native messaging host manifest that lets Chrome start the relay for
//! PostPane's extension. Written and removed only from Settings.
use agent_hud_agents::chatgpt as agent;
use agent_hud_core::l10n;
use serde_json::{json, Value};
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
};

/// The manifest for the relay at `engine`, an absolute path.
pub fn manifest(engine: &Path) -> Value {
    json!({
        "name": agent::HOST_NAME,
        "description": "PostPane ChatGPT channel",
        "path": engine,
        "type": "stdio",
        "allowed_origins": [agent::EXTENSION_ORIGIN],
    })
}

/// Where Chrome reads this user's native host manifests on this system.
pub fn manifest_directory() -> Result<PathBuf, String> {
    let location = agent::NATIVE_HOSTS
        .on(crate::os::OS)
        .value()
        .ok_or_else(|| {
            l10n::text(
                "这个系统还不能登记 Chrome 插件",
                "This system cannot register the Chrome extension yet",
            )
        })?;
    let home = crate::os::home_dir()?;
    let env = std::env::vars().collect::<crate::os::Environment>();
    crate::os::resolve(&home, &env, location)
        .into_iter()
        .next()
        .ok_or_else(|| "Chrome's native host folder is unavailable".into())
}
pub fn manifest_path(directory: &Path) -> PathBuf {
    directory.join(format!("{}.json", agent::HOST_NAME))
}

/// Whether a build output, disk image or translocated copy is at `path`:
/// Chrome would start a relay that soon moves or goes away.
pub fn transient(path: &Path) -> bool {
    let text = path.to_string_lossy();
    text.starts_with("/Volumes/")
        || text.contains("/AppTranslocation/")
        || path.components().any(|part| part.as_os_str() == "target")
}

/// Whether the manifest is there, and whether it names the relay at
/// `engine` with exactly what `manifest` writes.
pub fn manifest_state(directory: &Path, engine: Option<&Path>) -> (bool, bool) {
    let path = manifest_path(directory);
    let Some(written) = fs::read(&path)
        .ok()
        .filter(|bytes| bytes.len() <= 64 * 1024)
        .and_then(|bytes| serde_json::from_slice::<Value>(&bytes).ok())
    else {
        return (path.is_file(), false);
    };
    (
        true,
        engine.is_some_and(|engine| written == manifest(engine)),
    )
}

/// Writes the manifest for the relay at `engine`, replacing any before it.
pub fn install_manifest(directory: &Path, engine: &Path) -> Result<(), String> {
    if !engine.is_absolute() || transient(engine) || !engine.is_file() {
        return Err(l10n::text(
            "转接程序必须是指定安装位置的驿窗里打包的那份，不能是编译目录、磁盘映像或被系统转移的副本。",
            "The relay must be the one packaged in PostPane at its approved location, not a build output, disk image or translocated copy.",
        ));
    }
    // Chrome's own folder: it may not exist before a first native host.
    fs::create_dir_all(directory).map_err(|_| "Chrome's native host folder is unavailable")?;
    let bytes = serde_json::to_vec_pretty(&manifest(engine)).map_err(|_| "Manifest unavailable")?;
    let temporary = directory.join(format!(".{}.{}.tmp", agent::HOST_NAME, std::process::id()));
    let _ = fs::remove_file(&temporary);
    let result = crate::os::private_file(&temporary, true)
        .and_then(|mut file| file.write_all(&bytes))
        .and_then(|()| fs::rename(&temporary, manifest_path(directory)));
    if result.is_err() {
        let _ = fs::remove_file(&temporary);
    }
    result.map_err(|_| "The native host manifest could not be written".into())
}

/// Removes the manifest; nothing to do when it is not there.
pub fn remove_manifest(directory: &Path) -> Result<(), String> {
    match fs::remove_file(manifest_path(directory)) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(_) => Err("The native host manifest could not be removed".into()),
    }
}
