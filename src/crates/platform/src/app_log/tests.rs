use super::*;
use std::path::Path;

fn write(folder: &Path, name: &str, bytes: usize) {
    fs::write(folder.join(name), vec![b'x'; bytes]).unwrap();
}
fn size(folder: &Path, name: &str) -> Option<u64> {
    fs::metadata(folder.join(name)).ok().map(|file| file.len())
}

#[test]
fn a_file_within_the_limit_stays_where_it_is() {
    let folder = tempfile::tempdir().unwrap();
    write(folder.path(), FILE, 10);
    rotate(folder.path(), 10).unwrap();
    assert_eq!(size(folder.path(), FILE), Some(10));
    assert_eq!(size(folder.path(), "postpane.1.log"), None);
}

#[test]
fn a_file_past_the_limit_is_set_aside_and_only_two_older_ones_are_kept() {
    let folder = tempfile::tempdir().unwrap();
    write(folder.path(), FILE, 11);
    write(folder.path(), "postpane.1.log", 5);
    write(folder.path(), "postpane.2.log", 3);
    rotate(folder.path(), 10).unwrap();
    assert_eq!(size(folder.path(), FILE), None);
    assert_eq!(size(folder.path(), "postpane.1.log"), Some(11));
    assert_eq!(size(folder.path(), "postpane.2.log"), Some(5));
    assert_eq!(size(folder.path(), "postpane.3.log"), None);
}

#[test]
fn no_file_yet_is_nothing_to_set_aside() {
    let folder = tempfile::tempdir().unwrap();
    rotate(folder.path(), 10).unwrap();
    assert_eq!(fs::read_dir(folder.path()).unwrap().count(), 0);
}

#[test]
fn a_start_says_when_which_build_and_which_process() {
    let line = header(
        "2026-11-20 21:51:03.123 +0800",
        "0.1.0",
        4242,
        "/Applications/PostPane.app/Contents/MacOS/PostPane",
        "2026-11-20 17:01:02.000 +0800",
    );
    assert_eq!(
        line,
        "2026-11-20 21:51:03.123 +0800 ==== PostPane 0.1.0 started, pid 4242, \
         /Applications/PostPane.app/Contents/MacOS/PostPane built 2026-11-20 17:01:02.000 +0800"
    );
}

#[test]
fn a_panic_says_when_where_on_which_thread_and_how_it_got_there() {
    let report = panic_report(
        "2026-11-20 21:51:03.123 +0800",
        "agenthud-data",
        "src/crates/host/src/lib.rs:400:9",
        "index out of bounds",
        "0: first\n1: second",
    );
    assert_eq!(
        report,
        "2026-11-20 21:51:03.123 +0800 PANIC on thread agenthud-data at \
         src/crates/host/src/lib.rs:400:9: index out of bounds\n  0: first\n  1: second"
    );
}
