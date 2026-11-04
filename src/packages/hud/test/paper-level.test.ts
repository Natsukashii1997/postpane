import { test } from "node:test";
import assert from "node:assert/strict";
import { paperLevel, paperOf } from "../src/paper.ts";

test("on the receipt an ordinary reading is ink and only trouble is coloured", () => {
  for (const light of [true, false]) {
    const paper = paperOf(light);
    assert.equal(paperLevel("normal", paper), paper.ink);
    assert.equal(paperLevel("critical", paper), paper.red);
    assert.equal(paperLevel("stale", paper), paper.dim);
    assert.notEqual(paperLevel("warning", paper), paper.ink);
    assert.notEqual(paperLevel("warning", paper), paper.red);
  }
});
