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
  assert.match(shell, /composite: addsOnto\(\) \? "add" : "replace"/);
  // One settle per part: a second leave replaces the first (ENG-05).
  assert.match(
    shell,
    /settling\.get\(part\)\?\.cancel\(\);\s*settling\.delete\(part\);/,
  );
  // Where WebKit cannot add animations, coming back ends the settle (ENG-10).
  assert.match(shell, /onPointerEnter=\{\(\) => \{\s*resume\(root\.current\);/);
});

// ENG-10, round 2: Safari 16.0 and 16.1 have `composite` but add wrongly, so
// the API alone said yes. It is now tried on a hidden box, the way the settle
// uses it; in the system WKWebView: evidence webkit-r2/adds-onto.txt.
test("whether WebKit adds is tried, not read off the API", () => {
  const adds = readFileSync(
    new URL("../src/scene/adds-onto.ts", import.meta.url),
    "utf8",
  );
  assert.match(adds, /animation:hud-adds-onto 1s paused/);
  assert.match(adds, /composite: "add"/);
  assert.match(adds, /Math\.round\(new DOMMatrix\(now\)\.m41\) === 20/);
  // Tried once, and put away after.
  assert.match(adds, /if \(known !== undefined\) return known;/);
  for (const gone of ["settle.cancel();", "box.remove();", "sheet.remove();"])
    assert.ok(adds.includes(gone), gone);
  assert.doesNotMatch(shell, /\bADDS\b/);
});
