//! The review gate (#347, multi-agent MA-02 v0.3): ChatGPT says whether a
//! review is done; PostPane keeps the hard rules only — a cap on the
//! reviews one leave of the person's gives (`reviewLimit`, 5 by default),
//! the review chain that counts across handoffs and pull requests, the
//! commit the answer says it reviewed, and one ask to mend an answer's last
//! lines. What the answers mean, PostPane does not judge.
use super::gate_io::{reviewed_commit, same_commit};
use super::{exit, review_exit, Exit, Flaw, Handoff, Next, Review, Step, StepKind};
use serde::{Deserialize, Serialize};

/// Reviews one leave of the person's gives, unless set otherwise.
pub const LIMIT: u32 = 5;
/// The most the setting takes.
pub const LIMIT_MAX: u32 = 9;

/// What the gate keeps on a handoff, beside the rest.
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Gate {
    /// The cap its reviews count against, as set when it last asked.
    #[serde(default, skip_serializing_if = "is_zero")]
    pub limit: u32,
    /// The review chain it belongs to: one acceptance goal, across
    /// sessions, handoffs and pull requests.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub chain: Option<String>,
    /// The chain's reviews before this handoff; never reset.
    #[serde(default, skip_serializing_if = "is_zero")]
    pub chain_carried: u32,
    /// The commit under review, as the newest ask named it.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub head: Option<String>,
    /// What the person is to be told of: a pass, or the cap reached.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub notice: Option<Notice>,
}

fn is_zero(n: &u32) -> bool {
    *n == 0
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Notice {
    /// The review passed: the person hears of every pass.
    Passed,
    /// The cap was reached without a pass: the person steps in.
    Top,
}

impl Handoff {
    /// The cap its reviews count against.
    pub fn budget(&self) -> u32 {
        match self.gate.limit {
            0 => LIMIT,
            limit => limit,
        }
    }
    /// Reviews since the person's newest leave (#258: they spoke up, or
    /// allowed more): earlier handoffs' of the same chain too, unless its
    /// rounds began again here. A review counts once ChatGPT answered it,
    /// one that paused for evidence too; an answer only mending its last
    /// lines does not.
    pub fn counted(&self) -> u32 {
        let carried = if self.rounds_from == 0 {
            self.carried
        } else {
            0
        };
        carried + reviewed(&self.steps[self.rounds_from.min(self.steps.len())..])
    }
    /// The review chain's reviews so far, this handoff's included; never reset.
    pub fn total(&self) -> u32 {
        self.gate.chain_carried + reviewed(&self.steps)
    }
    /// No review is left for it: another needs the person's leave.
    pub fn spent(&self) -> bool {
        self.counted() >= self.budget()
    }
    /// The newest answer only mends the last lines of the one before.
    pub fn mended(&self) -> bool {
        let Some(at) = self.steps.iter().rposition(|s| s.kind == StepKind::Reply) else {
            return false;
        };
        self.steps[..at]
            .iter()
            .rev()
            .find(|s| matches!(s.kind, StepKind::Ask | StepKind::Format))
            .is_some_and(|s| s.kind == StepKind::Format)
    }
    /// The answer as it goes back: one that only mended its last lines
    /// goes with the answer it mended.
    pub fn answer(&self) -> String {
        let mut replies = self
            .steps
            .iter()
            .rev()
            .filter(|s| s.kind == StepKind::Reply);
        let newest = replies
            .next()
            .and_then(|s| s.text.clone())
            .unwrap_or_default();
        match replies.next().and_then(|s| s.text.as_deref()) {
            Some(before) if self.mended() => {
                format!("{before}\n\n（驿窗请 ChatGPT 补写的末尾几行）\n{newest}")
            }
            _ => newest,
        }
    }
    /// What the newest answer comes to (`Handoff::outcome`).
    pub(super) fn decide(&self) -> Next {
        let reply = self
            .last_reply()
            .and_then(|s| s.text.as_deref())
            .unwrap_or_default();
        let (mended, more) = (self.mended(), self.counted() < self.budget());
        if self.thinking() {
            return match exit(reply) {
                Ok(Exit::Mature | Exit::OtherPath) => Next::Close,
                Ok(Exit::Escalate) => Next::Escalate,
                Ok(Exit::Deepen | Exit::NeedEvidence) if !more => Next::Limit,
                Ok(Exit::Deepen) => Next::Back,
                Ok(Exit::NeedEvidence) => Next::Pause,
                Err(_) if !mended => Next::Format,
                Err(flaw) => Next::Invalid(flaw),
            };
        }
        let way = match review_exit(reply) {
            Ok(Some(way)) => way,
            Err(_) | Ok(None) if !mended => return Next::Format,
            Ok(None) if self.last_reply().is_some_and(|s| s.verdict.is_none()) => {
                return Next::NoVerdict
            }
            Ok(None) => return Next::BadTail(Flaw::NoExit),
            Err(flaw) => return Next::BadTail(flaw),
        };
        // The commit it says it reviewed (MA-02 §4): a pass holds for that
        // one only.
        if let Some(head) = &self.gate.head {
            match reviewed_commit(reply) {
                None if !mended => return Next::Format,
                None if way == Review::Pass => return Next::BadTail(Flaw::NoVersion),
                Some(commit) if way == Review::Pass && !same_commit(&commit, head) => {
                    return Next::Stale
                }
                _ => {}
            }
        }
        match way {
            Review::Pass => Next::Pass,
            Review::Escalate => Next::Escalate,
            _ if !more => Next::Limit,
            Review::NeedEvidence => Next::Pause,
            Review::Fix => Next::Back,
        }
    }
    /// The next review is the last its leave gives.
    pub fn last_round_next(&self) -> bool {
        self.counted() + 1 == self.budget()
    }
}

/// Answers among `steps` that count as reviews: all but those that only
/// mended the last lines of the one before.
fn reviewed(steps: &[Step]) -> u32 {
    let mut count = 0;
    let mut mending = false;
    for step in steps {
        match step.kind {
            StepKind::Format => mending = true,
            StepKind::Ask => mending = false,
            StepKind::Reply => {
                if !mending {
                    count += 1;
                }
                mending = false;
            }
            _ => {}
        }
    }
    count
}

#[cfg(test)]
mod tests {
    use super::super::*;

    const FIX: &str = "台账\n审查出口：返修\n结论：需修改";
    const HEAD: &str = "0123456789abcdef0123456789abcdef01234567";

    /// An engineering handoff of pull request `pr`, its conversation `c-<session>` open.
    fn open(book: &mut Book, session: &str, pr: Option<&str>, chain: Option<&str>) -> String {
        let h = book.begin(session, None, "修登录", None, "请审核", 1);
        assert!(book.rule(&h.id, Some(Risk::L2), pr, chain));
        book.opened(&h.id, &format!("c-{session}"), 2);
        h.id
    }
    /// Claude hands over again and ChatGPT answers `reply`.
    fn round(book: &mut Book, id: &str, session: &str, reply: &str, n: i64) {
        if book
            .get(id)
            .unwrap()
            .steps
            .iter()
            .any(|s| s.kind == StepKind::Reply)
        {
            book.asked(id, None, &format!("第 {n} 轮"), n * 10);
        }
        book.replied(
            &format!("c-{session}"),
            reply,
            Some(&format!("m{n}")),
            n * 10 + 1,
        );
    }

    #[test]
    fn five_reviews_by_one_leave_then_the_person_steps_in() {
        let mut book = Book::default();
        let id = open(&mut book, "s1", None, None);
        for n in 1..=3 {
            round(&mut book, &id, "s1", FIX, n);
            assert_eq!(book.get(&id).unwrap().next(), Some(Next::Back), "round {n}");
        }
        // A pause counts too, and warns the next is the last.
        round(
            &mut book,
            &id,
            "s1",
            "缺日志\n审查出口：证据不足暂停\n结论：需修改",
            4,
        );
        let kept = book.get(&id).unwrap();
        assert_eq!((kept.next(), kept.counted()), (Some(Next::Pause), 4));
        assert!(kept.last_round_next());
        round(&mut book, &id, "s1", FIX, 5);
        assert_eq!(book.get(&id).unwrap().next(), Some(Next::Limit));
        // The fifth passing ends it as any pass does.
        let mut book = Book::default();
        let id = open(&mut book, "s2", None, None);
        for n in 1..=4 {
            round(&mut book, &id, "s2", FIX, n);
        }
        round(&mut book, &id, "s2", "审查出口：通过\n结论：通过", 5);
        assert_eq!(book.get(&id).unwrap().next(), Some(Next::Pass));
        // A 思维评审 shares the cap: still deepening at five is the top.
        let mut book = Book::default();
        let t = book.begin("s3", None, "思维评审｜驿窗｜门", None, "b", 1);
        book.opened(&t.id, "c-s3", 2);
        for n in 1..=5 {
            round(
                &mut book,
                &t.id,
                "s3",
                "评审出口：继续深化\n结论：需修改",
                n,
            );
        }
        assert_eq!(book.get(&t.id).unwrap().next(), Some(Next::Limit));
        assert_eq!(
            book.carry(&t.id).contains("台账"),
            false,
            "no ledger for a 思维评审"
        );
    }

    #[test]
    fn a_chain_counts_on_across_pull_requests_and_never_resets() {
        let mut book = Book::default();
        let first = open(&mut book, "s1", Some("a/b#1"), None);
        round(&mut book, &first, "s1", FIX, 1);
        round(&mut book, &first, "s1", FIX, 2);
        let chain = book.get(&first).unwrap().gate.chain.clone().unwrap();
        // Split off to another pull request, the chain named: it counts on.
        let split = open(&mut book, "s2", Some("a/b#2"), Some(&chain));
        let kept = book.get(&split).unwrap();
        assert_eq!((kept.counted(), kept.total()), (2, 2));
        assert_eq!(kept.gate.chain.as_deref(), Some(chain.as_str()));
        // The person's leave begins the rounds again; the chain's stay.
        assert!(book.allow_extra(&split, "常浩：再审", 3));
        round(&mut book, &split, "s2", FIX, 3);
        let kept = book.get(&split).unwrap();
        assert_eq!((kept.counted(), kept.total()), (1, 3));
        assert!(book.chain_last("r-none").is_none());
        // The carried note names the round and brings the ledger as written.
        let note = book.carry(&split);
        assert!(
            note.contains("第 2 轮") && note.contains(&chain) && note.contains("累计第 4 轮"),
            "{note}"
        );
        assert!(note.contains("台账"), "{note}");
    }

    #[test]
    fn a_pass_holds_for_the_commit_under_review_only() {
        let mut book = Book::default();
        let id = open(&mut book, "s1", None, None);
        assert!(book.set_head(&id, Some(HEAD)));
        round(
            &mut book,
            &id,
            "s1",
            "受审版本：0123456\n审查出口：通过\n结论：通过",
            1,
        );
        assert_eq!(book.get(&id).unwrap().next(), Some(Next::Pass));
        let id = open(&mut book, "s2", None, None);
        book.set_head(&id, Some(HEAD));
        round(
            &mut book,
            &id,
            "s2",
            "受审版本：fedcba9\n审查出口：通过\n结论：通过",
            1,
        );
        assert_eq!(book.get(&id).unwrap().next(), Some(Next::Stale));
        // No version line: mended once, then a pass without it does not hold.
        let id = open(&mut book, "s3", None, None);
        book.set_head(&id, Some(HEAD));
        round(&mut book, &id, "s3", "全文\n审查出口：通过\n结论：通过", 1);
        assert_eq!(book.get(&id).unwrap().next(), Some(Next::Format));
        assert!(book.format_asked(&id, "请补写", 20));
        book.replied("c-s3", "审查出口：通过\n结论：通过", Some("m9"), 21);
        let kept = book.get(&id).unwrap();
        assert_eq!(kept.next(), Some(Next::BadTail(Flaw::NoVersion)));
        assert_eq!(kept.counted(), 1, "mending is no review");
        assert!(
            kept.answer().starts_with("全文"),
            "the mended answer goes along"
        );
    }

    #[test]
    fn commits_ledgers_and_the_cap_read_as_written() {
        assert_eq!(
            head_in(&format!("repo x\nhead_sha {HEAD}\nbase 1111111")),
            Some(HEAD.to_owned())
        );
        assert_eq!(head_in("没有提交"), None);
        let reply =
            "正文\n**受审版本：** `ABCDEF1234`\n未决：P0 0，P1 1\n审查出口：返修\n结论：需修改";
        assert_eq!(reviewed_commit(reply).as_deref(), Some("abcdef1234"));
        assert!(same_commit("abcdef1", "ABCDEF1234") && !same_commit("abc", "abcdef1"));
        let reply = "# 审查\n## 问题台账\n| P1-01 | 待修复 |\n## 其他\n受审版本：abcdef1";
        assert_eq!(ledger(reply), "## 问题台账\n| P1-01 | 待修复 |");
        assert_eq!(ledger("没有台账"), "没有台账");
        let temp = tempfile::tempdir().unwrap();
        let data = temp.path();
        assert_eq!(review_limit(data), LIMIT);
        assert_eq!(set_review_limit(data, 3), Ok(3));
        assert!(set_review_limit(data, 0).is_err() && set_review_limit(data, 10).is_err());
        set_project(data, "").unwrap();
        assert_eq!(review_limit(data), 3, "setting the project keeps the cap");
        archive(data, "h1", 1, "全文").unwrap();
    }
}
