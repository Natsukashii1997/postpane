use super::*;
use std::{
    collections::{HashMap, HashSet},
    os::unix::fs::PermissionsExt,
    sync::atomic::AtomicBool,
    time::Duration,
};

fn context(home: &Path) -> AccountContext {
    AccountContext {
        home: home.into(),
        data_dir: home.into(),
        env: HashMap::new(),
        account_homes: HashMap::new(),
        http: reqwest::blocking::Client::new(),
        children: Arc::new(Mutex::new(Vec::new())),
        cancelled: Arc::new(AtomicBool::new(false)),
        copilot_consent: Arc::new(AtomicBool::new(false)),
        relay_consent: Arc::new(Mutex::new(HashSet::new())),
    }
}

/// A fake engine that leaves a helper holding its stdout and stderr, writes
/// the helper's pid to `pid`, says it is ready, then runs `tail`.
fn engine(home: &Path, tail: &str) -> (Engine, libc::pid_t) {
    let script = home.join("fake-engine");
    fs::write(
        &script,
        format!("#!/bin/sh\nsleep 30 &\necho $! > \"$1\"\necho '{{\"ready\":true}}'\n{tail}\n"),
    )
    .unwrap();
    fs::set_permissions(&script, fs::Permissions::from_mode(0o700)).unwrap();
    let pid = home.join("helper.pid");
    let pid_arg = pid.to_str().unwrap();
    let engine = Engine::start(
        &context(home),
        &script,
        &[pid_arg],
        &home.join("folder"),
        &[],
    )
    .unwrap();
    let ready = engine.next(Instant::now() + Duration::from_secs(5));
    assert_eq!(ready, Some(serde_json::json!({"ready": true})));
    let helper = fs::read_to_string(&pid).unwrap().trim().parse().unwrap();
    (engine, helper)
}

fn gone(pid: libc::pid_t) -> bool {
    let deadline = Instant::now() + Duration::from_secs(3);
    loop {
        // SAFETY: signal 0 only asks whether the pid exists.
        if unsafe { libc::kill(pid, 0) } != 0 {
            return true;
        }
        if Instant::now() > deadline {
            return false;
        }
        std::thread::sleep(Duration::from_millis(20));
    }
}

/// Ends only the helper this test started, if the code under test did not.
fn reap(pid: libc::pid_t) {
    // SAFETY: the pid is the helper this test's own fake engine started, and
    // it is still running (`gone` returned false).
    unsafe { libc::kill(pid, libc::SIGKILL) };
}

#[test]
fn ending_an_engine_ends_the_helpers_still_holding_its_output() {
    // The engine itself exits at once, or stays until it is ended.
    for tail in ["exit 0", "wait"] {
        let home = tempfile::tempdir().unwrap();
        let (engine, helper) = engine(home.path(), tail);
        drop(engine);
        let ended = gone(helper);
        if !ended {
            reap(helper);
        }
        assert!(ended, "after `{tail}`, the helper outlived its engine");
    }
}

#[test]
fn stopping_ends_the_output_the_readers_wait_on() {
    let home = tempfile::tempdir().unwrap();
    let (engine, helper) = engine(home.path(), "wait");
    // What `AccountService::stop` does for every engine still running.
    let child = engine.child.clone();
    crate::os::kill_process_tree(&mut child.lock().unwrap());
    let next = engine.next(Instant::now() + Duration::from_secs(3));
    let ended = engine.ended();
    if !gone(helper) {
        reap(helper);
    }
    assert_eq!(next, None);
    assert!(ended, "the stdout reader saw its output end");
}

#[test]
fn what_an_engine_wrote_to_stderr_keeps_no_secret() {
    let home = tempfile::tempdir().unwrap();
    let script = home.path().join("fake-engine");
    fs::write(
        &script,
        "#!/bin/sh\necho 'Authorization: Bearer sk-ant-api03-AbCdEf0123456789xyz' >&2\n\
         echo 'proxy said 401 for https://x.test/v1?access_token=t0k3n' >&2\n",
    )
    .unwrap();
    fs::set_permissions(&script, fs::Permissions::from_mode(0o700)).unwrap();
    let engine = Engine::start(
        &context(home.path()),
        &script,
        &[],
        &home.path().join("folder"),
        &[],
    )
    .unwrap();
    assert_eq!(engine.next(Instant::now() + Duration::from_secs(5)), None);
    // stderr is drained by its own thread: wait for the second line.
    let deadline = Instant::now() + Duration::from_secs(3);
    while engine
        .stderr_preview(1000)
        .is_none_or(|text| !text.contains("access_token="))
        && Instant::now() < deadline
    {
        std::thread::sleep(Duration::from_millis(20));
    }
    assert_eq!(
        engine.stderr_preview(200).as_deref(),
        Some("Authorization: ***\nproxy said 401 for https://x.test/v1?access_token=***")
    );
}
