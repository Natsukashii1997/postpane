import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) =>
  readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

test("a view on its way out takes no key press (ENG-07)", () => {
  const present = read("scene/Present.tsx");
  assert.equal(present.match(/inert=\{!useIsPresent\(\)\}/g)?.length, 2);
  // The card's three views and the panel's content cross-fade through them.
  const surface = read("scene/HUDExpandedSurface.tsx");
  assert.match(surface, /<PresentButton\s+\/\/[^\n]*\n\s*key=\{`peek-/);
  assert.match(surface, /<PresentDiv key="tag"/);
  assert.equal(surface.match(/<PresentDiv\b/g)?.length, 3);
  assert.doesNotMatch(surface, /<motion\.(button|div)[^>]*\{\.\.\.swap\(/);
});
