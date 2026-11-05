//! Windows has no transport for the extension yet. An adapter would listen
//! on a same-user named pipe (`os/windows/pipe.rs`) and register the native
//! host under HKCU\Software\Google\Chrome\NativeMessagingHosts.
use super::Shared;
use std::{path::Path, sync::Arc};

const UNSUPPORTED: &str = "The ChatGPT channel is not available on Windows yet";

pub(super) struct Server;
impl Server {
    pub(super) fn start(_data: &Path, _shared: Arc<Shared>) -> Result<Self, String> {
        Err(UNSUPPORTED.into())
    }
}

pub(super) fn relay(_socket: &Path) -> Result<(), String> {
    Err(UNSUPPORTED.into())
}
