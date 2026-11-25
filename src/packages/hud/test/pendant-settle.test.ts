import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const shell = readFileSync(
  new URL("../src/scene/PendantShell.tsx", import.meta.url),
  "utf8",
);

test("a pendant let go mid-swing eases back upright instead of snapping", () => {
  // The shell keeps its own hover flag (global.css swings on it), so a leave
  // reads the angle before the swing stops (owner chose 改, 2026-11-25).
  assert.match(shell, /data-hover=\{hover\}/);
  assert.match(
    shell,
    /onPointerLeave=\{\(\) => \{\s*if \(!still\) settle\(root\.current\);/,
  );
  assert.match(shell, /const SWINGS = "\.hud-pendant-sway, \.hud-disk-broom";/);
});
