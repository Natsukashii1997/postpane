import { test } from "node:test";
import assert from "node:assert/strict";
import {
  agedTags,
  agentUnder,
  narrowTagSize,
  tagFoldKey,
  tagGap,
  tagWaits,
  TAG_NARROW_MS,
} from "../src/scene/tag-fold.ts";

const reply = (source: string) =>
  ({ id: "e1", kind: "completion", source }) as never;

test("a request always waits, so it folds into a narrow slip", () => {
  assert.equal(tagWaits({ id: "r1", request: {} }, new Set()), true);
});

test("a Hermes or ChatGPT reply waits until its card was opened", () => {
  assert.equal(tagWaits({ id: "e1", event: reply("hermes") }, new Set()), true);
  assert.equal(
    tagWaits({ id: "e1", event: reply("chatgpt") }, new Set(["e1"])),
    false,
  );
});

test("a Claude or Codex reply folds away on its clock and never narrows", () => {
  assert.equal(
    tagWaits({ id: "e1", event: reply("claude") }, new Set()),
    false,
  );
  assert.equal(tagWaits({ id: "e1", event: reply("codex") }, new Set()), false);
});

test("a tag ages after five seconds, counted per key", () => {
  const since = new Map([
    ["old", 0],
    ["new", 4000],
  ]);
  assert.deepEqual([...agedTags(since, TAG_NARROW_MS)], ["old"]);
  assert.equal(TAG_NARROW_MS, 5000);
});

test("one more request or reply makes a new key, so the tag hangs whole again", () => {
  assert.notEqual(tagFoldKey("claude", "r1", 1), tagFoldKey("claude", "r1", 2));
  assert.equal(tagFoldKey("claude", "r1", 1), tagFoldKey("claude", "r1", 1));
});

test("the slip stands on a side edge and lies along the top or bottom", () => {
  assert.deepEqual(narrowTagSize(1.15, "right"), { width: 28, height: 53 });
  assert.deepEqual(narrowTagSize(1.15, "top"), { width: 53, height: 28 });
});

test("the slip stands against the stub; a whole tag keeps its gap", () => {
  assert.equal(tagGap(true), 0);
  assert.equal(tagGap(false), 6);
});

const strip = { x: 900, y: 100, width: 50, height: 300 };
const marks = [
  { vendor: "claude", center: 40 },
  { vendor: "codex", center: 120 },
  { vendor: "hermes", center: 260 },
];
const tags = [
  {
    vendor: "claude",
    rects: [
      { x: 600, y: 125, width: 294, height: 30 },
      { x: 872, y: 113, width: 28, height: 53 },
    ],
  },
  {
    vendor: "hermes",
    rects: [{ x: 872, y: 333, width: 28, height: 53 }, null],
  },
];

test("only the agent under the pointer opens out: its mark on the strip", () => {
  assert.equal(
    agentUnder({ x: 920, y: 365 }, { strip, edge: "right", marks, tags }),
    "hermes",
  );
  assert.equal(
    agentUnder({ x: 920, y: 215 }, { strip, edge: "right", marks, tags }),
    "codex",
  );
});

test("or its own tag, whole or folded, and nothing else", () => {
  assert.equal(
    agentUnder({ x: 700, y: 140 }, { strip, edge: "right", marks, tags }),
    "claude",
  );
  assert.equal(
    agentUnder({ x: 880, y: 160 }, { strip, edge: "right", marks, tags }),
    "claude",
  );
  assert.equal(
    agentUnder({ x: 400, y: 140 }, { strip, edge: "right", marks, tags }),
    null,
  );
  assert.equal(agentUnder(null, { strip, edge: "right", marks, tags }), null);
});
