import { test } from "node:test";
import assert from "node:assert/strict";
import { alertPalette } from "../src/alerts/alert-tones.ts";
import { paperOf, paperLevel } from "../src/paper.ts";
import { alertFill } from "../src/tokens.ts";

test("off paper a notice keeps the HUD's alert tones", () => {
  const ground = { light: false };
  const colors = alertPalette(ground, null);
  assert.equal(colors.paper, null);
  assert.equal(colors.fill("turn"), alertFill("turn", ground));
});

test("on the receipt a reply is blue, a warning amber, controls solid ink", () => {
  for (const light of [true, false]) {
    const paper = paperOf(light);
    const colors = alertPalette({ light }, paper);
    assert.equal(colors.text("turn"), paper.blue);
    assert.equal(colors.text("warning"), paperLevel("warning", paper));
    assert.equal(colors.text("calm"), paper.ink);
    assert.equal(colors.fill("turn"), paper.ink);
    assert.equal(colors.onFill, paper.paper);
  }
});
