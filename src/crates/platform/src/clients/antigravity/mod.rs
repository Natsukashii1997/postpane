//! Antigravity's native channel: its running language server
//! (`agents::antigravity::ACCOUNT_SERVICE` for quota, `LOCAL_SERVICE` for the permission
//! requests it waits on.
mod daemon;
pub(crate) mod permissions;
mod running;
pub mod service;
