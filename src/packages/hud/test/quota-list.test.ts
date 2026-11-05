import { test } from "node:test";
import assert from "node:assert/strict";
import type { IslandEvent, PanelLayout, Quota } from "@agent-hud/protocol";
import {
  isQuotaEvent,
  isQuotaWindowEvent,
  queuedQuotas,
  shownNews,
} from "../src/alerts/quota-list.ts";

const news = (id: string, kind: IslandEvent["kind"], at: string) => ({
  type: "news" as const,
  event: { id, kind, at, source: "claude" } as IslandEvent,
});

test("the quota card lists every quota notice waiting, newest first, resets added and sign-outs too", () => {
  const queue = [
    news("old", "quota-exhaustion", "2026-11-05T06:00:00Z"),
    { type: "request" as const },
    news("reply", "completion", "2026-11-05T06:10:00Z"),
    news("new", "quota-reset", "2026-11-05T06:05:00Z"),
    news("credit", "reset-credits", "2026-11-05T06:20:00Z"),
    news("sign", "sign-in-needed", "2026-11-05T06:30:00Z"),
    news("undated", "quota-exhaustion", "later"),
  ];
  assert.deepEqual(
    queuedQuotas(queue).map((event) => event.id),
    ["sign", "credit", "new", "old", "undated"],
  );
  assert.deepEqual(queuedQuotas([]), []);
});

test("quota notices are a window's, resets added and sign-outs; a window's are two of them", () => {
  const kinds: IslandEvent["kind"][] = [
    "quota-exhaustion",
    "quota-reset",
    "reset-credits",
    "sign-in-needed",
    "completion",
  ];
  const of = (kind: IslandEvent["kind"]) =>
    ({ id: "e", kind, at: "", source: "" }) as IslandEvent;
  assert.deepEqual(
    kinds.map((kind) => isQuotaEvent(of(kind))),
    [true, true, true, true, false],
  );
  assert.deepEqual(
    kinds.map((kind) => isQuotaWindowEvent(of(kind))),
    [true, true, false, false, false],
  );
});

const row = (key: string, name: string) =>
  ({
    id: `claude-acct:${key}`,
    vendor: "claude",
    name,
    accountId: "acct",
    legacyWindowId: `acct/${key}`,
    usedPercent: 40,
    status: "normal",
  }) as unknown as Quota;
const quotas = [
  row("claude-weekly", "Weekly limit"),
  row("claude-weekly-fable", "Weekly limit · Fable"),
];
const hidingFable: PanelLayout = {
  blocks: { claude: { hiddenRows: ["acct/claude-weekly-fable"] } },
} as unknown as PanelLayout;

test("news about a row the hover panel hides is not told, nor named after a reset", () => {
  const events = [
    {
      id: "fable",
      kind: "quota-exhaustion",
      at: "",
      source: "claude",
      quotaId: "claude-acct:claude-weekly-fable",
    },
    {
      id: "weekly",
      kind: "quota-reset",
      at: "",
      source: "claude",
      quotaId: "claude-acct:claude-weekly",
      otherExhaustedWindows: [
        { id: "claude-acct:claude-weekly-fable", name: "Weekly limit · Fable" },
      ],
    },
    { id: "sign", kind: "sign-in-needed", at: "", source: "claude" },
    {
      id: "gone",
      kind: "quota-exhaustion",
      at: "",
      source: "claude",
      quotaId: "no-such-row",
    },
  ] as IslandEvent[];
  const shown = shownNews(events, quotas, hidingFable);
  assert.deepEqual(
    shown.map((event) => event.id),
    ["weekly", "sign", "gone"],
  );
  assert.deepEqual(shown[0].otherExhaustedWindows, []);
  // With nothing hidden every notice stays as it came.
  const all = shownNews(events, quotas, undefined);
  assert.deepEqual(all, events);
});
