import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) =>
  readFileSync(new URL(`../src/scene/${path}`, import.meta.url), "utf8");
const shell = read("PendantShell.tsx");
const settle = read("settle.ts");

test("a pendant let go mid-swing eases back upright instead of snapping", () => {
  // The shell keeps its own hover flag (global.css swings on it), so a leave
  // reads the angle before the swing stops (owner chose 改, 2026-11-25).
  assert.match(shell, /data-hover=\{hover\}/);
  assert.match(
    shell,
    /onPointerLeave=\{\(\) => \{\s*if \(!still\) settle\(root\.current\);/,
  );
  assert.match(
    settle,
    /const SWINGS = "\.hud-pendant-sway, \.hud-disk-broom";/,
  );
  // Added onto the swing, so a pointer back mid-way picks it up from there.
  assert.match(
    settle,
    /settleBack\(part, from, addsOnto\(\) \? "add" : "replace"\)/,
  );
  // One settle per part: a second leave replaces the first (ENG-05).
  assert.match(
    settle,
    /settling\.get\(part\)\?\.cancel\(\);\s*settling\.delete\(part\);/,
  );
  // Where WebKit cannot add animations, coming back ends the settle (ENG-10).
  assert.match(shell, /onPointerEnter=\{\(\) => \{\s*resume\(root\.current\);/);
});

// ENG-10: Safari 16.0 and 16.1 have `composite` but add wrongly, so the API
// alone said yes. Round 2 tried two translateX on a hidden box; round 3 asked
// for the pendant's own case: the settle itself (`settleBack`), from a turn
// as a matrix back to none, added onto a CSS rotation. In the system
// WKWebView: evidence webkit-r3/settle-probe.txt.
test("whether WebKit adds is tried with the settle itself, on a turn", () => {
  const probe = settle.slice(
    settle.indexOf("export function addsOnto"),
    settle.indexOf("export function degrees"),
  );
  assert.match(
    probe,
    /@keyframes hud-adds-onto\{from,to\{transform:rotate\(4deg\)\}\}/,
  );
  assert.match(probe, /animation:hud-adds-onto 1s paused/);
  assert.match(
    probe,
    /const from = new DOMMatrix\(\)\.rotate\(3\)\.toString\(\);/,
  );
  assert.match(probe, /const back = settleBack\(box, from, "add"\);/);
  assert.match(
    probe,
    /degrees\(getComputedStyle\(box\)\.transform\) - 7\) < 0\.1/,
  );
  // Tried once, and put away after.
  assert.match(probe, /if \(adds !== undefined\) return adds;/);
  for (const gone of ["back.cancel();", "box.remove();", "sheet.remove();"])
    assert.ok(probe.includes(gone), gone);
  // The settle and the probe are one function, so they cannot drift apart.
  assert.equal(settle.match(/\.animate\(/g)?.length, 1);
  assert.doesNotMatch(shell, /\.animate\(|\bADDS\b/);
});
