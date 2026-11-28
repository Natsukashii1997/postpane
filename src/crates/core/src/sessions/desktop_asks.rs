//! The cards of the questions Claude sessions stand as: their own boxes,
//! handoff cards, replies waiting on the owner, and next steps done in
//! another session (`reply_elsewhere`).
use super::*;
use agent_hud_agents::transcript::live::DesktopAsk;

impl AgentHudCore {
    /// Puts the questions the Claude desktop app asks in its own window among
    /// the requests the user is asked about, in place of the ones asked
    /// before. A next-step box whose session the host reaches is answerable
    /// (a card of its own id, which replaces the display-only one, as a host
    /// that starts sending replaces Open's); any other has the reason it can
    /// only be answered in the app (agent-hud-native-open
    /// ClaudeDesktopAsks.show/requests).
    pub(crate) fn sync_claude_desktop_asks(&mut self, now: i64) {
        let mut active = HashMap::new();
        let mut standing = HashSet::new();
        let claude = agent_hud_agents::claude::AGENT.id;
        if self.enabled.get(claude).copied().unwrap_or(true) {
            self.reword_desktop_asks(now);
            // Every pass prepares the projection first; its selection saves
            // choosing among each session's copies again.
            let listed = match &self.usage_projection {
                Some(projection) => projection
                    .selected
                    .iter()
                    .filter_map(|path| self.logs.get(path))
                    .filter(|head| !head.gone && !head.archived && !head.live.is_internal)
                    .collect(),
                None => self.listed_sessions(),
            };
            // When each listed session's latest turn started: a next step
            // pointing to it is done once the owner spoke there since.
            let started = listed
                .iter()
                .map(|log| {
                    let turn = log.live.turns.back();
                    let at = turn.map_or(0, |turn| turn.started.unwrap_or(turn.observed));
                    (log.id.clone(), at)
                })
                .collect::<HashMap<_, _>>();
            let candidates = listed
                .into_iter()
                .filter(|log| log.source == claude)
                .flat_map(|log| {
                    // Its question, a handoff card (#245), a reply waiting on the owner (#562).
                    agent_hud_agents::transcript::closing::standing_asks(&log.live)
                        .map(move |ask| (log, ask))
                })
                .filter_map(|(log, ask)| {
                    // A question whose words this run could not read has no card.
                    if !ask.is_worded() {
                        return None;
                    }
                    // A box stands until it is answered or its session is put
                    // away; it waits as long as approvals do (#184).
                    if !self.requests.still_held(ask.at, now) {
                        return None;
                    }
                    let key = crate::grok_cache::hash(&[&log.id, &ask.id]);
                    Some((key, log.id.clone(), log.cwd.clone(), log.title.clone(), ask))
                })
                .collect::<Vec<_>>();
            // A next step done in another session goes onto that session's
            // card, or points there (2026-11-28).
            let cards = candidates
                .iter()
                .map(
                    |(key, session, _, title, ask)| super::reply_elsewhere::Standing {
                        key,
                        session,
                        title,
                        ask,
                    },
                )
                .collect::<Vec<_>>();
            let desktop = &mut self.claude_desktop;
            let index = &desktop.index;
            let (routes, mut notes) = super::reply_elsewhere::route(
                &cards,
                |tab| index.session_of_tab(tab),
                &started,
                &mut desktop.forwarded,
            );
            for (at, ((key, session, cwd, _, ask), route)) in
                candidates.into_iter().zip(routes).enumerate()
            {
                standing.insert(key.clone());
                if route == super::reply_elsewhere::Route::Gone {
                    continue;
                }
                if self.claude_desktop.settled.contains(&key) {
                    continue;
                }
                // Once answerable, a box stays so while it stands: a session
                // the host stops reaching for a while (the app pauses a
                // hidden session) refuses the answer with the host's reason
                // instead of its card being replaced back and forth, here
                // and on the phone.
                // Turning answering off takes effect at once, reached or not.
                let way = if let Some(off) = self.claude_answers_off() {
                    Err(off)
                } else if self.claude_desktop.reached.contains(&key) {
                    Ok(())
                } else {
                    self.desktop_ask_way(&session, &ask)
                };
                if way.is_ok() {
                    self.claude_desktop.reached.insert(key.clone());
                }
                let req_id = format!(
                    "claude-desktop-ask:{}{key}",
                    if way.is_ok() { "reply:" } else { "" }
                );
                // A session link reads as its title (2026-11-28).
                let shown = DesktopAsk {
                    question: agent_hud_agents::transcript::elsewhere::plain_links(&ask.question),
                    ..ask.clone()
                };
                let mut view = agent_hud_agents::claude::transcript::desktop_ask_view(
                    &req_id,
                    &session,
                    cwd.as_deref(),
                    &shown,
                    way.err(),
                );
                if let super::reply_elsewhere::Route::Point { session, title } = route {
                    view["elsewhere"] = json!({"sessionId": session, "title": title});
                }
                if let Some(from) = notes.remove(&at) {
                    view["forwardedFrom"] = json!(from);
                }
                match self
                    .requests
                    .register_native(req_id.clone(), view.clone(), now)
                {
                    Some(ticket) => {
                        active.insert(req_id, (key, ticket));
                    }
                    None => {
                        // Shown already, or put away by its wait running out.
                        self.requests.refresh_native(&req_id, view);
                        if let Some(kept) = self.claude_desktop.asks.remove(&req_id) {
                            active.insert(req_id, kept);
                        }
                    }
                }
            }
        }
        for old_id in self.claude_desktop.asks.keys() {
            if !active.contains_key(old_id) {
                self.requests.settle_native(old_id);
            }
        }
        self.claude_desktop.asks = active;
        self.claude_desktop
            .settled
            .retain(|key| standing.contains(key));
        self.claude_desktop
            .reached
            .retain(|key| standing.contains(key));
        self.claude_desktop
            .forwarded
            .retain(|key| standing.contains(key));
    }
}
