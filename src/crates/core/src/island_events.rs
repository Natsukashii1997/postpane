//! One app-owned event history, shared by every presentation and host relay.
//! Ported from IslandEvents/QuotaAlerts/ResetCreditGrants; UI preferences consume
//! then suppress facts rather than keeping another independent diff history.
use super::*;

mod hook_reviews;

#[derive(Clone)]
struct Observation {
    at: i64,
    used: f64,
    reset: Option<i64>,
    critical: bool,
    exhausted: bool,
    at_risk: bool,
    warned: Option<i64>,
}
struct Credits {
    at: i64,
    count: u64,
    ids: Option<HashSet<String>>,
}
/// Whether a provider's account reading says its agent signed out, and when
/// that was last told.
struct SignIn {
    out: bool,
    told: Option<i64>,
}
/// A sign-out is told at most once a day, unless the agent was signed in
/// again in between.
const SIGN_IN_TOLD_EVERY_MS: i64 = 86_400_000;
pub(super) struct Tracker {
    started: i64,
    seen: HashMap<String, i64>,
    quotas: HashMap<String, Observation>,
    credits: HashMap<String, Credits>,
    sign_ins: HashMap<String, SignIn>,
    gateways: HashMap<String, SignIn>,
    /// When each agent's hooks waiting for the user were last told.
    reviews: HashMap<String, i64>,
    /// The failed Hermes scheduled tasks already told (`bot:job`), kept on
    /// disk so a restart does not tell them again; loaded on first look.
    cron_told: Option<HashSet<String>>,
    /// What was told could not be written last time: written at the next look.
    cron_unsaved: bool,
    revision: u64,
    events: VecDeque<Value>,
}
fn date(value: &Value) -> Option<i64> {
    value.as_str().and_then(metering::date_ms)
}
fn iso(at: i64) -> Value {
    DateTime::<Utc>::from_timestamp_millis(at)
        .map(|d| json!(d.to_rfc3339()))
        .unwrap_or(Value::Null)
}
impl Tracker {
    pub fn new() -> Self {
        Self {
            started: Utc::now().timestamp_millis(),
            seen: HashMap::new(),
            quotas: HashMap::new(),
            credits: HashMap::new(),
            sign_ins: HashMap::new(),
            gateways: HashMap::new(),
            reviews: HashMap::new(),
            cron_told: None,
            cron_unsaved: false,
            revision: 0,
            events: VecDeque::new(),
        }
    }
    fn push(&mut self, key: &str, mut event: Value) {
        self.revision = self.revision.wrapping_add(1);
        event["id"] = json!(format!(
            "event:{}:{}",
            self.revision,
            metering::event_key(key)
        ));
        if self.events.len() == 32 {
            self.events.pop_front();
        }
        self.events.push_back(event);
    }
    pub fn update(
        &mut self,
        sessions: &[Value],
        quotas: &[Value],
        accounts: &[Value],
        providers: &[Value],
        now: i64,
    ) -> Value {
        self.sign_ins(providers, now);
        self.hook_reviews(providers, now);
        self.seen.retain(|_, at| *at >= now - 31 * 86_400_000);
        let mut completions = sessions
            .iter()
            .filter_map(|session| {
                let facts = &session["liveFacts"];
                if facts["outcome"] != "completed" {
                    return None;
                }
                let at = date(&facts["endedAt"])?;
                let turn = facts["turnId"].as_str()?;
                let source = session["source"].as_str()?;
                let id = session["id"].as_str()?;
                Some((at, format!("{source}:{id}:{turn}"), session))
            })
            .collect::<Vec<_>>();
        completions.sort_by_key(|(at, key, _)| (*at, key.clone()));
        for (at, key, session) in completions {
            if at <= self.started || at > now || self.seen.insert(key.clone(), at).is_some() {
                continue;
            }
            self.push(&key,json!({"kind":"completion","at":iso(at),"startedAt":session["liveFacts"]["turnStartedAt"],"source":session["source"],"sessionId":session["id"],"turnId":session["liveFacts"]["turnId"],"title":session["title"],"model":session["model"],"message":session["liveFacts"]["message"],"prompt":session["liveFacts"]["prompt"],"navigationTarget":session["navigationTarget"],"cwd":session["cwd"],"logPath":session["logPath"]}));
        }
        let ids = quotas
            .iter()
            .filter_map(|q| q["id"].as_str())
            .collect::<HashSet<_>>();
        self.quotas.retain(|id, _| ids.contains(id.as_str()));
        for quota in quotas {
            let Some(id) = quota["id"].as_str() else {
                continue;
            };
            let Some(at) = date(&quota["observedAt"]) else {
                continue;
            };
            let old = self.quotas.get(id).cloned();
            if at > now
                || now.saturating_sub(at) > 1_800_000
                || old.as_ref().is_some_and(|old| at <= old.at)
                || quota["status"] == "stale"
            {
                continue;
            }
            let Some(used) = quota["usedPercent"]
                .as_f64()
                .filter(|n| n.is_finite() && (0.0..=100.0).contains(n))
            else {
                self.quotas.remove(id);
                continue;
            };
            let reset = date(&quota["resetAt"]);
            if reset.is_some_and(|reset| reset <= now) || (reset.is_none() && used != 0.0) {
                continue;
            }
            // A forecast from the whole window's straight line, before recent
            // readings give a pace, is too rough to alert on.
            let forecast = quota["metrics"]["outlook"]["kind"] == "exhausts"
                && quota["metrics"]["outlook"]["basis"] != "window"
                && quota["metrics"]["outlook"]["beforeReset"] == true
                && reset.is_some();
            let critical = used >= 90.0;
            let exhausted = used >= 99.5;
            let at_risk = critical || exhausted || forecast;
            let advanced = old
                .as_ref()
                .and_then(|old| old.reset.zip(reset).map(|(o, n)| n > o && at >= o))
                .unwrap_or(false);
            let restored = old
                .as_ref()
                .is_some_and(|old| used == 0.0 && old.used - used >= 5.0);
            let cycle_changed = advanced || restored;
            let warned = old
                .as_ref()
                .filter(|_| !cycle_changed)
                .and_then(|o| o.warned)
                .filter(|until| *until > at);
            self.quotas.insert(
                id.into(),
                Observation {
                    at,
                    used,
                    reset,
                    critical,
                    exhausted,
                    at_risk,
                    warned,
                },
            );
            let Some(old) = old else {
                continue;
            };
            let alert = if cycle_changed {
                Some("quota-reset")
            } else if exhausted && !old.exhausted
                || at_risk && !old.at_risk && (critical || warned.is_none())
            {
                Some("quota-exhaustion")
            } else {
                None
            };
            let crossing_only = alert.is_none() && critical && !old.critical;
            let kind = alert.or(crossing_only.then_some("quota-exhaustion"));
            if let Some(kind) = kind {
                let crossing = if exhausted && (cycle_changed || !old.exhausted) {
                    "exhausted"
                } else if critical && (cycle_changed || !old.critical) {
                    "critical"
                } else {
                    "forecast"
                };
                let other = if kind == "quota-reset" {
                    quotas
                        .iter()
                        .filter(|q| {
                            q["id"] != id
                                && q["vendor"] == quota["vendor"]
                                && q["accountId"] == quota["accountId"]
                                && q["status"] != "stale"
                                && q["usedPercent"].as_f64().is_some_and(|n| n >= 99.5)
                                && date(&q["resetAt"]).is_some_and(|reset| reset > now)
                        })
                        .map(|q| json!({"id":q["id"],"name":q["name"]}))
                        .collect::<Vec<_>>()
                } else {
                    vec![]
                };
                let interval = date(&quota["metrics"]["outlook"]["exhaustsAt"])
                    .filter(|_| kind == "quota-exhaustion" && crossing == "forecast" && forecast)
                    .map(|end| (end - now).max(0) as f64 / 1000.0);
                self.push(&format!("{id}:{kind}:{at}"),json!({"kind":kind,"islandAlert":!crossing_only,"at":iso(at),"source":quota["vendor"],"quotaId":id,"accountId":quota["accountId"],"title":quota["name"],"usedPercent":used,"resetAt":quota["resetAt"],"crossing":crossing,"timeToExhaustSeconds":interval,"otherExhaustedWindows":other}));
                if kind == "quota-exhaustion" && !critical {
                    if let Some(entry) = self.quotas.get_mut(id) {
                        entry.warned = reset;
                    }
                }
                if cycle_changed && critical {
                    let crossing = if exhausted { "exhausted" } else { "critical" };
                    self.push(&format!("{id}:quota-exhaustion:{at}"),json!({"kind":"quota-exhaustion","islandAlert":false,"at":iso(at),"source":quota["vendor"],"quotaId":id,"accountId":quota["accountId"],"title":quota["name"],"usedPercent":used,"resetAt":quota["resetAt"],"crossing":crossing,"timeToExhaustSeconds":null,"otherExhaustedWindows":[]}));
                }
            }
        }
        let account_ids = accounts
            .iter()
            .filter_map(|a| a["id"].as_str())
            .collect::<HashSet<_>>();
        self.credits
            .retain(|id, _| account_ids.contains(id.as_str()));
        for account in accounts {
            let Some(id) = account["id"].as_str() else {
                continue;
            };
            let Some(at) = date(&account["checkedAt"]).or_else(|| date(&account["observedAt"]))
            else {
                continue;
            };
            if at > now || now.saturating_sub(at) > 1_800_000 || account["stale"] == true {
                continue;
            }
            let value = &account["resetCredits"];
            let Some(count) = value["availableCount"].as_u64() else {
                continue;
            };
            let old = self.credits.get(id);
            if old.is_some_and(|old| at <= old.at) {
                continue;
            }
            let ids = value["credits"].as_array().map(|rows| {
                rows.iter()
                    .filter_map(|c| c["id"].as_str().map(str::to_owned))
                    .collect::<HashSet<_>>()
            });
            let title = account["label"]
                .as_str()
                .or_else(|| account["email"].as_str())
                .or_else(|| account["plan"].as_str());
            let event=old.filter(|old|count>old.count).map(|old|{let new=value["credits"].as_array().into_iter().flatten().filter(|c|old.ids.as_ref().is_some_and(|ids|c["id"].as_str().is_some_and(|id|!ids.contains(id)))).cloned().collect::<Vec<_>>();json!({"kind":"reset-credits","at":iso(at),"source":account["provider"],"accountId":id,"title":title,"added":count-old.count,"availableCount":count,"newCredits":new})});
            let previous_ids = old.and_then(|old| old.ids.clone());
            self.credits.insert(
                id.into(),
                Credits {
                    at,
                    count,
                    ids: ids.or(previous_ids),
                },
            );
            if let Some(event) = event {
                self.push(&format!("{id}:credits:{at}"), event);
            }
        }
        json!({"revision":self.revision,"items":self.events})
    }

    /// A Hermes bot whose gateway goes down (its Feishu connection drops,
    /// or the gateway stops) is told once, as a strip: at most once a day,
    /// again after it was up in between. The first look after launch only
    /// notes how things stand, as for sign-ins.
    pub fn gateways(&mut self, gateways: &[agent_hud_agents::hermes::Gateway], now: i64) {
        use agent_hud_agents::hermes::Down;
        for gateway in gateways {
            let out = gateway.down.is_some();
            let Some(old) = self.gateways.get_mut(&gateway.bot.id) else {
                self.gateways
                    .insert(gateway.bot.id.clone(), SignIn { out, told: None });
                continue;
            };
            let was_out = old.out;
            old.out = out;
            if !out {
                old.told = None;
                continue;
            }
            if was_out || old.told.is_some_and(|at| now - at < SIGN_IN_TOLD_EVERY_MS) {
                continue;
            }
            old.told = Some(now);
            let message = match gateway.down {
                Some(Down::Feishu) => crate::l10n::text("飞书断线", "Feishu disconnected"),
                _ => crate::l10n::text("网关没有运行", "Gateway not running"),
            };
            let id = &gateway.bot.id;
            self.push(&format!("hermes:{id}:offline:{now}"),json!({"kind":"bot-offline","islandAlert":true,"at":iso(now),"source":"hermes","accountId":id,"title":gateway.bot.name,"message":message,"bot":{"id":id,"name":gateway.bot.name}}));
        }
    }

    /// A Hermes scheduled task whose last run failed is told once, as a
    /// strip, and not again until a run of it succeeds (owner, issue #114).
    /// What was told is kept in `told_path`, so a failure from while the app
    /// was closed is told once at the next look, and a restart tells nothing
    /// new. A bot whose `jobs.json` cannot be read is left as it was.
    pub fn cron(
        &mut self,
        bots: &[(
            agent_hud_agents::hermes::Bot,
            Option<Vec<agent_hud_agents::hermes::CronJob>>,
        )],
        told_path: Option<&std::path::Path>,
        now: i64,
    ) {
        let mut told = self.cron_told.take().unwrap_or_else(|| {
            told_path
                .and_then(|path| std::fs::read_to_string(path).ok())
                .and_then(|text| serde_json::from_str::<HashSet<String>>(&text).ok())
                .unwrap_or_default()
        });
        let before = told.clone();
        for (bot, jobs) in bots {
            let Some(jobs) = jobs else { continue };
            let prefix = format!("{}:", bot.id);
            told.retain(|key| {
                key.strip_prefix(&prefix)
                    .is_none_or(|id| jobs.iter().any(|job| job.id == id && job.failed))
            });
            for job in jobs.iter().filter(|job| job.failed && job.enabled) {
                if !told.insert(format!("{prefix}{}", job.id)) {
                    continue;
                }
                let id = &bot.id;
                self.push(&format!("hermes:{id}:cron:{}:{now}", job.id),json!({"kind":"cron-failed","islandAlert":true,"at":iso(now),"source":"hermes","accountId":id,"title":job.name,"message":crate::l10n::text("没跑成", "Did not run"),"failedAt":job.last_run_at.map(iso),"nextRunAt":job.next_run_at.map(iso),"bot":{"id":id,"name":bot.name}}));
            }
        }
        if told != before || self.cron_unsaved {
            if let Some(path) = told_path {
                let mut keys = told.iter().collect::<Vec<_>>();
                keys.sort();
                // Whole or not at all: a torn file would tell everything again.
                let temporary = path.with_extension("json.tmp");
                let saved = std::fs::write(&temporary, json!(keys).to_string())
                    .and_then(|_| std::fs::rename(&temporary, path));
                if let Err(error) = &saved {
                    eprintln!("Hermes cron told {}: {error}", path.display());
                }
                self.cron_unsaved = saved.is_err();
            }
        }
        self.cron_told = Some(told);
    }

    /// An agent whose account reading says it signed out (the agent's own
    /// state, `failure` "signedOut", not a reading that only missed an
    /// answer) is told once, on the island: at most once a day, again after
    /// it was signed in in between. The first look after launch only notes
    /// how things stand.
    fn sign_ins(&mut self, providers: &[Value], now: i64) {
        for provider in providers {
            let Some(id) = provider["id"].as_str() else {
                continue;
            };
            let status = &provider["accountStatus"];
            if !status.is_object() || provider["enabled"] == false {
                continue;
            }
            let out = status["status"] == "error" && status["failure"] == "signedOut";
            let Some(old) = self.sign_ins.get_mut(id) else {
                self.sign_ins.insert(id.into(), SignIn { out, told: None });
                continue;
            };
            let was_out = old.out;
            old.out = out;
            if !out {
                // Only a good reading says the agent is signed in again.
                if status["status"] == "ready" {
                    old.told = None;
                }
                continue;
            }
            if was_out || old.told.is_some_and(|at| now - at < SIGN_IN_TOLD_EVERY_MS) {
                continue;
            }
            old.told = Some(now);
            let at = date(&status["failingSince"]).unwrap_or(now);
            self.push(&format!("{id}:sign-in:{at}"),json!({"kind":"sign-in-needed","islandAlert":true,"at":iso(now),"source":id,"title":provider["name"],"message":status["notice"]}));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn provider(status: &str, failure: Option<&str>) -> Value {
        json!({"id":"claude","name":"Claude Code","enabled":true,"accountStatus":{"status":status,"failure":failure,"notice":"Claude Code is signed out","failingSince":null}})
    }
    fn told(tracker: &mut Tracker, row: Value, now: i64) -> usize {
        tracker.update(&[], &[], &[], &[row], now)["items"]
            .as_array()
            .unwrap()
            .iter()
            .filter(|event| event["kind"] == "sign-in-needed")
            .count()
    }

    #[test]
    fn a_sign_out_is_told_once_a_day_and_again_after_signing_in() {
        let mut tracker = Tracker::new();
        let day = 86_400_000;
        let now = Utc::now().timestamp_millis();
        // The first look only notes how things stand.
        assert_eq!(told(&mut tracker, provider("ready", None), now), 0);
        let out = || provider("error", Some("signedOut"));
        assert_eq!(told(&mut tracker, out(), now + 1), 1);
        assert_eq!(told(&mut tracker, out(), now + 2), 1, "told once");
        // Signed in again, then out again within the day: told again.
        assert_eq!(told(&mut tracker, provider("ready", None), now + 3), 1);
        assert_eq!(told(&mut tracker, out(), now + 4), 2);
        let event = tracker.events.back().unwrap();
        assert_eq!(event["source"], "claude");
        assert_eq!(event["title"], "Claude Code");
        assert_eq!(event["message"], "Claude Code is signed out");
        assert_eq!(event["islandAlert"], true);
        // A failure that is not a sign-out in between does not count as
        // signing in, so the same day stays quiet.
        assert_eq!(
            told(&mut tracker, provider("error", Some("failed")), now + 5),
            2
        );
        assert_eq!(told(&mut tracker, out(), now + 6), 2);
        assert_eq!(told(&mut tracker, out(), now + day + 7), 2, "still out");
    }

    #[test]
    fn a_reading_that_only_missed_an_answer_is_not_a_sign_out() {
        let mut tracker = Tracker::new();
        let now = Utc::now().timestamp_millis();
        assert_eq!(told(&mut tracker, provider("ready", None), now), 0);
        assert_eq!(
            told(&mut tracker, provider("error", Some("transient")), now + 1),
            0
        );
    }

    #[test]
    fn a_hermes_gateway_going_down_is_told_once_until_it_comes_back() {
        use agent_hud_agents::hermes::{Bot, Down, Gateway};
        let gateway = |down| Gateway {
            bot: Bot {
                id: "agumon".into(),
                name: "亚古兽".into(),
            },
            down,
            down_since: None,
            home: std::path::PathBuf::new(),
        };
        let mut tracker = Tracker::new();
        let now = tracker.started + 1_000;
        let told = |tracker: &Tracker| {
            tracker
                .events
                .iter()
                .filter(|e| e["kind"] == "bot-offline")
                .count()
        };
        tracker.gateways(&[gateway(None)], now);
        tracker.gateways(&[gateway(Some(Down::Feishu))], now + 1);
        assert_eq!(told(&tracker), 1);
        let event = tracker.events.back().unwrap();
        assert_eq!(event["title"], "亚古兽");
        assert_eq!(event["source"], "hermes");
        tracker.gateways(&[gateway(Some(Down::Feishu))], now + 2);
        assert_eq!(told(&tracker), 1);
        tracker.gateways(&[gateway(None)], now + 3);
        tracker.gateways(&[gateway(Some(Down::Stopped))], now + 4);
        assert_eq!(told(&tracker), 2);

        let mut late = Tracker::new();
        late.gateways(&[gateway(Some(Down::Feishu))], now);
        assert_eq!(told(&late), 0, "the first look only notes");
    }

    #[test]
    fn a_failed_hermes_cron_job_is_told_once_until_it_runs_ok() {
        use agent_hud_agents::hermes::{Bot, CronJob};
        let bot = Bot {
            id: "default".into(),
            name: "猛鬼兽".into(),
        };
        let job = |id: &str, failed: bool| CronJob {
            id: id.into(),
            name: format!("任务{id}"),
            enabled: true,
            paused_reason: None,
            failed,
            last_run_at: Some(1_793_582_041_841),
            next_run_at: Some(1_794_181_500_000),
            schedule: None,
            delivers_to: None,
        };
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("hermes-cron-told.json");
        let told = |tracker: &Tracker| {
            tracker
                .events
                .iter()
                .filter(|e| e["kind"] == "cron-failed")
                .count()
        };
        let mut tracker = Tracker::new();
        let now = tracker.started + 1_000;
        // A failure from before launch is told at the first look.
        tracker.cron(
            &[(bot.clone(), Some(vec![job("a", true), job("b", false)]))],
            Some(&path),
            now,
        );
        assert_eq!(told(&tracker), 1);
        let event = tracker.events.back().unwrap();
        assert_eq!(event["title"], "任务a");
        assert_eq!(event["bot"]["name"], "猛鬼兽");
        assert_eq!(event["failedAt"], iso(1_793_582_041_841));
        assert_eq!(event["nextRunAt"], iso(1_794_181_500_000));
        // Still failing, or its jobs.json unreadable a moment: not again.
        tracker.cron(
            &[(bot.clone(), Some(vec![job("a", true)]))],
            Some(&path),
            now + 1,
        );
        tracker.cron(&[(bot.clone(), None)], Some(&path), now + 2);
        tracker.cron(
            &[(bot.clone(), Some(vec![job("a", true)]))],
            Some(&path),
            now + 3,
        );
        assert_eq!(told(&tracker), 1);
        // A restart remembers what was told.
        let mut restarted = Tracker::new();
        restarted.cron(
            &[(bot.clone(), Some(vec![job("a", true)]))],
            Some(&path),
            now + 4,
        );
        assert_eq!(told(&restarted), 0);
        // Disabled tasks are not told.
        let mut off = job("c", true);
        off.enabled = false;
        restarted.cron(
            &[(bot.clone(), Some(vec![job("a", true), off]))],
            Some(&path),
            now + 5,
        );
        assert_eq!(told(&restarted), 0);
        // Once it runs ok, the next failure is told again.
        restarted.cron(
            &[(bot.clone(), Some(vec![job("a", false)]))],
            Some(&path),
            now + 6,
        );
        restarted.cron(
            &[(bot.clone(), Some(vec![job("a", true)]))],
            Some(&path),
            now + 7,
        );
        assert_eq!(told(&restarted), 1);
    }

    fn cron_fixture() -> (
        agent_hud_agents::hermes::Bot,
        impl Fn(&str) -> agent_hud_agents::hermes::CronJob,
        impl Fn(&Tracker) -> usize,
    ) {
        use agent_hud_agents::hermes::{Bot, CronJob};
        let bot = Bot {
            id: "default".into(),
            name: "猛鬼兽".into(),
        };
        let failed = |id: &str| CronJob {
            id: id.into(),
            name: format!("任务{id}"),
            enabled: true,
            paused_reason: None,
            failed: true,
            last_run_at: Some(1_793_582_041_841),
            next_run_at: Some(1_794_181_500_000),
            schedule: None,
            delivers_to: None,
        };
        let told = |tracker: &Tracker| {
            tracker
                .events
                .iter()
                .filter(|e| e["kind"] == "cron-failed")
                .count()
        };
        (bot, failed, told)
    }

    #[test]
    fn a_torn_told_file_tells_once_more_then_is_whole_again() {
        let (bot, failed, told) = cron_fixture();
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("hermes-cron-told.json");
        std::fs::write(&path, "[\"default:a\"").unwrap();
        let mut tracker = Tracker::new();
        let now = tracker.started + 1_000;
        tracker.cron(&[(bot.clone(), Some(vec![failed("a")]))], Some(&path), now);
        // Unreadable means not known to be told: once more, never lost.
        assert_eq!(told(&tracker), 1);
        let kept: Vec<String> =
            serde_json::from_str(&std::fs::read_to_string(&path).unwrap()).unwrap();
        assert_eq!(kept, vec!["default:a".to_string()]);
        assert!(!dir.path().join("hermes-cron-told.json.tmp").exists());
        let mut restarted = Tracker::new();
        restarted.cron(&[(bot, Some(vec![failed("a")]))], Some(&path), now + 1);
        assert_eq!(told(&restarted), 0);
    }

    #[test]
    fn a_told_file_that_cannot_be_written_is_tried_again_next_look() {
        let (bot, failed, told) = cron_fixture();
        let dir = tempfile::tempdir().unwrap();
        let folder = dir.path().join("later");
        let path = folder.join("hermes-cron-told.json");
        let mut tracker = Tracker::new();
        let now = tracker.started + 1_000;
        tracker.cron(&[(bot.clone(), Some(vec![failed("a")]))], Some(&path), now);
        assert_eq!(told(&tracker), 1);
        assert!(!path.exists());
        // Nothing new, but what was told is still unsaved: saved now.
        std::fs::create_dir(&folder).unwrap();
        tracker.cron(
            &[(bot.clone(), Some(vec![failed("a")]))],
            Some(&path),
            now + 1,
        );
        assert_eq!(told(&tracker), 1, "not told again in the meantime");
        let mut restarted = Tracker::new();
        restarted.cron(&[(bot, Some(vec![failed("a")]))], Some(&path), now + 2);
        assert_eq!(told(&restarted), 0);
    }
}
