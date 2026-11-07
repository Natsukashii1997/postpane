use super::*;

#[test]
fn harness_opens_only_its_main_window_when_the_link_is_registered() {
    for target in [
        json!({"kind":"deepseek-app"}),
        json!({"kind":"deepseek-app","id":"session/one?query=two","url":"https://example.com"}),
    ] {
        assert_eq!(
            session_url_on(&target, Os::MacOs, |url| url == "dsh://open"),
            Some("dsh://open".into())
        );
        assert_eq!(session_url_on(&target, Os::MacOs, |_| false), None);
    }
}

#[test]
fn harness_does_not_offer_an_unverified_desktop_link_on_other_hosts() {
    for os in [Os::Windows, Os::Linux] {
        assert_eq!(
            session_url_on(&json!({"kind":"deepseek-app"}), os, |_| {
                panic!("an unsupported link must not query the host")
            }),
            None
        );
    }
}

#[test]
fn app_links_do_not_accept_unknown_kinds_or_change_session_links() {
    for target in [
        Value::Null,
        json!({"kind":"unknown","url":"dsh://open"}),
        json!({"kind":"iterm-session"}),
    ] {
        assert_eq!(session_url_on(&target, Os::MacOs, |_| true), None);
    }
    assert_eq!(
        session_url_on(
            &json!({"kind":"iterm-session","id":"pane/1"}),
            Os::MacOs,
            |_| panic!("a session link does not use app-link discovery"),
        ),
        Some("iterm2:reveal?sessionid=pane%2F1".into())
    );
    assert!(app_target(&Discovery::NONE).is_none());
}

#[test]
fn cursor_cloud_agent_opens_the_agents_window() {
    let target = json!({"kind":"cursor-agent","id":"bc-1234","cwd":null});
    assert_eq!(
        session_url(&target).as_deref(),
        Some("cursor://anysphere.cursor-deeplink/agent?id=bc-1234")
    );
}

#[test]
fn cursor_local_session_opens_its_folder() {
    let target = json!({"kind":"cursor-agent","id":"3e8f2eb2-c0d0","cwd":"/Users/a/my proj"});
    assert_eq!(
        session_url(&target).as_deref(),
        Some("cursor://file/Users/a/my%20proj")
    );
    assert!(session_url(&json!({"kind":"cursor-agent","id":"x","cwd":null})).is_none());
}

#[test]
fn a_local_cursor_session_names_its_folder_to_open_in_cursor() {
    let local = json!({"kind":"cursor-agent","id":"3e8f2eb2-c0d0","cwd":" /Users/a/my proj "});
    assert_eq!(
        cursor_folder(&local).and_then(|folder| folder.to_str()),
        Some("/Users/a/my proj")
    );
    // A cloud agent opens by its link, and a relative or missing folder is no folder.
    for target in [
        json!({"kind":"cursor-agent","id":"bc-1234","cwd":"/Users/a/p"}),
        json!({"kind":"cursor-agent","id":"3e8f","cwd":"relative"}),
        json!({"kind":"cursor-agent","id":"3e8f","cwd":null}),
        json!({"kind":"grok-bot-agent","id":"3e8f","cwd":"/Users/a/p"}),
    ] {
        assert_eq!(cursor_folder(&target), None, "{target}");
    }
}

#[test]
fn cursor_app_link_is_offered_only_where_it_is_registered() {
    let target = json!({"kind":"cursor-app"});
    assert_eq!(
        session_url_on(&target, Os::MacOs, |url| url == "cursor://"),
        Some("cursor://".into())
    );
    assert_eq!(session_url_on(&target, Os::MacOs, |_| false), None);
    for os in [Os::Windows, Os::Linux] {
        assert_eq!(
            session_url_on(&target, os, |_| panic!("unverified link")),
            None
        );
    }
}

#[test]
fn a_cloud_session_opens_on_claude_ai_only_by_a_session_id() {
    let open = |id: &str| {
        session_url_on(
            &json!({"kind":"claude-cloud-session","id":id}),
            Os::MacOs,
            |_| false,
        )
    };
    assert_eq!(
        open("session_01JpADBK4xjEKVxKkrSYTrLi"),
        Some("https://claude.ai/code/session_01JpADBK4xjEKVxKkrSYTrLi".into())
    );
    for odd in [
        "session_",
        "session_../x",
        "local_abc",
        "https://evil.example",
    ] {
        assert_eq!(open(odd), None);
    }
}

#[test]
fn a_chatgpt_conversation_opens_on_chatgpt_com_only_by_its_id() {
    let open = |id: &str| {
        session_url_on(
            &json!({"kind":"chatgpt-conversation","id":id}),
            Os::MacOs,
            |_| false,
        )
    };
    assert_eq!(
        open("6800c1a2-1b2c-8000-9d3e-0f1a2b3c4d5e"),
        Some("https://chatgpt.com/c/6800c1a2-1b2c-8000-9d3e-0f1a2b3c4d5e".into())
    );
    for odd in ["", "../x", "a/b", "https://evil.example", "a?b"] {
        assert_eq!(open(odd), None);
    }
}

#[test]
fn a_feishu_chat_opens_in_feishu_and_only_without_it_in_the_browser() {
    let target = json!({"kind":"feishu-chat","id":"oc_08a1_B2"});
    assert_eq!(
        session_url_on(&target, Os::MacOs, |url| url.starts_with("feishu://")),
        Some("feishu://applink.feishu.cn/client/chat/open?openChatId=oc_08a1_B2".into())
    );
    assert_eq!(
        session_url_on(&target, Os::MacOs, |_| false),
        Some("https://applink.feishu.cn/client/chat/open?openChatId=oc_08a1_B2".into())
    );
    for id in ["oc_a&x=1", "ou_08a1", "oc_", "https://example.com"] {
        assert_eq!(
            session_url_on(&json!({"kind":"feishu-chat","id":id}), Os::MacOs, |_| true),
            None,
            "{id}"
        );
    }
}

#[test]
fn a_claude_desktop_session_without_its_tab_is_not_reported_open() {
    // #220: the app alone is not the session, so the reply stays and says why.
    for kind in ["claude-desktop", "claude-cowork", "claudeDesktopSession"] {
        let target = json!({"kind":kind,"id":"11111111-2222-4333-8444-555555555555"});
        let reason = without_link(&target).expect_err(kind);
        assert!(!reason.is_empty(), "{kind}");
    }
    assert_eq!(without_link(&json!({"kind":"unknown","id":"x"})), Ok(false));
}

#[test]
fn a_tab_that_moved_to_a_new_claude_code_session_is_found_by_the_old_id() {
    // #220: the desktop tab keeps the ids it ran before in `priorCliSessionIds`.
    let temp = tempfile::tempdir().unwrap();
    let base = temp.path().to_path_buf();
    let tab = |stem: &str, meta: Value| {
        let folder = base.join("claude-code-sessions/org/acct");
        std::fs::create_dir_all(&folder).unwrap();
        std::fs::write(folder.join(format!("{stem}.json")), meta.to_string()).unwrap();
    };
    let stem = "local_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    let old = "11111111-2222-4333-8444-555555555555";
    let now = "66666666-7777-4888-9999-aaaaaaaaaaaa";
    tab(
        stem,
        json!({"sessionId":stem,"cliSessionId":now,"priorCliSessionIds":[old]}),
    );
    let bases = [base.clone()];
    assert_eq!(local_id_in(&bases, now, false), Some(stem.into()));
    assert_eq!(local_id_in(&bases, old, false), Some(stem.into()));
    // An id that is another tab's current one goes to that tab.
    let other = "local_ffffffff-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    tab(other, json!({"sessionId":other,"cliSessionId":old}));
    assert_eq!(local_id_in(&bases, old, false), Some(other.into()));
    // An archived tab is not opened by its old id either.
    let archived = "22222222-2222-4333-8444-555555555555";
    let gone = "local_00000000-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    tab(
        gone,
        json!({"sessionId":gone,"cliSessionId":now,"priorCliSessionIds":[archived],"isArchived":true}),
    );
    assert_eq!(local_id_in(&bases, archived, false), None);
}
