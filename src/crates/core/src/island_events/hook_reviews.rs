//! PostPane's hooks an agent skips until the user allows them in the agent
//! itself (Codex keeps a hook whose command changed `modified`), told as a
//! strip in the sidebar, at most once a day while they wait.
use super::*;

/// Told at most once a day while the hooks wait.
const REVIEW_TOLD_EVERY_MS: i64 = 86_400_000;
/// PostPane rewrites the hooks as it starts, and the sidebar takes what the
/// first snapshot holds as already seen: what waits is told only once the
/// app has run this long.
const AFTER_LAUNCH_MS: i64 = 20_000;

impl Tracker {
    /// An agent whose last account reading says it skips some of PostPane's
    /// hooks (`unreviewedHooks`) is told in the sidebar: soon after launch,
    /// since a launch is when the hooks change, then at most once a day, and
    /// at once again after they were allowed and changed again.
    pub(super) fn hook_reviews(&mut self, providers: &[Value], now: i64) {
        for provider in providers {
            let Some(id) = provider["id"].as_str() else {
                continue;
            };
            let events: Vec<&str> = provider["accountStatus"]["unreviewedHooks"]
                .as_array()
                .into_iter()
                .flatten()
                .filter_map(Value::as_str)
                .collect();
            if events.is_empty() || provider["enabled"] == false {
                self.reviews.remove(id);
                continue;
            }
            if now - self.started < AFTER_LAUNCH_MS
                || self
                    .reviews
                    .get(id)
                    .is_some_and(|at| now - at < REVIEW_TOLD_EVERY_MS)
            {
                continue;
            }
            self.reviews.insert(id.into(), now);
            let name = provider["name"].as_str().unwrap_or(id);
            // Without the permission hook its approvals stay in the agent;
            // the other hooks only report how its sessions are doing.
            let message = if events.contains(&"permissionRequest") {
                crate::l10n::text(
                    "审批不会出现在侧栏",
                    "Its approvals won't show in the sidebar",
                )
            } else {
                crate::l10n::text(
                    "会话进展不会及时出现在侧栏",
                    "Its sessions show in the sidebar late",
                )
            };
            // Codex's own way to allow them: /hooks, or "Trust all and
            // continue" when it asks on start (codex-cli 0.166).
            let step = crate::l10n::text(
                &format!("到 {name} 里允许驿窗的钩子（命令行里输入 /hooks）"),
                &format!("Allow PostPane's hooks in {name} (type /hooks in the CLI)"),
            );
            self.push(
                &format!("{id}:hooks-review:{now}"),
                json!({"kind":"hooks-review-needed","islandAlert":true,"at":iso(now),"source":id,"title":provider["name"],"message":message,"step":step,"hooks":events}),
            );
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn codex(hooks: &[&str]) -> Value {
        json!({"id":"codex","name":"Codex","enabled":true,"accountStatus":{"status":"ready","unreviewedHooks":hooks}})
    }
    fn reviews(tracker: &mut Tracker, row: Value, now: i64) -> Vec<Value> {
        tracker.update(&[], &[], &[], &[row], now)["items"]
            .as_array()
            .unwrap()
            .iter()
            .filter(|event| event["kind"] == "hooks-review-needed")
            .cloned()
            .collect()
    }

    #[test]
    fn hooks_waiting_for_the_user_are_told_after_launch_then_once_a_day() {
        let mut tracker = Tracker::new();
        let day = 86_400_000;
        let start = tracker.started;
        let waiting = || codex(&["permissionRequest", "userPromptSubmit"]);
        // Right after launch the sidebar would take it as already seen.
        assert!(reviews(&mut tracker, waiting(), start + 1_000).is_empty());
        let told = reviews(&mut tracker, waiting(), start + 30_000);
        assert_eq!(told.len(), 1);
        assert_eq!(told[0]["source"], "codex");
        assert_eq!(told[0]["title"], "Codex");
        assert_eq!(told[0]["islandAlert"], true);
        assert_eq!(
            told[0]["hooks"],
            json!(["permissionRequest", "userPromptSubmit"])
        );
        assert!(!told[0]["message"].as_str().unwrap().is_empty());
        // Where to allow them: Codex's own /hooks.
        assert!(told[0]["step"].as_str().unwrap().contains("/hooks"));
        assert_eq!(reviews(&mut tracker, waiting(), start + 60_000).len(), 1);
        assert_eq!(
            reviews(&mut tracker, waiting(), start + 30_000 + day).len(),
            2
        );
        // Allowed, then changed again: told at once.
        assert_eq!(
            reviews(&mut tracker, codex(&[]), start + 30_001 + day).len(),
            2
        );
        assert_eq!(
            reviews(&mut tracker, waiting(), start + 30_002 + day).len(),
            3
        );
    }

    #[test]
    fn trusted_hooks_or_a_turned_off_agent_are_not_told() {
        let mut tracker = Tracker::new();
        let at = tracker.started + 30_000;
        assert!(reviews(&mut tracker, codex(&[]), at).is_empty());
        let mut off = codex(&["permissionRequest"]);
        off["enabled"] = json!(false);
        assert!(reviews(&mut tracker, off, at + 1).is_empty());
        let no_field =
            json!({"id":"codex","name":"Codex","enabled":true,"accountStatus":{"status":"ready"}});
        assert!(reviews(&mut tracker, no_field, at + 2).is_empty());
    }

    #[test]
    fn only_the_permission_hook_keeps_approvals_from_the_sidebar() {
        let mut tracker = Tracker::new();
        let at = tracker.started + 30_000;
        let approvals = reviews(&mut tracker, codex(&["permissionRequest"]), at);
        let mut tracker = Tracker::new();
        let at = tracker.started + 30_000;
        let progress = reviews(&mut tracker, codex(&["userPromptSubmit"]), at);
        assert_ne!(approvals[0]["message"], progress[0]["message"]);
    }
}
