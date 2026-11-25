//! 插件原因码只在协议里流转，交给人看的错误说明带上下一步（#434）。
use agent_hud_core::l10n;

pub(super) fn refused(reason: &str) -> String {
    let (zh, en) = match reason {
        "composer-mismatch" => (
            "输入框里的字和要送的话对不上，可能多出旧稿、长文被转成附件，或留着上次的附件。请到 ChatGPT 页面移除附件、清空输入框后，在接力卡上重试。",
            "The composer does not match the words to send: an old draft or attachment may remain, or a long paste became an attachment. Please remove attachments and empty the ChatGPT composer, then retry from the handoff card.",
        ),
        "no-composer" => (
            "没有找到 ChatGPT 输入框。请打开对应的 ChatGPT 标签页，确认已登录、页面已加载后重试。",
            "The ChatGPT composer was not found. Please open the corresponding ChatGPT tab, check that you are signed in and the page has loaded, then retry.",
        ),
        "busy" => (
            "ChatGPT 还在写回答。请等这个会话写完后再重试。",
            "ChatGPT is still writing an answer. Please wait for this conversation to finish, then retry.",
        ),
        "send-failed" => (
            "没有确认这段话已发出。请先到 ChatGPT 页面核对是否已有这段话，再按接力卡提示处理，避免重复发送。",
            "Sending these words was not confirmed. Please check whether they already appear in ChatGPT, then follow the handoff card to avoid sending them twice.",
        ),
        "timeout" => (
            "等待 ChatGPT 页面超时。请打开对应标签页，先核对这段话是否已发出，再按接力卡提示处理。",
            "Waiting for the ChatGPT page timed out. Please open its tab, check whether these words were sent, then follow the handoff card.",
        ),
        "tab-closed" => (
            "ChatGPT 标签页已关闭或无法访问。请打开对应会话，核对这段话是否已发出，再按接力卡提示处理。",
            "The ChatGPT tab is closed or unreachable. Please open the conversation, check whether these words were sent, then follow the handoff card.",
        ),
        "not-watched" => (
            "这个 ChatGPT 会话不在接力名单里。请从接力卡打开对应会话后重试。",
            "This ChatGPT conversation is not on the handoff list. Please open it from the handoff card, then retry.",
        ),
        "other-conversation" => (
            "ChatGPT 页面已切到别的会话，这段话没有发送。请切回接力对应的会话，检查输入框后重试。",
            "The ChatGPT page has moved to another conversation; these words were not sent. Please return to the handoff conversation, check the composer, then retry.",
        ),
        _ => (
            "ChatGPT 插件没能完成这次操作。请到对应的 ChatGPT 页面核对是否已发出，再按接力卡提示处理。",
            "The ChatGPT extension could not finish this action. Please check whether these words were sent in ChatGPT, then follow the handoff card.",
        ),
    };
    l10n::text(zh, en)
}
