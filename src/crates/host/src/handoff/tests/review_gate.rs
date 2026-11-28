//! The review gate (#347): a pass held to the pull request's commit, chains,
//! risk levels, caps and the person's leave.
use super::*;

// T1
#[test]
fn the_review_cap_is_set_from_one_to_nine_five_unless_set() {
    let temp = tempfile::tempdir().unwrap();
    let desk = Desk::new(Some(temp.path().join("data")));
    assert_eq!(desk.review_limit(), 5);
    assert_eq!(desk.set_review_limit(9), Ok(9));
    assert_eq!(desk.review_limit(), 9);
    assert!(desk.set_review_limit(10).is_err() && desk.set_review_limit(0).is_err());
    assert_eq!(desk.review_limit(), 9, "a refused cap leaves the one set");
}

/// #347: a pass ends the handoff only while the commit reviewed is the
/// pull request's still; the person hears of it either way.
#[test]
fn a_pass_holds_only_for_the_pull_requests_current_commit() {
    const HEAD: &str = "0123456789abcdef0123456789abcdef01234567";
    let pass = "全部关闭\n受审版本：0123456\n未决：P0 0，P1 0\n审查出口：通过\n结论：通过";
    let cases = [
        (Ok(HEAD.to_owned()), "closed"),
        (
            Ok("fedcba9876543210fedcba9876543210fedcba98".to_owned()),
            "open",
        ),
        (Err("网络断了".to_owned()), "open"),
    ];
    for (head, status) in cases {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        let started = desk.start_ruled(
            &lines,
            "s1",
            Some("/w"),
            "修登录",
            None,
            &format!("{PR}\nhead_sha {HEAD}\n改动"),
            false,
            &Rule {
                risk: Some("L2".into()),
                ..Rule::default()
            },
            1,
        );
        let Ok(Started::Opening { handoff, project }) = started else {
            panic!()
        };
        desk.open(&lines, &handoff.id, "改动", project.as_deref(), || 1)
            .unwrap();
        let pr = desk.lock().get(&handoff.id).unwrap().pr.clone().unwrap();
        lines.heads.borrow_mut().insert(pr, head.clone());
        desk.observe(&turn("complete", pass), 3);
        assert!(desk.drive(&lines, 4));
        let kept = desk.lock().get(&handoff.id).cloned().unwrap();
        assert_eq!(desk.projection(4)[0]["status"], status, "{head:?}");
        let said = last_reply_to_claude(&lines);
        if status == "closed" {
            assert_eq!(kept.gate.notice, Some(book::Notice::Passed));
        } else {
            // Words that say it did not pass, none that it did (L3 P1-09).
            assert!(
                said.contains("驿窗没有放行") && !said.contains("驿窗已结束这次接力"),
                "{said}"
            );
            if head.is_ok() {
                // Moved on: the current commit sent again goes on
                // (Fable review #8), the round trip not stopped.
                let moved = said.contains("现在是") || said.contains("is at");
                assert!(moved && said.contains("自动往返没有停"), "{said}");
                assert!(kept.auto && kept.halt.is_none());
            } else {
                let halt = kept.halt.unwrap();
                assert!(
                    halt.contains("版本待核") || halt.contains("unverified"),
                    "{halt}"
                );
            }
        }
    }
}

/// Fable review #8: a pass of another commit than the one sent goes back
/// for the current one to be sent again; the round trip goes on.
#[test]
fn a_pass_of_another_commit_goes_back_to_be_sent_again() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let Started::Opening { handoff, .. } = ruled(&desk, &lines, "s1", "L2", None, 1).unwrap()
    else {
        panic!()
    };
    desk.observe(&turn("complete", &PASS.replace("0123456", "fedcba9")), 3);
    assert!(desk.drive(&lines, 4));
    let kept = desk.lock().get(&handoff.id).cloned().unwrap();
    assert_eq!((kept.phase, kept.auto), (Phase::Returned, true));
    assert!(kept.halt.is_none() && kept.gate.notice.is_none());
    let said = last_reply_to_claude(&lines);
    assert!(
        said.contains("对不上") && said.contains("自动往返没有停"),
        "{said}"
    );
}

/// #347 review P1-01, P1-02: a pass waiting across a restart is checked
/// against its pull request first; a pull request without the commit
/// under review is not sent.
#[test]
fn a_pass_across_a_restart_is_checked_and_a_pr_needs_its_commit() {
    let (temp, desk) = desk();
    let lines = Fake::default();
    let rule = Rule {
        risk: Some("L2".into()),
        ..Rule::default()
    };
    let refused = desk.start_ruled(&lines, "s1", None, "t", None, PR, false, &rule, 1);
    assert!(refused.unwrap_err().contains("head"));
    let id = match ruled(&desk, &lines, "s1", "L2", None, 1).unwrap() {
        Started::Opening { handoff, .. } | Started::Sent { handoff, .. } => handoff.id,
    };
    desk.observe(
        &turn("complete", "受审版本：0123456\n审查出口：通过\n结论：通过"),
        3,
    );
    // The app stops before the round trip took it up; the pull request moved on.
    let data = desk.data.clone().unwrap();
    drop(desk);
    let desk = Desk::new(Some(data));
    assert_eq!(
        desk.lock().get(&id).unwrap().status,
        Status::Open,
        "not ended unchecked"
    );
    lines.heads.borrow_mut().insert(
        "natsukashii1997/dt-sandbox#4".into(),
        Ok("fedcba9876543210fedcba9876543210fedcba98".into()),
    );
    assert!(desk.catch_up(&lines, 5));
    let kept = desk.lock().get(&id).cloned().unwrap();
    assert!(kept.live() && kept.gate.notice.is_none());
    assert_eq!(
        (kept.phase, kept.auto),
        (Phase::Returned, true),
        "sent back to resend"
    );
    drop(temp);
}

/// #347: a chain named must be known; the cap reached is noted for
/// the person; every answer is kept in full.
#[test]
fn an_unknown_chain_is_refused_and_the_top_is_noted() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let rule = Rule {
        risk: Some("L2".into()),
        chain: Some("r-nope".into()),
        ..Rule::default()
    };
    let refused = desk.start_ruled(&lines, "s1", None, "t", None, "b", false, &rule, 1);
    assert_eq!(refused.err(), Some(gate::chain_unknown("r-nope")));
    let id = match ruled(&desk, &lines, "s1", "L2", None, 1).unwrap() {
        Started::Opening { handoff, .. } => handoff.id,
        Started::Sent { handoff, .. } => handoff.id,
    };
    for (n, at) in [(1, 3), (2, 6)] {
        if n == 2 {
            ruled(&desk, &lines, "s1", "L2", None, 5).unwrap();
        }
        desk.observe(&json!({"type":"turn","phase":"complete","conversation":"c-new","prompt":asked(),"reply":format!("第 {n} 轮\n受审版本：0123456\n审查出口：返修\n结论：需修改"),"messageId":format!("m{n}")}), at);
        desk.drive(&lines, at + 1);
    }
    let kept = desk.lock().get(&id).cloned().unwrap();
    assert_eq!(kept.gate.notice, Some(book::Notice::Top));
    let kept_dir = desk
        .data
        .as_deref()
        .unwrap()
        .join("chatgpt")
        .join("replies");
    assert_eq!(std::fs::read_dir(kept_dir).unwrap().count(), 2);
}

#[test]
fn an_engineering_review_takes_l1_to_l3_and_refuses_l0() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    assert_eq!(
        ruled(&desk, &lines, "s1", "L0", None, 1).err(),
        Some(l0_refused())
    );
    assert_eq!(
        ruled(&desk, &lines, "s1", "L4", None, 1).err(),
        Some(bad_risk("L4"))
    );
    assert!(desk.lock().list.is_empty(), "nothing began");
    // A 思维评审 takes no risk level, so none refuses it.
    let rule = Rule {
        risk: Some("L0".into()),
        extra: None,
        ..Rule::default()
    };
    assert!(desk
        .start_ruled(
            &lines,
            "s2",
            None,
            "思维评审｜x｜y",
            None,
            "b",
            false,
            &rule,
            1
        )
        .is_ok());
    ruled(&desk, &lines, "s1", "l2", None, 1).unwrap();
    let shown = desk.projection(2);
    let ruled = shown
        .as_array()
        .unwrap()
        .iter()
        .find(|h| h["claudeSession"] == "s1")
        .unwrap();
    assert_eq!(ruled["risk"], "L2");
    assert_eq!(ruled["pr"], "natsukashii1997/dt-sandbox#4");
}

#[test]
fn an_l1_revise_goes_back_to_be_fixed_and_reviewed_again() {
    // #347: an L1 with a blocking point is fixed, then reviewed again;
    // only the points left to P2/P3 pass with suggestions.
    let (_temp, desk) = desk();
    let lines = Fake::default();
    ruled(&desk, &lines, "s1", "L1", None, 1).unwrap();
    desk.observe(
        &turn(
            "complete",
            "1. P1 漏了回滚\n受审版本：0123456\n审查出口：返修\n结论：需修改",
        ),
        3,
    );
    assert!(desk.drive(&lines, 4));
    let said = last_reply_to_claude(&lines);
    assert!(
        !said.contains("补改未复审") && said.contains("复审"),
        "{said}"
    );
    let shown = desk.projection(4);
    assert_eq!(
        (shown[0]["status"].as_str(), shown[0]["auto"].as_bool()),
        (Some("open"), Some(true))
    );
    assert_eq!(replies(&lines), 1);
}

/// L3 round 2, P1-02: a pull request first named in a later brief binds
/// the handoff, needs its commit, and a pass is checked against it.
#[test]
fn a_pull_request_named_later_binds_the_review_to_its_commit() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    engineering(&desk, &lines, "s1", "/w", "改动（还没开 PR）", 1).unwrap();
    desk.observe(&turn("complete", FIX), 3);
    desk.drive(&lines, 4);
    let refused = engineering(&desk, &lines, "s1", "/w", &format!("{PR}\n改好了"), 5);
    assert!(refused.unwrap_err().contains("no full commit under review"));
    let Started::Sent { handoff, .. } = engineering(
        &desk,
        &lines,
        "s1",
        "/w",
        &format!("{PR}\nhead_sha {HEAD}\n改好了"),
        6,
    )
    .unwrap() else {
        panic!("it goes into the open conversation");
    };
    let kept = desk.lock().get(&handoff.id).cloned().unwrap();
    assert_eq!(
        (kept.pr.as_deref(), kept.gate.head.as_deref()),
        (Some(PR_KEY), Some(HEAD))
    );
    lines
        .heads
        .borrow_mut()
        .insert(PR_KEY.into(), Ok(MOVED.into()));
    desk.observe(&json!({"type":"turn","phase":"complete","conversation":"c-new","prompt":asked(),"reply":PASS,"messageId":"m2"}), 7);
    desk.drive(&lines, 8);
    assert_eq!(status(&desk, 8), ("open".to_owned(), None));
    let said = last_reply_to_claude(&lines);
    assert!(
        said.contains("驿窗没有放行") && !said.contains("驿窗已结束这次接力"),
        "{said}"
    );
}

/// P1-01: a review of a pull request kept with no commit (from before
/// the gate) does not pass, after a restart too.
#[test]
fn a_review_kept_with_no_commit_does_not_pass_after_a_restart() {
    let (temp, desk) = desk();
    let lines = Fake::default();
    let Started::Opening { handoff, .. } =
        engineering(&desk, &lines, "s1", "/w", "改动", 1).unwrap()
    else {
        panic!()
    };
    desk.change(|book| book.set_pr(&handoff.id, PR_KEY));
    desk.observe(&turn("complete", PASS), 3);
    drop(desk);
    let desk = Desk::new(Some(temp.path().join("data")));
    lines
        .heads
        .borrow_mut()
        .insert(PR_KEY.into(), Ok(HEAD.into()));
    desk.drive(&lines, 4);
    assert_eq!(status(&desk, 4), ("open".to_owned(), None));
    assert!(last_reply_to_claude(&lines).contains(&guard::no_anchor(PR_KEY)));
}

/// P1-09: the person's 「转回 Claude」 on a pass is checked as the auto
/// round trip's is, and ends it only when the commit holds.
#[test]
fn a_pass_sent_back_by_hand_is_checked_against_the_commit() {
    for (head, ended) in [(MOVED, false), (HEAD, true)] {
        let (_temp, desk) = desk();
        let lines = Fake::default();
        let Started::Opening { handoff, .. } = ruled(&desk, &lines, "s1", "L2", None, 1).unwrap()
        else {
            panic!()
        };
        lines
            .heads
            .borrow_mut()
            .insert(PR_KEY.into(), Ok(head.into()));
        desk.observe(&turn("complete", PASS), 3);
        assert_eq!(desk.act(&lines, &handoff.id, "back", 4), Ok(Acted::Done));
        let said = last_reply_to_claude(&lines);
        assert_eq!(said.contains("驿窗没有放行"), !ended, "{said}");
        assert_eq!(said.contains("驿窗已结束这次接力"), ended, "{said}");
        let (status, notice) = status(&desk, 4);
        assert_eq!(status == "closed", ended);
        assert_eq!(notice.as_deref() == Some("passed"), ended);
    }
}

/// P1-04: a chain is taken over only once its review with ChatGPT is
/// answered and counted.
#[test]
fn a_chain_is_taken_over_only_once_its_review_is_answered() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    ruled(&desk, &lines, "s1", "L2", None, 1).unwrap();
    let busy = ruled(&desk, &lines, "s2", "L2", None, 2).unwrap_err();
    assert!(busy.contains("still waits on ChatGPT"), "{busy}");
    desk.observe(&turn("complete", FIX), 3);
    let Started::Opening { handoff, .. } = ruled(&desk, &lines, "s2", "L2", None, 4).unwrap()
    else {
        panic!()
    };
    assert_eq!(handoff.carried, 1, "the answer that came is counted");
}

/// P1-08: a cap reached in a session or working directory and not
/// settled lets no new review begin there without the person's word,
/// whatever chain or pull request it names.
#[test]
fn a_cap_reached_here_lets_no_new_review_begin_without_the_persons_word() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    ruled(&desk, &lines, "s1", "L2", None, 1).unwrap();
    desk.observe(&turn("complete", FIX), 3);
    desk.drive(&lines, 4);
    ruled(&desk, &lines, "s1", "L2", None, 5).unwrap();
    desk.observe(&json!({"type":"turn","phase":"complete","conversation":"c-new","prompt":asked(),"reply":FIX,"messageId":"m2"}), 6);
    desk.drive(&lines, 7);
    assert_eq!(status(&desk, 7).1.as_deref(), Some("top"));
    // No chain, no pull request: refused in the same directory and session.
    for (session, cwd) in [("s9", "/w"), ("s1", "/elsewhere")] {
        let refused = desk.start_ruled(
            &lines,
            session,
            Some(cwd),
            "修登录",
            None,
            "另一件事",
            true,
            &Rule::default(),
            8,
        );
        assert!(
            refused.unwrap_err().contains("reached its cap"),
            "{session} {cwd}"
        );
    }
    // Elsewhere it goes: a trust boundary, written as one.
    assert!(engineering(&desk, &lines, "s8", "/other", "另一件事", 8).is_ok());
    // With the person's word it goes, and the cap is settled here.
    *lines.opener.borrow_mut() = Some((Opener::Person, 8));
    assert!(engineering(&desk, &lines, "s9", "/w", "另一件事", 9).is_ok());
    *lines.opener.borrow_mut() = None;
    assert!(engineering(&desk, &lines, "s10", "/w", "第三件事", 10).is_ok());
}

/// P2-06: evidence a review paused for never goes past the cap as set now.
#[test]
fn evidence_never_goes_past_a_cap_lowered_meanwhile() {
    let (temp, desk) = desk();
    let lines = Fake::default();
    ruled(&desk, &lines, "s1", "L1", None, 1).unwrap();
    desk.observe(
        &turn(
            "complete",
            "缺复现日志\n受审版本：0123456\n审查出口：证据不足暂停\n结论：需修改",
        ),
        3,
    );
    desk.drive(&lines, 4);
    book::set_review_limit(&temp.path().join("data"), 1).unwrap();
    assert_eq!(
        ruled(&desk, &lines, "s1", "L1", None, 5).err(),
        Some(budget_spent(1))
    );
}

/// L3 special review, P1-04: a handoff whose opening failed and may
/// still come late is let go when its chain is taken over.
#[test]
fn a_failed_opening_coming_late_does_not_revive_a_chain_taken_over() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let failing = Fake {
        open_fails: true,
        ..Fake::default()
    };
    lines
        .heads
        .borrow_mut()
        .insert(PR_KEY.into(), Ok(HEAD.into()));
    let brief = format!("{PR}\nhead_sha {HEAD}\n改动");
    let rule = Rule {
        risk: Some("L2".into()),
        ..Rule::default()
    };
    let Started::Opening { handoff: a, .. } = desk
        .start_ruled(
            &failing,
            "s1",
            Some("/w"),
            "修登录",
            None,
            &brief,
            false,
            &rule,
            1,
        )
        .unwrap()
    else {
        panic!()
    };
    assert!(desk.open(&failing, &a.id, &brief, None, || 2).is_err());
    ruled(&desk, &lines, "s2", "L2", None, 3).unwrap();
    assert!(!desk.observe(
        &json!({"type":"opened","requestId":format!("{}~0", a.id),"ok":true,"conversation":"c-late"}),
        4
    ));
    let live = desk.lock().list.iter().filter(|h| h.live()).count();
    assert_eq!(live, 1, "one handoff counts the chain");
}

/// P2-08: a pull request and commit named by a call that is refused, or
/// whose words do not go, are not kept.
#[test]
fn a_refused_or_unsent_review_keeps_the_commit_it_had() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let Started::Opening { handoff, .. } = ruled(&desk, &lines, "s1", "L2", None, 1).unwrap()
    else {
        panic!()
    };
    desk.observe(&turn("complete", FIX), 3);
    desk.drive(&lines, 4);
    let other = format!(
        "PR：https://github.com/Natsukashii1997/dt-sandbox/pull/5\nhead_sha {MOVED}\n改好了"
    );
    let rule = Rule {
        risk: Some("L2".into()),
        ..Rule::default()
    };
    let kept = || {
        let h = desk.lock().get(&handoff.id).cloned().unwrap();
        (h.pr, h.gate.head)
    };
    let before = kept();
    lines.send_fails.set(true);
    let unsent = desk.start_ruled(
        &lines,
        "s1",
        Some("/w"),
        "修登录",
        None,
        &other,
        false,
        &rule,
        5,
    );
    assert!(unsent.is_err());
    assert_eq!(kept(), before, "words that did not go");
    lines.send_fails.set(false);
    // Other words wait on words never known to have gone in (L3 P1-10);
    // the answer to those counts.
    let sends = lines.sent.borrow().len();
    assert_eq!(
        ruled(&desk, &lines, "s1", "L2", None, 6).err(),
        Some(guard::still_waiting())
    );
    assert_eq!(lines.sent.borrow().len(), sends);
    desk.observe(&json!({"type":"turn","phase":"complete","conversation":"c-new","prompt":asked(),"reply":FIX,"messageId":"m2"}), 7);
    desk.drive(&lines, 8);
    let refused = desk.start_ruled(
        &lines,
        "s1",
        Some("/w"),
        "修登录",
        None,
        &other,
        false,
        &rule,
        9,
    );
    assert_eq!(refused.err(), Some(budget_spent(2)));
    assert_eq!(kept(), before, "a refusal");
}

/// P2-09: the person's 「转回 Claude」 on a pass that another send holds
/// says it did not go.
#[test]
fn a_pass_sent_back_by_hand_while_another_send_holds_it_says_so() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    let Started::Opening { handoff, .. } = ruled(&desk, &lines, "s1", "L2", None, 1).unwrap()
    else {
        panic!()
    };
    desk.observe(&turn("complete", PASS), 3);
    let busy = desk.claim(&handoff.id).unwrap();
    assert_eq!(
        desk.act(&lines, &handoff.id, "back", 4),
        Err(guard::back_not_done())
    );
    drop(busy);
    assert_eq!(desk.act(&lines, &handoff.id, "back", 5), Ok(Acted::Done));
    assert_eq!(status(&desk, 5).0, "closed");
}

/// L3 P1-10: a review sent and not known to have gone in when the app
/// restarted counts its answer, which cannot pass.
#[test]
fn a_review_unconfirmed_at_a_restart_counts_and_cannot_pass() {
    let (temp, desk) = desk();
    let lines = Fake::default();
    let Started::Opening { handoff, .. } =
        engineering(&desk, &lines, "s1", "/w", "改动（还没开 PR）", 1).unwrap()
    else {
        panic!()
    };
    desk.observe(&turn("complete", FIX), 3);
    desk.drive(&lines, 4);
    // Sent with pull request B, no word of it before the restart.
    lines.send_fails.set(true);
    let brief = format!("{PR}\nhead_sha {MOVED}\n改好了");
    assert!(engineering(&desk, &lines, "s1", "/w", &brief, 5).is_err());
    let pending = desk.lock().get(&handoff.id).unwrap().gate.pending.clone();
    assert_eq!(pending.unwrap().head.as_deref(), Some(MOVED));
    drop(desk);
    let desk = Desk::new(Some(temp.path().join("data")));
    lines
        .heads
        .borrow_mut()
        .insert(PR_KEY.into(), Ok(MOVED.into()));
    let pass = PASS.replace("0123456", "fedcba9");
    desk.observe(&json!({"type":"turn","phase":"complete","conversation":"c-new","prompt":asked(),"reply":pass,"messageId":"m2"}), 7);
    desk.drive(&lines, 8);
    let kept = desk.lock().get(&handoff.id).cloned().unwrap();
    assert_eq!(kept.counted(), 2, "the answer counts");
    assert_eq!(status(&desk, 8), ("open".to_owned(), None));
    assert!(last_reply_to_claude(&lines).contains(&guard::unconfirmed()));
}

#[test]
fn a_review_past_its_budget_goes_only_with_the_persons_leave() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    ruled(&desk, &lines, "s1", "L2", None, 1).unwrap();
    desk.observe(
        &turn(
            "complete",
            "1. 原子写入\n受审版本：0123456\n审查出口：返修\n结论：需修改",
        ),
        3,
    );
    desk.drive(&lines, 4);
    assert!(last_reply_to_claude(&lines).contains("最后一轮"));
    ruled(&desk, &lines, "s1", "L2", None, 5).unwrap();
    desk.observe(
        &json!({"type":"turn","phase":"complete","conversation":"c-new","reply":"还差\n受审版本：0123456\n审查出口：返修\n结论：需修改","messageId":"m2","prompt":asked()}),
        6,
    );
    desk.drive(&lines, 7);
    assert_eq!(desk.projection(7)[0]["halt"], at_limit(2, Sent::Back));
    // A third review (#60) needs the person's leave.
    assert_eq!(
        ruled(&desk, &lines, "s1", "L2", None, 8).err(),
        Some(budget_spent(2))
    );
    // The agent's own word is no leave (P1-06): not told who began the
    // turn, the words PostPane sent back, or a turn begun before them.
    let sends = lines.sent.borrow().len();
    let back = last_reply_to_claude(&lines);
    for turn in [
        None,
        Some((Opener::Plugin(back), 8)),
        Some((Opener::Person, 6)),
    ] {
        *lines.opener.borrow_mut() = turn;
        assert_eq!(
            ruled(&desk, &lines, "s1", "L2", Some("常浩要求再审一次"), 9).err(),
            Some(leave_unheard())
        );
    }
    assert_eq!(lines.sent.borrow().len(), sends);
    // Words from outside after them are: the person's, or another
    // agent's in their name.
    *lines.opener.borrow_mut() = Some((Opener::Plugin("常浩：再审一次".into()), 8));
    let Started::Sent { handoff, .. } =
        ruled(&desk, &lines, "s1", "L2", Some("常浩要求再审一次"), 9).unwrap()
    else {
        panic!("it goes into the open conversation");
    };
    assert_eq!(lines.sent.borrow().len(), sends + 1);
    assert_eq!((handoff.extra, handoff.auto), (1, true));
    assert_eq!(handoff.counted(), 0, "a new leave counts from one");
    assert_eq!(lines.opener_asked.borrow().last().unwrap(), "claude|s1");
}

#[test]
fn a_follow_up_from_another_session_counts_on_from_the_first() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    ruled(&desk, &lines, "s1", "L2", None, 1).unwrap();
    desk.observe(
        &turn(
            "complete",
            "1. 原子写入\n受审版本：0123456\n审查出口：返修\n结论：需修改",
        ),
        3,
    );
    // Round 2 from another Claude session (SBX-8): a new handoff that
    // carries round 1.
    let Started::Opening { handoff, .. } = ruled(&desk, &lines, "s2", "L2", None, 4).unwrap()
    else {
        panic!("another session opens its own");
    };
    assert_eq!(handoff.carried, 1);
    // The new conversation opens with PostPane's note on it, as kept:
    // it went with the words, not only into the record (#356 merge).
    let opening = asked().unwrap();
    assert!(opening.contains("【驿窗附注】"), "{opening}");
    desk.observe(
        &json!({"type":"turn","phase":"complete","conversation":"c-new","reply":"还差\n受审版本：0123456\n审查出口：返修\n结论：需修改","messageId":"m2","prompt":asked()}),
        5,
    );
    desk.drive(&lines, 6);
    let id = handoff.id.clone();
    let kept = desk.lock().get(&id).cloned().unwrap();
    assert_eq!(kept.halt.as_deref(), Some(at_limit(2, Sent::Back).as_str()));
    // The first session going on with its own handoff sees round 2.
    assert_eq!(
        ruled(&desk, &lines, "s1", "L2", None, 7).err(),
        Some(budget_spent(2))
    );
    // A third session gets nothing more without leave.
    assert_eq!(
        ruled(&desk, &lines, "s3", "L2", None, 7).err(),
        Some(budget_spent(2))
    );
    // Leave for a new handoff is heard since the chain last went back.
    let back = last_reply_to_claude(&lines);
    for turn in [
        None,
        Some((Opener::Plugin(back), 8)),
        Some((Opener::Person, 5)),
    ] {
        *lines.opener.borrow_mut() = turn;
        assert_eq!(
            ruled(&desk, &lines, "s3", "L2", Some("常浩授权"), 8).err(),
            Some(leave_unheard())
        );
    }
    // A Codex thread's leave is read from its own turn (#283).
    *lines.opener.borrow_mut() = None;
    let codex = Rule {
        risk: Some("L2".into()),
        extra: Some("常浩授权".into()),
        doer: Some(CODEX.into()),
        ..Rule::default()
    };
    let brief = format!("{PR}\nhead_sha {HEAD}\n改动");
    let refused = desk.start_ruled(&lines, "t9", None, "t", None, &brief, false, &codex, 9);
    assert_eq!(refused.err(), Some(leave_unheard()));
    assert_eq!(lines.opener_asked.borrow().last().unwrap(), "codex|t9");
    *lines.opener.borrow_mut() = Some((Opener::Person, 8));
    let Started::Opening { handoff, .. } =
        ruled(&desk, &lines, "s3", "L2", Some("常浩授权"), 8).unwrap()
    else {
        panic!("a third session opens its own");
    };
    assert_eq!((handoff.extra, handoff.counted()), (1, 0));
    assert_eq!(lines.opener_asked.borrow().last().unwrap(), "claude|s3");
}

#[test]
fn an_engineering_review_short_of_evidence_pauses_then_goes_again() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    ruled(&desk, &lines, "s1", "L1", None, 1).unwrap();
    desk.observe(
        &turn(
            "complete",
            "缺复现日志\n受审版本：0123456\n审查出口：证据不足暂停\n结论：需修改",
        ),
        3,
    );
    assert!(desk.drive(&lines, 4));
    assert!(last_reply_to_claude(&lines).contains("证据不足"));
    assert_eq!(desk.projection(4)[0]["auto"], false);
    // The evidence goes without leave, and the auto round trip is on again.
    let Started::Sent { handoff, .. } = ruled(&desk, &lines, "s1", "L1", None, 5).unwrap() else {
        panic!("it goes into the open conversation");
    };
    assert!(handoff.auto);
    assert_eq!(handoff.counted(), 1, "the paused review counts (#347)");
    // A way out that does not go with its verdict stops it.
    desk.observe(
        &json!({"type":"turn","phase":"complete","conversation":"c-new","reply":"受审版本：0123456\n审查出口：通过\n结论：需修改","messageId":"m2","prompt":asked()}),
        6,
    );
    mend(
        &desk,
        &lines,
        "受审版本：0123456\n审查出口：通过\n结论：需修改",
        6,
    );
    assert!(desk.drive(&lines, 7));
    assert_eq!(
        desk.projection(7)[0]["halt"],
        bad_review_tail(Flaw::Mismatch, Sent::Back)
    );
    let text = last_reply_to_claude(&lines);
    assert!(text.contains("审查出口与结论对不上") && text.contains("交常浩决定"));
}

/// #587 review P1-01: a chain past its cap, going on at the person's word,
/// does not carry another cap reached here since and ended only by an agent:
/// that one needs the person's word after it too.
#[test]
fn leave_for_one_capped_chain_does_not_settle_another_capped_here() {
    let (_temp, desk) = desk();
    let lines = Fake::default();
    // Chain B, here in /w, reaches its cap at 7.
    ruled(&desk, &lines, "s1", "L2", None, 1).unwrap();
    desk.observe(&turn("complete", FIX), 3);
    desk.drive(&lines, 4);
    ruled(&desk, &lines, "s1", "L2", None, 5).unwrap();
    desk.observe(&reply_as(asked(), FIX, "m2"), 6);
    desk.drive(&lines, 7);
    assert_eq!(status(&desk, 7).1.as_deref(), Some("top"));
    // Another review A, in /w too, reaches its cap at 10, its answer back.
    let a = desk.change(|book| {
        let a = book.begin("s2", Some("/w"), "修首页", None, "改动", 8);
        book.opened(&a.id, "c-a", 8);
        book.replied("c-a", FIX, Some("m-a"), 9);
        let prompt = book.get(&a.id).unwrap().prompt_for(StepKind::Back);
        book.returned(&a.id, StepKind::Back, "到顶了", &prompt, true, 10);
        book.note(&a.id, book::Notice::Top, 10);
        a.id
    });
    // An agent ends A on its own: no cap of A settled.
    let ended = desk
        .end_asked(&lines, CLAUDE, "s3", &[a.clone()], "清掉", 11)
        .unwrap();
    assert_eq!(ended["byPerson"], false);
    // B goes on from another session in /w, a new handoff on its pull
    // request: the person spoke after B went back, before A did — B's
    // leave only.
    *lines.opener.borrow_mut() = Some((Opener::Person, 9));
    let refused = ruled(&desk, &lines, "s4", "L2", Some("常浩授权继续"), 12);
    assert!(
        refused
            .as_ref()
            .is_err_and(|e| e.contains("reached its cap")),
        "{:?}",
        refused.err()
    );
    // Once the person speaks after A went back, B goes on.
    *lines.opener.borrow_mut() = Some((Opener::Person, 11));
    assert!(ruled(&desk, &lines, "s4", "L2", Some("常浩授权继续"), 13).is_ok());
}
