import { test } from "node:test";
import assert from "node:assert/strict";
import type { Handoff, Quota, Snapshot } from "@agent-hud/protocol";
import { weeklyFor } from "../src/card-weekly.ts";

function quota(vendor: string, extra: Partial<Quota> = {}): Quota {
  return {
    id: `${vendor}-${extra.name ?? "weekly"}-${extra.account ?? "a"}`,
    vendor,
    name: "Weekly limit",
    windowDurationSeconds: 604_800,
    allModels: true,
    usedPercent: 40,
    resetAt: "2026-11-14T02:00:00Z",
    status: "normal",
    account: "a",
    ...extra,
  };
}

const snapshot = (quotas: Quota[]) => ({ quotas }) as unknown as Snapshot;
const handoff = (doer?: "codex") => ({ id: "h", doer }) as unknown as Handoff;
const none = { panelLayout: undefined };

test("the news in front shows its own agent's weekly window, not the 5 hours", () => {
  const shown = snapshot([
    quota("claude", {
      name: "Current session",
      windowDurationSeconds: 18_000,
      usedPercent: 100,
      status: "critical",
    }),
    quota("claude", { usedPercent: 97.6, status: "critical" }),
    quota("codex", { usedPercent: 34 }),
  ]);
  assert.deepEqual(weeklyFor(shown, none, undefined, { source: "claude" }), {
    percent: 98,
    critical: true,
  });
  assert.deepEqual(weeklyFor(shown, none, undefined, { source: "codex" }), {
    percent: 34,
    critical: false,
  });
});

test("an opened handoff answers for its doer: Codex, else Claude", () => {
  const shown = snapshot([
    quota("claude", { usedPercent: 98 }),
    quota("codex", { usedPercent: 34 }),
  ]);
  const front = { source: "codex" };
  assert.equal(weeklyFor(shown, none, handoff(), front)?.percent, 98);
  assert.equal(weeklyFor(shown, none, handoff("codex"), front)?.percent, 34);
});

test("nothing without a live weekly window, or with nothing out", () => {
  const shown = snapshot([
    quota("claude", { status: "stale" }),
    quota("claude", { usedPercent: null, account: "b" }),
    quota("claude", { allModels: false, account: "c" }),
    quota("codex", {
      name: "Cloud credits",
      usedPercent: 90,
      metrics: { consumed: { unit: "USD", used: 9, capacity: 10 } },
    } as Partial<Quota>),
  ]);
  assert.equal(
    weeklyFor(shown, none, undefined, { source: "claude" }),
    undefined,
  );
  assert.equal(
    weeklyFor(shown, none, undefined, { source: "codex" }),
    undefined,
  );
  assert.equal(
    weeklyFor(shown, none, undefined, { source: "hermes" }),
    undefined,
  );
  assert.equal(weeklyFor(shown, none, undefined, undefined), undefined);
});

test("the fullest account leads, and a row the panel hides is left out", () => {
  const a = quota("claude", { usedPercent: 30, account: "a" });
  const b = quota("claude", { usedPercent: 70, account: "b" });
  const shown = snapshot([a, b]);
  assert.equal(
    weeklyFor(shown, none, undefined, { source: "claude" })?.percent,
    70,
  );
  const layout = {
    panelLayout: { blocks: { claude: { hiddenRows: [b.id] } } },
  } as unknown as Parameters<typeof weeklyFor>[1];
  assert.equal(
    weeklyFor(shown, layout, undefined, { source: "claude" })?.percent,
    30,
  );
});
