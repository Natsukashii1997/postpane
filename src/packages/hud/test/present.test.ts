import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) =>
  readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

test("a view on its way out takes no key press (ENG-07)", () => {
  const present = read("scene/Present.tsx");
  assert.equal(
    present.match(/\{\.\.\.useLeaving<HTML\w+Element>\(\)\}/g)?.length,
    2,
  );
  // Old WebKit ignores inert (before macOS 12.4): the view leaving also
  // swallows clicks and keys and lets go of focus, round 2 of ENG-07.
  // Measured in the system WKWebView: evidence webkit-r2/leaving*.txt and,
  // for the card leaving with its views inside, webkit-r3/r3*.txt; for the
  // peek's own button, a view called back, and presses, webkit-r4/r4-*.txt.
  for (const part of [
    /inert: true/,
    /onClickCapture: stop/,
    /onKeyDownCapture: stop/,
    /onFocusCapture: letGo/,
    // Round 3: hidden from VoiceOver, and out of Tab's order.
    /"aria-hidden": true/,
    /control\.tabIndex = -1;/,
    // Round 4: the view itself too (a peek is one button), and no new
    // press, drag or wheel gets in.
    /\[\s*root,\s*\.\.\.root\.querySelectorAll<HTMLElement>\(TABBABLE\),?\s*\]/,
    /onPointerDownCapture: halt/,
    /onPointerMoveCapture: halt/,
    /onWheelCapture: halt/,
    // Round 5: what React writes or adds while the view leaves is followed
    // (the queued changes first, when it is called back), and only where
    // WebKit has no inert; webkit-r5/r5t-*.txt.
    /new MutationObserver\(/,
    /attributeFilter: \["tabindex"\]/,
    /note\(watch\.takeRecords\(\)\);\s*watch\.disconnect\(\);/,
    /return KNOWS_INERT \? undefined : outOfTabs\(view\);/,
    // Round 6: a batch's values are all read before any is written, so one
    // written twice keeps React's last value (webkit-r6/r6-*.txt).
    /for \(const control of written\)\s*was\.set\(control, control\.getAttribute\("tabindex"\)\);\s*for \(const control of written\) control\.tabIndex = -1;/,
    /view\.contains\(held\)\) held\.blur\(\)/,
  ])
    assert.match(present, part);
  // A release and a cancel still go through, so a gesture begun before the
  // view started leaving ends as it does (webkit-r5/r5-gesture-*.txt).
  assert.doesNotMatch(present, /onPointer(Up|Cancel)Capture/);
  // The card's three views and the panel's content cross-fade through them.
  const surface = read("scene/HUDExpandedSurface.tsx");
  assert.match(surface, /<PresentButton\s+\/\/[^\n]*\n\s*key=\{`peek-/);
  assert.match(surface, /<PresentDiv key="tag"/);
  // ENG-19: the whole card and its content layer leave through it too, or
  // a view inside them, itself still present, kept taking keys.
  assert.equal(surface.match(/<PresentDiv\b/g)?.length, 5);
  assert.doesNotMatch(surface, /<motion\.div\b/);
  assert.doesNotMatch(surface, /<motion\.(button|div)[^>]*\{\.\.\.swap\(/);
});
