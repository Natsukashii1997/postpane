//! Writes to a running language server, sent at most once: a request that
//! may have reached a server is never sent again, to it or to another, so a
//! cascade is never started twice.
use super::*;

/// The operations the running language server may be asked for.
pub(super) fn allowed(method: &str) -> Result<(), String> {
    if matches!(
        method,
        "GetUserStatus"
            | "RetrieveUserQuotaSummary"
            | "GetAllCascadeTrajectories"
            | "GetCascadeTrajectory"
            | "HandleCascadeUserInteraction"
            | "StartCascade"
            | "SendUserCascadeMessage"
            | "SendAgentMessage"
            | "CancelCascadeInvocation"
    ) {
        Ok(())
    } else {
        Err("Unsupported public Antigravity service operation".into())
    }
}

/// Sends one write. It goes to the next server only when this one surely did
/// not act: the connection never opened, or the server refused before acting
/// (a 4xx answer). Known servers come first, then freshly found ones, each
/// tried once. A request that may have been acted on (lost, timed out, a 5xx
/// or an unreadable answer) ends it as Uncertain, never sent again.
pub fn call_once(method: &str, params: &Value) -> Result<Value, CallError> {
    allowed(method).map_err(CallError::Refused)?;
    if !crate::clients::runs(&agent_hud_agents::antigravity::LOCAL_SERVICE) {
        return Err(CallError::none());
    }
    let service = service().map_err(CallError::Unavailable)?;
    let mut tried = Vec::new();
    let mut refused = None;
    for fresh in [false, true] {
        let endpoints = match fresh {
            false => service.cached(),
            true => service
                .discover(true, false)
                .map_err(CallError::Unavailable)?,
        };
        if let Some(done) = service.once(endpoints, method, params, &mut tried, &mut refused) {
            return done;
        }
    }
    Err(refused.map_or_else(CallError::none, CallError::Refused))
}

impl Service {
    /// The servers in `endpoints` not `tried` yet, until one answers or may
    /// have acted; `None` when every one surely did nothing, the last
    /// refusal kept in `refused`.
    fn once(
        &self,
        endpoints: Vec<Endpoint>,
        method: &str,
        params: &Value,
        tried: &mut Vec<Endpoint>,
        refused: &mut Option<String>,
    ) -> Option<Result<Value, CallError>> {
        for endpoint in endpoints {
            if tried.contains(&endpoint) {
                continue;
            }
            tried.push(endpoint.clone());
            match self.post(&endpoint, method, params) {
                Err(CallError::Unavailable(_)) => forget(self, &endpoint),
                Err(CallError::Refused(error)) => *refused = Some(error),
                answered => return Some(answered),
            }
        }
        None
    }
}

fn forget(service: &Service, endpoint: &Endpoint) {
    let mut state = service.state.lock().unwrap_or_else(PoisonError::into_inner);
    state.endpoints.retain(|old| old != endpoint);
    state.complete = false;
}

/// A non-2xx answer. Connect maps a request it turned down before acting to
/// a 4xx (invalid argument, not found, unauthenticated, exhausted); 5xx
/// (internal, unavailable, deadline exceeded), 408, 409 (aborted) and 499
/// (canceled) may come after the server acted, so they are Uncertain.
pub(super) fn answered_with_error(response: reqwest::blocking::Response) -> CallError {
    let status = response.status().as_u16();
    let error = service_error(response);
    if (400..500).contains(&status) && !matches!(status, 408 | 409 | 499) {
        CallError::Refused(error)
    } else {
        CallError::Uncertain(error)
    }
}

/// The service's own Connect error (`{"code","message"}`) with its HTTP
/// status, limited in size. These come from the loopback service and hold no
/// credentials.
fn service_error(response: reqwest::blocking::Response) -> String {
    use std::io::Read;
    let status = response.status().as_u16();
    let mut bytes = Vec::new();
    let _ = response.take(4096).read_to_end(&mut bytes);
    let body = serde_json::from_slice::<Value>(&bytes).unwrap_or_default();
    let code = body["code"].as_str().unwrap_or("");
    match body["message"].as_str().filter(|text| !text.is_empty()) {
        Some(text) => format!(
            "Antigravity (HTTP {status} {code}): {}",
            text.chars().take(300).collect::<String>()
        ),
        None => format!("Antigravity local service returned HTTP {status} {code}"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{
        io::{Read, Write},
        net::TcpListener,
    };

    fn loopback() -> Service {
        Service {
            http: Client::builder()
                .no_proxy()
                .timeout(Duration::from_millis(500))
                .build()
                .unwrap(),
            state: Mutex::new(State {
                endpoints: Vec::new(),
                complete: false,
                failed_at: None,
            }),
            resolve: Mutex::new(()),
        }
    }
    fn at(port: u16) -> Endpoint {
        Endpoint {
            scheme: "http",
            port,
            pid: 1,
            csrf: HeaderValue::from_static("t"),
        }
    }
    /// A server that reads the request, then does `answer` with the socket.
    fn server(answer: fn(&mut std::net::TcpStream)) -> u16 {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let port = listener.local_addr().unwrap().port();
        std::thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            let mut request = [0u8; 4096];
            let _ = stream.read(&mut request);
            answer(&mut stream);
        });
        port
    }

    #[test]
    fn a_write_is_unavailable_only_if_it_never_connected() {
        let closed = TcpListener::bind("127.0.0.1:0").unwrap();
        let port = closed.local_addr().unwrap().port();
        drop(closed);
        let sent = loopback().post(&at(port), "StartCascade", &json!({}));
        assert!(matches!(sent, Err(CallError::Unavailable(_))), "{sent:?}");
    }

    #[test]
    fn a_write_that_was_sent_and_lost_is_uncertain() {
        // Received, then the connection drops before any answer.
        let dropped = server(|stream| drop(stream.shutdown(std::net::Shutdown::Both)));
        let sent = loopback().post(&at(dropped), "StartCascade", &json!({}));
        assert!(matches!(sent, Err(CallError::Uncertain(_))), "{sent:?}");
        // Received, and never answered within the time limit.
        let silent = server(|_| std::thread::sleep(Duration::from_secs(2)));
        let sent = loopback().post(&at(silent), "StartCascade", &json!({}));
        assert!(matches!(sent, Err(CallError::Uncertain(_))), "{sent:?}");
        // Answered with a body that is not JSON.
        let garbled = server(|stream| {
            let _ = stream.write_all(b"HTTP/1.1 200 OK\r\nContent-Length: 3\r\n\r\nnot");
        });
        let sent = loopback().post(&at(garbled), "StartCascade", &json!({}));
        assert!(matches!(sent, Err(CallError::Uncertain(_))), "{sent:?}");
    }

    fn answer(stream: &mut std::net::TcpStream, status: &str, body: &str) {
        let head = format!(
            "HTTP/1.1 {status}\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n",
            body.len()
        );
        let _ = stream.write_all(head.as_bytes());
        let _ = stream.write_all(body.as_bytes());
    }

    #[test]
    fn a_write_turned_down_before_acting_is_refused_with_its_status() {
        let refusing = server(|stream| {
            answer(
                stream,
                "400 Bad Request",
                r#"{"code":"invalid_argument","message":"no"}"#,
            )
        });
        let sent = loopback().post(&at(refusing), "StartCascade", &json!({}));
        let Err(CallError::Refused(error)) = sent else {
            panic!("{sent:?}");
        };
        assert_eq!(error, "Antigravity (HTTP 400 invalid_argument): no");
    }

    #[test]
    fn a_write_answered_with_a_server_error_may_have_acted() {
        for status in [
            "500 Internal Server Error",
            "503 Service Unavailable",
            "409 Conflict",
        ] {
            let failing = server(match status {
                "500 Internal Server Error" => |stream: &mut std::net::TcpStream| {
                    answer(
                        stream,
                        "500 Internal Server Error",
                        r#"{"code":"internal","message":"boom"}"#,
                    )
                },
                "503 Service Unavailable" => |stream: &mut std::net::TcpStream| {
                    answer(stream, "503 Service Unavailable", "{}")
                },
                _ => |stream: &mut std::net::TcpStream| {
                    answer(
                        stream,
                        "409 Conflict",
                        r#"{"code":"aborted","message":"x"}"#,
                    )
                },
            });
            let sent = loopback().post(&at(failing), "StartCascade", &json!({}));
            assert!(
                matches!(sent, Err(CallError::Uncertain(_))),
                "{status}: {sent:?}"
            );
        }
    }

    #[test]
    fn a_server_that_turned_it_down_hands_the_write_to_the_next() {
        let refusing = server(|stream| {
            answer(
                stream,
                "404 Not Found",
                r#"{"code":"not_found","message":"no cascade"}"#,
            )
        });
        let taking = server(|stream| answer(stream, "200 OK", r#"{"ok":true}"#));
        let (mut tried, mut refused) = (Vec::new(), None);
        let done = loopback().once(
            vec![at(refusing), at(taking)],
            "SendUserCascadeMessage",
            &json!({}),
            &mut tried,
            &mut refused,
        );
        assert_eq!(done.unwrap().unwrap(), json!({"ok": true}));
        assert!(refused.is_some());
    }

    #[test]
    fn a_write_that_may_have_acted_goes_to_no_other_server() {
        let failing = server(|stream| answer(stream, "500 Internal Server Error", "{}"));
        let other = TcpListener::bind("127.0.0.1:0").unwrap();
        other.set_nonblocking(true).unwrap();
        let other_port = other.local_addr().unwrap().port();
        let (mut tried, mut refused) = (Vec::new(), None);
        let done = loopback().once(
            vec![at(failing), at(other_port)],
            "StartCascade",
            &json!({}),
            &mut tried,
            &mut refused,
        );
        assert!(
            matches!(done, Some(Err(CallError::Uncertain(_)))),
            "{done:?}"
        );
        let reached = other.accept();
        assert!(
            matches!(&reached, Err(error) if error.kind() == std::io::ErrorKind::WouldBlock),
            "the second server was never asked"
        );
        // A server already tried is not asked again by a fresh discovery.
        let again = loopback().once(
            vec![at(failing)],
            "StartCascade",
            &json!({}),
            &mut tried,
            &mut refused,
        );
        assert!(again.is_none());
    }
}
