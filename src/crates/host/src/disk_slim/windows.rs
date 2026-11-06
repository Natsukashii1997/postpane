//! 磁盘瘦身 is a macOS app; on Windows there is nothing to hang.
use std::path::PathBuf;

pub(super) fn status_file() -> Option<PathBuf> {
    None
}

pub(super) fn installed() -> bool {
    false
}

pub(super) fn open_link(_url: &str) -> Result<(), String> {
    Err("磁盘瘦身只有 macOS 版".into())
}
