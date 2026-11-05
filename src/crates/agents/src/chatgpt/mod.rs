//! ChatGPT, reached through the PostPane Chrome extension on chatgpt.com
//! (docs/chatgpt-channel.md). It has no files to read: the extension reports
//! each finished turn over its native channel, and the platform turns it into
//! a completion event.
use crate::{Agent, Carries, Channel, Discovery, Location, PerOs, Support};
use serde_json::{json, Value};

/// The extension's fixed id: its manifest's `key` pins it, wherever the
/// folder is loaded from.
pub const EXTENSION_ID: &str = "fjjbgamejbdjdaddinacpbmaeokinbjl";
/// The only origin Chrome may start the native host for.
pub const EXTENSION_ORIGIN: &str = "chrome-extension://fjjbgamejbdjdaddinacpbmaeokinbjl/";
/// The native messaging host's name, and its manifest's file name without `.json`.
pub const HOST_NAME: &str = "com.postpane.chatgpt";
/// The navigation target a ChatGPT conversation opens with.
pub const NAVIGATION_KIND: &str = "chatgpt-conversation";

/// Where Chrome looks for a user's native messaging host manifests.
pub static NATIVE_HOSTS: PerOs<Location> = PerOs {
    macos: Support::Unverified(Location::app_data(
        &["Google/Chrome/NativeMessagingHosts"],
        "",
    )),
    windows: Support::Unsupported(
        "Chrome finds native hosts through the registry (HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts); not implemented",
    ),
    linux: Support::Unverified(Location::config_home(
        &["google-chrome/NativeMessagingHosts"],
        "",
    )),
};

static CHANNEL: Channel = Channel {
    name: "PostPane Chrome extension",
    carries: &[Carries::Turns],
    support: PerOs {
        macos: Support::Unverified(()),
        windows: Support::Unsupported("The extension's socket is a Unix socket; no named pipe yet"),
        linux: Support::Unverified(()),
    },
};

static DISCOVERY: Discovery = Discovery {
    session_target: Some(target),
    ..Discovery::NONE
};

pub static AGENT: Agent = Agent {
    id: "chatgpt",
    name: "ChatGPT",
    sessions: true,
    hooks: None,
    observer: None,
    channel: Some(&CHANNEL),
    program: None,
    replies: None,
    turns: None,
    items: None,
    sources: crate::everywhere(&[]),
    discovery: &DISCOVERY,
};

/// Whether `id` can be a chatgpt.com conversation id (`/c/<id>`).
pub fn conversation_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 128
        && id
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_'))
}

/// The session id a conversation is listed under.
pub fn session_id(conversation: &str) -> String {
    format!("chatgpt:{conversation}")
}

/// Where a conversation opens.
pub fn navigation_target(conversation: &str) -> Value {
    json!({"kind": NAVIGATION_KIND, "id": conversation})
}

/// The conversation of a session id, when it is one.
fn target(id: &str, _cwd: Option<&str>, _client: Option<&str>) -> Option<Value> {
    let conversation = id.strip_prefix("chatgpt:")?;
    conversation_id(conversation).then(|| navigation_target(conversation))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_session_opens_its_conversation() {
        assert_eq!(session_id("6800-ab_c"), "chatgpt:6800-ab_c");
        assert_eq!(
            target("chatgpt:6800-ab_c", None, None),
            Some(json!({"kind":"chatgpt-conversation","id":"6800-ab_c"}))
        );
        assert_eq!(target("chatgpt:", None, None), None);
        assert_eq!(target("chatgpt:a/b", None, None), None);
        assert_eq!(target("6800", None, None), None);
        assert!(!conversation_id(&"a".repeat(129)));
        assert!(EXTENSION_ORIGIN.contains(EXTENSION_ID));
    }
}
