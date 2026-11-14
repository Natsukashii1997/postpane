//! Sessions a client says are waiting on the user, without a HUD-answerable
//! request. One source can have several observers that each see part of it
//! (DeepSeek Harness's question stream and its plugin): every observer owns
//! its own slot, and the HUD sees the union, so one observer's update never
//! wipes out what another reported.
use super::Requests;
use std::collections::{HashMap, HashSet};

impl Requests {
    /// The sessions of `source` waiting now, as the source's only observer.
    pub fn set_native_waiting(&self, source: &str, sessions: &[String], now_ms: i64) {
        self.set_native_waiting_by(source, "", sessions, now_ms);
    }
    /// The sessions of `source` that `observer` sees waiting now; keeps phase
    /// evidence without fabricating a card or a transcript timestamp.
    pub fn set_native_waiting_by(
        &self,
        source: &str,
        observer: &str,
        sessions: &[String],
        _now_ms: i64,
    ) {
        let next: HashSet<String> = sessions
            .iter()
            .filter(|id| !id.is_empty())
            .cloned()
            .collect();
        let key = (source.to_owned(), observer.to_owned());
        let changed = {
            let mut state = self.0.state.lock().unwrap_or_else(|p| p.into_inner());
            if state
                .native_waiting
                .get(&key)
                .is_none_or(|old| *old != next)
                && (!next.is_empty() || state.native_waiting.contains_key(&key))
            {
                if next.is_empty() {
                    state.native_waiting.remove(&key);
                } else {
                    state.native_waiting.insert(key, next);
                }
                state.revision = state.revision.wrapping_add(1);
                true
            } else {
                false
            }
        };
        if changed {
            self.wake();
        }
    }
    /// Waiting sessions by source, every observer's together.
    pub fn native_waiting_sessions(&self) -> HashMap<String, HashSet<String>> {
        let state = self.0.state.lock().unwrap_or_else(|p| p.into_inner());
        let mut sessions: HashMap<String, HashSet<String>> = HashMap::new();
        for ((source, _), ids) in &state.native_waiting {
            sessions
                .entry(source.clone())
                .or_default()
                .extend(ids.iter().cloned());
        }
        sessions
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ids(list: &[&str]) -> Vec<String> {
        list.iter().map(|id| id.to_string()).collect()
    }

    #[test]
    fn observers_of_one_source_keep_their_own_waiting_sessions() {
        let requests = Requests::default();
        requests.set_native_waiting_by("deepseek", "stream", &ids(&["a"]), 0);
        requests.set_native_waiting_by("deepseek", "plugin", &ids(&["b", "a"]), 0);
        requests.set_native_waiting("codex", &ids(&["c"]), 0);
        let all = requests.native_waiting_sessions();
        assert_eq!(all["deepseek"], HashSet::from(["a".into(), "b".into()]));
        assert_eq!(all["codex"], HashSet::from(["c".into()]));

        let revision = requests.revision();
        requests.set_native_waiting_by("deepseek", "plugin", &ids(&["a", "b"]), 0);
        assert_eq!(requests.revision(), revision, "same set changes nothing");

        requests.set_native_waiting_by("deepseek", "plugin", &[], 0);
        assert_eq!(
            requests.native_waiting_sessions()["deepseek"],
            HashSet::from(["a".into()])
        );
        requests.set_native_waiting_by("deepseek", "stream", &[], 0);
        requests.set_native_waiting("codex", &[], 0);
        assert!(requests.native_waiting_sessions().is_empty());
        let revision = requests.revision();
        requests.set_native_waiting("codex", &[], 0);
        assert_eq!(
            requests.revision(),
            revision,
            "clearing twice changes nothing"
        );
    }
}
