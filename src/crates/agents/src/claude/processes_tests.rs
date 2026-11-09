use super::*;

const SESSION: &str = "11111111-2222-4333-8444-555555555555";
const OTHER: &str = "66666666-7777-4888-9999-000000000000";
/// `procStart` of the processes below: 2026-11-09 00:21:08 UTC.
const STARTED: i64 = 1_794_183_668;

fn roots(config: &Path) -> Vec<(PathBuf, &'static str)> {
    vec![(config.join("projects"), "claude")]
}

fn register(config: &Path, pid: i32, session: &str) -> PathBuf {
    let path = config.join(format!("sessions/{pid}.json"));
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(
        &path,
        serde_json::json!({"pid":pid,"sessionId":session,"pidDomain":"darwin",
            "procStart":"Mon Nov  9 00:21:08 2026","status":"busy"})
        .to_string(),
    )
    .unwrap();
    path
}

/// Pids below 1 000 run, as started; any other pid is gone.
fn runs(pid: i32, started: Option<i64>) -> bool {
    pid < 1_000 && started == Some(STARTED)
}

#[test]
fn a_session_whose_process_was_killed_has_ended() {
    let temp = tempfile::tempdir().unwrap();
    let config = temp.path().join(".claude");
    let mut processes = ClaudeProcesses::default();
    // Killed outright: the file stays, its pid no longer runs.
    register(&config, 41_107, SESSION);
    assert!(processes.refresh_with(&roots(&config), 5_000, Some(("darwin", runs))));
    assert!(processes.ended(SESSION, Some(4_000)));
    // Something happened in it after: another process took it on.
    assert!(!processes.ended(SESSION, Some(6_000)));
}

#[test]
fn a_session_whose_process_runs_goes_on() {
    let temp = tempfile::tempdir().unwrap();
    let config = temp.path().join(".claude");
    let mut processes = ClaudeProcesses::default();
    register(&config, 500, SESSION);
    assert!(!processes.refresh_with(&roots(&config), 5_000, Some(("darwin", runs))));
    assert!(!processes.ended(SESSION, Some(4_000)));
    // A session no file names keeps the transcript's word.
    assert!(!processes.ended(OTHER, Some(4_000)));
}

#[test]
fn a_session_whose_process_exited_cleanly_has_ended() {
    let temp = tempfile::tempdir().unwrap();
    let config = temp.path().join(".claude");
    let mut processes = ClaudeProcesses::default();
    let file = register(&config, 500, SESSION);
    processes.refresh_with(&roots(&config), 1_000, Some(("darwin", runs)));
    fs::remove_file(file).unwrap();
    assert!(processes.refresh_with(&roots(&config), 5_000, Some(("darwin", runs))));
    assert!(processes.ended(SESSION, Some(4_000)));
}

#[test]
fn a_reused_pid_is_another_program() {
    let temp = tempfile::tempdir().unwrap();
    let config = temp.path().join(".claude");
    let mut processes = ClaudeProcesses::default();
    register(&config, 500, SESSION);
    let later = |pid: i32, started: Option<i64>| runs(pid, started.map(|at| at + 86_400));
    processes.refresh_with(&roots(&config), 5_000, Some(("darwin", later)));
    assert!(processes.ended(SESSION, Some(4_000)));
}

#[test]
fn a_session_that_came_back_goes_on() {
    let temp = tempfile::tempdir().unwrap();
    let config = temp.path().join(".claude");
    let mut processes = ClaudeProcesses::default();
    register(&config, 41_107, SESSION);
    processes.refresh_with(&roots(&config), 5_000, Some(("darwin", runs)));
    // Resumed in a new process that registered.
    register(&config, 600, SESSION);
    assert!(processes.refresh_with(&roots(&config), 9_000, Some(("darwin", runs))));
    assert!(!processes.ended(SESSION, Some(4_000)));
}

#[test]
fn without_the_hosts_word_every_process_runs() {
    let temp = tempfile::tempdir().unwrap();
    let config = temp.path().join(".claude");
    let mut processes = ClaudeProcesses::default();
    register(&config, 41_107, SESSION);
    processes.refresh_with(&roots(&config), 5_000, None);
    assert!(!processes.ended(SESSION, Some(4_000)));
    // A file another host wrote says nothing of this host's pids.
    processes.refresh_with(&roots(&config), 5_000, Some(("linux", runs)));
    assert!(!processes.ended(SESSION, Some(4_000)));
}
