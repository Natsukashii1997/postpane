import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// A failed native call shows once: where the page shows it, or as a toast
// where the page has no place for it, never both (#259 A6).
const root = fileURLToPath(new URL("../src/", import.meta.url));
const files = readdirSync(root, { recursive: true, encoding: "utf8" })
  .filter((name) => /\.tsx?$/.test(name))
  .map((name) => ({ name, source: readFileSync(`${root}${name}`, "utf8") }));

/** The statement that starts at `start`: up to its `;` outside brackets. */
function statement(source: string, start: number) {
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if ("([{".includes(char)) depth += 1;
    else if (")]}".includes(char)) depth -= 1;
    else if (char === ";" && depth === 0) return source.slice(start, index);
  }
  return source.slice(start);
}

test("no catch both toasts a failure and passes it on to a caller that shows it", () => {
  const both: string[] = [];
  for (const { name, source } of files)
    for (const match of source.matchAll(/catch \((\w+)\) \{([^{}]*)\}/g))
      if (
        /toast\./.test(match[2]) &&
        new RegExp(`throw ${match[1]}\\b`).test(match[2])
      )
        both.push(`${name}:${source.slice(0, match.index).split("\n").length}`);
  assert.deepEqual(both, []);
});

test("a native call whose page has no place for its failure toasts it, not drops it", () => {
  const dropped: string[] = [];
  const call = /void (?:act|action|actionRef\s*\.current)\(\s*"[a-z_]+"/g;
  for (const { name, source } of files)
    for (const match of source.matchAll(call)) {
      const text = statement(source, match.index);
      const handled =
        /\.catch\(\s*\(\w+(?::[^)]*)?\)\s*=>/.test(text) ||
        /\.then\([\s\S]*,\s*\(\w+\)\s*=>/.test(text);
      if (!handled)
        dropped.push(
          `${name}:${source.slice(0, match.index).split("\n").length}`,
        );
    }
  assert.deepEqual(dropped, []);
});

test("the quota history shows a failure over the last answer it keeps", () => {
  const { source } = files.find(
    ({ name }) => name === "statistics/QuotaHistory.tsx",
  )!;
  assert.ok(
    !source.includes("{error && !data &&"),
    "the failure is not hidden while an answer shows",
  );
  assert.ok(source.includes("{error && ("), "the failure shows");
});
