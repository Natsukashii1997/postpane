//! The app's settings and provider switches: defaults, validation, and the
//! settings file, which another copy of the app may have written since.
use super::*;

/// The waits 「等待回答」 offers, in minutes; 0 waits until answered. Starting,
/// changing and reloading the settings all check against this one list (#184).
pub(crate) const APPROVAL_WAIT_MINUTES: [u64; 7] = [0, 1, 3, 5, 10, 30, 60];

impl crate::AgentHudCore {
    pub fn client_hooks_enabled(&self) -> bool {
        self.settings["clientHooks"] == true
    }

    /// Whether the HUD watches for DeepSeek Harness's questions (off unless
    /// the owner turns it on).
    pub fn deepseek_questions_enabled(&self) -> bool {
        self.settings["deepseekQuestions"] == true
    }

    pub fn antigravity_cli_settings(&self) -> Vec<PathBuf> {
        self.settings["antigravityCliSettings"]
            .as_array()
            .into_iter()
            .flatten()
            .filter_map(Value::as_str)
            .map(PathBuf::from)
            .collect()
    }

    pub fn set_presentation(&mut self, key: &str, value: &Value) -> Result<Value, String> {
        let mut values = serde_json::Map::new();
        values.insert(key.into(), value.clone());
        self.set_presentation_values(&Value::Object(values))
    }

    pub fn set_presentation_values(&mut self, values: &Value) -> Result<Value, String> {
        let values = values
            .as_object()
            .ok_or("Presentation values must be an object")?;
        for (key, value) in values {
            if !matches!(
                key.as_str(),
                "appearance" | "animations" | "showMenuBarIcon" | "appearanceFollowsScreen"
            ) {
                return Err("This setting requires its dedicated host action".into());
            }
            Self::validate_setting(key, value)?;
        }
        self.reload_preferences();
        if values
            .iter()
            .all(|(key, value)| self.settings.get(key) == Some(value))
        {
            return Ok(self.settings.clone());
        }
        let previous = self.settings.clone();
        for (key, value) in values {
            self.settings[key] = value.clone();
        }
        if let Err(error) = self.save() {
            self.settings = previous;
            return Err(error);
        }
        Ok(self.settings.clone())
    }

    pub fn seed_initial_preferences(&mut self, values: &Value) -> Result<bool, String> {
        if fs::symlink_metadata(&self.settings_path).is_ok() {
            return Ok(false);
        }
        let values = values
            .get("settings")
            .unwrap_or(values)
            .as_object()
            .ok_or("Initial settings must be an object")?;
        let mut next = self.settings.clone();
        let mut copied = false;
        for (key, value) in values {
            if Self::validate_setting(key, value).is_ok() {
                next[key] = value.clone();
                copied = true;
            }
        }
        if !copied {
            return Ok(false);
        }
        let previous = std::mem::replace(&mut self.settings, next);
        if let Err(error) = self.save() {
            self.settings = previous;
            return Err(error);
        }
        self.requests
            .set_hold_ms(self.settings["approvalWaitMinutes"].as_u64().unwrap_or(10) * 60_000);
        Ok(true)
    }

    pub(crate) fn apply_setting(&mut self, key: &str, value: &Value) -> Result<(), String> {
        Self::validate_setting(key, value)?;
        let previous = self.settings.clone();
        self.settings[key] = value.clone();
        if let Err(error) = self.save() {
            self.settings = previous;
            return Err(error);
        }
        if key == "approvalWaitMinutes" {
            self.requests.set_hold_ms(value.as_u64().unwrap() * 60_000);
        }
        self.apply_user_prices();
        Ok(())
    }

    /// Prices calls by what the owner set on the price page; when it changed,
    /// every log's cost is worked out again, a few at a time, and the rates
    /// and statistics follow.
    pub(crate) fn apply_user_prices(&mut self) {
        if crate::pricing::set_user_prices(crate::pricing::user_prices_from(&self.settings)) {
            for head in self.logs.values_mut() {
                head.list_cost_priced = false;
            }
            self.meters.view = None;
            self.statistics.revision = self.statistics.revision.wrapping_add(1);
        }
    }

    fn validate_setting(key: &str, value: &Value) -> Result<(), String> {
        match key {
            "appearance" if ["dark", "light", "system"].contains(&value.as_str().unwrap_or("")) => {
            }
            "quotaDisplay" if matches!(value.as_str(), Some("consumed" | "remaining")) => {}
            "codexHomes" | "antigravityCliSettings"
                if value.as_array().is_some_and(|homes| {
                    homes.iter().all(|home| {
                        home.as_str().is_some_and(|home| {
                            !home.is_empty() && home.trim() == home && !home.contains('\0')
                        })
                    })
                }) => {}
            "language" if value.as_str().is_some_and(|s| s.len() <= 32) => {}
            "animations"
            | "showMenuBarIcon"
            | "appearanceFollowsScreen"
            | "hudTools"
            | "claudeAnswers"
            | "readCopilotQuota"
            | "clientHooks"
            | "deepseekQuestions"
            | "launchAtLogin"
            | "hudVisible"
                if value.is_boolean() => {}
            "approvalWaitMinutes"
                if value
                    .as_u64()
                    .is_some_and(|v| APPROVAL_WAIT_MINUTES.contains(&v)) => {}
            // The price page: the owner's prices per million tokens by model,
            // multipliers by relay host, and what a local host is.
            "customPrices"
                if value.as_object().is_some_and(|prices| {
                    prices.len() <= 500
                        && prices.iter().all(|(model, price)| {
                            let rate = |key: &str| {
                                price[key].is_null()
                                    || price[key]
                                        .as_f64()
                                        .is_some_and(|v| v.is_finite() && v >= 0.0)
                            };
                            !model.is_empty()
                                && model.len() <= 300
                                && matches!(price["currency"].as_str(), Some("USD" | "CNY"))
                                && ["input", "output", "cacheRead", "cacheWrite"]
                                    .into_iter()
                                    .all(rate)
                        })
                }) => {}
            "relayMultipliers"
                if value.as_object().is_some_and(|hosts| {
                    hosts.len() <= 64
                        && hosts.iter().all(|(host, times)| {
                            !host.is_empty()
                                && host.len() <= 260
                                && times
                                    .as_f64()
                                    .is_some_and(|v| v.is_finite() && v > 0.0 && v <= 100.0)
                        })
                }) => {}
            "localKinds"
                if value.as_object().is_some_and(|hosts| {
                    hosts.len() <= 64
                        && hosts.iter().all(|(host, kind)| {
                            !host.is_empty()
                                && host.len() <= 260
                                && matches!(kind.as_str(), Some("model" | "gateway"))
                        })
                }) => {}
            // The relay addresses whose balance may be read with the key the
            // client already sends them (agents `relays::CONSENT`).
            "relayReading"
                if value.as_array().is_some_and(|hosts| {
                    hosts.len() <= 64
                        && hosts.iter().all(|host| {
                            host.as_str().is_some_and(|host| {
                                !host.is_empty()
                                    && host.len() <= 260
                                    && host.bytes().all(|b| b.is_ascii_graphic() && b != b'/')
                            })
                        })
                }) => {}
            _ => return Err("Unsupported setting or invalid value".into()),
        }
        Ok(())
    }

    /// Each request reads the file again, as launch does (#224): a missing
    /// `providers` is an empty table; a file that cannot be read or parsed
    /// keeps the settings in use and is reported in the snapshot, and the
    /// next change writes the file back whole.
    pub(crate) fn reload_preferences(&mut self) {
        if !self.settings_path.exists() {
            return;
        }
        let read = fs::read(&self.settings_path)
            .map_err(|e| e.to_string())
            .and_then(|bytes| serde_json::from_slice::<Value>(&bytes).map_err(|e| e.to_string()));
        let stored = match read {
            Ok(stored) => stored,
            Err(error) => return self.settings_unreadable(&error),
        };
        let enabled = match stored.get("providers").filter(|value| !value.is_null()) {
            None => HashMap::new(),
            Some(providers) => match serde_json::from_value(providers.clone()) {
                Ok(enabled) => enabled,
                Err(error) => return self.settings_unreadable(&error.to_string()),
            },
        };
        self.settings_issue = None;
        if let Some(values) = stored["settings"].as_object() {
            for (key, value) in values {
                if self.settings.get(key).is_some() {
                    self.settings[key] = value.clone();
                }
            }
        }
        self.requests.set_hold_ms(
            self.settings["approvalWaitMinutes"]
                .as_u64()
                .filter(|v| APPROVAL_WAIT_MINUTES.contains(v))
                .unwrap_or(10)
                * 60_000,
        );
        self.apply_user_prices();
        if self.enabled != enabled {
            self.enabled = enabled;
            self.usage_projection = None;
            self.meters.view = None;
        }
    }

    fn settings_unreadable(&mut self, error: &str) {
        let issue = format!(
            "{}{error}",
            l10n::text(
                "设置文件读不出，仍按上次读到的设置运行；改任意一项设置会重写这个文件：",
                "settings.json could not be read; the settings last read stay in use, and changing any setting rewrites the file: ",
            )
        );
        if self.settings_issue.as_ref() != Some(&issue) {
            eprintln!("{issue}");
        }
        self.settings_issue = Some(issue);
    }

    pub(crate) fn save(&mut self) -> Result<(), String> {
        let parent = self
            .settings_path
            .parent()
            .ok_or("Invalid settings location")?;
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        let bytes =
            serde_json::to_vec_pretty(&json!({"settings":self.settings,"providers":self.enabled}))
                .map_err(|e| e.to_string())?;
        let temporary = self.settings_path.with_extension("json.tmp");
        fs::write(&temporary, bytes)
            .and_then(|_| fs::rename(temporary, &self.settings_path))
            .map_err(|e| e.to_string())?;
        self.settings_issue = None;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn waiting_until_answered_survives_every_reload_of_the_settings_file() {
        // 「一直等」写在设置文件里：启动、每次请求重读设置之后都还是一直等。
        let home = tempfile::tempdir().unwrap();
        fs::write(
            home.path().join("settings.json"),
            json!({"settings": {"approvalWaitMinutes": 0}, "providers": {}}).to_string(),
        )
        .unwrap();
        let mut core = AgentHudCore::new(vec![], home.path().to_owned());
        let now = Utc::now().timestamp_millis();
        assert!(core.requests.still_held(now - 86_400_000, now), "at launch");
        core.request("snapshot", json!({})).unwrap();
        assert!(
            core.requests.still_held(now - 86_400_000, now),
            "after a request reloads the file"
        );
        core.apply_setting("approvalWaitMinutes", &json!(10))
            .unwrap();
        core.request("snapshot", json!({})).unwrap();
        assert!(
            !core.requests.still_held(now - 11 * 60_000, now),
            "10 minutes"
        );
    }

    #[test]
    fn a_hand_written_settings_file_without_providers_still_answers_every_request() {
        // 手写的设置文件漏了 "providers"（#224）：启动照常，每次请求重读也照常，当空表。
        let home = tempfile::tempdir().unwrap();
        fs::write(
            home.path().join("settings.json"),
            br#"{"settings":{"language":"en"}}"#,
        )
        .unwrap();
        let mut core = AgentHudCore::new(vec![], home.path().to_owned());
        let snapshot = core
            .request("snapshot", json!({}))
            .expect("a request after reloading a file without providers");
        assert_eq!(snapshot["settings"]["language"], "en");
        assert!(core.enabled.is_empty());
        core.request(
            "set_setting",
            json!({"key":"quotaDisplay","value":"remaining"}),
        )
        .expect("set_setting");
        let stored: Value =
            serde_json::from_slice(&fs::read(home.path().join("settings.json")).unwrap()).unwrap();
        assert_eq!(stored["providers"], json!({}));
        assert_eq!(stored["settings"]["quotaDisplay"], "remaining");
    }

    #[test]
    fn a_broken_settings_file_keeps_the_values_in_use_says_so_and_the_next_change_rewrites_it() {
        // 设置文件坏了（#224）：请求不失败，内存里的值照用，快照里报出来；改任意一项写回自愈。
        let home = tempfile::tempdir().unwrap();
        let path = home.path().join("settings.json");
        fs::write(
            &path,
            json!({"settings": {"approvalWaitMinutes": 0, "language": "en"}, "providers": {"codex": false}})
                .to_string(),
        )
        .unwrap();
        let mut core = AgentHudCore::new(vec![], home.path().to_owned());
        fs::write(&path, br#"{"settings": {"language": "zh-CN""#).unwrap();
        let now = Utc::now().timestamp_millis();
        let snapshot = core
            .request("snapshot", json!({}))
            .expect("a request after the file broke");
        assert_eq!(snapshot["settings"]["language"], "en");
        assert!(core.requests.still_held(now - 86_400_000, now));
        assert_eq!(core.enabled.get("codex"), Some(&false));
        let issue = snapshot["connection"]["settingsIssue"]
            .as_str()
            .expect("the broken file is reported");
        assert!(!issue.is_empty());

        let healed = core
            .request(
                "set_setting",
                json!({"key":"quotaDisplay","value":"remaining"}),
            )
            .expect("set_setting writes the file back");
        assert_eq!(healed["connection"]["settingsIssue"], Value::Null);
        let stored: Value = serde_json::from_slice(&fs::read(&path).unwrap()).unwrap();
        assert_eq!(stored["settings"]["approvalWaitMinutes"], 0);
        assert_eq!(stored["settings"]["quotaDisplay"], "remaining");
        assert_eq!(stored["providers"], json!({"codex": false}));
        let next = core.request("snapshot", json!({})).unwrap();
        assert_eq!(next["connection"]["settingsIssue"], Value::Null);
    }

    #[test]
    fn quota_display_defaults_to_consumed_and_persists_only_supported_choices() {
        let home = tempfile::tempdir().unwrap();
        let mut core = AgentHudCore::new(vec![], home.path().to_owned());
        assert_eq!(core.settings["quotaDisplay"], "consumed");
        core.apply_setting("quotaDisplay", &json!("remaining"))
            .unwrap();
        let reopened = AgentHudCore::new(vec![], home.path().to_owned());
        assert_eq!(reopened.settings["quotaDisplay"], "remaining");
        for invalid in [json!("used"), json!(""), json!(true), json!(null)] {
            assert!(core.apply_setting("quotaDisplay", &invalid).is_err());
            assert_eq!(core.settings["quotaDisplay"], "remaining");
        }
        core.apply_setting("quotaDisplay", &json!("consumed"))
            .unwrap();
        assert_eq!(core.settings["quotaDisplay"], "consumed");
    }

    #[test]
    fn menu_bar_icon_is_hidden_on_a_fresh_install_and_a_saved_choice_is_kept() {
        // 新装：没有设置文件，菜单栏图标默认不显示。
        let fresh = tempfile::tempdir().unwrap();
        let core = AgentHudCore::new(vec![], fresh.path().to_owned());
        assert_eq!(core.settings["showMenuBarIcon"], false);

        // 已有设置明确写了显示：照用户的值，不迁移、不覆盖。
        for saved in [true, false] {
            let home = tempfile::tempdir().unwrap();
            fs::write(
                home.path().join("settings.json"),
                serde_json::to_vec(
                    &json!({"settings": {"showMenuBarIcon": saved}, "providers": {}}),
                )
                .unwrap(),
            )
            .unwrap();
            let core = AgentHudCore::new(vec![], home.path().to_owned());
            assert_eq!(core.settings["showMenuBarIcon"], saved);
            let reopened = AgentHudCore::new(vec![], home.path().to_owned());
            assert_eq!(reopened.settings["showMenuBarIcon"], saved);
        }

        // 已有设置没写这一项（升级前的旧文件）：按新的默认值，不显示。
        let older = tempfile::tempdir().unwrap();
        fs::write(
            older.path().join("settings.json"),
            br#"{"settings": {"appearance": "dark"}, "providers": {}}"#,
        )
        .unwrap();
        let core = AgentHudCore::new(vec![], older.path().to_owned());
        assert_eq!(core.settings["showMenuBarIcon"], false);

        // 新装时从原版 Agent HUD 导入的明确选择同样照用。
        let imported = tempfile::tempdir().unwrap();
        let mut core = AgentHudCore::new(vec![], imported.path().to_owned());
        assert!(core
            .seed_initial_preferences(&json!({"showMenuBarIcon": true}))
            .unwrap());
        assert_eq!(core.settings["showMenuBarIcon"], true);
        let reopened = AgentHudCore::new(vec![], imported.path().to_owned());
        assert_eq!(reopened.settings["showMenuBarIcon"], true);
    }

    #[test]
    fn account_source_paths_persist_and_reject_invalid_entries() {
        for key in ["codexHomes", "antigravityCliSettings"] {
            let home = tempfile::tempdir().unwrap();
            let mut core = AgentHudCore::new(vec![], home.path().to_owned());
            assert_eq!(core.settings[key], json!([]));
            let homes = json!(["/work/codex-personal", "~/.codex-work"]);
            core.apply_setting(key, &homes).unwrap();
            let reopened = AgentHudCore::new(vec![], home.path().to_owned());
            assert_eq!(reopened.settings[key], homes);
            for invalid in [
                json!(null),
                json!("/work/codex"),
                json!([null]),
                json!([""]),
                json!([" "]),
                json!([" /work/codex"]),
                json!(["/work/codex "]),
                json!(["/work/\0codex"]),
            ] {
                assert!(core.apply_setting(key, &invalid).is_err());
                assert_eq!(core.settings[key], homes);
            }
            core.apply_setting(key, &json!([])).unwrap();
            assert_eq!(core.settings[key], json!([]));
        }
    }

    #[test]
    fn old_preferences_without_quota_display_keep_the_consumed_default() {
        let home = tempfile::tempdir().unwrap();
        fs::write(
            home.path().join("settings.json"),
            br#"{"settings":{"language":"en"},"providers":{}}"#,
        )
        .unwrap();
        let core = AgentHudCore::new(vec![], home.path().to_owned());
        assert_eq!(core.settings["language"], "en");
        assert_eq!(core.settings["quotaDisplay"], "consumed");
    }
}
