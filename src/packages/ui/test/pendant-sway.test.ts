import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/global.css", import.meta.url), "utf8");

/** Seconds from the start of a hover to the first swing of a pendant's
 * sway, read off its `animation` (duration, negative delay) and the
 * keyframes' first moving step. */
function firstSwing(animation: string) {
  const [duration, delay] = [...animation.matchAll(/(-?[\d.]+)s/g)].map(
    (match) => Number(match[1]),
  );
  const keyframes = css.match(/@keyframes hud-pendant-sway \{([\s\S]*?)\n\}/);
  assert.ok(keyframes, "the sway keyframes are in global.css");
  // The last rest step before it swings: the first "N%" that sits in the
  // rest group before a rotate other than 0.
  const rest = keyframes[1].match(
    /(\d+)%,\s*100%\s*\{\s*transform: rotate\(0deg\)/,
  );
  assert.ok(rest, "the sway rests until a step, then swings");
  const start = (Number(rest[1]) / 100) * duration;
  const offset = -delay % duration;
  return (start - offset + duration) % duration;
}

test("every pendant swings within half a second of a hover (#240)", () => {
  const rules = [
    ...css.matchAll(
      /([^{}]*\[data-hover="true"\] \.hud-pendant-sway)\s*\{\s*animation: hud-pendant-sway ([^;]+);/g,
    ),
  ];
  assert.ok(rules.length >= 1, "a hover rule plays the sway");
  for (const [, selector, animation] of rules) {
    assert.ok(
      firstSwing(animation) <= 0.5,
      `${selector.trim()} swings ${firstSwing(animation).toFixed(2)} s after the hover`,
    );
  }
});

test("磁盘瘦身 sways from the same rule as the cat, not its own", () => {
  assert.doesNotMatch(
    css,
    /data-app="disk"\][^{]*\.hud-pendant-sway\s*\{/,
    "no disk-only sway timing",
  );
});

test("the swing keys on the pendant's own hover flag, not :hover", () => {
  // So a leave can read the angle before the swing stops and ease it back
  // (owner chose 改, 2026-11-25; the shell's side: hud/test/pendant-settle).
  assert.doesNotMatch(css, /:hover \.hud-(pendant-sway|disk-broom)\s*\{/);
});
