import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  EASE_OUT,
  EASE_SWING,
  MOTION,
  MOTION_MS,
  cssCurve,
  eased,
} from "../src/lib/motion.ts";

const css = readFileSync(new URL("../src/global.css", import.meta.url), "utf8");

test("global.css carries the same motion values as lib/motion.ts", () => {
  for (const [name, ms] of Object.entries(MOTION_MS)) {
    assert.match(css, new RegExp(`--motion-${name}: ${ms}ms;`), name);
    assert.equal(MOTION[name as keyof typeof MOTION] * 1000, ms, name);
  }
  assert.match(css, new RegExp(`--ease-out: ${escape(cssCurve(EASE_OUT))};`));
  assert.match(
    css,
    new RegExp(`--ease-in-out: ${escape(cssCurve(EASE_SWING))};`),
  );
  // Tailwind's transition utilities move like hand-written CSS.
  assert.match(css, /--default-transition-duration: 120ms;/);
  assert.match(
    css,
    new RegExp(
      `--default-transition-timing-function: ${escape(cssCurve(EASE_OUT))};`,
    ),
  );
});

test("leaving is quicker than arriving, pressing quicker than hovering", () => {
  assert.ok(MOTION.exit < MOTION.enter);
  assert.ok(MOTION.press < MOTION.quick);
});

test("less motion stops loops instead of letting them flicker", () => {
  const rules = [
    ...css.matchAll(
      /(@media \(prefers-reduced-motion: reduce\) \{\s*\*,|\.hud-scene\[data-motion="reduce"\] \*,)[^}]*\}/g,
    ),
  ].map((m) => m[0]);
  assert.equal(rules.length, 2, "one rule for the system, one for 动画 off");
  for (const rule of rules)
    assert.match(rule, /animation-iteration-count: 1 !important/);
});

test("eased follows its curve from rest to rest", () => {
  assert.equal(eased(EASE_OUT, 0), 0);
  assert.equal(eased(EASE_OUT, 1), 1);
  // An ease-out is well past halfway at half time, and never goes back.
  assert.ok(eased(EASE_OUT, 0.5) > 0.8);
  let last = 0;
  for (let t = 0.05; t <= 1; t += 0.05) {
    const now = eased(EASE_OUT, t);
    assert.ok(now >= last);
    last = now;
  }
  assert.ok(Math.abs(eased(EASE_SWING, 0.5) - 0.5) < 0.01);
});

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
