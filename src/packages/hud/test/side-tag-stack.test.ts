import { test } from "node:test";
import assert from "node:assert/strict";
import { clearOf } from "../src/scene/side-tag-stack.ts";

const rect = (x: number, y: number, width = 170, height = 30) => ({
  x,
  y,
  width,
  height,
});

test("a tag that meets none stays by its mark", () => {
  assert.deepEqual(
    clearOf(rect(900, 300), [rect(900, 210)], "right"),
    rect(900, 300),
  );
});

test("on the top edge a tag that meets another drops a row below it", () => {
  assert.deepEqual(
    clearOf(rect(260, 81), [rect(226, 81, 255, 26)], "top"),
    rect(260, 81 + 26 + 4),
  );
});

test("on the bottom edge it rises a row; past several it keeps going", () => {
  assert.deepEqual(
    clearOf(rect(260, 800), [rect(226, 800), rect(300, 766)], "bottom"),
    rect(260, 732),
  );
});

test("on a side edge it steps away from the screen's edge", () => {
  assert.deepEqual(
    clearOf(rect(900, 300), [rect(880, 290, 200)], "right"),
    rect(880 - 4 - 170, 300),
  );
  assert.deepEqual(
    clearOf(rect(57, 300), [rect(57, 290, 200)], "left"),
    rect(57 + 200 + 4, 300),
  );
});
