import { test } from "node:test";
import assert from "node:assert/strict";
import { clickMayPin, hoverMayOpen, onSidebar } from "../src/request-hover.ts";

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

test("while Claude waits, Claude's mark opens its card and another mark opens that agent's own peek (#243)", () => {
  const at = (pointerKey: string | null) =>
    hoverMayOpen({
      requestKey: "claude",
      markKeys: marks,
      pointerKey,
      notch: false,
    });
  assert.equal(at("claude"), true);
  assert.equal(at("codex"), true);
  // Between marks the strip stays resting.
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

test("a pendant hangs outside the sidebar: the native pointer on it is off the sidebar (#480)", () => {
  // Off the strip, on the notes or disk-slim ball: no mark reacts, no peek
  // stays or grows, as the browser's pointerleave already has it.
  assert.equal(onSidebar(true, true), false);
  assert.equal(onSidebar(true, false), true);
  assert.equal(onSidebar(false, false), false);
});

test("a click on another agent's mark pins its own card; on the front news's own mark or in the notch it does not (#359)", () => {
  assert.equal(clickMayPin("codex", undefined, "dynamic"), true);
  assert.equal(clickMayPin("codex", "claude", "dynamic"), true);
  assert.equal(clickMayPin("claude", "claude", "dynamic"), false);
  assert.equal(clickMayPin(undefined, "claude", "dynamic"), false);
  assert.equal(clickMayPin("codex", "claude", "notch"), false);
  assert.equal(clickMayPin("codex", undefined, "notch"), false);
});
