import { test } from "node:test";
import assert from "node:assert/strict";
import { diskReading } from "../src/disk-slim.ts";

const GIB = 1024 ** 3;

test("low or critical space gives the band and whole GiB left (#155, #160)", () => {
  const state = { installed: true, panelOpen: false };
  assert.deepEqual(
    diskReading({ ...state, level: "low", availableBytes: 45.9 * GIB }),
    { level: "low", gib: 45 },
  );
  assert.deepEqual(
    diskReading({
      ...state,
      level: "critical",
      availableBytes: 30_965_669_888,
    }),
    { level: "critical", gib: 28 },
  );
});

test("no reading while space is fine, or the status is stale or odd", () => {
  const state = { installed: true, panelOpen: false };
  assert.equal(
    diskReading({ ...state, level: "ok", availableBytes: 86 * GIB }),
    null,
  );
  assert.equal(
    diskReading({ ...state, level: null, availableBytes: null }),
    null,
  );
  assert.equal(diskReading({ ...state, level: "low" }), null);
  assert.equal(
    diskReading({ ...state, level: "low", availableBytes: -1 }),
    null,
  );
  assert.equal(
    diskReading({ ...state, level: "dire", availableBytes: 5 * GIB }),
    null,
  );
});
