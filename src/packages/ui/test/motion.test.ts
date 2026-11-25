import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import {
  EASE_OUT,
  EASE_SWING,
  MOTION,
  GEOMETRY,
  MOTION_MS,
  NOTCH_GEOMETRY,
  cssCurve,
  eased,
  springFor,
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

test("the notch springs a little quicker than the sidebar's card, the same way", () => {
  assert.ok(NOTCH_GEOMETRY.visualDuration < GEOMETRY.visualDuration);
  assert.equal(NOTCH_GEOMETRY.bounce, 0);
  assert.equal(springFor(true), NOTCH_GEOMETRY);
  assert.equal(springFor(false), GEOMETRY);
});

test("动画 off rests the running dots as the system's less motion does (ENG-09)", () => {
  for (const scope of [
    /@media \(prefers-reduced-motion: reduce\) \{[^@]*?\.hud-running-grid > span \{\s*opacity: 0\.55;/,
    /\.hud-scene\[data-motion="reduce"\] \.hud-running-grid > span \{\s*animation: none;\s*opacity: 0\.55;/,
  ])
    assert.match(css, scope);
});

test("one-off moves take the shared paces; the few kept are named (ENG-11)", () => {
  // The pendant's lift, eye glow and press were set with the pendant
  // (owner 2026-11-06, #159) and keep their own timing.
  const kept = [
    "transition: transform 0.18s ease;",
    "transition: opacity 0.2s ease;",
    "transition-duration: 0.08s;",
  ];
  const literal = [
    ...css.matchAll(
      /^\s*(transition|transition-duration|animation)\s*:[^;]*\d(ms|s)\b[^;]*;/gm,
    ),
  ]
    .map((m) => m[0].trim())
    .filter((rule) => !/infinite|0\.01ms/.test(rule))
    .filter((rule) => !kept.includes(rule));
  assert.deepEqual(literal, []);
  // Tailwind durations in the shared parts are the language's paces; 80 is
  // a small popover closing, quicker than a panel's exit.
  const ui = new URL("../src/ui/", import.meta.url);
  for (const file of readdirSync(ui))
    for (const [, ms] of readFileSync(new URL(file, ui), "utf8").matchAll(
      /duration-(\d+)/g,
    ))
      assert.ok(
        [...Object.values(MOTION_MS), 80].includes(Number(ms)),
        `${file}: duration-${ms}`,
      );
});
