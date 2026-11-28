//! Starting an Antigravity session through its command line when no language
//! server runs: `agy -p` in the background, its event stream read until it
//! names the conversation. The turn then finishes on its own, and its reply
//! is read from the conversation like any other.
use super::*;
use agent_hud_core::l10n;
use std::time::Instant;

/// How long a start waits for `agy` to name its conversation.
const NAMED_WITHIN: Duration = Duration::from_secs(20);
/// Stream logs older than this are removed at the next start.
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
        let logs = self.config.task_root.with_file_name("agy-starts");
        fs::create_dir_all(&logs)?;
        prune(&logs);
        let log = logs.join(format!("{}.ndjson", request.request_id));
        let arguments = ["-p", &request.text, "--output-format", "stream-json"];
        let plan = self.plan(
            executable,
            arguments.map(String::from).to_vec(),
            Some(folder),
            NAMED_WITHIN.as_secs(),
        );
        let mut process = self.runner.spawn(&plan, &log)?;
        let began = Instant::now();
        loop {
            // Asked before reading, so an end is read with all it printed.
            let running = process.running();
            match heard(&fs::read_to_string(&log).unwrap_or_default()) {
                Heard::Started(id) => {
                    return Ok(StartReceipt {
                        provider: Provider::Antigravity,
                        request_id: request.request_id.clone(),
                        session_id: Some(id),
                        thread_id: None,
                        state: "started".into(),
                        reason: None,
                        job_id: None,
                        handoff_pending: false,
                    })
                }
                Heard::NeedsLogin => {
                    process.stop();
                    return Err(Failure::Unavailable(l10n::text(
                        "agy 命令行还没登录：在终端运行一次 agy，按提示登录 Google 账号",
                        "The agy command line is not signed in: run agy once in a terminal and sign in",
                    )));
                }
                Heard::Failed(error) => {
                    process.stop();
                    return Err(Failure::Rejected(error));
                }
                Heard::Nothing if !running => {
                    return Err(Failure::Rejected(
                        "Antigravity CLI ended without starting a session".into(),
                    ))
                }
                Heard::Nothing if began.elapsed() >= NAMED_WITHIN => {
                    return Err(Failure::AcceptanceUncertain)
                }
                Heard::Nothing => std::thread::sleep(Duration::from_millis(200)),
            }
        }
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
            [["-p", "修一下登录页", "--output-format", "stream-json"]]
        );
        let log = fixture
            .root
            .join("agy-starts")
            .join(format!("{REQUEST}.ndjson"));
        assert!(
            log.is_file(),
            "the stream is written beside the task folders"
        );
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
