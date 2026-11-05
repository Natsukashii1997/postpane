import { test } from "node:test";
import assert from "node:assert/strict";
import { hoverMayOpen } from "../src/request-hover.ts";

const marks = ["claude", "codex", "hermes"];

test("with nothing waiting, any hover opens", () => {
  assert.equal(
    hoverMayOpen({
      requestKey: null,
      markKeys: marks,
      pointerKey: "codex",
      notch: false,
    }),
    true,
  );
});

test("while Claude waits, only Claude's mark opens", () => {
  const at = (pointerKey: string | null) =>
    hoverMayOpen({
      requestKey: "claude",
      markKeys: marks,
      pointerKey,
      notch: false,
    });
  assert.equal(at("claude"), true);
  assert.equal(at("codex"), false);
  assert.equal(at(null), false);
});

test("a waiting agent with no mark, or the notch, keeps any hover opening", () => {
  assert.equal(
    hoverMayOpen({
      requestKey: "cursor",
      markKeys: marks,
      pointerKey: "codex",
      notch: false,
    }),
    true,
  );
  assert.equal(
    hoverMayOpen({
      requestKey: "claude",
      markKeys: [],
      pointerKey: null,
      notch: true,
    }),
    true,
  );
});

test("a hover from outside the strip (the request's own chip) still opens", () => {
  assert.equal(
    hoverMayOpen({
      requestKey: "claude",
      markKeys: marks,
      pointerKey: undefined,
      notch: false,
    }),
    true,
  );
});
