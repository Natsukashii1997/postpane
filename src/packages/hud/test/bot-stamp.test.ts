import { test } from "node:test";
import assert from "node:assert/strict";
import { stampFigure } from "../src/panel/bot-stamp.ts";

test("the default Hermes home is 猛鬼兽, the agumon profile 亚古兽", () => {
  assert.equal(stampFigure({ id: "default", name: "猛鬼兽" }), "ogre");
  assert.equal(stampFigure({ id: "agumon", name: "亚古兽" }), "agumon");
});

test("another profile has no figure and gets its name's first character", () => {
  assert.equal(stampFigure({ id: "gabumon", name: "加布兽" }), null);
});
