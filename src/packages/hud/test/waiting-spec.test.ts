// 侧栏「等待处理」与「积压事项」规范版 (owner, 2026-11-28, 都按推荐): the
// first line opens, a reply too; an open reply reads its closing; the
// backlog's own stalled ring and no type tag (owner, 2026-11-28 第 3 版), its
// wait beside the title, quiet 继续 / 停止 after
// the question; and every tag takes its colour from one place.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Approval, IslandEvent, Session } from "@agent-hud/protocol";
import {
  REPLY_BADGE,
  approvalGroups,
  openEntryId,
  requestBadge,
  tagColor,
  tagTone,
  toneInk,
  type ApprovalEntry,
} from "../src/permissions/approval-list.ts";
import { plainText, replyClosing } from "../src/permissions/reply-closing.ts";
import { backlogWaited } from "../src/panel/backlog.ts";
import { replyMessage } from "../src/alerts/reply-list.ts";
import type { LiveSession } from "../src/panel/agent-board.ts";
import { paperOf, relayPaperOf } from "../src/paper.ts";

const read = (path: string) =>
  readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

const reply = (id: string, at: string): ApprovalEntry => ({
  kind: "reply",
  id,
  at,
  badge: REPLY_BADGE,
  event: { id, at, kind: "completion", source: "claude" } as IslandEvent,
});
const elsewhere = (id: string, at: string): ApprovalEntry => ({
  kind: "request",
  id,
  at,
  badge: "ASK",
  request: {
    id,
    createdAt: at,
    kind: "question",
    source: "claude",
    answersQuestion: false,
  } as Approval,
});

test("the first line as listed opens, a reply too; the one asked only in Claude stays folded", () => {
  const entries = [
    elsewhere("ask", "2026-11-28T03:00:00Z"),
    ...[1, 2, 3, 4, 5].map((n) => reply(`r${n}`, `2026-11-28T04:0${n}:00Z`)),
  ];
  const open = openEntryId(entries, null);
  assert.equal(open, "r5");
  const { groups, hidden } = approvalGroups(entries, open);
  const shown = groups.flatMap((group) => group.entries.map((e) => e.id));
  assert.deepEqual(shown, ["r5", "r4", "r3", "r2"]);
  assert.equal(hidden, 2);
  // One at a time: the line picked stays open while it is listed.
  assert.equal(openEntryId(entries, "r3"), "r3");
  assert.equal(openEntryId(entries.slice(1, 3), "r3"), "r2");
  assert.equal(openEntryId([], null), null);
});

test("an open reply prints its closing small and its next step large, without the stars", () => {
  const message = [
    "**主线**：收尾按钮框｜✅2 ▶1｜本轮：钩子去重",
    "**本次完成**：修了 wrapup-guard 的去重误拦，开了 PR #571。",
    "**当前状态**：〔等你决定〕PR 已绿，等合并。",
    "**下一步**：交 Hermes 合并 PR #571。",
  ].join("\n");
  assert.deepEqual(replyClosing(message), {
    lines: [
      { label: "主线", text: "收尾按钮框｜✅2 ▶1｜本轮：钩子去重" },
      {
        label: "本次完成",
        text: "修了 wrapup-guard 的去重误拦，开了 PR #571。",
      },
      { label: "当前状态", text: "〔等你决定〕PR 已绿，等合并。" },
    ],
    next: "交 Hermes 合并 PR #571。",
  });
  assert.deepEqual(replyClosing("Done, **all** of it."), {
    lines: [{ label: null, text: "Done, all of it." }],
    next: null,
  });
  assert.equal(plainText("**本次完成**：改好"), "本次完成：改好");
  // The reply card reads the same words, its stars gone too.
  const event = { message: "**本次完成**：改好" } as IslandEvent;
  assert.equal(replyMessage(event, undefined), "本次完成：改好");
});

test("the backlog's stalled ring is violet on dark and light paper, apart from the tags' colours", () => {
  assert.equal(paperOf(false).violet, "#c391f2");
  assert.equal(paperOf(true).violet, "#7a3fae");
  const tags = (["ask", "reply", "start", "permission"] as const).map((tone) =>
    tagColor(tone, false),
  );
  assert.ok(!tags.includes(paperOf(false).violet));
  // WAIT is gone: a backlog line carries no type tag (owner, 2026-11-28).
  assert.equal(tagTone("WAIT"), "permission");
});

test("the sidebar's REPLY tag is the open card's blue; a permission one ochre (bug, 2026-11-28)", () => {
  for (const paper of [paperOf(true), paperOf(false), relayPaperOf(false)]) {
    const tone = requestBadge({ kind: "question", badge: REPLY_BADGE }).tone;
    assert.equal(toneInk(tone, paper), paper.blue);
    assert.equal(toneInk("permission", paper), paper.ochre);
  }
  // One place gives a tag its colour: the sidebar's tag no longer picks its own.
  const compact = read("alerts/CompactAlertView.tsx");
  assert.ok(!compact.includes("askedColor"));
  assert.match(compact, /toneInk\(asked\.tone, paper\)/);
});

test("a backlog line says how long it has waited, as the waiting list writes it", () => {
  const now = Date.parse("2026-11-28T12:00:00Z");
  const at = new Date(now - (52 * 3600 + 10 * 60) * 1000).toISOString();
  const entry = {
    status: "waiting",
    approval: { createdAt: at } as Approval,
    session: { id: "s" } as Session,
  } as LiveSession;
  assert.equal(backlogWaited(entry, now, true), "52 小时 10 分");
  const quiet = {
    status: "waiting",
    approval: null,
    session: { id: "q", updatedAt: at } as Session,
  } as LiveSession;
  assert.equal(backlogWaited(quiet, now, true), "52 小时 10 分");
});

test("a backlog line is a running row's form: its stalled ring, its question, quiet 继续 / 停止", () => {
  const fold = read("panel/BacklogFold.tsx");
  assert.ok(!fold.includes("不做了"), "「不做了」 is now 「停止」");
  assert.match(
    fold,
    /tone="quiet"[\s\S]*"继续"[\s\S]*tone="quietStop"[\s\S]*"停止"/,
  );
  assert.match(fold, /tone="quietSure"/);
  // Its head in yellow, the rule grey as the other sections' (owner, 2026-11-28).
  assert.match(fold, /color=\{paper\.ochre\}/);
  assert.match(fold, /backlogWaited\(entry, now, zh\)/);
  // The mark column takes the backlog's own hourglass, never a tag.
  const row = read("panel/SessionsSection.tsx");
  assert.match(row, /backlog \? \(\s*<BacklogMark/);
  assert.ok(!/WAIT_BADGE|"WAIT"/.test(row));
  const mark = read("panel/BacklogMark.tsx");
  assert.match(mark, /hud-backlog-stall/);
});
