import { test } from "node:test";
import assert from "node:assert/strict";
import type { IslandEvent } from "@agent-hud/protocol";
import { isQuotaEvent, queuedQuotas } from "../src/alerts/quota-list.ts";

const news = (id: string, kind: IslandEvent["kind"], at: string) => ({
  type: "news" as const,
  event: { id, kind, at, source: "claude" } as IslandEvent,
});

test("the quota card lists every quota notice waiting, newest first", () => {
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
    ["new", "old", "undated"],
  );
  assert.deepEqual(queuedQuotas([]), []);
});

test("only running-low and reset notices are quota notices", () => {
  const kinds: IslandEvent["kind"][] = [
    "quota-exhaustion",
    "quota-reset",
    "reset-credits",
    "sign-in-needed",
    "completion",
  ];
  assert.deepEqual(
    kinds.map((kind) =>
      isQuotaEvent({ id: "e", kind, at: "", source: "" } as IslandEvent),
    ),
    [true, true, false, false, false],
  );
});
