import { test } from "node:test";
import assert from "node:assert/strict";
import { alertPalette, quotaWordAccent } from "../src/alerts/alert-tones.ts";
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

test("a folded quota on paper: warning ochre, reset in the word ink, used up red (#308)", () => {
  for (const light of [true, false]) {
    const paper = paperOf(light);
    const ground = { light, opaque: true } as never;
    assert.equal(quotaWordAccent("warning", ground, paper), paper.ochre);
    assert.equal(quotaWordAccent("reset", ground, paper), paper.word);
    assert.equal(quotaWordAccent("critical", ground, paper), paper.red);
    assert.equal(quotaWordAccent("none", ground, paper), paper.dim);
  }
});
