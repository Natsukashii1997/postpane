import { test } from "node:test";
import assert from "node:assert/strict";
import { diskBadge } from "../src/disk-slim.ts";

const GIB = 1024 ** 3;

test("the badge prints whole GiB left when space is low or critical (#155)", () => {
  const state = { installed: true, panelOpen: false };
  assert.equal(
    diskBadge({ ...state, level: "low", availableBytes: 45.9 * GIB }),
    "45G",
  );
  assert.equal(
    diskBadge({ ...state, level: "critical", availableBytes: 30_965_669_888 }),
    "28G",
  );
});

test("no badge while space is fine, or the status is stale or odd", () => {
  const state = { installed: true, panelOpen: false };
  assert.equal(
    diskBadge({ ...state, level: "ok", availableBytes: 86 * GIB }),
    null,
  );
  assert.equal(
    diskBadge({ ...state, level: null, availableBytes: null }),
    null,
  );
  assert.equal(diskBadge({ ...state, level: "low" }), null);
  assert.equal(diskBadge({ ...state, level: "low", availableBytes: -1 }), null);
  assert.equal(
    diskBadge({ ...state, level: "dire", availableBytes: 5 * GIB }),
    null,
  );
});
