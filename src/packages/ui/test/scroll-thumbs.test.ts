import { test } from "node:test";
import assert from "node:assert/strict";
import { thumbSpan } from "../src/lib/scroll-thumbs.ts";

test("a box that does not overflow draws no thumb", () => {
  assert.equal(thumbSpan(0, 400, 400, 400, 0), null);
  assert.equal(thumbSpan(0, 400, 400, 300, 0), null);
});

test("the thumb runs from the top inset to the bottom inset as the box scrolls", () => {
  // 400 tall showing half of 800: the track is 396, the thumb half of it.
  assert.deepEqual(thumbSpan(100, 400, 400, 800, 0), {
    start: 102,
    length: 198,
  });
  assert.deepEqual(thumbSpan(100, 400, 400, 800, 400), {
    start: 300,
    length: 198,
  });
});

test("a long list keeps a thumb big enough to see, and overscroll stays on the track", () => {
  const span = thumbSpan(0, 200, 200, 100_000, 200_000);
  assert.deepEqual(span, { start: 174, length: 24 });
});
