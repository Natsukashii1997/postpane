//! The HUD's answers to the Claude desktop app's questions, left for a
//! session through Agent HUD's plugin. A session whose process stopped (the
//! desktop app reclaims idle ones, L-14) takes the answer by running in the
//! background, when the host can run it (#520).
use super::{installed, installed_at, ClaudeChannel, Refusal};
use agent_hud_core::{
    l10n,
    replies::{AnswerFix, SessionReplies, Unreachable},
};
use std::{path::PathBuf, sync::Arc, time::SystemTime};

/// Runs a Claude Code session whose process stopped, in the background, with
/// words as its user's next message (`claude -p --resume`, run by the host).
/// Err gives why it cannot, in the app's language.
pub type Waker = Arc<dyn Fn(&str, &str) -> Result<(), String> + Send + Sync>;

/// The HUD's answers to the Claude desktop app's questions, through the plugin.
pub struct ClaudeReplies {
    channel: ClaudeChannel,
    /// Claude Code's own folder, where it lists the plugins it installed.
    claude_config: PathBuf,
    /// The data folder whose hook inbox records that the HUD sent an answer
    /// (`hooks::record_delivery`); none records nothing.
    deliveries: Option<PathBuf>,
    /// The host's way to run a session whose process stopped; none leaves
    /// the answer refused, to be sent in Claude.
    waker: Option<Waker>,
}

impl ClaudeReplies {
    pub fn new(channel: ClaudeChannel, claude_config: PathBuf) -> Self {
        Self {
            channel,
            claude_config,
            deliveries: None,
            waker: None,
        }
    }

    /// Runs a session whose process stopped in the background with the
    /// HUD's answer (#520), as relays do (#175). Only `reply` does: words
    /// back from a relay and agents' messages keep their own ways.
    pub fn waking(mut self, waker: Waker) -> Self {
        self.waker = Some(waker);
        self
    }

    /// Records each answer left for a session as typed in Agent HUD on this
    /// Mac (`desktop:agenthud`), so a session's latest tag names the HUD and
    /// not a phone that sent it something earlier (`naming::surfaces`).
    pub fn recording_deliveries(mut self, data: Option<PathBuf>) -> Self {
        self.deliveries = data;
        self
    }

    /// Why words would not reach `session`, which has not checked in lately,
    /// and what would change it: the plugin is not installed; the session
    /// ran it and ended, as when Claude restarts; the session ran it since it
    /// was installed, so the app has paused the session; or the session
    /// started before the install and has not loaded it.
    fn unreachable(&self, session: &str) -> Unreachable {
        if !installed(&self.claude_config) {
            return Unreachable::new(
                l10n::text(
                    "Claude Code 还没装 Agent HUD 插件，装好后就能在 Agent HUD 里回答 Claude 的提问（设置 → 智能体插件）。",
                    "Claude Code doesn't have Agent HUD's plugin yet. Install it to answer Claude's questions in Agent HUD (Settings → Agent plugins).",
                ),
                Some(AnswerFix::InstallPlugin),
            );
        }
        if self.channel.ended(session) {
            return Unreachable::new(stopped(), None);
        }
        let paused = installed_at(&self.claude_config)
            .zip(self.channel.last_check_in(session))
            .is_some_and(|(installed, checked_in)| checked_in >= installed);
        if paused {
            return Unreachable::new(
                l10n::text(
                    "这个会话有一阵没回应 Agent HUD 插件了，可能被 Claude 暂停了。在 Claude 里打开这个会话就能回答。",
                    "This session hasn't answered Agent HUD's plugin for a while; Claude may have paused it. Open it in Claude to answer.",
                ),
                None,
            );
        }
        Unreachable::new(
            l10n::text(
                "这个会话还没加载 Agent HUD 插件。在会话里执行 /reload-plugins 后，就能在 Agent HUD 里回答。",
                "This session hasn't loaded Agent HUD's plugin. Run /reload-plugins in it to answer in Agent HUD.",
            ),
            Some(AnswerFix::ReloadPlugins),
        )
    }
}

/// Why words do not reach a session whose process stopped.
fn stopped() -> String {
    l10n::text(
        "这个会话的 Claude 进程已经停了（Claude 重启、关掉或回收过它）。在 Claude 里给它发一句话让它重新运行，就能在 Agent HUD 里回答。",
        "This session's Claude process has stopped (Claude restarted, closed or reclaimed it). Send it a message in Claude to run it again, then answer in Agent HUD.",
    )
}

/// Why words for another client's session never reach it: the plugin is Claude Code's.
fn not_claude() -> String {
    l10n::text(
        "Agent HUD 的插件只能把回答发进 Claude Code 会话。",
        "Agent HUD's plugin sends answers only into Claude Code sessions.",
    )
}

impl SessionReplies for ClaudeReplies {
    fn reaches(&self, source: &str, session: &str) -> Result<(), Unreachable> {
        if source != agent_hud_agents::claude::AGENT.id {
            return Err(Unreachable::new(not_claude(), None));
        }
        if self.channel.loaded(SystemTime::now()).contains(session) {
            Ok(())
        } else {
            Err(self.unreachable(session))
        }
    }
    fn reply(&self, source: &str, session: &str, words: &str) -> Result<(), String> {
        if source != agent_hud_agents::claude::AGENT.id {
            return Err(not_claude());
        }
        let now = SystemTime::now();
        let handed = match self.channel.hand(session, words, now) {
            Err(Refusal::NotLoaded) if self.channel.ended(session) => self.wake(session, words),
            handed => handed
                .map(drop)
                .map_err(|refusal| self.refusal_text(session, &refusal)),
        };
        if handed.is_ok() {
            self.delivered(session, now);
        }
        handed
    }
}

impl ClaudeReplies {
    /// `reply` into a Claude Code session under the caller's own identity
    /// `id` (#257): words left under it before are refused as
    /// `IdentityConflict` (`refusal_text` says the rest).
    pub fn reply_as(&self, session: &str, id: &str, words: &str) -> Result<(), Refusal> {
        let now = SystemTime::now();
        let handed = self.channel.hand_as(session, id, words, now);
        if handed.is_ok() {
            self.delivered(session, now);
        }
        handed
    }

    /// The answer for `session`, whose process stopped: the host runs it in
    /// the background with the words. Only a session the plugin said ended
    /// is run so; one only quiet may still run in Claude, and a second
    /// process beside it would split the conversation. Without a host that
    /// can, or when it cannot, the card keeps waiting and says why.
    fn wake(&self, session: &str, words: &str) -> Result<(), String> {
        let stopped = stopped();
        let Some(wake) = &self.waker else {
            return Err(stopped);
        };
        wake(session, words).map_err(|error| {
            l10n::text(
                &format!("{stopped}驿窗想在后台续接它，也没成：{error}。"),
                &format!("{stopped} Running it in the background failed too: {error}."),
            )
        })
    }

    /// What a refusal to leave words for `session` tells the person.
    pub fn refusal_text(&self, session: &str, refusal: &Refusal) -> String {
        match refusal {
            Refusal::NotLoaded => self.unreachable(session).note,
            Refusal::Rejected(_) => l10n::text(
                "插件不能发送以 / 开头的话。",
                "The plugin can't send words that start with /.",
            ),
            Refusal::InvalidInput(_) => l10n::text("没有要发送的话。", "There is nothing to send."),
            _ => l10n::text(
                "回答没能交给 Claude Code 插件。",
                "The answer could not be left for the Claude Code plugin.",
            ),
        }
    }

    /// Words left for `session` are recorded as typed in Agent HUD on this Mac.
    fn delivered(&self, session: &str, now: SystemTime) {
        if let Some(data) = &self.deliveries {
            use agent_hud_agents::naming::surfaces::{Category, Surface, AGENT_HUD};
            let at = now
                .duration_since(SystemTime::UNIX_EPOCH)
                .map(|since| since.as_millis() as i64)
                .unwrap_or_default();
            // A tag is a label: a failed write only leaves the log's tag.
            let _ = crate::hooks::record_delivery(
                data,
                agent_hud_agents::claude::AGENT.id,
                session,
                &Surface::new(Category::Desktop, AGENT_HUD),
                at,
            );
        }
    }
}
