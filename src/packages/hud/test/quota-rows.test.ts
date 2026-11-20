import { test } from "node:test";
import assert from "node:assert/strict";
import type { PanelLayout, Quota } from "@agent-hud/protocol";
import {
  inRowOrder,
  quotaRowHidden,
  quotaRowKey,
  quotaRowShown,
  leadingWindow,
  withRowShown,
} from "../src/quota-rows.ts";
import { peekWindowName } from "../src/panel/window-labels.ts";

const account = "account:aaa";
const other = "account:bbb";
const row = (window: string, accountId = account): Quota =>
  ({
    id: `claude:${accountId}:${window}`,
    vendor: "claude",
    name: window,
    usedPercent: 0,
    status: "normal",
    accountId,
    legacyWindowId: `${accountId}/${window}`,
  }) as Quota;

const session = row("claude-session");
const weekly = row("claude-weekly");
const fable = row("claude-weekly-fable");
const otherFable = row("claude-weekly-fable", other);

test("a layout writes a row by its Swift window id", () => {
  assert.equal(quotaRowKey(fable), `${account}/claude-weekly-fable`);
});

test("a row is hidden by its id, its window id, or its window alone", () => {
  assert.ok(quotaRowHidden(fable, [fable.id]));
  assert.ok(quotaRowHidden(fable, [`${account}/claude-weekly-fable`]));
  assert.ok(quotaRowHidden(fable, ["claude-weekly-fable"]));
  assert.ok(!quotaRowHidden(weekly, ["claude-weekly-fable"]));
});

test("rows follow a layout's order whichever key names them", () => {
  const ordered = inRowOrder(
    [session, weekly, fable],
    [fable.id, `${account}/claude-weekly`],
  );
  assert.deepEqual(
    ordered.map((r) => r.name),
    ["claude-weekly-fable", "claude-weekly", "claude-session"],
  );
});

test("showing a row hidden by its window alone keeps the other account's row hidden", () => {
  const hidden = withRowShown(["claude-weekly-fable", session.id], fable, [
    session,
    fable,
    otherFable,
  ]);
  assert.deepEqual(hidden, [session.id, `${other}/claude-weekly-fable`]);
  assert.ok(!quotaRowHidden(fable, hidden));
  assert.ok(quotaRowHidden(otherFable, hidden));
});

// Claude's readings as the sidebar gets them, the panel hiding Opus.
const reading = (window: string, usedPercent: number, extra: object = {}) =>
  ({ ...row(window), usedPercent, ...extra }) as Quota;
const claude = [
  reading("claude-session", 14, { shortLabel: "5h" }),
  reading("claude-weekly", 47, { shortLabel: "Weekly" }),
  reading("claude-weekly-opus", 92, { shortLabel: "Opus" }),
  reading("claude-credits", 68, {
    shortLabel: "Credits",
    metrics: { consumed: { used: 34, capacity: 50, unit: "USD" } },
  }),
];
const hidingOpus = {
  blocks: { claude: { hiddenRows: [`${account}/claude-weekly-opus`] } },
} as unknown as PanelLayout;

test("the peek lists only the windows the hover panel shows", () => {
  const shown = claude.filter((q) => quotaRowShown(q, hidingOpus));
  assert.deepEqual(
    shown.map((q) => peekWindowName(q)),
    ["5h", "Weekly", "Credits"],
  );
  assert.equal(claude.filter((q) => quotaRowShown(q, undefined)).length, 4);
  // A hidden account hides its rows the same way.
  const hidingAccount = {
    blocks: { claude: { hiddenAccounts: [account] } },
  } as unknown as PanelLayout;
  assert.equal(claude.filter((q) => quotaRowShown(q, hidingAccount)).length, 0);
});

test("without a weekly window the figure leads with the tightest shown window, never credits", () => {
  assert.equal(leadingWindow(claude)?.usedPercent, 92);
  assert.equal(
    leadingWindow(claude.filter((q) => quotaRowShown(q, hidingOpus)))
      ?.usedPercent,
    47,
  );
  assert.equal(
    leadingWindow([reading("claude-weekly", 30, { status: "stale" })]),
    undefined,
  );
});

// Claude and Codex as they read: a 5-hour and an every-model weekly window.
const timed = (window: string, usedPercent: number, seconds: number) =>
  reading(window, usedPercent, {
    windowDurationSeconds: seconds,
    allModels: true,
  });

test("the resting strip's figure leads with the weekly window, however full the 5 hours are (#174)", () => {
  const justReset = [
    timed("claude-session", 11, 18_000),
    timed("claude-weekly", 4, 604_800),
  ];
  assert.equal(leadingWindow(justReset)?.usedPercent, 4);
  const nearlySpent = [
    timed("claude-session", 95, 18_000),
    { ...timed("claude-weekly", 30, 604_800), status: "normal" as const },
  ];
  assert.equal(leadingWindow(nearlySpent)?.usedPercent, 30);
  // A weekly window for one model only does not lead.
  const fableOnly = [
    timed("claude-session", 11, 18_000),
    reading("claude-weekly-fable", 60, {
      windowDurationSeconds: 604_800,
      allModels: false,
    }),
  ];
  assert.equal(leadingWindow(fableOnly)?.usedPercent, 60);
  assert.equal(leadingWindow(fableOnly)?.name, "claude-weekly-fable");
  // A weekly window that failed to read gives way to a live one.
  const weeklyStale = [
    timed("claude-session", 11, 18_000),
    { ...timed("claude-weekly", 4, 604_800), status: "stale" as const },
  ];
  assert.equal(leadingWindow(weeklyStale)?.usedPercent, 11);
});

test("the peek writes a window by its short name, else its name", () => {
  const fable = { name: "Weekly limit · Fable", shortLabel: "Fable" };
  assert.equal(peekWindowName(fable), "Fable");
  assert.equal(peekWindowName({ name: "Current session" }), "Current session");
});
