import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { moves, scaledFill } from "../src/lib/moves.ts";

test("an inline transition takes the language's pace and curve", () => {
  assert.equal(
    moves("quick", "opacity", "color"),
    "opacity var(--motion-quick) var(--ease-out), color var(--motion-quick) var(--ease-out)",
  );
});

test("a scaled fill stays within its track", () => {
  assert.equal(scaledFill(0.4).transform, "scaleX(0.4)");
  assert.equal(scaledFill(1.7).transform, "scaleX(1)");
  assert.equal(scaledFill(-1).transform, "scaleX(0)");
  assert.equal(scaledFill(Number.NaN).transform, "scaleX(0)");
  assert.equal(scaledFill(0.4).transformOrigin, "left");
});

// The windows once timed the same kind of change at 140, 160, 180, 200 and
// 220 ms with three curves. A pace written by hand drifts again; the tokens
// (--motion-*, --ease-*, lib/moves) keep one language.
test("the windows write no pace or curve of their own", () => {
  const root = fileURLToPath(new URL("../src", import.meta.url));
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory()
        ? files(path)
        : /\.(tsx?|css)$/.test(name)
          ? [path]
          : [];
    });
  // A transition or animation that still names a time or a curve once its
  // tokens are taken out.
  const handWritten = (line: string) => {
    const bare = line.replace(/var\(--[\w-]+\)/g, "");
    // A wrapped value ("…160ms ease, …") on a line of its own.
    if (/\b\d+(?:\.\d+)?m?s\s+(?:ease|linear)|cubic-bezier\(/.test(bare))
      return true;
    if (!/\b(?:transition|animation)\b/.test(line)) return false;
    return /\b\d+(?:\.\d+)?m?s\b|cubic-bezier\(|\bease(?:-in|-out|-in-out)?\b/.test(
      bare,
    );
  };
  const found = files(root).flatMap((path) =>
    readFileSync(path, "utf8")
      .split("\n")
      .map((line, index) => ({ line, at: `${path}:${index + 1}` }))
      .filter(({ line }) => handWritten(line))
      // A hover card leaves in 80 ms, under any token; the sessions'
      // pulse is a loop and keeps its own length and curve.
      .filter(({ line }) => !/app-tip-out 80ms|session-pulse 1\.4s/.test(line)),
  );
  assert.deepEqual(
    found.map(({ at, line }) => `${at} ${line.trim()}`),
    [],
  );
});
