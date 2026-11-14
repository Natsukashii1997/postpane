//! JSON-lines development transport; the desktop embeds the same Runtime directly.
use agent_hud_runtime::Runtime;
use serde_json::{json, Value};
use std::io::{self, BufRead, Write};
use std::time::Duration;

/// How long the app may take to answer `method`: longer for the ones that
/// wait on the ChatGPT extension (`chatgpt::OPEN_TIME`, `SEND_TIME`).
fn wait_for(method: &str) -> Duration {
    use agent_hud_runtime::chatgpt::{OPEN_TIME, SEND_TIME};
    let margin = Duration::from_secs(10);
    match method {
        "chatgpt_open" => OPEN_TIME + margin,
        "chatgpt_send" | "relay_to_chatgpt" => SEND_TIME + margin,
        _ => agent_hud_runtime::local_tools::READ_TIME,
    }
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let arguments = std::env::args().collect::<Vec<_>>();
    // Chrome starts this program as the ChatGPT extension's native host, with
    // the caller's origin first: a relay to the app, nothing else.
    if arguments
        .get(1)
        .is_some_and(|origin| origin.starts_with("chrome-extension://"))
    {
        let data = agent_hud_runtime::local_tools_directory()?;
        if let Some(status) = agent_hud_runtime::chatgpt::bridge(&arguments, &data) {
            std::process::exit(status);
        }
    }
    if let Some(status) = agent_hud_runtime::hooks::entry(&arguments) {
        std::process::exit(status);
    }
    let app_channel = std::env::args().any(|arg| arg == "--app-channel");
    let directory = if app_channel {
        Some(agent_hud_runtime::local_tools_directory()?)
    } else {
        None
    };
    let executable = std::env::current_exe().ok();
    let _ownership = if app_channel {
        None
    } else {
        Some(agent_hud_runtime::claim_collector(
            false,
            executable.as_deref(),
        )?)
    };
    // App-channel mode is a transport only. No Runtime, watcher, database or
    // provider job is created, even when the application is absent or tools off.
    let mut runtime = if app_channel {
        None
    } else {
        Some(Runtime::new(None)?)
    };
    let collection = runtime.as_ref().map(Runtime::collection_gate);
    let mut output = io::BufWriter::new(io::stdout().lock());
    for line in io::stdin().lock().lines() {
        let response = match serde_json::from_str::<Value>(&line?) {
            Ok(request) if app_channel => {
                let id = request.get("id").cloned().unwrap_or(Value::Null);
                match agent_hud_runtime::local_tools::request_with_timeout(
                    directory.as_ref().unwrap(),
                    &request,
                    wait_for(request["method"].as_str().unwrap_or("")),
                ) {
                    // An answer the app could not tie to a request (a busy
                    // or unreadable one) still goes back to the caller's.
                    Ok(mut response) => {
                        if response.get("id").is_none_or(Value::is_null) {
                            response["id"] = id;
                        }
                        response
                    }
                    Err(error) => {
                        json!({"id":id,"error":{"code":"tools_unavailable","message":error}})
                    }
                }
            }
            Ok(request) => {
                let id = request.get("id").cloned().unwrap_or(Value::Null);
                match request["method"].as_str() {
                    Some(method) => {
                        // A collection pass waits only while an account reading stores its result.
                        let _turn = collection
                            .as_ref()
                            .filter(|_| {
                                matches!(method, "snapshot" | "refresh" | "request_snapshot")
                            })
                            .map(|gate| {
                                gate.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
                            });
                        match runtime
                            .as_mut()
                            .unwrap()
                            .request(method, request.get("params").cloned().unwrap_or(json!({})))
                        {
                            Ok(result) => json!({"id":id,"result":result}),
                            Err(error) => {
                                json!({"id":id,"error":{"code":"operation_failed","message":error}})
                            }
                        }
                    }
                    None => {
                        json!({"id":id,"error":{"code":"invalid_request","message":"method must be a string"}})
                    }
                }
            }
            Err(_) => {
                json!({"id":null,"error":{"code":"parse_error","message":"Expected one JSON request per line"}})
            }
        };
        serde_json::to_writer(&mut output, &response)?;
        output.write_all(b"\n")?;
        output.flush()?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn methods_that_wait_on_chatgpt_are_given_longer() {
        assert_eq!(
            wait_for("snapshot"),
            agent_hud_runtime::local_tools::READ_TIME
        );
        assert!(wait_for("chatgpt_open") > Duration::from_secs(90));
        assert!(wait_for("relay_to_chatgpt") > Duration::from_secs(30));
        assert!(wait_for("chatgpt_send") > Duration::from_secs(30));
    }
}
