import { test } from "node:test";
import assert from "node:assert/strict";
import type { IslandEvent, Session } from "@agent-hud/protocol";
import {
  entryTitle,
  REPLY_BADGE,
  type ApprovalEntry,
} from "../src/permissions/approval-list.ts";

const event = (prompt?: string): IslandEvent => ({
  id: "e",
  kind: "completion",
  at: "2026-11-05T12:09:47Z",
  source: "hermes",
  title: "2026/10/27 更新万象AI实验室",
  prompt,
});
const session = { title: "2026/10/27 更新万象AI实验室" } as Session;
const reply = (prompt?: string): ApprovalEntry => ({
  kind: "reply" as const,
  id: "e",
  at: "2026-11-05T12:09:47Z",
  badge: REPLY_BADGE,
  event: event(prompt),
  session,
});

test("a Hermes reply is titled by what was asked, not the chat's first topic", () => {
  assert.equal(
    entryTitle(reply("你好，说个笑话"), "有新回复"),
    "你好，说个笑话",
  );
});

test("without the words asked, the session's title stays", () => {
  assert.equal(entryTitle(reply(), "有新回复"), "2026/10/27 更新万象AI实验室");
});
