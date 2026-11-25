import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { cardFolds, foldStore, rowsMove } from "../src/panel/fold-store.ts";
import { closesWith } from "../src/scene/close-with-sidebar.ts";

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
  assert.match(
    read("HUDScene.tsx"),
    /useCloseWithSidebar\(open, Boolean\(event \|\| request\)\);/,
  );
  const close = read("scene/close-with-sidebar.ts");
  assert.match(close, /openHandoffCard\(null\);/);
  assert.match(close, /cardFolds\.reset\(\);/);
  // Each section of a card has a key of its own place.
  assert.match(read("panel/SourceSessions.tsx"), /place=\{focusVendor\}/);
  assert.equal(typeof cardFolds.reset, "function");
});

// #448: with a tag still out (a request waiting, a reply unseen) the sidebar
// never counted as folded, so a list opened on the card stayed open the next
// time it came out. Lists fold back once the card closes, tag or no tag; the
// handoff card still waits for the sidebar to fold away.
test("lists fold back when the card closes, even with a tag still out", () => {
  assert.deepEqual(closesWith(true, false), { handoff: false, folds: false });
  assert.deepEqual(closesWith(true, true), { handoff: false, folds: false });
  assert.deepEqual(closesWith(false, true), { handoff: false, folds: true });
  assert.deepEqual(closesWith(false, false), { handoff: true, folds: true });
});

test("only the list just opened or folded moves its rows, not another list", () => {
  const store = foldStore();
  let toggle = () => {};
  const seen: Record<string, boolean> = {};
  const List = ({ name, grab }: { name: string; grab?: boolean }) => {
    const [, flip, moving] = store.use(name);
    if (grab) toggle = flip;
    seen[name] = moving > 0;
    return null;
  };
  const draw = () =>
    renderToStaticMarkup(
      createElement(
        "b",
        null,
        createElement(List, { name: "claude:running", grab: true }),
        createElement(List, { name: "codex:waiting" }),
      ),
    );
  draw();
  // Rows that come and go for other reasons (an answer, a removal) just go.
  assert.deepEqual(seen, { "claude:running": false, "codex:waiting": false });
  toggle();
  draw();
  // ENG-03: another list changing in the same moment does not move.
  assert.deepEqual(seen, { "claude:running": true, "codex:waiting": false });
});

// ENG-03, second round: within a fold's window, the same list's rows changing
// for another reason (an answer, a removal) moved as if the fold took them.
test("only the rows a fold itself brings or takes move, not a later change", () => {
  const fold = 1000;
  // Not folded just now: nothing moves.
  assert.equal(rowsMove(null, 0, "a"), false);
  assert.equal(rowsMove({ fold: 0, rows: "a" }, 0, "a\nb"), false);
  // The render the fold causes moves what it brings or takes.
  assert.equal(rowsMove({ fold: 0, rows: "a" }, fold, "a\nb\nc"), true);
  // A list first drawn inside a fold (a group the fold brought) moves too.
  assert.equal(rowsMove(null, fold, "x\ny"), true);
  // Later renders in the window keep the fold's rows moving...
  assert.equal(rowsMove({ fold, rows: "a\nb\nc" }, fold, "a\nb\nc"), true);
  // ...but rows that change then (an answer came, one was removed) do not.
  assert.equal(rowsMove({ fold, rows: "a\nb\nc" }, fold, "a\nc"), false);
  assert.equal(rowsMove({ fold, rows: "a\nb\nc" }, fold, "a\nb\nc\nd"), false);
  // Folding again inside the window is a fold of its own.
  assert.equal(rowsMove({ fold, rows: "a\nb\nc" }, fold + 300, "a"), true);
});

test("each list goes by its rows: a group's list by its own, under the card's fold", () => {
  const fold = read("permissions/FoldButton.tsx");
  assert.match(
    fold,
    /const moving = useContext\(FoldMotion\) && rowsMove\(seen\.current, fold, rows\);/,
  );
  // What it saw is kept once drawn, not while drawing (a render may repeat).
  assert.match(
    fold,
    /useLayoutEffect\(\(\) => \{\s*seen\.current = \{ fold, rows \};/,
  );
  assert.match(fold, /<ParentFold\.Provider value=\{fold\}>/);
  assert.doesNotMatch(
    fold,
    /useContext\(Moving\);\s*const moving = useContext\(FoldMotion\) &&/,
  );
});

// ENG-08: the tray's hint stayed up once the keyboard moved on (Tab to
// 「收起」), and a fold's moving rows cut it off.
test("a tray block's hint goes when the pointer or the focus leaves it", () => {
  const tray = read("panel/SessionsSection.tsx");
  assert.match(tray, /onPointerLeave=\{\(\) => cool\(index\)\}/);
  assert.match(tray, /onBlur=\{\(\) => cool\(index\)\}/);
});

test("the copy that measures the panel draws a fold's rows at once", () => {
  // Only the panel in view lets rows move (FoldScope): the hidden copy
  // keeps the paper at the list's new height from the first frame.
  const surface = read("scene/HUDExpandedSurface.tsx");
  assert.match(surface, /<FoldScope\s+moves=\{!reduceMotion\}/);
  const fold = read("permissions/FoldButton.tsx");
  assert.match(fold, /const FoldMotion = createContext\(false\)/);
});

test("rows a fold takes away stop taking clicks while they fade", () => {
  const fold = read("permissions/FoldButton.tsx");
  const shut = fold.slice(fold.indexOf("shut:"), fold.indexOf("open:"));
  assert.equal(shut.match(/pointerEvents: "none"/g)?.length, 2);
  // Arrived, it follows the card again rather than forcing clicks on.
  const open = fold.slice(fold.indexOf("open:"), fold.indexOf("transitionEnd"));
  assert.match(open, /pointerEvents: "inherit"/);
  // Nor the keyboard: a leaving row is inert until it is gone.
  assert.match(
    fold,
    /const leaving = useLeaving<HTMLDivElement>\(\);\s*return \(\s*<motion\.div\s+\{\.\.\.leaving\}/,
  );
});

test("「在跑 n」 moves the running rows by its own fold, not the cards'", () => {
  // ENG-01: the board's fold was a store of its own, and the rows read the
  // cards' store, so they never moved when 「在跑 n」 opened.
  const rows = read("panel/PlaceRows.tsx");
  assert.match(rows, /const \[open, toggle, folding\] = boardFolds\.use\(/);
  assert.match(rows, /<FoldRows moving=\{folding\}>\s*\{rows\.running\.map/);
  // A card list hands its own fold down to the rows drawn in it.
  const sections = read("panel/WorkSections.tsx");
  assert.match(sections, /<ListFolding\.Provider value=\{folding\}>/);
});
