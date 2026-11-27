//! Running Antigravity language servers and the `agy` CLI, found from the
//! process list, with the loopback credential each one can be called with.
pub(super) struct Server {
    pub pid: u32,
    pub token: String,
    pub extension: Option<(u16, String)>,
    /// The HTTPS port a discovery file names; else every listening port is tried.
    pub https: Option<u16>,
    /// The credential and ports came from a discovery file, not the process's
    /// own command line: a port it names counts only if the process listens on it.
    pub from_file: bool,
    priority: u8,
}

/// The endpoints to try for `server`, given the ports its process listens
/// on: HTTPS with its token, then its extension port over HTTP. A discovery
/// file only says which of the process's own ports to use; one naming a port
/// the process does not listen on is not tried (postpane#560 P1-01).
pub(super) fn candidates(server: &Server, listening: &[u16]) -> Vec<(&'static str, u16, String)> {
    let owned = |port: &u16| !server.from_file || listening.contains(port);
    let https = match server.https {
        Some(port) => vec![port],
        None => listening.to_vec(),
    };
    let mut found = https
        .into_iter()
        .filter(|port| !server.token.is_empty() && owned(port))
        .map(|port| ("https", port, server.token.clone()))
        .collect::<Vec<_>>();
    if let Some((port, token)) = server.extension.as_ref().filter(|(port, _)| owned(port)) {
        found.push(("http", *port, token.clone()));
    }
    found
}
fn flag(command: &str, name: &str) -> Option<String> {
    let target = format!("--{name}");
    let mut offset = 0;
    while let Some(found) = command[offset..].find(&target) {
        let at = offset + found;
        let after = at + target.len();
        if (at == 0 || command.as_bytes()[at - 1].is_ascii_whitespace())
            && command
                .as_bytes()
                .get(after)
                .is_some_and(|byte| *byte == b'=' || byte.is_ascii_whitespace())
        {
            let value = command[after..].trim_start_matches('=').trim_start();
            let value = if let Some(quote @ ('\'' | '"')) = value.chars().next() {
                value[1..].split(quote).next()?
            } else {
                value.split_whitespace().next()?
            };
            if !value.is_empty() && !value.bytes().any(|byte| matches!(byte, 0 | b'\r' | b'\n')) {
                return Some(value.into());
            }
        }
        offset = after;
    }
    None
}

pub(super) fn servers() -> Result<Vec<Server>, String> {
    let published = crate::os::home_dir()
        .map(|home| super::daemon::published(&storage(&home)))
        .unwrap_or_default();
    Ok(parse_servers(crate::os::processes()?, &published))
}

/// Antigravity's storage folders, where its servers publish themselves,
/// found the way its transcripts are (`GEMINI_CLI_HOME`, else `~/.gemini`).
fn storage(home: &std::path::Path) -> Vec<std::path::PathBuf> {
    let env = std::env::vars().collect::<crate::os::Environment>();
    agent_hud_agents::antigravity::AGENT
        .discovery
        .storage
        .iter()
        .flat_map(|location| crate::os::resolve(home, &env, location))
        .collect()
}

/// Credentials come from the command line (older apps, the `agy` CLI) or,
/// for a server that carries none, from the discovery file naming its pid.
fn parse_servers(
    processes: Vec<crate::os::ProcessInfo>,
    published: &[super::daemon::Published],
) -> Vec<Server> {
    let mut result = Vec::new();
    for process in processes {
        let pid = process.pid;
        let command = process.command.as_str();
        let executable = process.executable.to_lowercase().replace('\\', "/");
        let cli = matches!(executable.rsplit('/').next(), Some("agy" | "agy.exe"));
        let server = (executable.contains("language_server")
            || executable.contains("language-server"))
            && (executable.contains("antigravity.app/")
                || executable.contains("antigravity ide.app/")
                || executable.contains("/antigravity/")
                || executable.contains("/antigravity-cli/")
                || executable.contains("/antigravity_cli/")
                || flag(command, "app_data_dir")
                    .is_some_and(|path| path.starts_with("antigravity")));
        if !server && !cli {
            continue;
        }
        let token = flag(command, "csrf_token").unwrap_or_default();
        let extension = flag(command, "extension_server_port")
            .and_then(|value| value.parse::<u16>().ok())
            .filter(|port| *port != 0)
            .and_then(|port| {
                let token =
                    flag(command, "extension_server_csrf_token").unwrap_or_else(|| token.clone());
                (!token.is_empty()).then_some((port, token))
            });
        let mut server = Server {
            pid,
            token,
            extension,
            https: None,
            from_file: false,
            priority: if cli { 1 } else { 0 },
        };
        if server.token.is_empty() && server.extension.is_none() {
            let Some(file) = published.iter().find(|file| file.pid == pid) else {
                continue;
            };
            server.token = file.token.clone();
            server.https = file.https;
            server.extension = file.http.map(|port| (port, file.token.clone()));
            server.from_file = true;
        }
        result.push(server);
    }
    result.sort_by_key(|server| (server.priority, server.pid));
    result
}

/// The CLI's own executable, rather than another `agy` found on PATH.
/// A token-less CLI still supports its read-only `/usage` command; when no
/// CLI process is running, fall back to the installed or app-bundled CLI.
pub(super) fn cli_executable() -> Result<Option<String>, String> {
    if let Some(running) = cli_from(crate::os::processes()?) {
        return Ok(Some(running));
    }
    let Ok(home) = crate::os::home_dir() else {
        return Ok(None);
    };
    let env = std::env::vars().collect::<crate::os::Environment>();
    Ok(crate::os::engine_candidates(&home, &env, "agy")
        .into_iter()
        .find(|path| crate::os::engine_executable(path))
        .and_then(|path| path.to_str().map(str::to_owned)))
}

fn cli_from(processes: Vec<crate::os::ProcessInfo>) -> Option<String> {
    processes.into_iter().find_map(|process| {
        let path = std::path::Path::new(&process.executable);
        (path.is_absolute()
            && path
                .file_name()
                .and_then(|name| name.to_str())
                .is_some_and(|name| {
                    name.eq_ignore_ascii_case("agy") || name.eq_ignore_ascii_case("agy.exe")
                }))
        .then_some(process.executable)
    })
}

#[cfg(test)]
mod tests {
    use super::super::daemon::Published;
    use super::*;

    fn process(pid: u32, executable: &str, command: &str) -> crate::os::ProcessInfo {
        crate::os::ProcessInfo {
            pid,
            executable: executable.into(),
            command: command.into(),
        }
    }

    #[test]
    fn discovers_all_authenticated_native_and_cli_servers() {
        let found = parse_servers(
            vec![
                process(
                    1,
                    "/Applications/Antigravity.app/language_server",
                    "server --csrf_token fixture-1",
                ),
                process(
                    2,
                    "/u/.gemini/antigravity-cli/language_server",
                    "server --csrf_token fixture-2",
                ),
                process(3, "/bin/agy", "agy"),
                process(
                    4,
                    "/unrelated/language_server",
                    "server --csrf_token fixture-4",
                ),
                process(
                    5,
                    "/Applications/Antigravity IDE.app/language-server",
                    "server --csrf_token fixture-5",
                ),
            ],
            &[],
        );
        assert_eq!(
            found.iter().map(|server| server.pid).collect::<Vec<_>>(),
            [1, 2, 5]
        );
    }

    #[test]
    fn discovers_windows_language_server_and_cli_with_native_paths() {
        let found = parse_servers(
            vec![
                process(
                    1,
                    r"C:\Program Files\Antigravity\language_server.exe",
                    "server --app_data_dir antigravity --csrf_token fixture",
                ),
                process(2, r"C:\Tools\agy.exe", "agy.exe --csrf_token fixture"),
                process(
                    3,
                    r"C:\Other\language_server.exe",
                    "server --app_data_dir unrelated --csrf_token fixture",
                ),
            ],
            &[],
        );
        assert_eq!(
            found.iter().map(|server| server.pid).collect::<Vec<_>>(),
            [1, 2]
        );
    }

    /// Antigravity 2.35.2 desktop: the host token arrives on stdin, so the
    /// command line has no credential and only the discovery file does.
    const HUB_SERVER: &str = "/Applications/Antigravity.app/Contents/Resources/bin/language_server";
    const HUB_ARGS: &str = "language_server --standalone --override_ide_name antigravity \
        --subclient_type hub --override_ide_version 2.35.2 --https_server_port 0 \
        --app_data_dir antigravity --enable_sidecars \
        --host_bridge_url=http://127.0.0.1:53119 --read_host_bridge_token_from_stdin";

    fn hub_file(pid: u32) -> Published {
        Published {
            pid,
            https: Some(53120),
            http: Some(53121),
            token: "fixture-hub".into(),
        }
    }

    #[test]
    fn desktop_hub_server_uses_the_discovery_file_for_its_own_pid() {
        assert!(parse_servers(vec![process(7, HUB_SERVER, HUB_ARGS)], &[]).is_empty());
        let found = parse_servers(
            vec![
                process(7, HUB_SERVER, HUB_ARGS),
                process(8, "/usr/bin/python3", "python3 language_server"),
            ],
            &[hub_file(7), hub_file(8)],
        );
        assert_eq!(found.len(), 1);
        let server = &found[0];
        assert_eq!((server.pid, server.token.as_str()), (7, "fixture-hub"));
        assert_eq!(server.https, Some(53120));
        assert_eq!(server.extension, Some((53121, "fixture-hub".to_owned())));
    }

    /// A discovery file names the process's ports; only those the process
    /// listens on are tried (postpane#560 P1-01).
    #[test]
    fn a_discovery_file_port_counts_only_if_its_process_listens_on_it() {
        let found = parse_servers(vec![process(7, HUB_SERVER, HUB_ARGS)], &[hub_file(7)]);
        let server = &found[0];
        assert!(server.from_file);
        assert_eq!(
            candidates(server, &[53120, 53121, 53498]),
            [
                ("https", 53120, "fixture-hub".to_owned()),
                ("http", 53121, "fixture-hub".to_owned()),
            ]
        );
        // The file points at ports another process holds.
        assert!(candidates(server, &[53498]).is_empty());
        assert!(candidates(server, &[]).is_empty());
        assert_eq!(
            candidates(server, &[53121]),
            [("http", 53121, "fixture-hub".to_owned())]
        );
    }

    #[test]
    fn a_command_line_server_tries_every_port_it_listens_on_and_its_extension() {
        let found = parse_servers(
            vec![process(
                9,
                "/Applications/Antigravity.app/language_server",
                "server --csrf_token t --extension_server_port 4000",
            )],
            &[],
        );
        let server = &found[0];
        assert!(!server.from_file);
        assert_eq!(
            candidates(server, &[5000, 5001]),
            [
                ("https", 5000, "t".to_owned()),
                ("https", 5001, "t".to_owned()),
                ("http", 4000, "t".to_owned()),
            ]
        );
    }

    #[test]
    fn a_stale_discovery_file_never_vouches_for_another_process() {
        let found = parse_servers(vec![process(7, HUB_SERVER, HUB_ARGS)], &[hub_file(99)]);
        assert!(found.is_empty());
    }

    #[test]
    fn command_line_credentials_win_and_cli_and_desktop_run_side_by_side() {
        let found = parse_servers(
            vec![
                process(3, "/opt/homebrew/bin/agy", "agy --csrf_token fixture-cli"),
                process(7, HUB_SERVER, HUB_ARGS),
                process(
                    9,
                    "/Applications/Antigravity.app/language_server",
                    "server --csrf_token fixture-old",
                ),
            ],
            &[hub_file(7), hub_file(9)],
        );
        let seen = found
            .iter()
            .map(|server| (server.pid, server.token.as_str(), server.https))
            .collect::<Vec<_>>();
        assert_eq!(
            seen,
            [
                (7, "fixture-hub", Some(53120)),
                (9, "fixture-old", None),
                (3, "fixture-cli", None),
            ]
        );
    }

    #[test]
    fn tokenless_cli_fallback_uses_the_executable_not_command_arguments() {
        let root = tempfile::tempdir().unwrap();
        let executable = root.path().join("installed/agy");
        let executable = executable.to_str().unwrap();
        let found = cli_from(vec![
            process(1, "/bin/sh", "sh /bin/agy"),
            process(2, executable, "agy"),
        ]);
        assert_eq!(found.as_deref(), Some(executable));
        assert!(cli_from(vec![process(1, "agy", "agy")]).is_none());
    }
}
