import { test } from "node:test";
import assert from "node:assert/strict";
import type { Handoff, Session } from "@agent-hud/protocol";
import { groupRelays, relaySiblings } from "../src/relay-groups.ts";

// #427 (owner chose 甲, 2026-11-19): one list of open relays, in three
// groups — 要你管, 在动, 静着 — the latest moved first in each.

const now = Date.parse("2026-11-19T12:00:00Z");
const min = 60_000;

const relay = (id: string, over: Partial<Handoff> = {}): Handoff => ({
  id,
  title: id,
  claudeSession: `s-${id}`,
  chatgptConversation: `c-${id}`,
  status: "open",
  createdAt: now - 300 * min,
  updatedAt: now - 10 * min,
  rounds: 1,
  phase: "working",
  phaseAt: now - 10 * min,
  steps: [{ at: now - 20 * min, kind: "ask" }],
  ...over,
});

const running = (id: string) =>
  ({ id, source: "claude", title: id, state: "running" }) as unknown as Session;

test("relays that wait on the person come first, then those under way, then the quiet", () => {
  const relays = [
    relay("working", { phaseAt: now - 5 * min }),
    relay("quiet", { phase: "returned", phaseAt: now - 5 * 60 * min }),
    relay("paused", {
      auto: false,
      halt: "30 分钟没回信",
      phaseAt: now - 3 * 60 * min,
    }),
    relay("returned", { phase: "returned", phaseAt: now - 30 * min }),
    relay("unsent", { phase: "failed", phaseAt: now - 50 * min }),
    relay("replied", {
      phase: "replied",
      auto: false,
      phaseAt: now - 40 * min,
    }),
    relay("stopped", {
      phase: "replied",
      notice: "top",
      topAt: now - 6 * 60 * min,
      phaseAt: now - 6 * 60 * min,
      steps: [{ at: now - 7 * 60 * min, kind: "ask" }],
    }),
    relay("closed", { status: "closed", phase: "ended" }),
  ];
  const grouped = groupRelays(relays, [], now);
  assert.deepEqual(
    grouped.map((entry) => [entry.handoff.id, entry.group]),
    [
      ["replied", "need"],
      ["unsent", "need"],
      ["paused", "need"],
      ["stopped", "need"],
      ["working", "move"],
      ["returned", "move"],
      ["quiet", "quiet"],
    ],
  );
});

test("a reply the auto round trip takes back by itself is under way, not the person's", () => {
  const [entry] = groupRelays(
    [relay("auto", { phase: "replied", auto: true })],
    [],
    now,
  );
  assert.equal(entry.group, "move");
});

test("a relay still for two hours stays under way while its doer's session runs", () => {
  const still = relay("still", {
    phase: "returned",
    phaseAt: now - 3 * 60 * min,
  });
  assert.equal(groupRelays([still], [], now)[0].group, "quiet");
  assert.equal(
    groupRelays([still], [running("s-still")], now)[0].group,
    "move",
  );
});

test("the handoff card steps through the list it was opened from, in the same order", () => {
  const relays = [
    relay("a", { phaseAt: now - 5 * min }),
    relay("b", { phase: "failed", phaseAt: now - 9 * min }),
    relay("c", { doer: "codex", phaseAt: now - 7 * min }),
  ];
  // Opened from ChatGPT's card: every relay it reviews.
  assert.deepEqual(
    relaySiblings(relays, [], now, relays[0], ["a", "b", "c"]).map(
      (entry) => entry.handoff.id,
    ),
    ["b", "a", "c"],
  );
  // Opened with no list (a Claude session's 「接力」 tag): its doer's relays.
  assert.deepEqual(
    relaySiblings(relays, [], now, relays[0]).map((entry) => entry.handoff.id),
    ["b", "a"],
  );
  assert.deepEqual(
    relaySiblings(relays, [], now, relays[2]).map((entry) => entry.handoff.id),
    ["c"],
  );
});

// The card side (#427): ChatGPT's 「等待处理」 gets the person's relays,
// 「正在进行」 those under way and the quiet; the handoff card steps through
// them. Components are checked by their source, as relay-toggle.test.ts.
import { readFileSync } from "node:fs";
import { splitRelays } from "../src/relay-groups.ts";
import { scene } from "./scenes/scenes.ts";

const read = (path: string) =>
  readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

test("nine relays split into the card's two sections, five and four", () => {
  const { snapshot } = scene("chatgpt-nine-relays");
  const { waiting, running } = splitRelays(
    groupRelays(
      snapshot.handoffs,
      snapshot.sessions,
      Date.parse(snapshot.generatedAt),
    ),
  );
  assert.deepEqual(
    waiting.map((entry) => entry.handoff.id),
    ["n-silent", "n-top", "n-paused", "n-replied", "n-unsent"],
  );
  assert.deepEqual(
    running.map((entry) => [entry.handoff.id, entry.group]),
    [
      ["n-working", "move"],
      ["n-fix-a", "move"],
      ["n-fix-b", "move"],
      ["n-quiet", "quiet"],
    ],
  );
});

test("ChatGPT's card lists its relays in both sections; a row opens its card among them", () => {
  const sessions = read("panel/SourceSessions.tsx");
  assert.match(sessions, /relays=\{desk \? splitRelays\(/);
  const sections = read("panel/WorkSections.tsx");
  assert.match(sections, /<RelayRows/);
  const rows = read("panel/RelayRows.tsx");
  assert.match(rows, /card\.open\(entry\.handoff\.id, among\)/);
  assert.match(rows, /<RelayTag/);
  // The session row's 「接力」 tag is the same tag.
  assert.match(read("panel/SessionsSection.tsx"), /<RelayTag/);
});

test("the plane still opens the latest, among the relays it counts", () => {
  const toggle = read("alerts/RelayToggle.tsx");
  assert.match(
    toggle,
    /onClick=\{\(\) =>\s*card\.open\(\s*live\[0\]\.id,\s*live\.map\(\(handoff\) => handoff\.id\),?\s*\)\s*\}/,
  );
});

test("the handoff card steps to the previous and next relay under its head", () => {
  const card = read("alerts/HandoffCard.tsx");
  assert.match(card, /<HandoffHead[\s\S]*?\/>\s*<RelaySwitch/);
  const step = read("alerts/RelaySwitch.tsx");
  assert.match(step, /relaySiblings\(/);
  assert.match(step, /上一单/);
  assert.match(step, /下一单/);
  assert.match(step, /openHandoffCard\(/);
});
