import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { cardFolds, foldStore } from "../src/panel/fold-store.ts";

// #430: the sidebar draws a panel twice, the one in view and a hidden copy
// that measures it. 「展开其余 n 条」 opened only in the copy in view left the
// card at its folded height, the rest scrolling inside it. Both copies now
// read one store, folded again when the sidebar closes (#374 unchanged).
const read = (path: string) =>
  readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

test("a list opened in one copy is open in the other, and folds back on reset", () => {
  const store = foldStore();
  let toggle = () => {};
  const List = ({ grab }: { grab?: boolean }) => {
    const [open, flip] = store.use("chatgpt:waiting");
    if (grab) toggle = flip;
    return createElement("i", null, open ? "open" : "folded");
  };
  const draw = () =>
    renderToStaticMarkup(
      createElement(
        "b",
        null,
        createElement(List, { grab: true }),
        createElement(List),
      ),
    );
  assert.equal(draw(), "<b><i>folded</i><i>folded</i></b>");
  toggle();
  // The copy in view and the measuring copy both open.
  assert.equal(draw(), "<b><i>open</i><i>open</i></b>");
  store.reset();
  assert.equal(draw(), "<b><i>folded</i><i>folded</i></b>");
});

test("the cards' lists use the shared store; the sidebar closing folds them", () => {
  assert.match(read("panel/WorkSections.tsx"), /cardFolds\.use\(foldKey\)/);
  assert.match(
    read("permissions/ApprovalContent.tsx"),
    /cardFolds\.use\("approvals"\)/,
  );
  assert.match(
    read("alerts/CompletionAlertView.tsx"),
    /cardFolds\.use\("replies"\)/,
  );
  for (const file of [
    "panel/WorkSections.tsx",
    "permissions/ApprovalContent.tsx",
    "alerts/CompletionAlertView.tsx",
  ])
    assert.doesNotMatch(read(file), /\[unfolded, setUnfolded\] = useState/);
  assert.match(read("HUDScene.tsx"), /useCloseWithSidebar\(sidebarShown\);/);
  const close = read("scene/close-with-sidebar.ts");
  assert.match(close, /openHandoffCard\(null\);/);
  assert.match(close, /cardFolds\.reset\(\);/);
  // Each section of a card has a key of its own place.
  assert.match(read("panel/SourceSessions.tsx"), /place=\{focusVendor\}/);
  assert.equal(typeof cardFolds.reset, "function");
});
