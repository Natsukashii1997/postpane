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
/// not get it: the connection never opened. Known servers come first, then
/// freshly found ones, each tried once. Any answer that is not a success,
/// whatever its status, and a request lost, timed out or answered unreadably
/// may have been acted on: it ends as Uncertain, never sent again (Connect
/// promises no status that proves a server did nothing). Discovery runs only
/// after every known server failed to connect, so a failed discovery never
/// hides a request that was sent.
pub fn call_once(method: &str, params: &Value) -> Result<Value, CallError> {
    allowed(method).map_err(CallError::Refused)?;
    if !crate::clients::runs(&agent_hud_agents::antigravity::LOCAL_SERVICE) {
        return Err(CallError::none());
    }
    let service = service().map_err(CallError::Unavailable)?;
    let mut tried = Vec::new();
    if let Some(done) = service.once(service.cached(), method, params, &mut tried) {
        return done;
    }
    let found = service
        .discover(true, false)
        .map_err(CallError::Unavailable)?;
    service
        .once(found, method, params, &mut tried)
        .unwrap_or_else(|| Err(CallError::none()))
}

impl Service {
    /// The servers in `endpoints` not `tried` yet, until one is reached;
    /// `None` when none of them could be connected to.
    fn once(
        &self,
        endpoints: Vec<Endpoint>,
        method: &str,
        params: &Value,
        tried: &mut Vec<Endpoint>,
    ) -> Option<Result<Value, CallError>> {
        for endpoint in endpoints {
            if tried.contains(&endpoint) {
                continue;
            }
            tried.push(endpoint.clone());
            match self.post(&endpoint, method, params) {
                Err(CallError::Unavailable(_)) => forget(self, &endpoint),
                reached => return Some(reached),
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

/// The service's own Connect error (`{"code","message"}`) with its HTTP
/// status, limited in size. These come from the loopback service and hold no
/// credentials.
pub(super) fn service_error(response: reqwest::blocking::Response) -> String {
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

    /// Connect promises no status that proves a server did nothing, and a
    /// body may be missing or not match its status: every error answer is
    /// Uncertain, its status and code kept in the text.
    #[test]
    fn a_write_answered_with_any_error_is_uncertain_with_its_status() {
        let cases: [(fn(&mut std::net::TcpStream), &str); 6] = [
            (
                |s| {
                    answer(
                        s,
                        "400 Bad Request",
                        r#"{"code":"invalid_argument","message":"no"}"#,
                    )
                },
                "Antigravity (HTTP 400 invalid_argument): no",
            ),
            (
                |s| answer(s, "400 Bad Request", "{}"),
                "Antigravity local service returned HTTP 400 ",
            ),
            (
                |s| answer(s, "400 Bad Request", r#"{"code":"internal","message":"x"}"#),
                "Antigravity (HTTP 400 internal): x",
            ),
            (
                |s| {
                    answer(
                        s,
                        "429 Too Many Requests",
                        r#"{"code":"resource_exhausted","message":"slow"}"#,
                    )
                },
                "Antigravity (HTTP 429 resource_exhausted): slow",
            ),
            (
                |s| answer(s, "404 Not Found", r#"{"code":"internal","message":"odd"}"#),
                "Antigravity (HTTP 404 internal): odd",
            ),
            (
                |s| {
                    answer(
                        s,
                        "500 Internal Server Error",
                        r#"{"code":"internal","message":"boom"}"#,
                    )
                },
                "Antigravity (HTTP 500 internal): boom",
            ),
        ];
        for (respond, said) in cases {
            let sent = loopback().post(&at(server(respond)), "StartCascade", &json!({}));
            assert_eq!(sent, Err(CallError::Uncertain(said.into())));
        }
    }

    #[test]
    fn a_server_that_could_not_be_connected_to_hands_the_write_to_the_next() {
        let closed = TcpListener::bind("127.0.0.1:0").unwrap();
        let closed_port = closed.local_addr().unwrap().port();
        drop(closed);
        let taking = server(|stream| answer(stream, "200 OK", r#"{"ok":true}"#));
        let mut tried = Vec::new();
        let done = loopback().once(
            vec![at(closed_port), at(taking)],
            "SendUserCascadeMessage",
            &json!({}),
            &mut tried,
        );
        assert_eq!(done.unwrap().unwrap(), json!({"ok": true}));
        // None reachable: the caller may look for servers afresh.
        let mut tried = Vec::new();
        let none = loopback().once(
            vec![at(closed_port)],
            "StartCascade",
            &json!({}),
            &mut tried,
        );
        assert!(none.is_none());
    }

    /// An error answer, even a 404 that may mean the cascade lives on another
    /// server, ends the write: no other server is asked, and no fresh
    /// discovery runs after it (`call_once` returns what `once` reached).
    #[test]
    fn a_write_answered_with_an_error_goes_to_no_other_server() {
        for status in ["404 Not Found", "500 Internal Server Error"] {
            let failing = server(match status {
                "404 Not Found" => |s: &mut std::net::TcpStream| {
                    answer(
                        s,
                        "404 Not Found",
                        r#"{"code":"not_found","message":"no cascade"}"#,
                    )
                },
                _ => |s: &mut std::net::TcpStream| answer(s, "500 Internal Server Error", "{}"),
            });
            let other = TcpListener::bind("127.0.0.1:0").unwrap();
            other.set_nonblocking(true).unwrap();
            let other_port = other.local_addr().unwrap().port();
            let mut tried = Vec::new();
            let done = loopback().once(
                vec![at(failing), at(other_port)],
                "StartCascade",
                &json!({}),
                &mut tried,
            );
            assert!(
                matches!(done, Some(Err(CallError::Uncertain(_)))),
                "{status}: {done:?}"
            );
            let reached = other.accept();
            assert!(
                matches!(&reached, Err(error) if error.kind() == std::io::ErrorKind::WouldBlock),
                "{status}: the second server was never asked"
            );
            // A server already tried is not asked again by a fresh discovery.
            let again = loopback().once(vec![at(failing)], "StartCascade", &json!({}), &mut tried);
            assert!(again.is_none());
        }
    }
}
