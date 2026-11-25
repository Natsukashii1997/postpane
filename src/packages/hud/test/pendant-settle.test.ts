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
  // Added onto the swing, so a pointer back mid-way picks it up from there.
  assert.match(shell, /composite: ADDS \? "add" : "replace"/);
  // One settle per part: a second leave replaces the first (ENG-05).
  assert.match(
    shell,
    /settling\.get\(part\)\?\.cancel\(\);\s*settling\.delete\(part\);/,
  );
  // Where WebKit cannot add animations, coming back ends the settle (ENG-10).
  assert.match(shell, /onPointerEnter=\{\(\) => \{\s*resume\(root\.current\);/);
});
