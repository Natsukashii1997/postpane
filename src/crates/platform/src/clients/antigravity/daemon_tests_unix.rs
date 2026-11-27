//! Discovery files behind links are not read (postpane#560 P2-01).
use super::tests::{hub, HUB};
use super::*;
use std::os::unix::fs::symlink;

#[test]
fn linked_storage_daemon_folders_and_files_are_not_read() {
    let home = tempfile::tempdir().unwrap();
    let elsewhere = home.path().join("elsewhere");
    fs::create_dir_all(elsewhere.join("daemon")).unwrap();
    fs::write(elsewhere.join("daemon/hub.json"), HUB).unwrap();
    fs::write(elsewhere.join("hub.json"), HUB).unwrap();
    // The storage folder itself is a link.
    let linked_root = home.path().join("linked-root");
    symlink(&elsewhere, &linked_root).unwrap();
    // The daemon folder is a link.
    let root = home.path().join("root");
    fs::create_dir_all(&root).unwrap();
    symlink(elsewhere.join("daemon"), root.join("daemon")).unwrap();
    // The file is a link.
    let plain = home.path().join("plain");
    fs::create_dir_all(plain.join("daemon")).unwrap();
    symlink(elsewhere.join("hub.json"), plain.join("daemon/hub.json")).unwrap();
    assert!(published(&[linked_root, root, plain]).is_empty());
    assert_eq!(published(&[elsewhere]), [hub()]);
}
