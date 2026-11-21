//! The handoff states and their moves (docs/chatgpt-channel.md「接力状态」):
//! one test per move of the table, and seeded random runs of every move the
//! book offers, checking the invariants I-01.. after each step. A move or an
//! invariant changed here is changed in the table too.
use super::*;
use std::collections::HashMap;

/// A book with one handoff of session `s1`, opened in conversation `c1`.
fn open_one(now: i64) -> (Book, String) {
    let mut book = Book::default();
    let id = book.begin("s1", None, "修登录", None, "brief", now).id;
    assert!(book.opened(&id, "c1", now + 1));
    (book, id)
}

fn state(book: &Book, id: &str) -> (Status, Phase) {
    let handoff = book.get(id).unwrap();
    (handoff.status, handoff.phase)
}

#[test]
fn t01_begin_opens_and_closes_the_sessions_live_one_where_it_stood() {
    let (mut book, first) = open_one(10);
    book.working("c1", 12);
    let second = book.begin("s1", None, "修登录", None, "brief", 20).id;
    assert_eq!(state(&book, &second), (Status::Opening, Phase::Sending));
    // Taken over: closed, its phase left as it was (not Ended).
    assert_eq!(state(&book, &first), (Status::Closed, Phase::Working));
}

#[test]
fn t02_opened_binds_an_opening_or_a_failed_one_not_taken_over() {
    let mut book = Book::default();
    let id = book.begin("s1", None, "t", None, "brief", 10).id;
    assert!(book.opened(&id, "c1", 11));
    assert_eq!(state(&book, &id), (Status::Open, Phase::Delivered));
    let late = book.begin("s2", None, "t", None, "brief", 20).id;
    assert!(book.failed(&late, "没打开", 21));
    assert!(book.opened(&late, "c2", 22), "a failed one may still bind");
    assert_eq!(state(&book, &late), (Status::Open, Phase::Delivered));
    // Another live one bound to that conversation is closed, phase kept.
    let other = book.begin("s3", None, "t", None, "brief", 30).id;
    assert!(book.opened(&other, "c2", 31));
    assert_eq!(state(&book, &late), (Status::Closed, Phase::Delivered));
    // Taken over by a newer one of its session: it binds no more.
    let gone = book.begin("s4", None, "t", None, "brief", 40).id;
    assert!(book.failed(&gone, "没打开", 41));
    book.begin("s4", None, "t", None, "brief", 42);
    assert!(!book.opened(&gone, "c4", 43));
}

#[test]
fn t03_failed_expire_and_interrupted_fail_only_an_opening_one() {
    let mut book = Book::default();
    let id = book.begin("s1", None, "t", None, "brief", 10).id;
    assert!(book.failed(&id, "没打开", 11));
    assert_eq!(state(&book, &id), (Status::Failed, Phase::Failed));
    assert!(!book.failed(&id, "再一次", 12));
    let slow = book.begin("s2", None, "t", None, "brief", 20).id;
    assert!(!book.expire(20 + OPEN_TIMEOUT_MS, "超时"));
    assert!(book.expire(21 + OPEN_TIMEOUT_MS, "超时"));
    assert_eq!(state(&book, &slow), (Status::Failed, Phase::Failed));
    let cut = book
        .begin("s3", None, "t", None, "brief", 30 + OPEN_TIMEOUT_MS)
        .id;
    assert!(book.interrupted(31 + OPEN_TIMEOUT_MS, "驿窗重启"));
    assert_eq!(state(&book, &cut), (Status::Failed, Phase::Failed));
    let (mut open, bound) = open_one(10);
    assert!(!open.failed(&bound, "x", 12), "an open one does not fail");
}

#[test]
fn t04_retry_reopens_a_failed_one_while_its_session_has_no_live_one() {
    let mut book = Book::default();
    let id = book.begin("s1", None, "t", None, "brief", 10).id;
    assert!(book.retry(&id, 11).is_none(), "only a failed one");
    book.failed(&id, "没打开", 12);
    assert_eq!(book.retry(&id, 13).as_deref(), Some("brief"));
    assert_eq!(state(&book, &id), (Status::Opening, Phase::Sending));
    assert_eq!(book.get(&id).unwrap().attempt, 1);
    book.failed(&id, "没打开", 14);
    book.begin("s1", None, "t", None, "brief", 15);
    assert!(book.retry(&id, 16).is_none(), "its session has a live one");
}

#[test]
fn t05_the_round_moves_ask_work_answer_and_hand_back() {
    let (mut book, id) = open_one(10);
    assert!(book.working("c1", 12));
    assert!(!book.working("c1", 13), "only from sending or delivered");
    assert!(book.replied("c1", "看完了", None, 14));
    assert_eq!(state(&book, &id), (Status::Open, Phase::Replied));
    assert!(book.returned(&id, StepKind::Back, "回信", "p1", true, 15));
    assert_eq!(state(&book, &id), (Status::Open, Phase::Returned));
    assert!(book.asked(&id, Some("改好了"), "再看", 16));
    assert_eq!(state(&book, &id), (Status::Open, Phase::Delivered));
    assert!(book.replied("c1", "第二封", None, 17));
    assert!(book.format_asked(&id, "补格式", 18));
    assert_eq!(state(&book, &id), (Status::Open, Phase::Delivered));
    assert_eq!(book.get(&id).unwrap().rounds, 2);
}

#[test]
fn t06_words_that_never_reached_claude_take_the_answer_back() {
    let (mut book, id) = open_one(10);
    book.replied("c1", "看完了", None, 12);
    book.returned(&id, StepKind::Back, "回信", "p1", true, 13);
    assert!(book.undelivered(&id, "p1", Delivery::Expired, "没送到", 14));
    assert_eq!(state(&book, &id), (Status::Open, Phase::Replied));
    assert!(!book.get(&id).unwrap().auto, "and the round trip stops");
}

#[test]
fn t07_end_passed_and_idle_end_it() {
    let (mut book, id) = open_one(10);
    assert!(book.end(&id, 12));
    assert_eq!(state(&book, &id), (Status::Closed, Phase::Ended));
    assert!(!book.end(&id, 13));
    let mut failed = Book::default();
    let gone = failed.begin("s1", None, "t", None, "brief", 10).id;
    failed.failed(&gone, "没打开", 11);
    assert!(failed.end(&gone, 12), "a failed one may be ended");
    assert_eq!(state(&failed, &gone), (Status::Closed, Phase::Ended));
    let (mut book, id) = open_one(10);
    assert!(book.passed(&id, "结论：通过", 12));
    assert_eq!(state(&book, &id), (Status::Closed, Phase::Ended));
    let (mut book, id) = open_one(10);
    book.replied("c1", "看完了", None, 12);
    assert!(!book.idle(12 + IDLE_END_MS, "闲置"));
    assert!(book.idle(13 + IDLE_END_MS, "闲置"));
    assert_eq!(state(&book, &id), (Status::Closed, Phase::Ended));
}

#[test]
fn t08_a_review_chain_moved_on_ends_the_others() {
    let (mut book, first) = open_one(10);
    book.adopt(11);
    let chain = book.get(&first).unwrap().gate.chain.clone().unwrap();
    let next = book.begin("s2", None, "t", None, "brief", 20).id;
    assert!(book.close_others(&chain, &next));
    assert_eq!(state(&book, &first), (Status::Closed, Phase::Ended));
}

#[test]
fn t09_stop_and_resume_change_only_the_round_trip() {
    let (mut book, id) = open_one(10);
    assert!(book.stop(&id, "停一下", false, 12));
    let handoff = book.get(&id).unwrap();
    assert_eq!(
        (handoff.auto, handoff.halt.as_deref()),
        (false, Some("停一下"))
    );
    assert_eq!(state(&book, &id), (Status::Open, Phase::Delivered));
    assert!(!book.stop(&id, "再停", false, 13), "stops once");
    assert!(book.resume(&id, 14));
    assert_eq!(
        (
            book.get(&id).unwrap().auto,
            book.get(&id).unwrap().halt.clone()
        ),
        (true, None)
    );
    assert!(book.overdue(15 + REPLY_WAIT_MS, "没回", "没接", "没醒"));
    assert!(book.evidence_in(&id, 16 + REPLY_WAIT_MS));
    assert!(book.get(&id).unwrap().auto);
    assert_eq!(state(&book, &id), (Status::Open, Phase::Delivered));
}

/// Gap F-01 (found by the random runs, 2026-11-21; fixed the same day, the
/// owner: 「修 F-01」): retrying an older failed handoff while a newer failed
/// one of the same session could still bind late left two live handoffs of
/// one session. A failed one taken over is no longer retried.
#[test]
fn f01_a_session_keeps_one_live_handoff_through_retry_and_a_late_bind() {
    let mut book = Book::default();
    let older = book.begin("s1", None, "t", None, "brief", 10).id;
    book.failed(&older, "没打开", 11);
    let newer = book.begin("s1", None, "t", None, "brief", 20).id;
    book.failed(&newer, "没打开", 21);
    let retried = book.retry(&older, 30).is_some();
    let bound = book.opened(&newer, "c1", 31);
    let live = book.list.iter().filter(|h| h.live()).count();
    assert!(
        live <= 1,
        "retried={retried} bound={bound}: {live} live handoffs of s1"
    );
}

// ---- Seeded random runs ----------------------------------------------------

/// A small seeded generator (xorshift): the same seed, the same run.
struct Dice(u64);
impl Dice {
    fn roll(&mut self, sides: usize) -> usize {
        self.0 ^= self.0 << 13;
        self.0 ^= self.0 >> 7;
        self.0 ^= self.0 << 17;
        (self.0 % sides as u64) as usize
    }
}

const SESSIONS: [&str; 3] = ["s0", "s1", "s2"];
const CONVERSATIONS: [&str; 3] = ["c0", "c1", "c2"];
const DELIVERIES: [Delivery; 6] = [
    Delivery::Waiting,
    Delivery::Taken,
    Delivery::Started,
    Delivery::Refused,
    Delivery::Expired,
    Delivery::Cancelled,
];

/// One move of the book, picked by `dice`; returns its name for the report.
fn step(book: &mut Book, dice: &mut Dice, now: i64, n: usize) -> String {
    let ids: Vec<String> = book.list.iter().map(|h| h.id.clone()).collect();
    let id = if ids.is_empty() {
        String::from("none")
    } else {
        ids[dice.roll(ids.len())].clone()
    };
    let session = SESSIONS[dice.roll(SESSIONS.len())];
    let conversation = CONVERSATIONS[dice.roll(CONVERSATIONS.len())];
    let prompt = format!("p{}", dice.roll(4));
    let delivery = DELIVERIES[dice.roll(DELIVERIES.len())];
    let words = format!("话{n}");
    let name = match dice.roll(27) {
        0 | 1 => {
            book.begin(session, None, "t", None, &words, now);
            "begin"
        }
        2 | 3 => {
            book.opened(&id, conversation, now);
            "opened"
        }
        4 => {
            book.failed(&id, "没打开", now);
            "failed"
        }
        5 => {
            book.retry(&id, now);
            "retry"
        }
        6 => {
            book.expire(now, "超时");
            "expire"
        }
        7 => {
            book.interrupted(now, "重启");
            "interrupted"
        }
        8 => {
            book.asked(&id, None, &words, now);
            "asked"
        }
        9 => {
            book.format_asked(&id, &words, now);
            "format_asked"
        }
        10 => {
            book.working(conversation, now);
            "working"
        }
        11 => {
            book.replied(conversation, &words, None, now);
            "replied"
        }
        12 => {
            let kind = [StepKind::Back, StepKind::Again][dice.roll(2)];
            book.returned(&id, kind, &words, &prompt, dice.roll(2) == 0, now);
            "returned"
        }
        13 => {
            book.delivery(&id, &prompt, delivery, now);
            "delivery"
        }
        14 => {
            book.undelivered(&id, &prompt, delivery, "没送到", now);
            "undelivered"
        }
        15 => {
            book.end(&id, now);
            "end"
        }
        16 => {
            book.passed(&id, "结论：通过", now);
            "passed"
        }
        17 => {
            book.idle(now, "闲置");
            "idle"
        }
        18 => {
            book.stop(&id, "停", dice.roll(2) == 0, now);
            "stop"
        }
        19 => {
            book.resume(&id, now);
            "resume"
        }
        20 => {
            book.evidence_in(&id, now);
            "evidence_in"
        }
        21 => {
            book.overdue(now, "没回", "没接", "没醒");
            "overdue"
        }
        22 => {
            book.queued(&id, now);
            book.woke(&id, "唤醒", now);
            "queued+woke"
        }
        23 => {
            book.awake(&id, now);
            book.restarted();
            "awake+restarted"
        }
        24 => {
            book.adopt(now);
            let chain = book.get(&id).and_then(|h| h.gate.chain.clone());
            let keep = ids.get(dice.roll(ids.len().max(1))).cloned();
            if let (Some(chain), Some(keep)) = (chain, keep) {
                book.close_others(&chain, &keep);
            }
            "adopt+close_others"
        }
        25 => {
            book.unconfirmed(&id, "没确认", dice.roll(2) == 0, now);
            book.pending_at_restart("重启时没确认", now);
            "unconfirmed"
        }
        _ => {
            let at = dice.roll(4);
            book.told(&id, at, "已告诉", now);
            book.round(&id, now);
            "told+round"
        }
    };
    name.to_owned()
}

/// What the invariants compare between two steps, per handoff.
#[derive(Clone)]
struct Seen {
    status: Status,
    phase: Phase,
    rounds: u32,
    attempt: u32,
    steps: usize,
}

fn seen(book: &Book) -> HashMap<String, Seen> {
    book.list
        .iter()
        .map(|h| {
            let seen = Seen {
                status: h.status,
                phase: h.phase,
                rounds: h.rounds,
                attempt: h.attempt,
                steps: h.steps.len(),
            };
            (h.id.clone(), seen)
        })
        .collect()
}

/// The invariants that hold whatever moves are made; the broken ones, named.
fn broken(book: &Book, before: &HashMap<String, Seen>) -> Vec<String> {
    let mut broken = vec![];
    let mut live_sessions = HashMap::new();
    let mut live_conversations = HashMap::new();
    for h in &book.list {
        let id = &h.id;
        if (h.status == Status::Failed) != (h.phase == Phase::Failed) {
            broken.push(format!("I-01 {id} {:?}/{:?}", h.status, h.phase));
        }
        if h.phase == Phase::Ended && h.status != Status::Closed {
            broken.push(format!("I-02 {id} {:?}", h.status));
        }
        if let Some(was) = before.get(id) {
            if was.status == Status::Closed && (h.status, h.phase) != (was.status, was.phase) {
                broken.push(format!("I-03 {id} {:?}/{:?}", h.status, h.phase));
            }
            if h.rounds < was.rounds || h.attempt < was.attempt || h.steps.len() < was.steps {
                broken.push(format!("I-08 {id}"));
            }
        }
        let bound = h.chatgpt_conversation.is_some();
        let unbound_ok = !matches!(h.status, Status::Opening | Status::Failed) || !bound;
        if !unbound_ok || (h.status == Status::Open && !bound) {
            broken.push(format!("I-04 {id} {:?} bound={bound}", h.status));
        }
        if h.auto != h.halt.is_none() {
            broken.push(format!("I-05 {id} auto={} halt={:?}", h.auto, h.halt));
        }
        if h.live() {
            if live_sessions.insert(h.claude_session.clone(), id).is_some() {
                broken.push(format!("I-06 {}", h.claude_session));
            }
            if let Some(c) = &h.chatgpt_conversation {
                if live_conversations.insert(c.clone(), id).is_some() {
                    broken.push(format!("I-07 {c}"));
                }
            }
        }
        if h.phase_at > h.updated_at {
            broken.push(format!("I-09 {id}"));
        }
    }
    broken
}

#[test]
fn t10_random_moves_keep_every_invariant() {
    let gaps = [
        1,
        1_000,
        OPEN_TIMEOUT_MS + 1,
        REPLY_WAIT_MS + 1,
        IDLE_END_MS + 1,
    ];
    // The first run that broke each invariant, by its number.
    let mut first: std::collections::BTreeMap<String, String> = Default::default();
    for seed in 1..=300u64 {
        let mut dice = Dice(seed.wrapping_mul(0x9e37_79b9_7f4a_7c15) | 1);
        let mut book = Book::default();
        let mut now = 1_000_000;
        let mut moves = vec![];
        for n in 0..120 {
            now += gaps[dice.roll(gaps.len())];
            let before = seen(&book);
            moves.push(step(&mut book, &mut dice, now, n));
            for broke in broken(&book, &before) {
                let number = broke[..4].to_owned();
                let tail = moves[n.saturating_sub(6)..].join(" ");
                first.entry(number).or_insert_with(|| {
                    format!("seed {seed} move {n}: {broke}; last moves: {tail}")
                });
            }
        }
    }
    assert!(first.is_empty(), "{first:#?}");
}
