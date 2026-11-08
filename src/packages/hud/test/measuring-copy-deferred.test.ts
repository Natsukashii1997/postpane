import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// #264: the hidden copy that measures the panel for its next opening drew the
// whole usage panel in the same task as a card leaving (a request answered,
// a reply's 知道了): 53–131 ms long tasks in the preview's development build
// (evidence/2026-11-09-264-deferred-measure/). It now draws from a deferred
// value, as upstream e07cd7e does, so React draws it after what shows has
// changed. HUDScene.tsx cannot be imported under node --test (TSX); read it.
const source = readFileSync(
  new URL("../src/HUDScene.tsx", import.meta.url),
  "utf8",
);

/** A top-level function's body (Prettier puts its closing brace alone). */
function body(name: string) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} is in HUDScene.tsx`);
  const end = source.indexOf("\n}\n", start);
  return source.slice(start, end);
}

/** The JSX inside the hidden measuring element. */
function measuringElement() {
  const at = source.indexOf("data-hud-measurement");
  assert.ok(at >= 0, "the hidden measuring element is in HUDScene.tsx");
  const open = source.lastIndexOf("<div", at);
  const close = source.indexOf("\n          </div>", at);
  return source.slice(open, close);
}

test("the measuring copy draws from a deferred value of what it measures", () => {
  const copy = body("MeasuringCopy");
  const deferred = copy.match(/const (\w+) = useDeferredValue\(version\)/);
  assert.ok(deferred, "MeasuringCopy defers the version it is given");
  assert.match(
    copy,
    new RegExp(`<Redraw\\s+version=\\{${deferred[1]}\\}`),
    "Redraw only draws again once the deferred version catches up",
  );
});

test("the hidden copy is drawn through MeasuringCopy, not straight from measured", () => {
  const element = measuringElement();
  assert.match(element, /<MeasuringCopy\s+version=\{measured\}/);
  assert.doesNotMatch(element, /<Redraw\s+version=\{measured\}/);
});
