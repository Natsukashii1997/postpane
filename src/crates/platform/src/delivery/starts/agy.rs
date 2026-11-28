//! Starting an Antigravity session through its command line when no language
//! server runs: `agy -p` in the background, its event stream read until it
//! names the conversation. The turn then finishes on its own, and its reply
//! is read from the conversation like any other.
use super::super::process::Background;
use super::*;
use agent_hud_core::l10n;
use std::time::Instant;

/// How long a start waits for `agy` to name its conversation.
#[cfg(not(test))]
const NAMED_WITHIN: Duration = Duration::from_secs(20);
#[cfg(test)]
const NAMED_WITHIN: Duration = Duration::from_millis(300);
/// How long a start left uncertain is still followed in the background
/// before an `agy` that named nothing is stopped.
#[cfg(not(test))]
const FOLLOWED_FOR: Duration = Duration::from_secs(10 * 60);
#[cfg(test)]
const FOLLOWED_FOR: Duration = Duration::from_millis(300);
/// Stream logs a crash left behind are removed at the next start.
const KEPT_FOR: Duration = Duration::from_secs(7 * 24 * 60 * 60);

/// What a start has heard from `agy` so far.
#[derive(Debug, PartialEq)]
enum Heard {
    Nothing,
    Started(String),
    NeedsLogin,
    Failed(String),
}

/// How a start through `agy` ended. Only a sign-in prompt, which comes
/// before any conversation exists, proves none was made; an `agy` that
/// failed, ended or went quiet without naming one may still have made one.
enum Settled {
    Named(String),
    NotSignedIn,
    Unknown(String),
}

impl SessionStarts {
    /// `reason` is why the language server could not start it, kept when
    /// there is no `agy` either.
    pub(super) fn start_agy(
        &self,
        folder: &Path,
        request: &StartRequest,
        reason: String,
    ) -> Result<StartReceipt> {
        let Some(executable) = self.config.antigravity_executable.as_ref() else {
            return Err(Failure::Unavailable(reason));
        };
        // The stream holds the whole turn: only this user may read it, and
        // it is removed once the start is settled.
        let logs = self.agy_logs();
        private_dir(&logs)?;
        prune(&logs);
        let log = logs.join(format!("{}.ndjson", request.request_id));
        let _ = fs::remove_file(&log);
        let plan = self.plan(
            executable,
            vec![
                prompt(&request.text),
                "--output-format".into(),
                "stream-json".into(),
            ],
            Some(folder),
            NAMED_WITHIN.as_secs(),
        );
        let mut process = self.runner.spawn(&plan, &log)?;
        let Some(settled) = watch(&mut *process, &log, NAMED_WITHIN) else {
            // Still running, nothing named yet: saved uncertain, and
            // completed when `agy` names its conversation.
            let receipts = self.receipts.clone();
            let request_id = request.request_id.clone();
            std::thread::spawn(move || follow(process, &log, &receipts, &request_id));
            return Ok(unsettled(
                &request.request_id,
                "agy has not named its conversation yet; still following it".into(),
            ));
        };
        record(&self.receipts, &log, &request.request_id, settled)
    }

    fn agy_logs(&self) -> PathBuf {
        self.config.task_root.with_file_name("agy-starts")
    }

    /// After a restart, nothing follows the starts a quit left uncertain: a
    /// stream that has since named its conversation completes its start, and
    /// streams of settled starts are removed. Others stay until `agy` names
    /// one or `KEPT_FOR` passes. A stream that asked to sign in stays
    /// uncertain, saying so: the `agy` that printed it may still run, and
    /// nothing here can stop it or see it end.
    pub(super) fn recover_agy_starts(&self) {
        for entry in fs::read_dir(self.agy_logs())
            .into_iter()
            .flatten()
            .flatten()
        {
            let path = entry.path();
            if path.extension().and_then(|ext| ext.to_str()) != Some("ndjson") {
                continue;
            }
            let Some(request_id) = path
                .file_stem()
                .and_then(|stem| stem.to_str())
                .filter(|id| valid_uuid(id))
            else {
                continue;
            };
            let key = super::start::receipt_path(&self.receipts, Provider::Antigravity, request_id);
            let saved = &read_json(&key)["receipt"];
            if saved["requestId"] != request_id
                || saved["provider"] != serde_json::json!(Provider::Antigravity)
            {
                continue;
            }
            if saved["state"] != "uncertain" {
                let _ = fs::remove_file(&path);
                continue;
            }
            match heard(&fs::read_to_string(&path).unwrap_or_default()) {
                Heard::Started(id) => {
                    let _ = record(&self.receipts, &path, request_id, Settled::Named(id));
                }
                Heard::NeedsLogin => {
                    let reason = "agy asked to sign in before Agent HUD quit; whether it made a \
                                  conversation cannot be confirmed";
                    let _ =
                        super::start::settle(&self.receipts, unsettled(request_id, reason.into()));
                }
                Heard::Nothing | Heard::Failed(_) => {}
            }
        }
    }
}

/// Saves how a start through `agy` ended, then removes its stream, which
/// holds the whole turn. One whose outcome could not be saved stays for the
/// next start to read.
fn record(receipts: &Path, log: &Path, request_id: &str, settled: Settled) -> Result<StartReceipt> {
    let ended = outcome(request_id, settled);
    let receipt = match &ended {
        Ok(receipt) => receipt.clone(),
        Err(error) => StartReceipt {
            state: "rejected".into(),
            reason: Some(error.to_string()),
            session_id: None,
            ..started(request_id, String::new())
        },
    };
    match super::start::settle(receipts, receipt) {
        Ok(_) => drop(fs::remove_file(log)),
        Err(error) => {
            agent_hud_core::note!("An Antigravity start's receipt could not be saved: {error}")
        }
    }
    ended
}

fn started(request_id: &str, id: String) -> StartReceipt {
    StartReceipt {
        provider: Provider::Antigravity,
        request_id: request_id.into(),
        session_id: Some(id),
        thread_id: None,
        state: "started".into(),
        reason: None,
        job_id: None,
        handoff_pending: false,
    }
}

fn unsettled(request_id: &str, reason: String) -> StartReceipt {
    StartReceipt {
        state: "uncertain".into(),
        reason: Some(reason),
        session_id: None,
        ..started(request_id, String::new())
    }
}

/// The receipt a settled start stands on: an `agy` that asked to sign in is
/// refused (a rejected start may be retried); anything short of a named
/// conversation stays uncertain.
fn outcome(request_id: &str, settled: Settled) -> Result<StartReceipt> {
    match settled {
        Settled::Named(id) => Ok(started(request_id, id)),
        Settled::NotSignedIn => Err(Failure::Unavailable(l10n::text(
            "agy 命令行还没登录：在终端运行一次 agy，按提示登录 Google 账号",
            "The agy command line is not signed in: run agy once in a terminal and sign in",
        ))),
        Settled::Unknown(reason) => Ok(unsettled(request_id, reason)),
    }
}

/// Reads the stream until `agy` names its conversation, asks to sign in,
/// fails or ends, for at most `within`; `None` while it still runs having
/// said nothing. An `agy` that asked to sign in or failed is stopped.
fn watch(process: &mut dyn Background, log: &Path, within: Duration) -> Option<Settled> {
    let began = Instant::now();
    loop {
        // Asked before reading, so an end is read with all it printed.
        let running = process.running();
        let settled = match heard(&fs::read_to_string(log).unwrap_or_default()) {
            Heard::Started(id) => return Some(Settled::Named(id)),
            Heard::NeedsLogin => Settled::NotSignedIn,
            Heard::Failed(error) => {
                Settled::Unknown(format!("agy failed without naming a conversation: {error}"))
            }
            Heard::Nothing if !running => {
                return Some(Settled::Unknown(
                    "agy ended without naming a conversation".into(),
                ))
            }
            Heard::Nothing if began.elapsed() >= within => return None,
            Heard::Nothing => {
                std::thread::sleep(Duration::from_millis(200));
                continue;
            }
        };
        process.stop();
        return Some(settled);
    }
}

/// Completes a start saved uncertain. If this app quits first, `agy` runs
/// on and finishes its turn; the stream it leaves is read at the next start
/// (`recover_agy_starts`).
fn follow(mut process: Box<dyn Background>, log: &Path, receipts: &Path, request_id: &str) {
    let settled = watch(&mut *process, log, FOLLOWED_FOR).unwrap_or_else(|| {
        // Stopped to free the computer; whether a conversation was made is
        // still unknown.
        process.stop();
        Settled::Unknown("agy named no conversation in 10 minutes and was stopped".into())
    });
    let _ = record(receipts, log, request_id, settled);
}

/// Reads `agy --output-format stream-json`, with its stderr in the same log.
/// The conversation is named at the top of an event or one level down
/// (`init`, `result`); deeper ones belong to subagents.
fn heard(log: &str) -> Heard {
    for line in log.lines() {
        let Ok(event) = serde_json::from_str::<Value>(line) else {
            if line.contains("Authentication required") {
                return Heard::NeedsLogin;
            }
            continue;
        };
        let named = std::iter::once(&event)
            .chain(
                event
                    .as_object()
                    .into_iter()
                    .flat_map(|object| object.values()),
            )
            .find_map(|value| {
                value["conversation_id"]
                    .as_str()
                    .filter(|id| valid_uuid(id))
            });
        if let Some(id) = named {
            return Heard::Started(id.into());
        }
        let result = &event["result"];
        if result["status"] == "ERROR" {
            let error = result["error"].as_str().unwrap_or("Antigravity CLI failed");
            return if error.contains("authentication") {
                Heard::NeedsLogin
            } else {
                Heard::Failed(error.chars().take(300).collect())
            };
        }
    }
    Heard::Nothing
}

/// The message attached to `-p`, so agy never reads it as its own options
/// (`-p "--version"` prints the version). agy 1.5.18 refuses an attached
/// message that starts with `-`; a space in front makes it a prompt.
fn prompt(text: &str) -> String {
    let space = if text.starts_with('-') { " " } else { "" };
    format!("-p={space}{text}")
}

fn prune(logs: &Path) {
    for entry in fs::read_dir(logs).into_iter().flatten().flatten() {
        let age = entry.metadata().and_then(|meta| meta.modified()).ok();
        if age
            .and_then(|at| at.elapsed().ok())
            .is_some_and(|age| age > KEPT_FOR)
        {
            let _ = fs::remove_file(entry.path());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::super::super::fixtures::{StartFixture, REQUEST};
    use super::*;
    use std::sync::atomic::Ordering;
    const ID: &str = "1c6dfca4-5f50-4c5e-a468-8738d81ff3fd";

    /// A start through a fake `agy` that prints `printed` and is still
    /// running or has ended.
    fn start(printed: &str, running: bool) -> (StartFixture, Result<StartReceipt>) {
        let fixture = StartFixture::new();
        *fixture.fake.agy.lock().unwrap() = (printed.into(), running);
        let mut config = fixture.config();
        config.antigravity_executable = Some(fixture.root.join("bin/agy"));
        let starts =
            SessionStarts::with_runner(config, fixture.receipts(), fixture.fake.clone()).unwrap();
        let request = StartRequest {
            provider: Provider::Antigravity,
            request_id: REQUEST.into(),
            text: "修一下登录页".into(),
            folder: String::new(),
            title: None,
        };
        // What `start` saves before it asks the client.
        intent(&fixture.receipts());
        let started = starts.start_agy(&fixture.home(), &request, "no server".into());
        (fixture, started)
    }
    /// The uncertain receipt `start` saves first, under request `REQUEST`.
    fn intent(receipts: &Path) -> PathBuf {
        private_dir(receipts).unwrap();
        let receipt = unsettled(REQUEST, Failure::AcceptanceUncertain.to_string());
        let key = super::super::start::receipt_path(receipts, Provider::Antigravity, REQUEST);
        atomic_json(
            &key,
            &serde_json::json!({"fingerprint": "f", "receipt": receipt}),
        )
        .unwrap();
        key
    }

    #[test]
    fn a_start_returns_once_agy_names_the_conversation_and_leaves_it_running() {
        let init = format!(r#"{{"event":"init","init":{{"conversation_id":"{ID}"}}}}"#);
        let (fixture, started) = start(&init, true);
        let receipt = started.unwrap();
        assert_eq!(receipt.session_id.as_deref(), Some(ID));
        assert_eq!(receipt.state, "started");
        assert!(!fixture.fake.agy_stopped.load(Ordering::SeqCst));
        let calls = fixture.fake.calls.lock().unwrap().clone();
        assert_eq!(
            calls,
            [["-p=修一下登录页", "--output-format", "stream-json"]]
        );
        let logs = fixture.root.join("agy-starts");
        assert!(
            logs.is_dir(),
            "the stream is written beside the task folders"
        );
        let log = logs.join(format!("{REQUEST}.ndjson"));
        assert!(!log.exists(), "and removed once the start is settled");
    }

    /// An `agy` that is still running, or has ended, and whether it was stopped.
    struct Agy(bool, Arc<std::sync::atomic::AtomicBool>);
    impl Background for Agy {
        fn running(&mut self) -> bool {
            self.0
        }
        fn stop(&mut self) {
            self.1.store(true, Ordering::SeqCst);
        }
    }
    fn agy(running: bool) -> (Box<Agy>, Arc<std::sync::atomic::AtomicBool>) {
        let stopped = Arc::new(std::sync::atomic::AtomicBool::new(false));
        (Box::new(Agy(running, stopped.clone())), stopped)
    }
    /// A start saved uncertain, its stream holding `printed`: the receipts
    /// folder, the receipt and the stream.
    fn left_uncertain(printed: &str) -> (tempfile::TempDir, PathBuf, PathBuf, PathBuf) {
        let temp = tempfile::tempdir().unwrap();
        let receipts = temp.path().join("receipts");
        let key = intent(&receipts);
        let log = temp.path().join("stream.ndjson");
        fs::write(&log, printed).unwrap();
        (temp, receipts, key, log)
    }

    #[test]
    fn a_start_left_uncertain_is_completed_once_agy_names_the_conversation() {
        // The shape Antigravity's headless docs give: the id beside `init`.
        let init = format!(
            r#"{{"event":"init","conversation_id":"{ID}","init":{{"cwd":"/w","tools":[]}}}}"#
        );
        let (_temp, receipts, key, log) = left_uncertain(&init);
        follow(agy(true).0, &log, &receipts, REQUEST);
        let receipt = &read_json(&key)["receipt"];
        assert_eq!(receipt["state"], "started");
        assert_eq!(receipt["sessionId"], ID);
        assert_eq!(
            read_json(&key)["fingerprint"],
            "f",
            "the request stays the same"
        );
        assert!(!log.exists());
    }

    #[test]
    fn a_followed_agy_that_ends_or_goes_quiet_naming_nothing_stays_uncertain() {
        let (_temp, receipts, key, log) = left_uncertain("");
        follow(agy(false).0, &log, &receipts, REQUEST);
        let receipt = &read_json(&key)["receipt"];
        assert_eq!(receipt["state"], "uncertain");
        assert!(receipt["sessionId"].is_null());
        // Quiet past FOLLOWED_FOR: stopped to free the computer, still uncertain.
        let (_temp, receipts, key, log) = left_uncertain("");
        let (quiet, stopped) = agy(true);
        follow(quiet, &log, &receipts, REQUEST);
        assert!(stopped.load(Ordering::SeqCst));
        let receipt = &read_json(&key)["receipt"];
        assert_eq!(receipt["state"], "uncertain");
        assert!(receipt["reason"].as_str().unwrap().contains("10 minutes"));
        assert!(!log.exists());
    }

    #[test]
    fn whichever_writes_first_the_settled_receipt_stands() {
        // The follower names the conversation before the start saves its
        // own uncertain receipt: the start's late write keeps it.
        let (_temp, receipts, key, _log) = left_uncertain("");
        let named = super::super::start::settle(&receipts, started(REQUEST, ID.into())).unwrap();
        assert_eq!(named.state, "started");
        let late = unsettled(REQUEST, "still following".into());
        let stands = super::super::start::settle(&receipts, late).unwrap();
        assert_eq!(stands.session_id.as_deref(), Some(ID));
        assert_eq!(read_json(&key)["receipt"]["sessionId"], ID);
    }

    #[test]
    fn after_a_restart_a_stream_that_named_its_conversation_completes_the_start() {
        let fixture = StartFixture::new();
        let key = intent(&fixture.receipts());
        let logs = fixture.root.join("agy-starts");
        private_dir(&logs).unwrap();
        let log = logs.join(format!("{REQUEST}.ndjson"));
        fs::write(
            &log,
            format!(r#"{{"event":"init","conversation_id":"{ID}"}}"#),
        )
        .unwrap();
        let _starts = fixture.starts();
        assert_eq!(read_json(&key)["receipt"]["state"], "started");
        assert_eq!(read_json(&key)["receipt"]["sessionId"], ID);
        assert!(!log.exists(), "removed once the start is saved");
        // A later start finds its start settled: the stream goes.
        fs::write(&log, "").unwrap();
        let _starts = fixture.starts();
        assert!(!log.exists(), "a stream of a settled start is removed");
    }

    #[test]
    fn after_a_restart_only_a_stream_matching_its_own_receipt_is_read() {
        let fixture = StartFixture::new();
        let key = intent(&fixture.receipts());
        let logs = fixture.root.join("agy-starts");
        private_dir(&logs).unwrap();
        let named = format!(r#"{{"event":"init","conversation_id":"{ID}"}}"#);
        // Not a stream's name, or no receipt of its own: left alone.
        let other = logs.join(format!("{REQUEST}.txt"));
        fs::write(&other, &named).unwrap();
        let orphan = logs.join(format!("{}.ndjson", super::super::super::fixtures::SESSION));
        fs::write(&orphan, &named).unwrap();
        let _starts = fixture.starts();
        assert_eq!(read_json(&key)["receipt"]["state"], "uncertain");
        assert!(other.exists() && orphan.exists());
        // A receipt that names another request is not this stream's.
        let mut saved = read_json(&key);
        saved["receipt"]["requestId"] = super::super::super::fixtures::SESSION.into();
        atomic_json(&key, &saved).unwrap();
        let log = logs.join(format!("{REQUEST}.ndjson"));
        fs::write(&log, &named).unwrap();
        let _starts = fixture.starts();
        assert!(read_json(&key)["receipt"]["sessionId"].is_null());
        assert!(log.exists());
    }

    /// The `agy` that asked may still run after a quit, and nothing here can
    /// stop it: the start is not rejected, and its stream is kept.
    #[test]
    fn after_a_restart_a_stream_that_asked_to_sign_in_stays_uncertain() {
        let fixture = StartFixture::new();
        let key = intent(&fixture.receipts());
        let logs = fixture.root.join("agy-starts");
        private_dir(&logs).unwrap();
        let log = logs.join(format!("{REQUEST}.ndjson"));
        fs::write(
            &log,
            "Authentication required. Please visit the URL to log in:\n",
        )
        .unwrap();
        let _starts = fixture.starts();
        let receipt = &read_json(&key)["receipt"];
        assert_eq!(receipt["state"], "uncertain");
        assert!(receipt["reason"].as_str().unwrap().contains("sign in"));
        assert!(log.exists());
    }

    /// A conversation named but not saved: the stream that names it stays,
    /// so the next start can still complete it.
    #[test]
    fn a_stream_is_kept_until_its_outcome_is_saved() {
        let init = format!(r#"{{"event":"init","conversation_id":"{ID}"}}"#);
        let (_temp, receipts, key, log) = left_uncertain(&init);
        fs::remove_file(&key).unwrap();
        follow(agy(true).0, &log, &receipts, REQUEST);
        assert!(log.exists(), "the receipt could not be saved");
        intent(&receipts);
        follow(agy(true).0, &log, &receipts, REQUEST);
        assert_eq!(read_json(&key)["receipt"]["sessionId"], ID);
        assert!(!log.exists());
    }

    #[test]
    fn a_message_never_becomes_one_of_agys_options() {
        assert_eq!(prompt("修一下 -p 参数"), "-p=修一下 -p 参数");
        assert_eq!(prompt("--version"), "-p= --version");
        assert_eq!(prompt("-x\n第二行"), "-p= -x\n第二行");
    }

    #[test]
    fn an_agy_that_is_not_signed_in_is_stopped_and_says_so() {
        let (fixture, started) = start(
            "Authentication required. Please visit the URL to log in:\n",
            true,
        );
        assert!(matches!(started, Err(Failure::Unavailable(reason)) if reason.contains("agy")));
        assert!(fixture.fake.agy_stopped.load(Ordering::SeqCst));
        // Stopped here, so known to have made nothing: saved as refused.
        let key =
            super::super::start::receipt_path(&fixture.receipts(), Provider::Antigravity, REQUEST);
        assert_eq!(read_json(&key)["receipt"]["state"], "rejected");
        assert!(!fixture
            .root
            .join(format!("agy-starts/{REQUEST}.ndjson"))
            .exists());
    }

    #[test]
    fn an_agy_that_ends_or_fails_naming_nothing_leaves_the_start_uncertain() {
        // It may have made a conversation before it went: never "rejected",
        // which would let the same task be started again.
        let (_, ended) = start("", false);
        let ended = ended.unwrap();
        assert_eq!(
            (ended.state.as_str(), ended.session_id),
            ("uncertain", None)
        );
        let failed = r#"{"event":"result","result":{"conversation_id":"","status":"ERROR","error":"backend unavailable"}}"#;
        let (fixture, failed) = start(failed, true);
        let failed = failed.unwrap();
        assert_eq!(failed.state, "uncertain");
        assert!(failed.reason.unwrap().contains("backend unavailable"));
        assert!(fixture.fake.agy_stopped.load(Ordering::SeqCst));
    }

    #[test]
    fn with_no_agy_the_language_servers_reason_stands() {
        let fixture = StartFixture::new();
        let starts = fixture.starts();
        let request = StartRequest {
            provider: Provider::Antigravity,
            request_id: REQUEST.into(),
            text: "hi".into(),
            folder: String::new(),
            title: None,
        };
        let started = starts.start_agy(&fixture.home(), &request, "no server".into());
        assert!(matches!(started, Err(Failure::Unavailable(reason)) if reason == "no server"));
        assert!(fixture.fake.calls.lock().unwrap().is_empty());
    }

    #[test]
    fn the_conversation_is_named_by_an_event_or_the_one_inside_it() {
        assert_eq!(heard(""), Heard::Nothing);
        let init = format!(r#"{{"event":"init","init":{{"conversation_id":"{ID}"}}}}"#);
        assert_eq!(heard(&init), Heard::Started(ID.into()));
        let result = format!(
            r#"{{"event":"result","result":{{"conversation_id":"{ID}","status":"SUCCESS"}}}}"#
        );
        assert_eq!(heard(&result), Heard::Started(ID.into()));
        let top = format!(r#"{{"conversation_id":"{ID}","status":"SUCCESS"}}"#);
        assert_eq!(heard(&top), Heard::Started(ID.into()));
    }

    #[test]
    fn a_subagents_conversation_or_an_empty_one_names_nothing() {
        let subagent = format!(
            r#"{{"event":"step_update","step_update":{{"subagent_info":{{"conversation_id":"{ID}"}}}}}}"#
        );
        assert_eq!(heard(&subagent), Heard::Nothing);
        // What `/help` prints: a result with no conversation behind it.
        let empty = r#"{"event":"result","result":{"conversation_id":"","status":"SUCCESS"}}"#;
        assert_eq!(heard(empty), Heard::Nothing);
    }

    #[test]
    fn signing_in_and_failures_are_told_apart() {
        // agy 1.5.18 not signed in: stderr asks first, the result fails ~60 s later.
        let asked = "\nAuthentication required. Please visit the URL to log in:\n  https://accounts.google.com/o/oauth2/auth?…\n";
        assert_eq!(heard(asked), Heard::NeedsLogin);
        let failed = r#"{"conversation_id":"","status":"ERROR","error":"authentication failed or timed out"}"#;
        assert_eq!(
            heard(&format!(r#"{{"event":"result","result":{failed}}}"#)),
            Heard::NeedsLogin
        );
        let quota = r#"{"event":"result","result":{"conversation_id":"","status":"ERROR","error":"quota exhausted"}}"#;
        assert_eq!(heard(quota), Heard::Failed("quota exhausted".into()));
    }
}
