//! A page whose web content process ended draws nothing until it is loaded
//! again. The app writes down which window lost its page and when, then
//! reloads it, so a blank window can be traced in the app's log (#512).

/// Reloads the page of the window named `label` after its content process
/// ended, and writes what happened with `log`.
// Called by hosts whose web view reports the end (macOS); the others have none.
#[allow(dead_code)]
pub(super) fn process_ended(
    label: &str,
    reload: impl FnOnce() -> Result<(), String>,
    mut log: impl FnMut(String),
) {
    log(format!(
        "Web content process ended in window {label}; reloading"
    ));
    match reload() {
        Ok(()) => log(format!("Web content reload sent to window {label}")),
        Err(error) => log(format!(
            "Web content reload failed in window {label}: {error}"
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn lines(reload: Result<(), String>) -> Vec<String> {
        let mut lines = Vec::new();
        process_ended("hud-display-1", || reload, |line| lines.push(line));
        lines
    }

    #[test]
    fn an_ended_page_is_written_down_then_reloaded() {
        assert_eq!(
            lines(Ok(())),
            [
                "Web content process ended in window hud-display-1; reloading",
                "Web content reload sent to window hud-display-1",
            ]
        );
    }

    #[test]
    fn a_reload_that_fails_is_written_down_with_its_error() {
        assert_eq!(
            lines(Err("window is gone".into())),
            [
                "Web content process ended in window hud-display-1; reloading",
                "Web content reload failed in window hud-display-1: window is gone",
            ]
        );
    }
}
