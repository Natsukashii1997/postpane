import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
const global = read("../../ui/src/global.css");
const settings = read("../src/settings/settings.css");
const receipt = read("../src/settings/receipt.css");

/** The declarations of the rules for exactly this selector. */
function rules(css: string, selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...css.matchAll(new RegExp(`(?:^|\\n)${escaped} \\{([^}]*)\\}`, "g"))]
    .map((match) => match[1])
    .join("\n");
}

// A trackpad scroll past the end bounced the whole Settings page, and macOS
// could leave the bounce stuck part way: the page drawn a row higher while
// the fixed sidebar still took clicks at its old place (#259 A4).
test("an app window never bounces as a whole page", () => {
  assert.match(rules(global, "html"), /overscroll-behavior:\s*none/);
});

test("the Settings sidebar is a column of the window, not fixed on top of it", () => {
  for (const [name, css, selector] of [
    ["settings.css", settings, ".apple-sidebar"],
    ["receipt.css", receipt, ".apple-app .apple-sidebar"],
  ] as const) {
    assert.doesNotMatch(rules(css, selector), /position:\s*fixed/, name);
  }
  // Still the box the receipt's printer slot is placed in, as a fixed box was:
  // the slot spans the sidebar, not the window.
  assert.match(rules(settings, ".apple-sidebar"), /position:\s*relative/);
  // Nothing makes room for a fixed sidebar any more.
  assert.doesNotMatch(rules(settings, ".apple-content"), /margin-left/);
});
