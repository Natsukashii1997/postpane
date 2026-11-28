//! The system proxy, handed to the programs PostPane starts (#567). A GUI
//! app gets no proxy variables, and `claude` reads only those, not the
//! system's setting: started bare from here it went straight to Anthropic,
//! was refused (403) and could not renew its sign-in. PostPane names the
//! system proxy in its own environment once at launch, so every program it
//! starts afterwards inherits it.
use std::collections::HashMap;

/// The variables a program reads its proxy from; one set is the user's own
/// choice and stands as it is.
const PROXY_KEYS: [&str; 6] = [
    "HTTPS_PROXY",
    "https_proxy",
    "HTTP_PROXY",
    "http_proxy",
    "ALL_PROXY",
    "all_proxy",
];
/// What stays off the proxy unless the user said otherwise: this machine.
const LOCAL: &str = "localhost,127.0.0.1,::1";

fn named(env: &HashMap<String, String>, key: &str) -> bool {
    env.get(key).is_some_and(|value| !value.trim().is_empty())
}

/// Whether the environment already names a proxy.
fn has_proxy(env: &HashMap<String, String>) -> bool {
    PROXY_KEYS.iter().any(|key| named(env, key))
}

/// What to add to `env` so its programs go through `proxy`: both spellings
/// of each variable, and this machine kept direct. Nothing when `env`
/// already names a proxy or there is none to hand on.
pub(crate) fn additions(
    env: &HashMap<String, String>,
    proxy: Option<&str>,
) -> Vec<(&'static str, String)> {
    let Some(proxy) = proxy.map(str::trim).filter(|proxy| !proxy.is_empty()) else {
        return vec![];
    };
    if has_proxy(env) {
        return vec![];
    }
    let mut out: Vec<(&'static str, String)> =
        ["HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy"]
            .into_iter()
            .map(|key| (key, proxy.to_owned()))
            .collect();
    if !named(env, "NO_PROXY") && !named(env, "no_proxy") {
        out.push(("NO_PROXY", LOCAL.into()));
        out.push(("no_proxy", LOCAL.into()));
    }
    out
}

/// Names the system proxy in this process's environment when it names none.
/// Call it first thing at launch, before any thread starts. Returns the
/// proxy handed on, for the log.
pub fn inherit_system_proxy() -> Option<String> {
    let env = std::env::vars().collect::<HashMap<_, _>>();
    if has_proxy(&env) {
        return None;
    }
    let proxy = crate::os::system_proxy()?;
    let added = additions(&env, Some(&proxy));
    for (key, value) in &added {
        std::env::set_var(key, value);
    }
    (!added.is_empty()).then_some(proxy)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn env(pairs: &[(&str, &str)]) -> HashMap<String, String> {
        pairs
            .iter()
            .map(|(key, value)| ((*key).into(), (*value).into()))
            .collect()
    }

    #[test]
    fn a_bare_environment_gets_the_proxy_and_keeps_this_machine_direct() {
        let added = additions(&env(&[("PATH", "/usr/bin")]), Some("http://127.0.0.1:8086"));
        assert_eq!(
            added,
            vec![
                ("HTTPS_PROXY", "http://127.0.0.1:8086".to_owned()),
                ("https_proxy", "http://127.0.0.1:8086".to_owned()),
                ("HTTP_PROXY", "http://127.0.0.1:8086".to_owned()),
                ("http_proxy", "http://127.0.0.1:8086".to_owned()),
                ("NO_PROXY", "localhost,127.0.0.1,::1".to_owned()),
                ("no_proxy", "localhost,127.0.0.1,::1".to_owned()),
            ]
        );
    }

    #[test]
    fn a_proxy_the_user_named_stands() {
        for key in PROXY_KEYS {
            let added = additions(
                &env(&[(key, "http://10.0.0.1:3128")]),
                Some("http://127.0.0.1:8086"),
            );
            assert!(added.is_empty(), "{key} was overridden");
        }
    }

    #[test]
    fn an_empty_variable_names_no_proxy() {
        let added = additions(
            &env(&[("HTTPS_PROXY", "  ")]),
            Some("http://127.0.0.1:8086"),
        );
        assert_eq!(added.len(), 6);
    }

    #[test]
    fn the_users_exceptions_stand() {
        let added = additions(
            &env(&[("no_proxy", ".corp")]),
            Some("http://127.0.0.1:8086"),
        );
        assert!(added
            .iter()
            .all(|(key, _)| !key.eq_ignore_ascii_case("no_proxy")));
        assert_eq!(added.len(), 4);
    }

    #[test]
    fn without_a_system_proxy_nothing_changes() {
        assert!(additions(&env(&[]), None).is_empty());
        assert!(additions(&env(&[]), Some(" ")).is_empty());
    }
}
