//! Words sent into a watched conversation, and what is known of them when
//! they did not go (#466): send never pressed, they are not there, and may
//! go again; no word of them, or send pressed with nothing seen to start,
//! it is not known whether they went (the host's `handoff/sending/book_unsure.rs`).
use super::{agent, l10n, refused, request_id, Channel, SEND_TIME};
use serde_json::{json, Value};

/// How asking the extension came to nothing.
pub(super) enum Unasked {
    /// What was asked never left PostPane: no extension is connected.
    Unposted(String),
    /// The extension's own answer, not ok.
    Refused(Value),
    /// No answer: none in time, or the extension went away meanwhile.
    Silent(String),
}
impl From<Unasked> for String {
    fn from(unasked: Unasked) -> String {
        match unasked {
            Unasked::Unposted(text) | Unasked::Silent(text) => text,
            Unasked::Refused(reply) => {
                let text = refused(reply["reason"].as_str().unwrap_or("send-failed"));
                // Words the page put in the box and could not take out again
                // (#507 review P2-03): said, so they are not sent by hand.
                if reply["left"] == true {
                    return text + &left_in_box();
                }
                // A new chat's send pressed and no address seen (#544): the
                // words may be in a conversation not yet known.
                let unseen = matches!(reply["reason"].as_str(), Some("timeout" | "unconfirmed"));
                if reply["pressed"] == true && unseen {
                    return text + &pressed_unseen();
                }
                text
            }
        }
    }
}
fn pressed_unseen() -> String {
    l10n::text(
        "（发送已经点下去了：这段话可能已在一个新的 ChatGPT 会话里，重试前先到 ChatGPT 里核对，免得重复送审）",
        " (send was pressed: these words may be in a new ChatGPT conversation; check ChatGPT before retrying, so they are not sent twice)",
    )
}
fn left_in_box() -> String {
    l10n::text(
        "（页面已换到别的会话，输入框里留着没清掉的字，请到那个 ChatGPT 标签页看一眼）",
        " (the page moved to another conversation; words are left in its box, look at that ChatGPT tab)",
    )
}

/// Why words did not go into a conversation, as far as is known, each with
/// its reason in the app's language.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum SendFailed {
    /// Send was never pressed: the extension says so (`pressed: false`), or
    /// the words never left PostPane. They are not in the conversation.
    NotPressed(String),
    /// Not known: no word came in time, the extension went away meanwhile,
    /// it pressed send and saw nothing start, or it does not say (an older
    /// extension; a tab closed meanwhile).
    Unsure(String),
}
impl SendFailed {
    pub fn text(&self) -> &str {
        match self {
            Self::NotPressed(text) | Self::Unsure(text) => text,
        }
    }
}
impl From<Unasked> for SendFailed {
    fn from(unasked: Unasked) -> Self {
        let pressed = match &unasked {
            Unasked::Unposted(_) => Some(false),
            Unasked::Refused(reply) => reply["pressed"].as_bool(),
            Unasked::Silent(_) => None,
        };
        let text = String::from(unasked);
        match pressed {
            Some(false) => Self::NotPressed(text),
            _ => Self::Unsure(text),
        }
    }
}

impl Channel {
    /// Sends `text` to a watched conversation.
    pub fn send(&self, conversation: &str, text: &str) -> Result<Value, String> {
        self.send_as(conversation, text, None)
            .map_err(|failed| failed.text().to_owned())
    }
    /// `send`, asked as `request`: an answer that comes after the wait still
    /// reaches the listener under that id.
    pub fn send_as(
        &self,
        conversation: &str,
        text: &str,
        request: Option<&str>,
    ) -> Result<Value, SendFailed> {
        if !agent::conversation_id(conversation) {
            let text = l10n::text("会话 id 不对", "Invalid conversation id");
            return Err(SendFailed::NotPressed(text));
        }
        if text.trim().is_empty() {
            let text = l10n::text("缺少要发出的文字", "Text is required");
            return Err(SendFailed::NotPressed(text));
        }
        let id = request.map(str::to_owned).unwrap_or_else(request_id);
        let message = json!({"type":"send","conversation":conversation,"text":text});
        let reply = self.shared.ask_as(id, message, SEND_TIME)?;
        Ok(json!({"sent":true,"promptId":reply["promptId"]}))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // #507 review P2-03: words the page could not take out of the box again.
    #[test]
    fn words_left_in_the_box_are_said_with_the_reason() {
        let said = |left: bool| {
            let mut reply = json!({"reason":"other-conversation","pressed":false});
            if left {
                reply["left"] = json!(true);
            }
            reply
        };
        let plain = String::from(Unasked::Refused(said(false)));
        let left = String::from(Unasked::Refused(said(true)));
        assert!(left.starts_with(&plain) && left.len() > plain.len());
        let failed = SendFailed::from(Unasked::Refused(said(true)));
        assert_eq!(failed, SendFailed::NotPressed(left));
    }

    // #544 gap 3: a new chat's send pressed and no address seen: said, so
    // it is checked before a retry sends the words again.
    #[test]
    fn a_send_pressed_with_no_address_seen_is_said_with_the_reason() {
        let said = |pressed: bool| {
            String::from(Unasked::Refused(
                json!({"ok":false,"reason":"timeout","pressed":pressed}),
            ))
        };
        assert!(said(true).starts_with(&said(false)) && said(true).len() > said(false).len());
        let busy = json!({"ok":false,"reason":"busy","pressed":true});
        assert_eq!(String::from(Unasked::Refused(busy)), refused("busy"));
    }
}
