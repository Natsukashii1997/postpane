//! Review chains and the gate's doings on the book (#347): which handoff a
//! new one goes on from, the cap and commit as set, what the person is to
//! hear of, and the note PostPane adds to the next review's words.
use super::gate::Notice;
use super::gate_io::ledger;
use super::{Book, Handoff, Phase, Step, StepKind};

/// The review chain a handoff begins: its id, as 「r…」.
pub fn chain_id(id: &str) -> String {
    format!("r{}", id.trim_start_matches('h'))
}

/// The handoff a new one goes on from (`Book::earlier`).
pub struct Earlier {
    pub id: String,
    pub chain: String,
    /// Its reviews since the person's newest leave; none once it passed.
    pub period: u32,
    /// Its chain's reviews; never reset.
    pub total: u32,
}

impl Book {
    /// The handoff one other than `id` goes on from: the newest of review
    /// chain `chain` when named, else the newest of pull request `pr` —
    /// unless that one passed, when the pull request begins a new chain.
    pub fn earlier(&self, id: &str, pr: Option<&str>, chain: Option<&str>) -> Option<Earlier> {
        let last = self
            .list
            .iter()
            .rev()
            .filter(|h| h.id != id && !h.thinking())
            .find(|h| match chain {
                Some(chain) => h.gate.chain.as_deref() == Some(chain),
                None => pr.is_some() && h.pr.as_deref() == pr,
            })?;
        // Passed as PostPane let it pass (#347): an answer that wrote 通过
        // but was held back by the commit check did not.
        let passed = last.gate.notice == Some(Notice::Passed)
            || (last.gate.chain.is_none()
                && !last.live()
                && last.last_reply().and_then(|s| s.verdict) == Some(super::Verdict::Pass));
        if passed && chain.is_none() {
            return None;
        }
        Some(Earlier {
            id: last.id.clone(),
            chain: last
                .gate
                .chain
                .clone()
                .unwrap_or_else(|| chain_id(&last.id)),
            period: if passed { 0 } else { last.counted() },
            total: last.total(),
        })
    }
    /// One handoff of a review chain open at a time (#347): the others
    /// still open close as handed over to `keep`, so no review of the chain
    /// is counted on two handoffs side by side.
    pub fn close_others(&mut self, chain: &str, keep: &str) -> bool {
        let now = self
            .list
            .iter()
            .find(|h| h.id == keep)
            .map_or(0, |h| h.created_at);
        let mut closed = false;
        // A failed one whose opening may still come late is let go too
        // (L3 P1-04): it can bind no conversation once taken over.
        let revivable = |h: &Handoff| h.status == super::Status::Failed && h.brief.is_some();
        for h in self
            .list
            .iter_mut()
            .filter(|h| h.id != keep && (h.live() || revivable(h)))
        {
            if h.gate.chain.as_deref() == Some(chain) {
                if h.live() {
                    h.status = super::Status::Closed;
                    h.enter(Phase::Ended, now);
                }
                h.brief = None;
                h.steps.push(
                    Step::new(
                        now,
                        StepKind::End,
                        Some(&format!("同一审查链转到新接力 {keep}")),
                    )
                    .by_auto(),
                );
                closed = true;
            }
        }
        closed
    }
    /// Handoffs still open from before the review gate (#347, go-live gate of the old MA-02 §5.6):
    /// each gets its own review chain and a step saying what it counted
    /// when it moved over, so nothing is reset unseen.
    pub fn adopt(&mut self, now: i64) -> bool {
        let mut adopted = false;
        for h in self
            .list
            .iter_mut()
            .filter(|h| h.live() && !h.thinking() && h.gate.chain.is_none())
        {
            h.gate.chain = Some(chain_id(&h.id));
            let text = format!(
                "按审核门续审：本次授权周期已审 {} 轮，审查链 {} 共 {} 轮",
                h.counted(),
                chain_id(&h.id),
                h.total()
            );
            h.steps
                .push(Step::new(now, StepKind::Work, Some(&text)).by_auto());
            adopted = true;
        }
        adopted
    }
    /// The newest handoff of review chain `chain`.
    pub fn chain_last(&self, chain: &str) -> Option<&Handoff> {
        self.list
            .iter()
            .rev()
            .find(|h| h.gate.chain.as_deref() == Some(chain))
    }
    /// Sets the cap handoff `id`'s reviews count against, as set now.
    pub fn set_limit(&mut self, id: &str, limit: u32) -> bool {
        let Some(handoff) = self.list.iter_mut().find(|h| h.id == id) else {
            return false;
        };
        handoff.gate.limit = limit;
        true
    }
    /// Sets the commit handoff `id` asks to have reviewed.
    pub fn set_head(&mut self, id: &str, head: Option<&str>) -> bool {
        let Some(handoff) = self.list.iter_mut().find(|h| h.id == id) else {
            return false;
        };
        handoff.gate.head = head.map(str::to_ascii_lowercase);
        true
    }
    /// The person is to hear of handoff `id`: it passed, or reached its cap
    /// (when, kept: L3 P2-07).
    pub fn note(&mut self, id: &str, notice: Notice, now: i64) -> bool {
        let Some(handoff) = self.list.iter_mut().find(|h| h.id == id) else {
            return false;
        };
        handoff.gate.notice = Some(notice);
        if notice == Notice::Top {
            handoff.gate.top_at = now;
        }
        true
    }
    /// PostPane asked ChatGPT to mend only the last lines of its answer
    /// (`text`); the answer to it is no review of its own.
    pub fn format_asked(&mut self, id: &str, text: &str, now: i64) -> bool {
        let Some(handoff) = self.list.iter_mut().find(|h| h.id == id && h.live()) else {
            return false;
        };
        handoff
            .steps
            .push(Step::new(now, StepKind::Format, Some(text)).by_auto());
        handoff.enter(Phase::Delivered, now);
        true
    }
    /// Adds PostPane's note to the words handoff `id`'s conversation is
    /// to open with.
    pub fn extend_brief(&mut self, id: &str, note: &str) -> bool {
        let Some(brief) = self
            .list
            .iter_mut()
            .find(|h| h.id == id)
            .and_then(|h| h.brief.as_mut())
        else {
            return false;
        };
        brief.push_str(note);
        true
    }
    /// What PostPane adds to the words of handoff `id`'s next review: which
    /// round of the person's leave and of the chain it is, and the problem
    /// ledger of the chain's newest answer, as ChatGPT wrote it.
    pub fn carry(&self, id: &str, kept: &dyn Fn(&str, usize) -> Option<String>) -> String {
        let Some(handoff) = self.list.iter().find(|h| h.id == id) else {
            return String::new();
        };
        // Nothing reviewed yet: nothing to add.
        if handoff.total() == 0 && handoff.counted() == 0 {
            return String::new();
        }
        let (round, cap) = (handoff.counted() + 1, handoff.budget());
        let last = if round == cap {
            "，也是最后一轮"
        } else {
            ""
        };
        let mut note =
            format!("\n\n---\n【驿窗附注】这是本次授权周期第 {round} 轮（上限 {cap} 轮{last}）");
        if let Some(chain) = &handoff.gate.chain {
            note.push_str(&format!(
                "，审查链 {chain} 累计第 {} 轮",
                handoff.total() + 1
            ));
        }
        note.push('。');
        let earlier = || {
            handoff.gate.chain.as_deref().and_then(|c| {
                self.list
                    .iter()
                    .rev()
                    .find(|h| h.id != id && h.gate.chain.as_deref() == Some(c))
            })
        };
        // The newest answer that reviewed, not one only mending its last
        // lines (#347); in full as kept, else as the handoff has it.
        let source = Some(handoff)
            .filter(|h| h.substantive().is_some())
            .or_else(earlier);
        let reply = source.and_then(|h| {
            let (n, step) = h.substantive()?;
            kept(&h.id, n).or_else(|| step.text.clone())
        });
        if let Some(reply) = reply.filter(|_| !handoff.thinking()) {
            note.push_str(&format!(
                "\n上一轮问题台账（驿窗原样带入，未改动；请逐条对账，漏掉的按未关闭处理）：\n{}",
                ledger(&reply)
            ));
        }
        note
    }
}
