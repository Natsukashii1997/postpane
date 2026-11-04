import { test } from "node:test";
import assert from "node:assert/strict";
import { receiptSheetInset } from "../src/scene/receipt-sheet.ts";

const frame = { x: 900, y: 100, width: 560, height: 800 };

test("a card apart from the dock is printed on its whole frame", () => {
  assert.deepEqual(receiptSheetInset(false, "right", frame, frame, 12), {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });
});

test("a panel grown from a right dock stops short of the stubs and the flare", () => {
  // The stubs stand 40 wide at the screen's right edge, inside the frame.
  const strip = { x: 1420, y: 300, width: 40, height: 200 };
  assert.deepEqual(receiptSheetInset(true, "right", frame, strip, 12), {
    top: 12,
    bottom: 12,
    left: 0,
    right: 40 + 10,
  });
});

test("on a top dock the sheet starts below the stubs, inside the side flares", () => {
  const top = { x: 400, y: 0, width: 600, height: 400 };
  const strip = { x: 600, y: 0, width: 200, height: 50 };
  assert.deepEqual(receiptSheetInset(true, "top", top, strip, 12), {
    top: 50 + 10,
    bottom: 0,
    left: 12,
    right: 12,
  });
});
