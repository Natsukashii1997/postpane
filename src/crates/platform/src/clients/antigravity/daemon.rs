//! Antigravity's desktop app (2.35+, `--subclient_type hub`) starts its
//! language server with the host token on stdin, so the command line carries no
//! CSRF credential. The server instead publishes its own loopback ports and
//! credential in a same-user file, `~/.gemini/antigravity*/daemon/*.json`
//! (`pid`, `httpsPort`, `httpPort`, `csrfToken`). A file counts only for the
//! running Antigravity language server whose pid it names; the credential is
//! never logged or returned.
use std::{fs, io::Read, path::Path};

const MAX_FILE: u64 = 4096;

#[derive(Clone, Debug, PartialEq, Eq)]
pub(super) struct Published {
    pub pid: u32,
    pub https: Option<u16>,
    pub http: Option<u16>,
    pub token: String,
}

/// Every well-formed discovery file under `home`. Unreadable, oversized,
/// linked or malformed files are skipped; matching to a process is the caller's.
pub(super) fn published(home: &Path) -> Vec<Published> {
    let Ok(roots) = fs::read_dir(home.join(".gemini")) else {
        return Vec::new();
    };
    let mut found = Vec::new();
    for root in roots.flatten() {
        if !root
            .file_name()
            .to_str()
            .is_some_and(|name| name.starts_with("antigravity"))
        {
            continue;
        }
        let Ok(files) = fs::read_dir(root.path().join("daemon")) else {
            continue;
        };
        for file in files.flatten() {
            let path = file.path();
            if path.extension().and_then(|ext| ext.to_str()) != Some("json")
                || !file.file_type().is_ok_and(|kind| kind.is_file())
            {
                continue;
            }
            let mut bytes = Vec::new();
            let read = fs::File::open(&path)
                .and_then(|file| file.take(MAX_FILE + 1).read_to_end(&mut bytes));
            if read.is_ok() && bytes.len() as u64 <= MAX_FILE {
                found.extend(parse(&bytes));
            }
        }
    }
    found
}

fn parse(bytes: &[u8]) -> Option<Published> {
    let value = serde_json::from_slice::<serde_json::Value>(bytes).ok()?;
    let port = |key: &str| {
        value[key]
            .as_u64()
            .and_then(|port| u16::try_from(port).ok())
            .filter(|port| *port != 0)
    };
    let token = value["csrfToken"].as_str()?;
    let pid = u32::try_from(value["pid"].as_u64()?).ok()?;
    let (https, http) = (port("httpsPort"), port("httpPort"));
    (!token.is_empty()
        && !token.bytes().any(|byte| byte.is_ascii_control())
        && pid != 0
        && (https.is_some() || http.is_some()))
    .then(|| Published {
        pid,
        https,
        http,
        token: token.to_owned(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Shape written by Antigravity 2.35.2 (`daemon/hub_<httpPort>.json`).
    const HUB: &str = r#"{"pid":92483,"httpsPort":53120,"httpPort":53121,"lsVersion":"2.35.2","csrfToken":"fixture-hub-token"}"#;

    fn hub() -> Published {
        Published {
            pid: 92483,
            https: Some(53120),
            http: Some(53121),
            token: "fixture-hub-token".into(),
        }
    }

    #[test]
    fn reads_the_desktop_hub_discovery_file() {
        assert_eq!(parse(HUB.as_bytes()), Some(hub()));
    }

    #[test]
    fn rejects_files_without_a_usable_credential_pid_or_port() {
        for body in [
            "",
            "not json",
            "[]",
            r#"{"pid":92483,"httpsPort":53120,"httpPort":53121}"#,
            r#"{"pid":92483,"httpsPort":53120,"csrfToken":""}"#,
            r#"{"pid":92483,"httpsPort":53120,"csrfToken":"a\nb"}"#,
            r#"{"httpsPort":53120,"csrfToken":"t"}"#,
            r#"{"pid":0,"httpsPort":53120,"csrfToken":"t"}"#,
            r#"{"pid":-1,"httpsPort":53120,"csrfToken":"t"}"#,
            r#"{"pid":92483,"httpsPort":0,"httpPort":70000,"csrfToken":"t"}"#,
        ] {
            assert_eq!(parse(body.as_bytes()), None, "{body}");
        }
        let one_port = parse(br#"{"pid":7,"httpPort":53121,"csrfToken":"t"}"#).unwrap();
        assert_eq!((one_port.https, one_port.http), (None, Some(53121)));
    }

    #[test]
    fn scans_only_antigravity_daemon_folders_and_skips_bad_files() {
        let home = tempfile::tempdir().unwrap();
        let write = |relative: &str, body: &str| {
            let path = home.path().join(relative);
            fs::create_dir_all(path.parent().unwrap()).unwrap();
            fs::write(path, body).unwrap();
        };
        write(".gemini/antigravity/daemon/hub_53121.json", HUB);
        write(
            ".gemini/antigravity-cli/daemon/cli_1.json",
            r#"{"pid":5,"httpPort":6,"csrfToken":"cli"}"#,
        );
        write(".gemini/antigravity/daemon/notes.txt", HUB);
        write(".gemini/antigravity/daemon/broken.json", "{");
        write(
            ".gemini/antigravity/daemon/huge.json",
            &format!("{HUB}{}", " ".repeat(MAX_FILE as usize)),
        );
        write(".gemini/other/daemon/hub_1.json", HUB);
        let mut found = published(home.path());
        found.sort_by_key(|server| server.pid);
        assert_eq!(found.iter().map(|s| s.pid).collect::<Vec<_>>(), [5, 92483]);
        assert_eq!(found[1], hub());
        assert!(published(&home.path().join("missing")).is_empty());
    }
}
