import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) =>
  readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

// ENG-04: less motion (the system's or 动画 off) jumps to an agent's blocks.
// ENG-17: the jump read 动画 as it was when the spotlight came, so turning it
// off while the panel settled (the ResizeObserver reaching again) still
// scrolled smoothly.
test("the jump to an agent reads 动画 as it is when it reaches", () => {
  const spot = read("panel/spotlight.ts");
  assert.match(spot, /smooth\.current = moves;/);
  assert.match(
    spot,
    /smooth\.current && !systemReducesMotion\(\) \? "smooth" : "auto"/,
  );
  // Turned off part way: the rest of the way at once.
  assert.match(
    spot,
    /useEffect\(\(\) => \{\s*if \(!moves\) reaching\.current\?\.\(\);\s*\}, \[moves\]\);/,
  );
  assert.equal(spot.match(/reaching\.current = null;/g)?.length, 2);
  assert.match(
    read("HoverPanel.tsx"),
    /const \{ scroller, lit \} = useSpotlight\(spotlight, moves\);/,
  );
});
