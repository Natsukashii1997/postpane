//! The system proxy as System Settings sets it, read through `scutil --proxy`
//! (#567). Only a fixed HTTPS or HTTP proxy is handed on; an automatic
//! (PAC) configuration has no single address to name.

/// The system proxy as a URL (`http://127.0.0.1:8086`), the HTTPS one
/// before the HTTP one; None when neither is on or `scutil` did not answer.
pub(crate) fn system_proxy() -> Option<String> {
    super::super::unix::script_output("exec /usr/sbin/scutil --proxy")
        .and_then(|text| from_scutil(&text))
}

/// Reads `scutil --proxy`'s dictionary: `HTTPSEnable : 1` with its
/// `HTTPSProxy` and `HTTPSPort`, else the same for HTTP.
fn from_scutil(text: &str) -> Option<String> {
    let value = |key: &str| {
        text.lines().find_map(|line| {
            let (name, value) = line.split_once(" : ")?;
            (name.trim() == key).then(|| value.trim())
        })
    };
    ["HTTPS", "HTTP"].into_iter().find_map(|kind| {
        if value(&format!("{kind}Enable")) != Some("1") {
            return None;
        }
        let host = value(&format!("{kind}Proxy")).filter(|host| !host.is_empty())?;
        let port = value(&format!("{kind}Port"))?.parse::<u16>().ok()?;
        let host = if host.contains(':') && !host.starts_with('[') {
            format!("[{host}]")
        } else {
            host.to_owned()
        };
        Some(format!("http://{host}:{port}"))
    })
}

#[cfg(test)]
mod tests {
    use super::from_scutil;

    const ON: &str = "<dictionary> {
  ExceptionsList : <array> {
    0 : 127.0.0.1
    1 : localhost
  }
  HTTPEnable : 1
  HTTPPort : 8086
  HTTPProxy : 127.0.0.1
  HTTPSEnable : 1
  HTTPSPort : 8086
  HTTPSProxy : 127.0.0.1
  SOCKSEnable : 0
}";

    #[test]
    fn reads_the_https_proxy() {
        assert_eq!(from_scutil(ON).as_deref(), Some("http://127.0.0.1:8086"));
    }

    #[test]
    fn falls_back_to_the_http_proxy() {
        let text = "<dictionary> {
  HTTPEnable : 1
  HTTPPort : 7890
  HTTPProxy : proxy.lan
  HTTPSEnable : 0
}";
        assert_eq!(from_scutil(text).as_deref(), Some("http://proxy.lan:7890"));
    }

    #[test]
    fn brackets_an_ipv6_host() {
        let text = "  HTTPSEnable : 1\n  HTTPSPort : 8086\n  HTTPSProxy : ::1\n";
        assert_eq!(from_scutil(text).as_deref(), Some("http://[::1]:8086"));
    }

    #[test]
    fn no_proxy_when_none_is_on() {
        let off = "<dictionary> {
  HTTPEnable : 0
  HTTPSEnable : 0
  ProxyAutoConfigEnable : 1
  ProxyAutoConfigURLString : http://wpad/wpad.dat
}";
        assert_eq!(from_scutil(off), None);
        assert_eq!(from_scutil(""), None);
        // On, but without a port it names nothing to go through.
        assert_eq!(
            from_scutil("  HTTPSEnable : 1\n  HTTPSProxy : 127.0.0.1\n"),
            None
        );
    }
}
