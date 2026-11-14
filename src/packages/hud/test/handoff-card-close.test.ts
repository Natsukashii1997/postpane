import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// The handoff card stands in for what the sidebar showed until it closes or
// the sidebar folds away. A request waiting for its answer (#184) keeps the
// sidebar from folding, and before a handoff ends its foot has no 「知道了」,
// so the card had no way out but Escape (#334). The owner chose a × beside
// the card's ↗ that goes back (2026-11-14, 乙); the pointer leaving keeps it.
const read = (path: string) =>
  readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

test("the handoff card's task line hands its close to a × (#334)", () => {
  const card = read("alerts/HandoffCard.tsx");
  const row = card.match(/<HandoffTitleRow[\s\S]*?\/>/);
  assert.ok(row, "the card draws its task line with HandoffTitleRow");
  assert.match(row[0], /onClose=\{onClose\}/);
});

test("the × sits beside the ↗, says 返回 and closes the card (#334)", () => {
  const title = read("alerts/HandoffTitleRow.tsx");
  const buttons = [...title.matchAll(/<GoButton[\s\S]*?\/>/g)].map(
    (match) => match[0],
  );
  assert.equal(buttons.length, 2, "↗ to the session, then ×");
  const [go, close] = buttons;
  assert.doesNotMatch(go, /icon="close"/);
  assert.match(close, /icon="close"/);
  assert.match(close, /返回/);
  assert.match(close, /enabled\b(?!=)|enabled=\{true\}/);
  assert.match(close, /onClick=\{onClose\}/);
});

test("GoButton draws an × when asked, the ↗ otherwise (#334)", () => {
  const button = read("GoButton.tsx");
  assert.match(button, /icon === "close" \? \(\s*<X /);
  assert.match(button, /<ArrowUpRight /);
});

test("the pointer leaving still keeps the card open (#334, 乙)", () => {
  const scene = read("HUDScene.tsx");
  assert.match(
    scene,
    /const sidebarShown = open \|\| Boolean\(event \|\| request\);/,
  );
});
