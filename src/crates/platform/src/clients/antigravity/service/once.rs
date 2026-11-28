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

/// Sends one write. Endpoints that refuse the connection were never reached
/// and the next is tried, first those already known, then freshly found
/// ones; any other failure ends it: Refused when the server answered with
/// an error, Uncertain when it may have acted.
pub fn call_once(method: &str, params: &Value) -> Result<Value, CallError> {
    allowed(method).map_err(CallError::Refused)?;
    if !crate::clients::runs(&agent_hud_agents::antigravity::LOCAL_SERVICE) {
        return Err(CallError::none());
    }
    let service = service().map_err(CallError::Unavailable)?;
    for fresh in [false, true] {
        let endpoints = match fresh {
            false => service.cached(),
            true => service
                .discover(true, false)
                .map_err(CallError::Unavailable)?,
        };
        for endpoint in endpoints {
            match service.post(&endpoint, method, params) {
                Err(CallError::Unavailable(_)) => forget(service, &endpoint),
                answered => return answered,
            }
        }
    }
    Err(CallError::none())
}

fn forget(service: &Service, endpoint: &Endpoint) {
    let mut state = service.state.lock().unwrap_or_else(PoisonError::into_inner);
    state.endpoints.retain(|old| old != endpoint);
    state.complete = false;
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

    #[test]
    fn a_write_the_server_answered_with_an_error_is_refused() {
        let refusing = server(|stream| {
            let body = br#"{"code":"invalid_argument","message":"no"}"#;
            let head = format!(
                "HTTP/1.1 400 Bad Request\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n",
                body.len()
            );
            let _ = stream.write_all(head.as_bytes());
            let _ = stream.write_all(body);
        });
        let sent = loopback().post(&at(refusing), "StartCascade", &json!({}));
        assert!(matches!(sent, Err(CallError::Refused(_))), "{sent:?}");
    }
}
