import { test } from "node:test";
import assert from "node:assert/strict";
import type { Handoff, IslandEvent, Session } from "@agent-hud/protocol";
import {
  OPENERS,
  composeMessage,
  defaultPurpose,
  deliveryHint,
  handoffFor,
  sendLabel,
  sentNote,
  serial,
  sheetTargets,
  switchPurpose,
} from "../src/alerts/handoff-sheet.ts";

const session = (id: string, extra: Partial<Session> = {}): Session => ({
  id,
  title: `Session ${id}`,
  source: "claude",
  model: "claude-opus-5-5",
  cwd: "/w/postpane",
  updatedAt: "2026-11-05T00:00:00Z",
  state: "idle",
  tokens: 0,
  cost: null,
  contextPercent: null,
  logPath: null,
  parentId: null,
  ...extra,
});
const reply = (source: string, sessionId: string): IslandEvent => ({
  id: `r-${sessionId}`,
  kind: "completion",
  at: "2026-11-05T01:00:00Z",
  source,
  sessionId,
  message: "改好了",
});
const handoff = (extra: Partial<Handoff> = {}): Handoff => ({
  id: "h19a2b3c4d00",
  title: "驿窗｜接力 1c",
  claudeSession: "s1",
  cwd: "/w/postpane",
  chatgptConversation: "c-1",
  status: "open",
  createdAt: 1,
  updatedAt: 2,
  rounds: 0,
  ...extra,
});

test("a reply belongs to the live handoff of its session or conversation", () => {
  const handoffs = [
    handoff({ id: "old", status: "closed" }),
    handoff({ id: "h2" }),
    handoff({
      id: "h3",
      claudeSession: "s9",
      chatgptConversation: null,
      status: "opening",
    }),
  ];
  assert.equal(handoffFor(handoffs, "claude", "s1")?.id, "h2");
  assert.equal(handoffFor(handoffs, "chatgpt", "chatgpt:c-1")?.id, "h2");
  assert.equal(handoffFor(handoffs, "claude", "s9")?.id, "h3");
  assert.equal(handoffFor(handoffs, "chatgpt", "c-1"), undefined);
  assert.equal(handoffFor(handoffs, "codex", "s1"), undefined);
  assert.equal(handoffFor(undefined, "claude", "s1"), undefined);
  assert.equal(
    handoffFor([handoff({ status: "failed" })], "claude", "s1"),
    undefined,
  );
});

test("a ChatGPT reply goes back to its Claude session, or nowhere", () => {
  const sessions = [session("s1", { title: "修登录" })];
  const [back, ...rest] = sheetTargets(
    reply("chatgpt", "chatgpt:c-1"),
    [handoff()],
    sessions,
  );
  assert.deepEqual(back, {
    kind: "claude",
    session: "s1",
    label: "修登录",
    handoffId: "h19a2b3c4d00",
  });
  assert.equal(rest.length, 0);
  assert.equal(defaultPurpose(back), "apply");
  // Without its session listed, the handoff's title names it.
  assert.deepEqual(
    sheetTargets(reply("chatgpt", "chatgpt:c-1"), [handoff()], []),
    [{ ...back, label: "驿窗｜接力 1c" }],
  );
  assert.deepEqual(
    sheetTargets(reply("chatgpt", "chatgpt:c-2"), [handoff()], sessions),
    [],
  );
});

test("a Claude reply goes to its review conversation first, and always to a new review", () => {
  const sessions = [session("s1", { title: "修登录", cwd: "/w/a" })];
  const targets = sheetTargets(reply("claude", "s1"), [handoff()], sessions);
  assert.deepEqual(
    targets.map((target) => target.kind),
    ["chatgpt", "new-review"],
  );
  assert.deepEqual(targets[1], {
    kind: "new-review",
    session: "s1",
    cwd: "/w/a",
    title: "修登录",
  });
  assert.equal(defaultPurpose(targets[0]), "review");
  assert.equal(defaultPurpose(targets[1]), "review");
  // A review still opening has no conversation to send to yet.
  assert.deepEqual(
    sheetTargets(
      reply("claude", "s1"),
      [handoff({ status: "opening", chatgptConversation: null })],
      sessions,
    ).map((target) => target.kind),
    ["new-review"],
  );
  assert.deepEqual(sheetTargets(reply("codex", "t1"), [], sessions), []);
});

test("the purpose opens the message, and changing it keeps the edits", () => {
  assert.equal(
    composeMessage("review", "diff"),
    "请审核下面这次改动，按严重程度列出问题，最后一行写「结论：通过」或「结论：需修改」。\n\ndiff",
  );
  assert.equal(
    composeMessage("apply", "意见"),
    "以下是 ChatGPT 的审核意见，请逐条处理，改完说明每条怎么处理的：\n\n意见",
  );
  assert.equal(composeMessage("plain", "原文"), "原文");
  const edited = composeMessage("review", "diff") + "\n补一句";
  assert.equal(switchPurpose(edited, "review", "plain"), "diff\n补一句");
  assert.equal(switchPurpose("diff", "plain", "apply"), OPENERS.apply + "diff");
  // An opener the reader rewrote stays; the new one goes in front.
  assert.equal(
    switchPurpose("我自己写的", "review", "apply"),
    OPENERS.apply + "我自己写的",
  );
});

test("the sheet says how the words travel, and why they would not", () => {
  const [chatgpt, fresh] = sheetTargets(
    reply("claude", "s1"),
    [handoff()],
    [session("s1")],
  );
  const [claude] = sheetTargets(
    reply("chatgpt", "chatgpt:c-1"),
    [handoff()],
    [],
  );
  assert.equal(
    deliveryHint(claude, null),
    "消息排进 Claude 会话，空闲时自动发出",
  );
  assert.equal(
    deliveryHint(chatgpt, { reachable: true }),
    "经 Chrome 插件送进 ChatGPT 会话",
  );
  assert.equal(
    deliveryHint(claude, { reachable: false, reason: "这个会话还没加载插件" }),
    "这个会话还没加载插件",
  );
  assert.equal(sendLabel(claude), "送进会话");
  assert.equal(sendLabel(chatgpt), "送进会话");
  assert.equal(sendLabel(fresh), "新建并送出");
  assert.equal(sentNote(claude), "已排进 Claude 会话，空闲时发出");
  assert.equal(sentNote(fresh), "已交给 ChatGPT，新会话正在打开");
  assert.equal(serial("h19a2b3c4d00", "x"), "NO.4D00");
  assert.equal(serial(undefined, "r-7"), "NO.00R7");
});
