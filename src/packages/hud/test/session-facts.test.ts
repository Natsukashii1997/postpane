// What the mark director sees of a session 「待核对」 (ADR-0001, #354).
import { test } from "node:test";
import assert from "node:assert/strict";
import { factsOf } from "../src/bots/session-facts.ts";
import { scene } from "./scenes/scenes.ts";

const codex = (id: string) =>
  scene("codex-stale").snapshot.sessions.find((s) => s.id === id)!;

test("待核对的会话交给小人时是空闲、不带请求，不让小人来找你", () => {
  const facts = factsOf(codex("x-stale"), []);
  assert.equal(facts.phase, "idle");
  assert.deepEqual(facts.requests, []);
});

test("没过半小时的提问照常算等你、带着请求", () => {
  const facts = factsOf(codex("x-fresh"), []);
  assert.equal(facts.phase, "waiting");
  assert.equal(facts.requests.length, 1);
});

test("待核对的会话有审批卡时，卡就是证据：仍是等你", () => {
  const card = {
    id: "card",
    sessionId: "x-stale",
    kind: "question" as const,
    at: 0,
  };
  const facts = factsOf(codex("x-stale"), [card]);
  assert.equal(facts.phase, "waiting");
  assert.ok(facts.requests.some((r) => r.id === "card"));
});
