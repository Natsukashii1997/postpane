use super::{Handler, REQUEST_LIMIT, RESPONSE_LIMIT};
use serde_json::Value;
use std::{path::Path, sync::Arc, time::Duration};
pub struct Server(crate::os::pipe::Server);
impl Server {
    pub fn start(data: &Path, handler: Handler) -> Result<Self, String> {
        crate::os::pipe::Server::start(
            data,
            "tools",
            REQUEST_LIMIT as usize,
            RESPONSE_LIMIT as usize,
            Arc::new(move |request, active| Some(handler(request, active))),
        )
        .map(Self)
    }
    pub fn is_listening(&self) -> bool {
        self.0.is_listening()
    }
}
pub fn request(data: &Path, request: &Value) -> Result<Value, String> {
    request_with_timeout(data, request, super::READ_TIME)
}
pub fn request_with_timeout(
    data: &Path,
    request: &Value,
    timeout: Duration,
) -> Result<Value, String> {
    crate::os::pipe::request(
        data,
        "tools",
        request,
        REQUEST_LIMIT as usize,
        RESPONSE_LIMIT as usize,
        timeout,
        || false,
    )?
    .ok_or_else(|| "The local tools response did not complete".into())
}
