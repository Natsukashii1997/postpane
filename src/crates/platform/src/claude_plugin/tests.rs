use super::*;
use agent_hud_core::replies::{AnswerFix, SessionReplies};

const SESSION: &str = "44444444-4444-4444-8444-444444444444";

fn check_in(channel: &ClaudeChannel, session: &str, body: &[u8]) {
    let folder = channel.directory().join("sessions");
    fs::create_dir_all(&folder).unwrap();
    fs::write(folder.join(format!("{session}.json")), body).unwrap();
}

#[test]
fn the_plugin_files_point_at_the_channel_and_are_written_once() {
    let temp = tempfile::tempdir().unwrap();
    let channel = ClaudeChannel::new(temp.path().join("channel"));
    let folder = temp.path().join("plugin");
    assert!(channel.prepare_plugin(Path::new("relative")).is_err());
    assert!(channel.prepare_plugin(&folder).unwrap());
    assert!(
        !channel.prepare_plugin(&folder).unwrap(),
        "nothing changed the second time"
    );
    let script = fs::read_to_string(folder.join("hooks/register.ts")).unwrap();
    assert!(!script.contains("__AGENT_HUD_CHANNEL_JSON__"));
    assert!(
        script.contains(&serde_json::to_string(&channel.directory().to_string_lossy()).unwrap())
    );
    assert!(script.contains("$.prompt.submit") && script.contains("takenAt"));
    assert!(!script.contains("child_process"));
    let manifest: Value =
        serde_json::from_slice(&fs::read(folder.join(".claude-plugin/plugin.json")).unwrap())
            .unwrap();
    assert_eq!(manifest["name"], "agent-hud");
    assert!(
        channel.directory().join("sessions").is_dir()
            && channel.directory().join("prompts").is_dir()
    );
    assert_eq!(
        install_arguments(&folder)[..3],
        ["plugin", "install", "agent-hud"]
    );
    assert_eq!(remove_arguments()[0], ["plugin", "uninstall", PLUGIN_ID]);
}

#[test]
fn installed_follows_claude_codes_record() {
    let temp = tempfile::tempdir().unwrap();
    assert!(!installed(temp.path()));
    fs::create_dir_all(temp.path().join("plugins")).unwrap();
    let record = temp.path().join("plugins/installed_plugins.json");
    fs::write(&record, br#"{"plugins":{"other@market":[]}}"#).unwrap();
    assert!(!installed(temp.path()));
    fs::write(&record, br#"{"plugins":{"agent-hud@agent-hud":[]}}"#).unwrap();
    assert!(installed(temp.path()));
}

#[test]
fn installed_from_follows_the_folder_claude_code_added_the_marketplace_from() {
    let temp = tempfile::tempdir().unwrap();
    let config = temp.path().join("config");
    let ours = temp.path().join("ours");
    let swift = temp.path().join("swift");
    fs::create_dir_all(config.join("plugins")).unwrap();
    fs::create_dir_all(&ours).unwrap();
    fs::create_dir_all(&swift).unwrap();
    let markets = config.join("plugins/known_marketplaces.json");
    let market = |source: Value, location: &Path| {
        fs::write(
            &markets,
            json!({"agent-hud":{"source":source,"installLocation":location}}).to_string(),
        )
        .unwrap();
    };
    assert_eq!(marketplace_folder(&config), None);

    market(json!({"source":"directory","path":swift}), &swift);
    assert_eq!(marketplace_folder(&config), Some(swift.clone()));
    assert!(
        !installed_from(&config, &swift),
        "a marketplace alone is no plugin"
    );
    fs::write(
        config.join("plugins/installed_plugins.json"),
        br#"{"plugins":{"agent-hud@agent-hud":[]}}"#,
    )
    .unwrap();
    assert!(installed_from(&config, &swift));
    assert!(!installed_from(&config, &ours));

    // No source path: where Claude Code keeps it; the same folder however it is spelt.
    market(json!({"source":"directory"}), &swift.join("../ours"));
    assert_eq!(marketplace_folder(&config), Some(swift.join("../ours")));
    assert!(installed_from(&config, &ours));
    assert!(!installed_from(&config, &swift));

    // A record it cannot read is another's.
    fs::write(&markets, b"{").unwrap();
    assert_eq!(marketplace_folder(&config), None);
    assert!(!installed_from(&config, &ours));
    fs::remove_file(&markets).unwrap();
    assert!(!installed_from(&config, &ours));
}

#[test]
fn a_session_runs_the_plugin_while_it_checks_in() {
    let temp = tempfile::tempdir().unwrap();
    let channel = ClaudeChannel::new(temp.path().to_path_buf());
    let now = SystemTime::now();
    assert!(channel.loaded(now).is_empty());
    check_in(&channel, SESSION, br#"{"at":1}"#);
    check_in(
        &channel,
        "55555555-5555-4555-8555-555555555555",
        br#"{"ended":1}"#,
    );
    check_in(&channel, "bad name", br#"{"at":1}"#);
    assert_eq!(channel.loaded(now), HashSet::from([SESSION.to_string()]));
    assert!(
        channel
            .loaded(SystemTime::now() + CHECK_IN_LIFETIME + Duration::from_secs(1))
            .is_empty(),
        "a check-in older than 20 s does not count"
    );
    channel.clear().unwrap();
    assert!(channel.loaded(now).is_empty());
    channel.clear().unwrap();
}

#[test]
fn the_huds_answer_records_the_hud_as_its_sender() {
    let temp = tempfile::tempdir().unwrap();
    let channel = ClaudeChannel::new(temp.path().join("channel"));
    let data = temp.path().join("data");
    let replies = ClaudeReplies::new(channel.clone(), temp.path().join("claude-config"))
        .recording_deliveries(Some(data.clone()));
    assert!(replies.reply("claude", SESSION, "Ship it").is_err());
    assert!(
        !data.join("hooks/inbox").exists(),
        "words never left record nothing"
    );
    check_in(&channel, SESSION, br#"{"at":1}"#);
    replies.reply("claude", SESSION, "Ship it").unwrap();
    let records = fs::read_dir(data.join("hooks/inbox"))
        .unwrap()
        .flatten()
        .filter_map(|entry| fs::read(entry.path()).ok())
        .filter_map(|bytes| serde_json::from_slice::<Value>(&bytes).ok())
        .collect::<Vec<_>>();
    assert_eq!(records.len(), 1);
    assert_eq!(records[0]["kind"], "delivery");
    assert_eq!(records[0]["data"]["surface"], "desktop:agenthud");
}

#[test]
fn the_huds_answer_goes_to_a_loaded_session_and_tidies_what_was_taken() {
    let temp = tempfile::tempdir().unwrap();
    let channel = ClaudeChannel::new(temp.path().to_path_buf());
    let replies = ClaudeReplies::new(channel.clone(), temp.path().join("claude-config"));
    let now = SystemTime::now();
    assert_eq!(
        channel.hand(SESSION, "Install on my iPhone", now),
        Err(Refusal::NotLoaded)
    );
    assert!(replies
        .reaches("claude", SESSION)
        .unwrap_err()
        .note
        .contains("Agent plugins"));
    check_in(&channel, SESSION, br#"{"at":1}"#);
    assert!(replies.reaches("claude", SESSION).is_ok());
    assert!(replies.reaches("codex", SESSION).is_err());
    for refused in ["/clear", "  /compact", "   "] {
        assert!(channel.hand(SESSION, refused, now).is_err(), "{refused:?}");
    }
    let id = channel
        .hand(SESSION, "Build and install it on my iPhone", now)
        .unwrap();
    assert!(valid_name(&id) && id.len() == 36);
    let file = channel
        .directory()
        .join("prompts")
        .join(SESSION)
        .join(format!("{id}.json"));
    let left: Value = serde_json::from_slice(&fs::read(&file).unwrap()).unwrap();
    assert_eq!(
        (left["text"].as_str(), left["asUser"].as_bool()),
        (Some("Build and install it on my iPhone"), Some(false))
    );
    assert_eq!(
        channel.state(SESSION, &id, now).unwrap(),
        Some((PromptState::Waiting, None))
    );
    // The plugin took it a while ago: the next answer clears it.
    fs::write(&file, br#"{"takenAt":1,"startedAt":2}"#).unwrap();
    fs::File::options()
        .write(true)
        .open(&file)
        .unwrap()
        .set_modified(now - Duration::from_secs(120))
        .unwrap();
    replies.reply("claude", SESSION, "Next release").unwrap();
    assert!(!file.exists());
}

/// #255 (L-14): a session that ended once its turn was over refuses words
/// handed to it now, yet queued words wait for it as the plugin reads them,
/// under the same refusals for empty words and slash commands.
#[test]
fn words_queued_for_a_session_that_ended_wait_for_it_to_open() {
    let temp = tempfile::tempdir().unwrap();
    let channel = ClaudeChannel::new(temp.path().join("data"));
    let now = SystemTime::now();
    check_in(&channel, SESSION, br#"{"ended":1}"#);
    assert_eq!(
        channel.hand(SESSION, "Fix the three points", now),
        Err(Refusal::NotLoaded)
    );
    for refused in ["/clear", "   "] {
        assert!(channel.queue(SESSION, refused, now).is_err(), "{refused:?}");
    }
    assert!(channel.queue("../x", "Fix it", now).is_err());
    let id = channel.queue(SESSION, "Fix the three points", now).unwrap();
    let file = channel
        .directory()
        .join("prompts")
        .join(SESSION)
        .join(format!("{id}.json"));
    let left: Value = serde_json::from_slice(&fs::read(&file).unwrap()).unwrap();
    assert_eq!(left["text"], "Fix the three points");
    assert_eq!(left["asUser"], false);
    let expires = left["expiresAt"].as_u64().unwrap() - left["at"].as_u64().unwrap();
    assert_eq!(expires, PROMPT_LIFETIME.as_millis() as u64);
    assert_eq!(
        channel.state(SESSION, &id, now).unwrap(),
        Some((PromptState::Waiting, None))
    );
}

#[test]
fn words_left_under_an_identity_report_how_they_went() {
    let temp = tempfile::tempdir().unwrap();
    let channel = ClaudeChannel::new(temp.path().to_path_buf());
    let now = SystemTime::now();
    let id = "66666666-6666-4666-8666-666666666666";
    channel.leave(SESSION, id, "Ship it", true, now).unwrap();
    assert_eq!(
        channel.leave(SESSION, id, "Ship it", true, now),
        Err(Refusal::IdentityConflict)
    );
    assert!(channel.leave("../escape", id, "x", false, now).is_err());
    assert_eq!(
        channel
            .state(SESSION, "77777777-7777-4777-8777-777777777777", now)
            .unwrap(),
        None
    );
    assert_eq!(
        channel.cancel(SESSION, id).unwrap(),
        PromptState::CancelRequested
    );
    assert_eq!(
        channel.state(SESSION, id, now).unwrap().unwrap().0,
        PromptState::CancelRequested
    );
    let file = channel
        .directory()
        .join("prompts")
        .join(SESSION)
        .join(format!("{id}.json"));
    fs::write(&file, br#"{"takenAt":1,"refused":"busy"}"#).unwrap();
    assert_eq!(
        channel.state(SESSION, id, now).unwrap(),
        Some((PromptState::Refused, Some("busy".into())))
    );
    fs::write(&file, br#"{"takenAt":1}"#).unwrap();
    assert!(matches!(
        channel.cancel(SESSION, id),
        Err(Refusal::Unsupported(_))
    ));
    fs::write(&file, br#"{"text":"x","expiresAt":1}"#).unwrap();
    assert_eq!(
        channel.state(SESSION, id, now).unwrap().unwrap().0,
        PromptState::Expired
    );
}

/// A session the HUD cannot reach says which step would let it answer there:
/// install the plugin; load it in a session that last checked in before the
/// install; or open a session the app paused after it ran this install.
#[test]
fn an_unreached_session_names_the_step_that_lets_the_hud_answer() {
    let temp = tempfile::tempdir().unwrap();
    let channel = ClaudeChannel::new(temp.path().join("channel"));
    let config = temp.path().join("claude-config");
    let replies = ClaudeReplies::new(channel.clone(), config.clone());
    let fix = || replies.reaches("claude", SESSION).unwrap_err().fix;
    assert_eq!(fix(), Some(AnswerFix::InstallPlugin));
    assert_eq!(
        replies.reaches("codex", SESSION).unwrap_err().fix,
        None,
        "the plugin is Claude Code's alone"
    );

    // Installed a minute ago: a session that never checked in has not loaded it.
    let now = SystemTime::now();
    let installed =
        chrono::DateTime::<chrono::Utc>::from(now - Duration::from_secs(60)).to_rfc3339();
    fs::create_dir_all(config.join("plugins")).unwrap();
    fs::write(
        config.join("plugins/installed_plugins.json"),
        json!({"version": 2, "plugins": {"agent-hud@agent-hud": [
            {"scope": "user", "installedAt": installed, "lastUpdated": installed}]}})
        .to_string(),
    )
    .unwrap();
    assert!(installed_at(&config).is_some());
    assert_eq!(fix(), Some(AnswerFix::ReloadPlugins));

    // Nor has one that last checked in before the install.
    check_in(&channel, SESSION, br#"{"at":1}"#);
    let file = channel
        .directory()
        .join("sessions")
        .join(format!("{SESSION}.json"));
    let checked_in = |seconds_ago: u64| {
        fs::File::options()
            .write(true)
            .open(&file)
            .unwrap()
            .set_modified(now - Duration::from_secs(seconds_ago))
            .unwrap()
    };
    checked_in(3_600);
    assert_eq!(fix(), Some(AnswerFix::ReloadPlugins));

    // It ran this install, then went quiet: the app paused it, and nothing here would change that.
    checked_in(30);
    let paused = replies.reaches("claude", SESSION).unwrap_err();
    assert_eq!(paused.fix, None);
    assert!(paused.note.contains("paused"), "{}", paused.note);

    // It ended (Claude quit or restarted and stopped it): reloading plugins has
    // nowhere to run, so the card says to open it in Claude, however long ago.
    check_in(&channel, SESSION, br#"{"ended":1}"#);
    for seconds_ago in [0, 3_600] {
        checked_in(seconds_ago);
        let ended = replies.reaches("claude", SESSION).unwrap_err();
        assert_eq!(ended.fix, None);
        assert!(ended.note.contains("stopped"), "{}", ended.note);
    }

    check_in(&channel, SESSION, br#"{"at":1}"#);
    checked_in(0);
    assert!(replies.reaches("claude", SESSION).is_ok());

    // The plugin wrote that it ended: its process stopped, the plugin is
    // there (L-14), and a message runs it again.
    check_in(&channel, SESSION, br#"{"ended":1}"#);
    let stopped = replies.reaches("claude", SESSION).unwrap_err();
    assert_eq!(stopped.fix, None);
    assert!(stopped.note.contains("stopped"), "{}", stopped.note);
}

#[test]
fn a_session_whose_process_stopped_is_told_apart_from_one_never_seen() {
    let temp = tempfile::tempdir().unwrap();
    let channel = ClaudeChannel::new(temp.path().join("channel"));
    let quiet = Duration::from_secs(180);
    let now = SystemTime::now();
    // Never checked in: it may run without the plugin, so not stopped.
    assert!(!channel.stopped(SESSION, now, quiet));
    check_in(&channel, SESSION, br#"{"at":1}"#);
    assert!(!channel.stopped(SESSION, now, quiet), "checked in just now");
    assert!(
        channel.stopped(SESSION, now + Duration::from_secs(181), quiet),
        "quiet for longer than asked"
    );
    // The desktop app stopped it: the plugin wrote that it ended (L-14).
    check_in(&channel, SESSION, br#"{"ended":1}"#);
    assert!(channel.stopped(SESSION, now, quiet));
    assert!(channel.last_check_in(SESSION).is_none());
    assert!(!channel.stopped("not a session", now, quiet));
}

/// A session that ended stays known as ended for a week, so its question
/// still says to open it in Claude; other check-ins go after a day.
#[test]
fn an_ended_session_is_remembered_for_a_week() {
    let temp = tempfile::tempdir().unwrap();
    let channel = ClaudeChannel::new(temp.path().join("channel"));
    let ended = "55555555-5555-4555-8555-555555555555";
    check_in(&channel, SESSION, br#"{"at":1}"#);
    check_in(&channel, ended, br#"{"ended":1}"#);
    let now = SystemTime::now();
    let day = Duration::from_secs(86_400);

    channel.sweep(now + 2 * day);
    assert!(channel.ended(ended), "kept past a day");
    assert_eq!(
        channel.last_check_in(SESSION),
        None,
        "a plain check-in goes after a day"
    );

    channel.sweep(now + 8 * day);
    assert!(!channel.ended(ended), "gone after a week");
}

/// #257: words back to Claude go under the caller's own id, so the same step
/// sent twice leaves one copy: the second is refused as used before, whether
/// handed to a session running now or queued for one that ended.
#[test]
fn words_left_under_the_callers_id_go_once() {
    let temp = tempfile::tempdir().unwrap();
    let channel = ClaudeChannel::new(temp.path().join("data"));
    let now = SystemTime::now();
    let id = "h1a2b3c400-b5";
    check_in(&channel, SESSION, br#"{"ended":1}"#);
    assert_eq!(
        channel.hand_as(SESSION, id, "Fix the three points", now),
        Err(Refusal::NotLoaded)
    );
    assert!(channel.queue_as(SESSION, "../x", "Fix it", now).is_err());
    channel
        .queue_as(SESSION, id, "Fix the three points", now)
        .unwrap();
    assert_eq!(
        channel.queue_as(SESSION, id, "Fix the three points", now),
        Err(Refusal::IdentityConflict)
    );
    check_in(&channel, SESSION, b"{}");
    assert_eq!(
        channel.hand_as(SESSION, id, "Fix the three points", now),
        Err(Refusal::IdentityConflict)
    );
    let folder = channel.directory().join("prompts").join(SESSION);
    assert_eq!(fs::read_dir(&folder).unwrap().count(), 1, "one copy");
    let left: Value =
        serde_json::from_slice(&fs::read(folder.join(format!("{id}.json"))).unwrap()).unwrap();
    assert_eq!(left["id"], id);
    assert_eq!(
        channel.state(SESSION, id, now).unwrap(),
        Some((PromptState::Waiting, None))
    );
}

/// #258: who began a session's current turn, read from the end of its
/// transcript: the person's own words, words Agent HUD's plugin submitted,
/// or neither that can be told (a task notification, a system line).
#[test]
fn the_current_turn_is_begun_by_the_person_or_by_the_plugin() {
    let temp = tempfile::tempdir().unwrap();
    let config = temp.path().join("claude");
    let folder = config.join("projects").join("-w");
    fs::create_dir_all(&folder).unwrap(); // plain directory
    let line = |value: Value| format!("{value}\n");
    let human = |text: &str, at: &str| {
        line(
            json!({"type":"user","timestamp":at,"origin":{"kind":"human"},"message":{"role":"user","content":text}}),
        )
    };
    let plugin = |text: &str, at: &str| {
        line(
            json!({"type":"user","timestamp":at,"origin":{"kind":"plugin","name":"agent-hud"},"pluginPrompt":{"name":"agent-hud","text":text},"message":{"role":"user","content":format!("The agent-hud plugin sent a message:\n{text}")}}),
        )
    };
    let tool = line(
        json!({"type":"user","timestamp":"2026-11-09T01:00:09Z","message":{"role":"user","content":[{"type":"tool_result","content":"ok"}]}}),
    );
    let answer = line(
        json!({"type":"assistant","timestamp":"2026-11-09T01:00:10Z","message":{"role":"assistant","content":[{"type":"text","text":"done"}]}}),
    );
    let file = folder.join(format!("{SESSION}.jsonl"));
    assert_eq!(current_turn(&config, SESSION), None, "no transcript");
    fs::write(
        &file,
        [
            human("开工", "2026-11-09T01:00:00Z"),
            answer.clone(),
            plugin("ChatGPT 的意见", "2026-11-09T01:00:08Z"),
            tool.clone(),
            answer.clone(),
        ]
        .concat(),
    )
    .unwrap();
    assert_eq!(
        current_turn(&config, SESSION),
        Some((Opener::Plugin("ChatGPT 的意见".into()), 1_794_186_008_000))
    );
    let mut more = fs::read_to_string(&file).unwrap();
    more.push_str(&human("先改第 2 条", "2026-11-09T01:01:00Z"));
    more.push_str(&line(
        json!({"type":"user","timestamp":"2026-11-09T01:01:01Z","message":{"role":"user","content":"[Request interrupted by user]"}}),
    ));
    more.push_str(&tool);
    fs::write(&file, &more).unwrap();
    assert_eq!(
        current_turn(&config, SESSION),
        Some((Opener::Person, 1_794_186_060_000))
    );
    more.push_str(&line(
        json!({"type":"user","timestamp":"2026-11-09T01:02:00Z","origin":{"kind":"task-notification"},"message":{"role":"user","content":"<task-notification>done</task-notification>"}}),
    ));
    fs::write(&file, &more).unwrap();
    assert_eq!(current_turn(&config, SESSION), None, "not told");
    // Another Claude session's message (#439): Claude's desktop app marks
    // it meta, yet it begins the turn, and it is not the person's.
    more.push_str(&human("再说一句", "2026-11-09T01:03:00Z"));
    more.push_str(&line(
        json!({"type":"user","timestamp":"2026-11-09T01:04:00Z","isMeta":true,"origin":{"kind":"peer","from":"local_x"},"message":{"role":"user","content":"Another Claude session sent a message:\n结束接力"}}),
    ));
    more.push_str(&tool);
    fs::write(&file, &more).unwrap();
    assert_eq!(current_turn(&config, SESSION), None, "a peer's turn");
    // A line not a prompt that names the person or the plugin (review
    // P2-01): it ends the search, yet is taken at its word by no one.
    for origin in [
        json!({"kind":"human"}),
        json!({"kind":"plugin","name":"agent-hud"}),
    ] {
        more.push_str(&human("又一句", "2026-11-09T01:05:00Z"));
        more.push_str(&line(
            json!({"type":"user","timestamp":"2026-11-09T01:06:00Z","isMeta":true,"origin":origin,"pluginPrompt":{"text":"结束"},"message":{"role":"user","content":"meta"}}),
        ));
        fs::write(&file, &more).unwrap();
        assert_eq!(current_turn(&config, SESSION), None, "{origin}");
    }
    assert_eq!(current_turn(&config, "../x"), None);
}

#[test]
fn an_answer_for_a_session_whose_process_stopped_runs_it_in_the_background() {
    use std::sync::{Arc, Mutex};
    let temp = tempfile::tempdir().unwrap();
    let channel = ClaudeChannel::new(temp.path().join("channel"));
    let data = temp.path().join("data");
    let woken = Arc::new(Mutex::new(Vec::<(String, String)>::new()));
    let waker = |result: Result<(), String>| {
        let woken = woken.clone();
        let waker: Waker = Arc::new(move |session: &str, words: &str| {
            woken.lock().unwrap().push((session.into(), words.into()));
            result.clone()
        });
        waker
    };
    let replies = |result| {
        ClaudeReplies::new(channel.clone(), temp.path().join("claude-config"))
            .recording_deliveries(Some(data.clone()))
            .waking(waker(result))
    };

    // Never seen running the plugin, or only quiet: Claude may still run it,
    // so nothing starts a second one beside it.
    assert!(replies(Ok(())).reply("claude", SESSION, "重送").is_err());
    check_in(&channel, SESSION, br#"{"at":1}"#);
    let quiet = channel
        .directory()
        .join("sessions")
        .join(format!("{SESSION}.json"));
    fs::File::options()
        .write(true)
        .open(&quiet)
        .unwrap()
        .set_modified(SystemTime::now() - Duration::from_secs(600))
        .unwrap();
    assert!(replies(Ok(())).reply("claude", SESSION, "重送").is_err());
    assert!(woken.lock().unwrap().is_empty());

    // Its process stopped (the desktop app reclaimed it, L-14): the answer
    // runs it in the background (#520), and the HUD is its sender.
    check_in(&channel, SESSION, br#"{"ended":1}"#);
    replies(Ok(())).reply("claude", SESSION, "重送").unwrap();
    assert_eq!(
        woken.lock().unwrap().as_slice(),
        [(SESSION.to_string(), "重送".to_string())]
    );
    assert!(data
        .join("hooks/inbox")
        .read_dir()
        .unwrap()
        .next()
        .is_some());
    // Not to Codex, and no words handed to a plugin that is not running.
    assert!(replies(Ok(())).reply("codex", SESSION, "重送").is_err());
    assert_eq!(woken.lock().unwrap().len(), 1);
    assert!(!channel.directory().join("prompts").join(SESSION).exists());

    // It cannot run in the background: the card keeps waiting and says why.
    let refused = replies(Err("这个会话的权限模式是 default".into()))
        .reply("claude", SESSION, "重送")
        .unwrap_err();
    assert!(refused.contains("stopped"), "{refused}");
    assert!(refused.contains("default"), "{refused}");

    // A host that cannot run Claude Code refuses as before.
    let plain = ClaudeReplies::new(channel.clone(), temp.path().join("claude-config"));
    assert!(plain.reply("claude", SESSION, "重送").is_err());
}
