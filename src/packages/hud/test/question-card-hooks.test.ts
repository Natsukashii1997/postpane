import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// React counts a component's hooks on every render: a hook called after an
// early return is skipped whenever that return is taken, and a card that
// switches between the two (its client stops or starts taking answers) throws
// "Rendered fewer hooks than expected" and takes the side panel down.
const source = readFileSync(
  new URL("../src/permissions/PermissionQuestionCard.tsx", import.meta.url),
  "utf8",
);

/** The component's body, line by line (two spaces deep, as Prettier writes it). */
function body(name: string) {
  const lines = source.split("\n");
  const start = lines.findIndex((line) =>
    line.startsWith(`export function ${name}(`),
  );
  assert.ok(start >= 0, `${name} is in the file`);
  const end = lines.findIndex((line, index) => index > start && line === "}");
  return lines.slice(start, end).map((text, index) => ({
    text,
    line: start + index + 1,
  }));
}

test("the question card calls every hook before it can return (#259 A3)", () => {
  const lines = body("PermissionQuestionCard");
  let statement = "";
  let firstReturn: number | null = null;
  const hooks: number[] = [];
  for (const { text, line } of lines) {
    if (/^ {2}\S/.test(text)) statement = text;
    const returns =
      /^ {2}if \(.*\)\s*return\b/.test(text) ||
      (/^ {4}return\b/.test(text) && statement.startsWith("  if ("));
    if (returns && firstReturn === null) firstReturn = line;
    if (/^ {2}(?:const [^=]+= )?use[A-Z]\w*\(/.test(text)) hooks.push(line);
  }
  assert.ok(hooks.length > 0, "the card has hooks");
  assert.ok(firstReturn !== null, "the card has an early return");
  const late = hooks.filter((line) => line > firstReturn!);
  assert.deepEqual(
    late,
    [],
    `hooks on lines ${late.join(", ")} come after the return on line ${firstReturn}`,
  );
});
