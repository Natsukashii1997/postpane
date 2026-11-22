//! Words back to the session that asked, by hand or by the round trip, and
//! an answer in while the auto round trip is off, which goes back all the
//! same (#410): it used to wait on the sidebar for the person's 「转回」
//! while the session that asked waited on unaware.
use super::{Desk, Lines, Unsent, CLAUDE};
use crate::handoff::book::{by_doer, Handoff, StepKind};
use agent_hud_runtime::l10n;

impl Desk {
    /// Words back to the session (`kind`: its answer or the ask to hand over
    /// again), under the step's own id (#257): words left under it before
    /// went already, and are not left twice. Not reached: they wait in the
    /// session's queue and go in once it is opened (#223). `auto` when the
    /// round trip sent them, not the person. Whether they went.
    pub(super) fn hand_back(
        &self,
        lines: &dyn Lines,
        handoff: &Handoff,
        kind: StepKind,
        text: &str,
        auto: bool,
        now: i64,
    ) -> Result<bool, String> {
        let id = handoff.id.as_str();
        let _sending = self.claim(id)?;
        if self.lock().returned_already(id, text) {
            return Ok(false);
        }
        let prompt = self
            .lock()
            .get(id)
            .map_or_else(|| handoff.prompt_for(kind), |h| h.prompt_for(kind));
        let (doer, session) = (
            handoff.doer.as_deref().unwrap_or(CLAUDE),
            &handoff.claude_session,
        );
        if let Err(Unsent::Failed(error)) = lines
            .reaches(doer, session)
            .map_err(Unsent::Failed)
            .and_then(|()| lines.reply(doer, session, &prompt, text))
        {
            if let Err(Unsent::Failed(_)) = lines.queue(doer, session, &prompt, text) {
                return Err(error);
            }
            self.change(|book| {
                book.returned(id, kind, text, &prompt, auto, now) && book.queued(id, now)
            });
            return Ok(true);
        }
        self.change(|book| book.returned(id, kind, text, &prompt, auto, now));
        Ok(true)
    }
    /// An answer in while the auto round trip is off goes back all the same
    /// (#410), saying the person decides what comes next; the round trip
    /// stays off. Neither reached nor queued: the card says so, and it is
    /// not tried again by itself (the person's 「转回」 still can).
    pub(super) fn hand_held(&self, lines: &dyn Lines, id: &str, now: i64) -> bool {
        let Some(handoff) = self.lock().get(id).cloned().filter(Handoff::held_answer) else {
            return false;
        };
        let Some(reply) = handoff.last_reply().and_then(|step| step.text.clone()) else {
            return false;
        };
        let (text, _) = self.back_words(lines, &handoff, &reply, true);
        match self.hand_back(lines, &handoff, StepKind::Back, &text, true, now) {
            Ok(went) => went,
            Err(error) => {
                let why = by_doer(&held_back_failed(&error), handoff.doer.as_deref());
                self.change(|book| book.trouble(id, &why, now))
            }
        }
    }
}

/// An answer in while the auto round trip was off could not go back.
fn held_back_failed(error: &str) -> String {
    l10n::text(
        &format!("回信没能转回 Claude 会话（{error}），请在接力卡上点「转回」"),
        &format!("The answer could not go back to the Claude session ({error}); send it back from the card"),
    )
}

/// What `relay_to_chatgpt` says of the answer to come: by itself as the
/// round trip goes, or, paused by the person, back all the same with what
/// comes next left to them.
pub(super) fn relay_gate(paused: bool) -> String {
    if paused {
        return l10n::text(
            "常浩暂停了这张接力的自动往返：回信到了照样转回这个会话，但会写明下一步等常浩决定。",
            "The person paused this handoff's auto round trip: the answer still comes back here, saying the person decides what comes next.",
        );
    }
    l10n::text(
        "回信由驿窗自动转回这个会话：返修转回让你改完再送（本次授权周期默认最多 5 轮，常浩可在驿窗设置「智能体插件」的「审核轮数上限」里调，1–9 轮）；通过也转回、驿窗结束接力；到顶、决策升级或末尾几行认不出时转回并交常浩决定。",
        "The answer comes back here by itself: a fix to make, to send again (at most the review cap of rounds per leave of the person's); a pass, sent back and ended; the cap, an escalation or last lines PostPane cannot read, left to the person.",
    )
}
