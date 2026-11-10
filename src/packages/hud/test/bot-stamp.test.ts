import { test } from "node:test";
import assert from "node:assert/strict";
import { sealInk, stampFigure } from "../src/panel/bot-stamp.ts";

test("the default Hermes home is 猛鬼兽, the agumon profile 亚古兽", () => {
  assert.equal(stampFigure({ id: "default", name: "猛鬼兽" }), "ogre");
  assert.equal(stampFigure({ id: "agumon", name: "亚古兽" }), "agumon");
});

test("another profile has no figure and gets its name's first character", () => {
  assert.equal(stampFigure({ id: "gabumon", name: "加布兽" }), null);
});

test("亚古兽's seal is wisteria, 猛鬼兽's and any other vermilion (#299)", () => {
  const agumon = { id: "agumon", name: "亚古兽" };
  const ogre = { id: "default", name: "猛鬼兽" };
  const other = { id: "gabumon", name: "加布兽" };
  assert.equal(sealInk(agumon, false), "#b89ae8");
  assert.equal(sealInk(agumon, true), "#6b4a9c");
  assert.equal(sealInk(ogre, false), "#e7826f");
  assert.equal(sealInk(ogre, true), "#a83a2c");
  assert.equal(sealInk(other, true), "#a83a2c");
});
