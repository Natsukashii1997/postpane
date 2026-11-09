import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// #264 drew the panel's hidden measuring copy from a deferred value (upstream
// e07cd7e). In the app's WebKit sidebar every bot then stayed on its static
// logo; reverting it brought them back (bisected on 2026-11-09, L-35). Chromium
// and Safari previews did not show it, so this guard keeps the copy synchronous.
const source = readFileSync(
  new URL("../src/HUDScene.tsx", import.meta.url),
  "utf8",
);

test("the hidden measuring copy is drawn as it is, not deferred", () => {
  assert.doesNotMatch(source, /useDeferredValue/);
  assert.doesNotMatch(source, /MeasuringCopy/);
});
