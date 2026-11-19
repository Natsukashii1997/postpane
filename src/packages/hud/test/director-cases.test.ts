// The mark director exists twice: TypeScript here (browser preview) and Rust
// in src/crates/hud/src/bots.rs (the app). Both replay the same recorded steps
// in director-cases.json, so changing either one alone turns its replay red
// (L-49; the Rust side is `directs_as_the_typescript_director_did`).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import type { MarkDirector as Director } from "../src/bots/mark-director.ts";

// mark-director.ts reaches model.ts, which imports JSON and artwork the way
// Vite reads them, so plain node cannot load it: Vite loads it here.
const vite = await createServer({
  configFile: false,
  root: fileURLToPath(new URL("..", import.meta.url)),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true, hmr: false, watch: null },
});
const { MarkDirector } = (await vite.ssrLoadModule(
  "/src/bots/mark-director.ts",
)) as { MarkDirector: typeof Director };
await vite.close();

interface Step {
  now: number;
  read?: unknown;
  looked?: string[] | null;
  advance?: unknown;
  wire: unknown;
  nextChange: number | null;
}
const cases: { name: string; startedAt: number; steps: Step[] }[] = JSON.parse(
  readFileSync(
    new URL(
      "../../../crates/hud/src/bots/director-cases.json",
      import.meta.url,
    ),
    "utf8",
  ),
).cases;

/** Equal as the Rust replay compares: numbers to 1e-9, objects by key. */
function same(a: unknown, b: unknown): boolean {
  if (typeof a === "number" && typeof b === "number")
    return Math.abs(a - b) <= 1e-9;
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((item, i) => same(item, b[i]));
  if (a && b && typeof a === "object" && typeof b === "object") {
    const left = Object.entries(a as Record<string, unknown>);
    return (
      left.length === Object.keys(b as object).length &&
      left.every(
        ([key, value]) =>
          key in (b as object) &&
          same(value, (b as Record<string, unknown>)[key]),
      )
    );
  }
  return a === b;
}

test("the TypeScript director takes the recorded steps the Rust one replays", (t) => {
  let now = 0;
  t.mock.method(Date, "now", () => now * 1000);
  let steps = 0;
  for (const recorded of cases) {
    const director = new MarkDirector(recorded.startedAt);
    recorded.steps.forEach((step, index) => {
      now = step.now;
      if (step.read !== undefined)
        director.read(step.read as Parameters<Director["read"]>[0], now);
      else if (step.looked !== undefined) director.looked(step.looked, now);
      else director.advance(now);
      const place = `${recorded.name} step ${index}`;
      const wire = {
        startedAt: director.startedAt,
        directions: director.directions,
      };
      assert.ok(
        same(JSON.parse(JSON.stringify(wire)), step.wire),
        `${place}: published\n${JSON.stringify(wire)}\nnot\n${JSON.stringify(step.wire)}`,
      );
      const next = director.nextChange(now);
      assert.ok(
        same(next, step.nextChange),
        `${place}: next change ${next}, not ${step.nextChange}`,
      );
      steps += 1;
    });
  }
  assert.ok(steps >= 150, `${steps} steps`);
});
