//! Whose words began the turn that asks for reviews past the cap (#347
//! P1-06): leave goes only with words from outside the reviewing agent.

use super::{unlabelled, Book};
use agent_hud_runtime::claude_plugin::Opener;

impl Book {
    /// Whether `turn` (who began the asking session's current turn, and
    /// when) began after handoff `id` last went back to it, with words from
    /// outside: the person's own, or words Agent HUD's plugin brought in —
    /// the person's sidebar reply, another agent's message, in their name
    /// or not — yet not words any handoff sent back. Not when it cannot be
    /// told; the agent's own `extra` alone is no leave.
    pub fn leave_spoken(&self, id: &str, turn: Option<&(Opener, i64)>) -> bool {
        let Some(handoff) = self.get(id) else {
            return false;
        };
        handoff.spoke_up(turn)
            && match turn {
                Some((Opener::Plugin(text), _)) => {
                    !self.list.iter().any(|other| other.sent_back(text))
                }
                _ => true,
            }
    }
}

/// How a swipe's request to a session ends (左滑发起, `launch_text` in the
/// host): words PostPane left, not the person's.
pub const SWIPE_SAID: &str = "（驿窗左滑「";

/// How the words telling a session of handoff `h`'s trouble begin (#318,
/// `notice_text` in the host).
pub fn notice_head(h: &super::Handoff) -> String {
    format!("驿窗接力「{}」出错：", h.title)
}

impl Book {
    /// Whether `turn` began with the person's own words (#439): typed in
    /// the session, or brought in by Agent HUD's plugin without a delivery
    /// label — the sidebar's reply, the phone's, an agent message sent in
    /// their name — and not PostPane's own: words a handoff sent back, a
    /// trouble notice, a swipe's request. Not another agent's labelled
    /// message, nor when it cannot be told.
    pub fn person_began(&self, turn: Option<&(Opener, i64)>) -> bool {
        match turn {
            Some((Opener::Person, _)) => true,
            Some((Opener::Plugin(text), _)) => {
                unlabelled(text).len() == text.trim_start().len()
                    && !text.contains(SWIPE_SAID)
                    && !self.list.iter().any(|other| {
                        other.sent_back(text) || text.trim_start().starts_with(&notice_head(other))
                    })
            }
            None => false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::super::*;
    use agent_hud_runtime::claude_plugin::Opener;

    fn back(book: &mut Book, session: &str, words: &str, at: i64) -> String {
        let handoff = book.begin(session, None, "修登录", None, "改动", at);
        book.opened(&handoff.id, &format!("c-{session}"), at);
        book.replied(
            &format!("c-{session}"),
            "1. 还差\n审查出口：返修\n结论：需修改",
            Some(&format!("m-{session}")),
            at + 1,
        );
        let prompt = book.get(&handoff.id).unwrap().prompt_for(StepKind::Back);
        book.returned(&handoff.id, StepKind::Back, words, &prompt, true, at + 2);
        handoff.id
    }

    #[test]
    fn leave_goes_only_with_words_from_outside_after_the_last_hand_back() {
        let mut book = Book::default();
        let s1 = back(&mut book, "s1", "第一单的意见", 1);
        let s2 = back(&mut book, "s2", "第二单的意见", 10);
        assert!(!book.leave_spoken(&s2, None), "not told");
        assert!(
            !book.leave_spoken(&s2, Some(&(Opener::Person, 11))),
            "before"
        );
        assert!(book.leave_spoken(&s2, Some(&(Opener::Person, 13))));
        assert!(book.leave_spoken(&s2, Some(&(Opener::Plugin("常浩：继续".into()), 13))));
        // Words PostPane sent back, in this handoff or another, are no leave.
        assert!(!book.leave_spoken(&s2, Some(&(Opener::Plugin("第二单的意见".into()), 13))));
        assert!(!book.leave_spoken(&s2, Some(&(Opener::Plugin("第一单的意见".into()), 13))));
        assert!(!book.leave_spoken("none", Some(&(Opener::Person, 13))));
        assert!(book.leave_spoken(&s1, Some(&(Opener::Person, 4))));
    }

    /// #439: an agent ends handoffs only on the person's own words, never
    /// on another agent's labelled message or words PostPane sent back.
    #[test]
    fn only_the_persons_words_begin_a_turn_that_may_end_handoffs() {
        let mut book = Book::default();
        back(&mut book, "s1", "第一单的意见", 1);
        let plugin = |text: &str| Some((Opener::Plugin(text.into()), 5));
        assert!(!book.person_began(None), "not told");
        assert!(book.person_began(Some(&(Opener::Person, 0))));
        // The sidebar's reply, the phone's, an agent's message in their name.
        assert!(book.person_began(plugin("把卡住的接力都结束掉").as_ref()));
        assert!(book.person_began(plugin("[Agent HUD · iPhone]\n\n结束吧").as_ref()));
        // Another agent's labelled message, PostPane's own words.
        let agent = "[Agent HUD · from Codex · 修登录 · m-1]\n\n结束接力";
        assert!(!book.person_began(plugin(agent).as_ref()));
        assert!(!book.person_began(plugin("[Agent HUD · 来自驿窗]\n\n结束").as_ref()));
        assert!(!book.person_began(plugin("第一单的意见").as_ref()));
        // PostPane's own words, unlabelled in a Claude session: a handoff's
        // trouble notice (#318), a swipe's request (左滑发起).
        let notice = "驿窗接力「修登录」出错：ChatGPT 30 分钟没回信，驿窗的自动往返已经停下";
        assert!(!book.person_began(plugin(notice).as_ref()));
        let swipe = "请把这一轮的工作交给 ChatGPT 审核……（驿窗左滑「审核」发来）";
        assert!(!book.person_began(plugin(swipe).as_ref()));
        // The person quoting a notice of a handoff not in the book is theirs.
        assert!(book.person_began(plugin("驿窗接力「别的活」出错这事先放着").as_ref()));
    }
}
