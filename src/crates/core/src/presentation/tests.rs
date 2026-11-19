//! Ways back to a session: the desktop app's index, hook origins and the
//! session's log, and Claude Code's background jobs.
use crate::AgentHudCore;
use agent_hud_agents::HookEvent;
use chrono::Utc;
use serde_json::{json, Value};
use std::{fs, path::Path};

fn write(path: &Path, value: Value) {
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(path, serde_json::to_vec(&value).unwrap()).unwrap();
}
/// A fresh UUID-shaped session ID.
fn session_id() -> String {
    use std::sync::atomic::{AtomicU64, Ordering};
    static NEXT: AtomicU64 = AtomicU64::new(0);
    let n = NEXT.fetch_add(1, Ordering::Relaxed);
    let t = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_nanos() as u64;
    format!(
        "{:08x}-{:04x}-4{:03x}-8{:03x}-{:012x}",
        (t >> 32) as u32,
        (t >> 16) as u16,
        n & 0xfff,
        (t >> 4) & 0xfff,
        t & 0xffff_ffff_ffff
    )
}
fn core(home: &Path) -> AgentHudCore {
    let mut core = AgentHudCore::new(vec![], home.join("app"));
    core.provider_roots = vec![(home.join(".claude/projects"), "claude")];
    core
}
/// A Claude log whose lines name these clients, a second apart, the last now.
fn transcript(home: &Path, id: &str, entrypoints: &[&str]) {
    let now = Utc::now();
    let lines = entrypoints
        .iter()
        .enumerate()
        .map(|(i, entrypoint)| {
            let at = now - chrono::Duration::seconds((entrypoints.len() - 1 - i) as i64);
            json!({"sessionId":id,"timestamp":at.to_rfc3339(),"type":"assistant","entrypoint":entrypoint,
                "message":{"id":format!("m{i}"),"role":"assistant","model":"claude-sonnet-4-6","usage":{"input_tokens":10,"output_tokens":5}}})
            .to_string()
        })
        .collect::<Vec<_>>()
        .join("\n");
    let path = home
        .join(".claude/projects/work")
        .join(format!("{id}.jsonl"));
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(path, lines + "\n").unwrap();
}
fn desktop_tab(home: &Path, id: &str) -> String {
    let local = format!("local_{}", session_id());
    write(
        &home
            .join("Library/Application Support/Claude/claude-code-sessions/org/account")
            .join(format!("{local}.json")),
        json!({"sessionId":local,"cliSessionId":id,"isArchived":false}),
    );
    local
}
fn origin(id: &str, host: &str, target: Value, ago_ms: i64) -> HookEvent {
    HookEvent {
        source: "claude".into(),
        session_id: id.into(),
        at_ms: Utc::now().timestamp_millis() - ago_ms,
        kind: "origin".into(),
        data: json!({"hostVerified":true,"host":host,"navigationTarget":target}),
    }
}
fn target(core: &mut AgentHudCore, id: &str) -> Value {
    core.read_projection_sources();
    let snapshot = core.request("snapshot", json!({})).unwrap();
    snapshot["sessions"]
        .as_array()
        .unwrap()
        .iter()
        .find(|session| session["id"] == id)
        .map(|session| session["navigationTarget"].clone())
        .expect("the session is listed")
}

#[test]
fn a_newer_desktop_log_keeps_the_desktop_target_a_stale_cli_origin_would_clear() {
    let temp = tempfile::tempdir().unwrap();
    let home = temp.path();
    let mut core = core(home);

    // Started in a terminal with hooks on, then resumed in the desktop app.
    let resumed = session_id();
    let local = desktop_tab(home, &resumed);
    transcript(home, &resumed, &["cli", "claude-desktop"]);
    core.ingest_hook_events(vec![origin(&resumed, "cli", Value::Null, 60_000)]);
    assert_eq!(
        target(&mut core, &resumed),
        json!({"kind":"claude-desktop","id":local})
    );

    // The origin is newer than the log: it stands, and names no destination.
    let fresh = session_id();
    desktop_tab(home, &fresh);
    transcript(home, &fresh, &["cli", "claude-desktop"]);
    core.ingest_hook_events(vec![origin(&fresh, "cli", Value::Null, -30_000)]);
    assert_eq!(target(&mut core, &fresh), Value::Null);

    // Desktop origin, later resumed in a terminal: no pane can be guessed.
    let left = session_id();
    desktop_tab(home, &left);
    transcript(home, &left, &["claude-desktop", "cli"]);
    core.ingest_hook_events(vec![origin(
        &left,
        "desktop",
        json!({"kind":"claude-desktop","id":left}),
        60_000,
    )]);
    assert_eq!(target(&mut core, &left), Value::Null);
}

#[test]
fn a_background_job_returns_by_moving_into_the_desktop_app() {
    let temp = tempfile::tempdir().unwrap();
    let home = temp.path();
    let config = home.join(".claude");
    let mut core = core(home);
    let id = session_id();
    let job = id[..8].to_owned();
    transcript(home, &id, &["cli", "cli"]);
    write(
        &config.join("jobs").join(&job).join("state.json"),
        json!({"state":"blocked","sessionId":id,"template":"bg"}),
    );
    write(
        &config.join("sessions/101.json"),
        json!({"pid":101,"sessionId":id,"kind":"bg","status":"idle","entrypoint":"cli"}),
    );
    // The job's own hooks: the command line, no destination.
    core.ingest_hook_events(vec![origin(&id, "cli", Value::Null, 30_000)]);
    assert_eq!(
        target(&mut core, &id),
        json!({"kind":"claude-background-job","id":id,"job":job})
    );

    // Moved: the job's process went, the desktop app took the session in,
    // before the desktop app wrote anything to its log.
    fs::remove_file(config.join("sessions/101.json")).unwrap();
    write(
        &config.join("sessions/202.json"),
        json!({"pid":202,"sessionId":id,"kind":"interactive","entrypoint":"claude-desktop"}),
    );
    let local = desktop_tab(home, &id);
    assert_eq!(
        target(&mut core, &id),
        json!({"kind":"claude-desktop","id":local})
    );

    // A terminal resumed it later: hooks decide, and that one named no pane.
    write(
        &config.join("sessions/303.json"),
        json!({"pid":303,"sessionId":id,"kind":"interactive","entrypoint":"cli"}),
    );
    core.ingest_hook_events(vec![origin(&id, "cli", Value::Null, 0)]);
    assert_eq!(target(&mut core, &id), Value::Null);
}

/// A Codex rollout this client wrote, with one token count, now.
fn codex_rollout(home: &Path, id: &str, source: &str, originator: &str) {
    let at = Utc::now().to_rfc3339();
    let lines = [
        json!({"timestamp":at,"type":"session_meta","payload":{"id":id,"timestamp":at,"cwd":"/w/repo","source":source,"originator":originator}}),
        json!({"timestamp":at,"type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":10,"output_tokens":0}}}}),
    ];
    let path = home
        .join(".codex/sessions/2026/10/26")
        .join(format!("rollout-{id}.jsonl"));
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    let text: String = lines.iter().map(|line| format!("{line}\n")).collect();
    fs::write(path, text).unwrap();
}

#[test]
fn another_app_server_clients_codex_thread_opens_in_codex() {
    let temp = tempfile::tempdir().unwrap();
    let home = temp.path();
    let mut core = core(home);
    core.provider_roots = vec![(home.join(".codex/sessions"), "codex")];

    // A wrapper script's own app-server client: Codex lists its thread.
    let asked = session_id();
    codex_rollout(home, &asked, "vscode", "codex_ask");
    assert_eq!(
        target(&mut core, &asked),
        json!({"kind":"codex-thread","id":asked})
    );

    // Its hooks ran under an app-server outside Codex Desktop, which names
    // no way back; the thread still opens in Codex.
    let hooked = session_id();
    codex_rollout(home, &hooked, "vscode", "codex_ask");
    core.ingest_hook_events(vec![HookEvent {
        source: "codex".into(),
        ..origin(&hooked, "daemon", Value::Null, 30_000)
    }]);
    assert_eq!(
        target(&mut core, &hooked),
        json!({"kind":"codex-thread","id":hooked})
    );

    // The IDE extension's and the CLI's threads belong to their own windows.
    let ide = session_id();
    codex_rollout(home, &ide, "vscode", "codex_vscode");
    assert_eq!(target(&mut core, &ide), Value::Null);
    let cli = session_id();
    codex_rollout(home, &cli, "cli", "codex_cli_rs");
    assert_eq!(target(&mut core, &cli), Value::Null);
}

#[test]
fn a_harness_session_gets_the_discovered_app_fallback_and_loses_it_on_refresh() {
    let temp = tempfile::tempdir().unwrap();
    let home = temp.path();
    let mut core = core(home);
    let source = agent_hud_agents::deepseek::AGENT.id;
    core.provider_roots = vec![(home.join(".dsh/sessions"), source)];
    let header =
        json!({"type":"session","version":4,"id":"main","createdAt":Utc::now().to_rfc3339()});
    let path = home.join(".dsh/sessions/main/session.jsonl");
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(path, format!("{header}\n")).unwrap();
    let id = "deepseek:main";
    let found = crate::ProviderDiscovery {
        id: source.into(),
        installed: true,
        ..Default::default()
    };
    // A CLI or a sessions folder does not prove a desktop link is available.
    core.set_provider_discovery(vec![found.clone()]);
    assert_eq!(target(&mut core, id), Value::Null);
    let revision = core.sessions_revision;

    let app = json!({"kind":"deepseek-app"});
    core.set_provider_discovery(vec![crate::ProviderDiscovery {
        navigation_target: Some(app.clone()),
        ..found.clone()
    }]);
    let snapshot = core
        .request("snapshot", json!({"changesOnly":true}))
        .unwrap();
    assert_eq!(snapshot["sessions"][0]["navigationTarget"], app);
    assert!(core.sessions_revision > revision);
    let detail = core.request("session_detail", json!({"id":id})).unwrap();
    assert_eq!(detail["session"]["navigationTarget"], app);
    let page = core.request("sessions", json!({})).unwrap();
    assert_eq!(page["items"][0]["navigationTarget"], app);

    core.set_provider_discovery(vec![found]);
    let snapshot = core
        .request("snapshot", json!({"changesOnly":true}))
        .unwrap();
    assert_eq!(snapshot["sessions"][0]["navigationTarget"], Value::Null);
}

#[test]
fn an_app_fallback_preserves_specific_targets_and_belongs_only_to_its_source() {
    let temp = tempfile::tempdir().unwrap();
    let mut core = core(temp.path());
    let source = agent_hud_agents::deepseek::AGENT.id;
    core.set_provider_discovery(vec![crate::ProviderDiscovery {
        id: source.into(),
        navigation_target: Some(json!({"kind":"deepseek-app"})),
        ..Default::default()
    }]);
    let pane = json!({"kind":"iterm-session","id":"pane"});
    let mut session = json!({"source":source,"id":"deepseek:main","navigationTarget":pane});
    let presentation = core.presentation(Utc::now().timestamp_millis());
    presentation.overlay(&mut session, None, None, &Default::default());
    assert_eq!(session["navigationTarget"], pane);

    let mut other = json!({"source":agent_hud_agents::codex::AGENT.id,"id":"other"});
    presentation.overlay(&mut other, None, None, &Default::default());
    assert_eq!(other["navigationTarget"], Value::Null);
}

#[test]
fn a_session_lists_where_its_first_and_latest_prompts_were_typed() {
    let temp = tempfile::tempdir().unwrap();
    let home = temp.path();
    let mut core = core(home);
    let id = session_id();
    let now = Utc::now();
    let at = |ago_s: i64| now - chrono::Duration::seconds(ago_s);
    let prompt = |ago_s: i64, entrypoint: &str, text: &str, plugin: bool| {
        let mut line = json!({"sessionId":id,"timestamp":at(ago_s).to_rfc3339(),"type":"user","entrypoint":entrypoint,
            "message":{"role":"user","content":text}});
        if plugin {
            line["origin"] = json!({"kind":"plugin","name":"agent-hud"});
        }
        line.to_string()
    };
    let path = home
        .join(".claude/projects/work")
        .join(format!("{id}.jsonl"));
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(
        &path,
        [
            prompt(600, "cli", "start in the terminal", false),
            prompt(10, "cli", "sent from the phone", true),
        ]
        .join("\n")
            + "\n",
    )
    .unwrap();
    let ms = |ago_s: i64| at(ago_s).timestamp_millis();
    core.ingest_hook_events(vec![
        // The terminal's hook ran at the session's start; its record keeps
        // that first surface when the hook runs again for the phone's prompt.
        HookEvent {
            data: json!({"hostVerified":true,"host":"cli","navigationTarget":null,"surface":"cli:iterm",
                "first":{"surface":"cli:iterm","at":ms(620)}}),
            ..origin(&id, "cli", Value::Null, 0)
        },
        HookEvent {
            source: "claude".into(),
            session_id: id.clone(),
            at_ms: ms(40),
            kind: "delivery".into(),
            data: json!({"surface":"mobile:iphone"}),
        },
    ]);
    core.read_projection_sources();
    let snapshot = core.request("snapshot", json!({})).unwrap();
    let session = snapshot["sessions"]
        .as_array()
        .unwrap()
        .iter()
        .find(|session| session["id"] == id)
        .cloned()
        .expect("the session is listed");
    assert_eq!(
        session["origins"],
        json!({"init":"cli:iterm","latest":"mobile:iphone"})
    );
}

#[test]
fn a_hermes_session_names_the_bot_whose_home_it_was_read_from() {
    let temp = tempfile::tempdir().unwrap();
    let core = core(temp.path());
    let hermes = temp.path().join(".hermes");
    let profile = hermes.join("profiles").join("agumon");
    fs::create_dir_all(&profile).unwrap();
    fs::write(hermes.join("SOUL.md"), "# 猛鬼兽 · SOUL\n").unwrap();
    fs::write(profile.join("SOUL.md"), "# 亚古兽 · SOUL\n").unwrap();
    let presentation = core.presentation(Utc::now().timestamp_millis());
    let mut agumon = json!({"source":"hermes","id":"hermes:agumon:1",
        "logPath":format!("{}#hud-session-31", profile.join("state.db").display())});
    presentation.overlay(&mut agumon, None, None, &Default::default());
    assert_eq!(agumon["bot"], json!({"id":"agumon","name":"亚古兽"}));

    let mut ogre = json!({"source":"hermes","id":"hermes:1",
        "logPath":hermes.join("state.db").to_string_lossy()});
    presentation.overlay(&mut ogre, None, None, &Default::default());
    assert_eq!(ogre["bot"], json!({"id":"default","name":"猛鬼兽"}));

    let mut codex =
        json!({"source":"codex","id":"c","logPath":hermes.join("state.db").to_string_lossy()});
    presentation.overlay(&mut codex, None, None, &Default::default());
    assert_eq!(codex["bot"], Value::Null);
}

#[test]
fn a_hermes_session_goes_back_to_its_feishu_chat() {
    let temp = tempfile::tempdir().unwrap();
    let mut core = core(temp.path());
    let hermes = temp.path().join(".hermes");
    core.provider_roots.push((hermes.clone(), "hermes"));
    fs::create_dir_all(&hermes).unwrap();
    fs::write(hermes.join("SOUL.md"), "# 猛鬼兽 · SOUL\n").unwrap();
    fs::write(hermes.join("gateway_state.json"), "{}").unwrap();
    let db = rusqlite::Connection::open(hermes.join("state.db")).unwrap();
    db.execute_batch(
        "CREATE TABLE sessions (id TEXT PRIMARY KEY, source TEXT, chat_type TEXT, chat_id TEXT, user_id TEXT);
         INSERT INTO sessions VALUES ('grp','feishu','group','oc_grp','ou_colleague'),
           ('tool','tool',NULL,NULL,NULL);",
    )
    .unwrap();
    drop(db);
    let presentation = core.presentation(Utc::now().timestamp_millis());
    let log = hermes.join("state.db").to_string_lossy().into_owned();
    let mut chat = json!({"source":"hermes","id":"hermes:grp","logPath":log});
    presentation.overlay(&mut chat, None, None, &Default::default());
    assert_eq!(
        chat["navigationTarget"],
        json!({"kind":"feishu-chat","id":"oc_grp"})
    );
    // A run with no Feishu chat keeps no way back, as before.
    let mut tool = json!({"source":"hermes","id":"hermes:tool","logPath":log});
    presentation.overlay(&mut tool, None, None, &Default::default());
    assert_eq!(tool["navigationTarget"], Value::Null);
}

/// A Claude log mid-turn: the user's prompt, just sent, no answer yet.
fn turn_in_progress(home: &Path, id: &str) {
    let at = Utc::now().to_rfc3339();
    let line = json!({"sessionId":id,"timestamp":at,"type":"user","entrypoint":"cli",
        "message":{"role":"user","content":"Run a long command"}});
    let path = home
        .join(".claude/projects/work")
        .join(format!("{id}.jsonl"));
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(path, line.to_string() + "\n").unwrap();
}
fn state(core: &mut AgentHudCore, id: &str) -> Value {
    let snapshot = core.request("snapshot", json!({})).unwrap();
    snapshot["sessions"]
        .as_array()
        .unwrap()
        .iter()
        .find(|session| session["id"] == id)
        .map(|session| session["state"].clone())
        .expect("the session is listed")
}

/// Killed outright mid-turn (#251): its log still says it runs, and Claude
/// Code's registry names a process that no longer does. Another session, whose
/// process runs, goes on.
#[test]
fn a_session_whose_process_was_killed_is_no_longer_running() {
    use agent_hud_agents::claude::processes::ClaudeProcesses;
    let temp = tempfile::tempdir().unwrap();
    let home = temp.path();
    let mut core = core(home);
    core.claude_desktop.processes =
        ClaudeProcesses::with_host(agent_hud_agents::Os::MacOs, |pid, _| pid != 41_107);
    let (killed, running) = (session_id(), session_id());
    turn_in_progress(home, &killed);
    turn_in_progress(home, &running);
    // Before a process registers, the log has its say.
    assert_eq!(state(&mut core, &killed), "running");
    for (id, pid) in [(&killed, 41_107), (&running, 500)] {
        write(
            &home.join(format!(".claude/sessions/{pid}.json")),
            json!({"pid":pid,"sessionId":id,"pidDomain":"darwin","status":"busy"}),
        );
    }
    std::thread::sleep(std::time::Duration::from_millis(5));
    // The next look reads the registry: the killed session has ended.
    assert!(core.look(), "a process that went is a change");
    assert_eq!(state(&mut core, &killed), "idle");
    assert_eq!(state(&mut core, &running), "running");
}

/// A Claude log that asked the user a question `ago_min` minutes ago and was
/// quiet after.
fn asked_a_question(home: &Path, id: &str, ago_min: i64) {
    let at = |ago: i64| (Utc::now() - chrono::Duration::minutes(ago)).to_rfc3339();
    let usage = json!({"input_tokens":10,"output_tokens":5,"cache_creation_input_tokens":0,"cache_read_input_tokens":0});
    let lines = [
        json!({"sessionId":id,"timestamp":at(ago_min + 1),"type":"user","entrypoint":"cli","uuid":"u1",
            "message":{"role":"user","content":"Pick a plan"}}),
        json!({"sessionId":id,"timestamp":at(ago_min),"type":"assistant","entrypoint":"cli",
            "message":{"id":"m1","model":"claude-opus-4-5","role":"assistant","usage":usage,
                "content":[{"type":"tool_use","id":"q1","name":"AskUserQuestion","input":{}}]}}),
    ];
    let path = home
        .join(".claude/projects/work")
        .join(format!("{id}.jsonl"));
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    let text = lines.iter().map(Value::to_string).collect::<Vec<_>>();
    fs::write(path, text.join("\n") + "\n").unwrap();
}
fn listed(core: &mut AgentHudCore, id: &str) -> Option<Value> {
    let snapshot = core.request("snapshot", json!({})).unwrap();
    snapshot["sessions"]
        .as_array()
        .unwrap()
        .iter()
        .find(|session| session["id"] == id)
        .cloned()
}

/// A question the log left open still waits after half an hour, marked stale;
/// once Claude Code's registry says its process went, nothing waits (#251).
#[test]
fn an_open_question_waits_until_its_process_has_gone() {
    use agent_hud_agents::claude::processes::ClaudeProcesses;
    let temp = tempfile::tempdir().unwrap();
    let home = temp.path();
    let mut core = core(home);
    core.claude_desktop.processes =
        ClaudeProcesses::with_host(agent_hud_agents::Os::MacOs, |pid, _| pid != 41_107);
    let (killed, unknown) = (session_id(), session_id());
    asked_a_question(home, &killed, 45);
    asked_a_question(home, &unknown, 45);
    let session = listed(&mut core, &unknown).expect("the session is listed");
    assert_eq!(session["state"], "waiting");
    assert_eq!(session["liveFacts"]["requests"][0]["stale"], true);
    write(
        &home.join(".claude/sessions/41107.json"),
        json!({"pid":41_107,"sessionId":killed,"pidDomain":"darwin","status":"busy"}),
    );
    std::thread::sleep(std::time::Duration::from_millis(5));
    assert!(core.look(), "a process that went is a change");
    let session = listed(&mut core, &killed).expect("the session is listed");
    assert_eq!(session["state"], "idle");
    assert_eq!(session["liveFacts"]["requests"], json!([]));
    assert_eq!(state(&mut core, &unknown), "waiting");
}

/// An open question in a log older than a day does not bring its session back
/// into the snapshot's one-day window.
#[test]
fn an_open_question_older_than_a_day_stays_out_of_the_snapshot() {
    let temp = tempfile::tempdir().unwrap();
    let home = temp.path();
    let mut core = core(home);
    let (old, recent) = (session_id(), session_id());
    asked_a_question(home, &old, 25 * 60);
    asked_a_question(home, &recent, 23 * 60);
    assert!(listed(&mut core, &old).is_none());
    assert_eq!(state(&mut core, &recent), "waiting");
}
