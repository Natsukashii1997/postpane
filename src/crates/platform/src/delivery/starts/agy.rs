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
const FOLLOWED_FOR: Duration = Duration::from_secs(10 * 60);
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
        let logs = self.config.task_root.with_file_name("agy-starts");
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
        if let Some(settled) = watch(&mut *process, &log, NAMED_WITHIN) {
            let _ = fs::remove_file(&log);
            return settled.map(|id| started(&request.request_id, id));
        }
        // Still running and nothing named yet: the start is saved uncertain,
        // and its receipt is completed when `agy` settles.
        let receipts = self.receipts.clone();
        let request_id = request.request_id.clone();
        std::thread::spawn(move || follow(process, &log, &receipts, &request_id));
        Err(Failure::AcceptanceUncertain)
    }
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

/// Reads the stream until `agy` names its conversation or fails, for at most
/// `within`; `None` while it still runs having said nothing. A failed or
/// unsigned `agy` is stopped.
fn watch(process: &mut dyn Background, log: &Path, within: Duration) -> Option<Result<String>> {
    let began = Instant::now();
    loop {
        // Asked before reading, so an end is read with all it printed.
        let running = process.running();
        let settled = match heard(&fs::read_to_string(log).unwrap_or_default()) {
            Heard::Started(id) => Ok(id),
            Heard::NeedsLogin => Err(Failure::Unavailable(l10n::text(
                "agy 命令行还没登录：在终端运行一次 agy，按提示登录 Google 账号",
                "The agy command line is not signed in: run agy once in a terminal and sign in",
            ))),
            Heard::Failed(error) => Err(Failure::Rejected(error)),
            Heard::Nothing if !running => Err(Failure::Rejected(
                "Antigravity CLI ended without starting a session".into(),
            )),
            Heard::Nothing if began.elapsed() >= within => return None,
            Heard::Nothing => {
                std::thread::sleep(Duration::from_millis(200));
                continue;
            }
        };
        if settled.is_err() {
            process.stop();
        }
        return Some(settled);
    }
}

/// Completes the receipt of a start saved uncertain: started once `agy`
/// names the conversation, rejected when it fails or ends naming none, and
/// rejected and stopped when it says nothing for `FOLLOWED_FOR`.
fn follow(mut process: Box<dyn Background>, log: &Path, receipts: &Path, request_id: &str) {
    let settled = watch(&mut *process, log, FOLLOWED_FOR).unwrap_or_else(|| {
        process.stop();
        Err(Failure::Rejected(
            "Antigravity CLI named no conversation in 10 minutes and was stopped".into(),
        ))
    });
    let _ = fs::remove_file(log);
    // The start writes its uncertain receipt once it returns; wait for it,
    // so it never overwrites this one.
    let key = super::start::receipt_path(receipts, Provider::Antigravity, request_id);
    for _ in 0..50 {
        if read_json(&key)["receipt"]["reason"] == Failure::AcceptanceUncertain.to_string() {
            break;
        }
        std::thread::sleep(Duration::from_millis(200));
    }
    let receipt = settled.map_or_else(
        |error| StartReceipt {
            state: "rejected".into(),
            reason: Some(error.to_string()),
            session_id: None,
            ..started(request_id, String::new())
        },
        |id| started(request_id, id),
    );
    if let Err(error) = super::start::save_receipt(receipts, &receipt) {
        agent_hud_core::note!("An Antigravity start's receipt could not be completed: {error}");
    }
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
        let started = starts.start_agy(&fixture.home(), &request, "no server".into());
        (fixture, started)
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

    /// An `agy` that is still running, or has ended.
    struct Agy(bool, bool);
    impl Background for Agy {
        fn running(&mut self) -> bool {
            self.0
        }
        fn stop(&mut self) {
            self.1 = true;
        }
    }
    /// A start saved uncertain, its stream holding `printed`: the receipts
    /// folder, the receipt and the stream.
    fn left_uncertain(printed: &str) -> (tempfile::TempDir, PathBuf, PathBuf, PathBuf) {
        let temp = tempfile::tempdir().unwrap();
        let receipts = temp.path().join("receipts");
        private_dir(&receipts).unwrap();
        let receipt = StartReceipt {
            state: "uncertain".into(),
            reason: Some(Failure::AcceptanceUncertain.to_string()),
            session_id: None,
            ..started(REQUEST, String::new())
        };
        let key = super::super::start::receipt_path(&receipts, Provider::Antigravity, REQUEST);
        atomic_json(
            &key,
            &serde_json::json!({"fingerprint": "f", "receipt": receipt}),
        )
        .unwrap();
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
        follow(Box::new(Agy(true, false)), &log, &receipts, REQUEST);
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
    fn a_start_left_uncertain_whose_agy_ended_naming_nothing_is_rejected() {
        let (_temp, receipts, key, log) = left_uncertain("");
        follow(Box::new(Agy(false, false)), &log, &receipts, REQUEST);
        let receipt = &read_json(&key)["receipt"];
        assert_eq!(receipt["state"], "rejected");
        assert!(receipt["sessionId"].is_null());
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
    }

    #[test]
    fn an_agy_that_ends_naming_nothing_is_refused() {
        let (_, started) = start("", false);
        assert!(matches!(started, Err(Failure::Rejected(_))));
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
