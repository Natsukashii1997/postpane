import { test } from "node:test";
import assert from "node:assert/strict";
import type { PanelLayout, Quota } from "@agent-hud/protocol";
import {
  inRowOrder,
  quotaRowHidden,
  quotaRowKey,
  quotaRowShown,
  tightestWindow,
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

// Claude's readings as the sidebar gets them, the panel hiding Fable.
const reading = (window: string, usedPercent: number, extra: object = {}) =>
  ({ ...row(window), usedPercent, ...extra }) as Quota;
const claude = [
  reading("claude-session", 14, { shortLabel: "5h" }),
  reading("claude-weekly", 47, { shortLabel: "Weekly" }),
  reading("claude-weekly-fable", 92, { shortLabel: "Fable" }),
  reading("claude-cloud", 68, {
    shortLabel: "Cloud",
    metrics: { consumed: { used: 34, capacity: 50, unit: "USD" } },
  }),
];
const hidingFable = {
  blocks: { claude: { hiddenRows: [`${account}/claude-weekly-fable`] } },
} as unknown as PanelLayout;

test("the peek lists only the windows the hover panel shows", () => {
  const shown = claude.filter((q) => quotaRowShown(q, hidingFable));
  assert.deepEqual(
    shown.map((q) => peekWindowName(q, "zh")),
    ["5h", "Weekly", "云端"],
  );
  assert.equal(claude.filter((q) => quotaRowShown(q, undefined)).length, 4);
  // A hidden account hides its rows the same way.
  const hidingAccount = {
    blocks: { claude: { hiddenAccounts: [account] } },
  } as unknown as PanelLayout;
  assert.equal(claude.filter((q) => quotaRowShown(q, hidingAccount)).length, 0);
});

test("the resting strip's figure leads with the tightest shown window, never credits", () => {
  assert.equal(tightestWindow(claude)?.usedPercent, 92);
  assert.equal(
    tightestWindow(claude.filter((q) => quotaRowShown(q, hidingFable)))
      ?.usedPercent,
    47,
  );
  assert.equal(
    tightestWindow([reading("claude-weekly", 30, { status: "stale" })]),
    undefined,
  );
});

test("the peek writes Claude's cloud credits as 云端 in Chinese only", () => {
  const cloud = { name: "Cloud session credits", shortLabel: "Cloud" };
  assert.equal(peekWindowName(cloud, "zh"), "云端");
  assert.equal(peekWindowName(cloud, "en"), "Cloud");
  assert.equal(
    peekWindowName({ name: "Weekly", shortLabel: "Weekly" }, "zh"),
    "Weekly",
  );
  assert.equal(
    peekWindowName({ name: "Current session" }, "zh"),
    "Current session",
  );
});
