//! Antigravity's native channel: its running language server
//! (`agents::antigravity::ACCOUNT_SERVICE` for quota, `LOCAL_SERVICE` for the permission
//! requests it waits on.
mod daemon;
pub(crate) mod permissions;
mod running;
pub mod service;

/// Why a call to the running language server failed: none was reached, one
/// answered and refused, or a request was sent and its outcome is unknown.
/// Only the first lets a start fall back to `agy`.
#[derive(Debug, PartialEq, Eq)]
pub enum CallError {
    Unavailable(String),
    Refused(String),
    Uncertain(String),
}
impl CallError {
    /// No language server answered at all.
    pub(crate) fn none() -> Self {
        Self::Unavailable(agent_hud_core::l10n::text(
            "没有已登录且正在运行的 Antigravity 服务",
            "No authenticated already-running Antigravity service is available",
        ))
    }
}
impl From<CallError> for String {
    fn from(error: CallError) -> Self {
        match error {
            CallError::Unavailable(text)
            | CallError::Refused(text)
            | CallError::Uncertain(text) => text,
        }
    }
}
