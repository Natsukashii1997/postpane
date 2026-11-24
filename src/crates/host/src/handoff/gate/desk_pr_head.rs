//! A pull request's current commit, as GitHub has it (#347): what a pass
//! is held to. Read through the proxy git and the app are set up with;
//! that failing, once more straight to GitHub (#527, owner 2026-11-24):
//! on 2026-11-23 the local proxy broke and a pass stayed 「版本待核」 for a
//! round. Only second, as the way straight may be the one that fails
//! (G-19).
use std::process::{Command, Stdio};
use std::time::Duration;

/// How long one read may take.
const READ_HEAD_WAIT: Duration = Duration::from_secs(20);
/// What sends a read through a proxy, besides git's own `http.proxy`.
const PROXY_VARS: [&str; 6] = [
    "HTTPS_PROXY",
    "HTTP_PROXY",
    "ALL_PROXY",
    "https_proxy",
    "http_proxy",
    "all_proxy",
];
/// What a read says of a pull request GitHub does not have: no other way
/// finds it.
const NOT_FOUND: &str = "没找到这个 PR";

/// 「owner/repo#n」's current commit.
pub(in crate::handoff) fn read_pr_head(pr: &str) -> Result<String, String> {
    with_fallback(|straight| ls_remote(pr, straight))
}

/// Through the proxy, then (failing, unless the pull request is not there)
/// straight: what each said, when both failed.
fn with_fallback(read: impl Fn(bool) -> Result<String, String>) -> Result<String, String> {
    let through = match read(false) {
        Ok(commit) => return Ok(commit),
        Err(error) if error == NOT_FOUND => return Err(error),
        Err(error) => error,
    };
    match read(true) {
        Ok(commit) => {
            agent_hud_runtime::note!("A pull request's commit was read straight to GitHub, the read through the proxy having failed: {through}");
            Ok(commit)
        }
        Err(straight) => {
            agent_hud_runtime::note!("A pull request's commit could not be read, through the proxy ({through}) or straight ({straight})");
            Err(format!("{through}；不经代理再读也失败：{straight}"))
        }
    }
}

/// What git is run with: never asking anyone for credentials, and, read
/// straight, with git's own proxy setting off.
fn args(url: &str, reference: &str, straight: bool) -> Vec<String> {
    let mut args = vec!["-c", "credential.interactive=never"];
    if straight {
        args.extend(["-c", "http.proxy=", "-c", "https.proxy="]);
    }
    args.extend(["ls-remote", url, reference]);
    args.into_iter().map(str::to_owned).collect()
}

/// A pull request's current commit, 「owner/repo#n」, as GitHub has it:
/// `git ls-remote`, with the person's own git credentials.
fn ls_remote(pr: &str, straight: bool) -> Result<String, String> {
    let (repo, number) = pr.split_once('#').ok_or("不是 PR")?;
    let url = format!("https://github.com/{repo}.git");
    let reference = format!("refs/pull/{number}/head");
    // Never asks anyone for credentials: what git has, or it fails.
    let mut git = Command::new("/usr/bin/git");
    git.args(args(&url, &reference, straight));
    if straight {
        for name in PROXY_VARS {
            git.env_remove(name);
        }
    }
    let mut child = git
        .env("GIT_TERMINAL_PROMPT", "0")
        .env("GIT_ASKPASS", "/usr/bin/false")
        .env("SSH_ASKPASS", "/usr/bin/false")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| error.to_string())?;
    let deadline = std::time::Instant::now() + READ_HEAD_WAIT;
    while child.try_wait().map_err(|e| e.to_string())?.is_none() {
        if std::time::Instant::now() > deadline {
            // Ended, not left behind (#347 review P2-03).
            let _ = child.kill();
            let _ = child.wait();
            return Err("读取超时".to_owned());
        }
        std::thread::sleep(Duration::from_millis(100));
    }
    let output = child
        .wait_with_output()
        .map_err(|error| error.to_string())?;
    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(error
            .lines()
            .next()
            .unwrap_or("git ls-remote 失败")
            .to_owned());
    }
    String::from_utf8_lossy(&output.stdout)
        .split_whitespace()
        .next()
        .filter(|commit| commit.len() == 40)
        .map(str::to_owned)
        .ok_or_else(|| NOT_FOUND.to_owned())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::RefCell;

    fn reads(answers: Vec<Result<String, String>>) -> (Result<String, String>, Vec<bool>) {
        let asked = RefCell::new(Vec::new());
        let answers = RefCell::new(answers.into_iter());
        let read = |straight| {
            asked.borrow_mut().push(straight);
            answers.borrow_mut().next().unwrap()
        };
        let got = with_fallback(read);
        (got, asked.into_inner())
    }

    #[test]
    fn a_read_through_the_proxy_is_all_when_it_works() {
        let (got, asked) = reads(vec![Ok("a".repeat(40))]);
        assert_eq!((got, asked), (Ok("a".repeat(40)), vec![false]));
    }

    #[test]
    fn a_failed_read_is_tried_once_more_straight() {
        let error = "LibreSSL SSL_connect: SSL_ERROR_SYSCALL".to_owned();
        let (got, asked) = reads(vec![Err(error), Ok("b".repeat(40))]);
        assert_eq!((got, asked), (Ok("b".repeat(40)), vec![false, true]));
    }

    #[test]
    fn both_failing_say_both() {
        let (got, asked) = reads(vec![Err("代理坏了".into()), Err("读取超时".into())]);
        let error = got.unwrap_err();
        assert!(
            error.contains("代理坏了") && error.contains("读取超时"),
            "{error}"
        );
        assert_eq!(asked, [false, true]);
    }

    #[test]
    fn a_pull_request_not_there_is_not_read_again() {
        let (got, asked) = reads(vec![Err(NOT_FOUND.into())]);
        assert_eq!((got, asked), (Err(NOT_FOUND.into()), vec![false]));
    }

    #[test]
    fn a_read_straight_turns_git_s_own_proxy_off() {
        let through = args("u", "r", false);
        let straight = args("u", "r", true);
        assert!(!through.iter().any(|a| a.starts_with("http.proxy")));
        for setting in ["http.proxy=", "https.proxy="] {
            assert!(straight.iter().any(|a| a == setting), "{straight:?}");
        }
        assert_eq!(straight[straight.len() - 3..], ["ls-remote", "u", "r"]);
    }
}
