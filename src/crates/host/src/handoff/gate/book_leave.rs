//! Whose words began the turn that asks for reviews past the cap (#347
//! P1-06): leave goes only with words from outside the reviewing agent.

use super::Book;
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
}
