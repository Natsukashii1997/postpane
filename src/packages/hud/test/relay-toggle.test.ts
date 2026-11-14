import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Handoff } from "@agent-hud/protocol";
import { liveHandoffs } from "../src/alerts/handoff-doer.ts";
import { planeInks } from "../src/alerts/plane-inks.ts";
import { paperOf, relayPaperOf } from "../src/paper.ts";

// One button into a handoff card and back out (#341). #334 gave the card a ×
// beside its ↗; the owner wanted a single button instead, and chose 丙 on
// 2026-11-14: a paper plane in the ↗'s square, left of the stamp in both
// cards' heads. On the waiting card it opens the open handoff that moved
// last (a count on its corner when there are more); on the handoff card the
// same square is held down and goes back to what the sidebar showed.
const read = (path: string) =>
  readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

const handoff = (
  id: string,
  status: Handoff["status"],
  updatedAt: number,
  phaseAt?: number,
): Handoff =>
  ({ id, status, updatedAt, phaseAt, createdAt: 0, rounds: 0 }) as Handoff;

test("the open handoffs, the one that moved last first (#341)", () => {
  const listed = liveHandoffs([
    handoff("old", "open", 100),
    handoff("ended", "closed", 900),
    handoff("moved", "open", 50, 800),
    handoff("opening", "opening", 300),
    handoff("failed", "failed", 950),
  ]);
  assert.deepEqual(
    listed.map((h) => h.id),
    ["moved", "opening", "old"],
  );
  assert.deepEqual(liveHandoffs([handoff("ended", "closed", 1)]), []);
});

test("the plane is white, not the cards' blue (owner, 2026-11-14)", () => {
  const dark = paperOf(false);
  const waiting = planeInks(dark, false).inks;
  assert.equal(waiting.ink, "#ffffff");
  assert.equal(waiting.line, "#ffffff");
  assert.notEqual(waiting.ink, dark.blue);
  // The notch has no paper: white on its dark ground too.
  assert.equal(planeInks(null, false).inks.ink, "#ffffff");
  // Held down on the airmail paper: the paper's ink, a white plane on it.
  const relay = relayPaperOf(true);
  const held = planeInks(relay, true).inks;
  assert.equal(held.strong, relay.ink);
  assert.equal(held.onStrong, "#ffffff");
  // Light paper cannot show white: the unpressed square takes its ink.
  const light = paperOf(true);
  assert.equal(planeInks(light, false).inks.ink, light.ink);
});

test("the replies' card and an agent's board block carry the same plane, into their own relays (ADR-0001 C2, #359)", () => {
  const replies = read("alerts/CompletionAlertView.tsx");
  assert.match(
    replies,
    /toggle=\{\s*<EnterRelay\s+handoffs=\{cardRelays\(\s*handoffs,[\s\S]*?each\.event[\s\S]*?\)\}\s+paper=\{paper\}\s+zh=\{zh\}\s*\/>\s*\}/,
  );
  const heading = read("panel/BoardHeading.tsx");
  // Left of the stamp.
  assert.match(
    heading,
    /<EnterRelay\s+handoffs=\{relaysOf\(handoffs, vendor\)\}[\s\S]*?\/>\s*\{stamp && <Stamp/,
  );
  assert.match(
    read("panel/QuotaSection.tsx"),
    /<BoardHeading[\s\S]*?handoffs=\{snapshot\.handoffs\}/,
  );
});

test("the waiting card's head carries the plane, left of the stamp (#341)", () => {
  const content = read("permissions/ApprovalContent.tsx");
  assert.match(
    content,
    // Only the relays this card's agents take part in (ADR-0001 C2, #354).
    /toggle=\{\s*<EnterRelay\s+handoffs=\{cardRelays\(handoffs \?\? undefined, requests\)\}\s+paper=\{paper\}\s+zh=\{zh\}\s*\/>\s*\}/,
  );
  const head = read("permissions/ListHead.tsx");
  // After the count tags, before the stamp.
  assert.match(head, /<\/span>\s*\{toggle\}\s*\{\/\* The receipt's stamp/);
  const scene = read("HUDScene.tsx");
  assert.match(
    scene,
    /<ApprovalContent[\s\S]*?handoffs=\{snapshot\.handoffs\}/,
  );
});

test("on the waiting card the plane opens the handoff that moved last (#341)", () => {
  const toggle = read("alerts/RelayToggle.tsx");
  const enter = toggle.slice(toggle.indexOf("export function EnterRelay"));
  assert.match(enter, /const live = liveHandoffs\(handoffs \?\? \[\]\);/);
  assert.match(enter, /if \(!card \|\| live\.length === 0\) return null;/);
  assert.match(enter, /pressed=\{false\}/);
  assert.match(enter, /live\.length > 1\s*\? \{ text: String\(live\.length\)/);
  assert.match(enter, /onClick=\{\(\) => card\.open\(live\[0\]\.id\)\}/);
});

test("on the handoff card the same square, held down, goes back (#341)", () => {
  const toggle = read("alerts/RelayToggle.tsx");
  const leave = toggle.slice(
    toggle.indexOf("export function LeaveRelay"),
    toggle.indexOf("export function EnterRelay"),
  );
  assert.match(leave, /icon="relay"/);
  assert.match(leave, /\bpressed\b/);
  assert.match(leave, /退出接力/);
  assert.match(leave, /onClick=\{onLeave\}/);
  const head = read("alerts/HandoffHead.tsx");
  assert.match(
    head,
    /<LeaveRelay paper=\{paper\} zh=\{zh\} onLeave=\{onLeave\} \/>\s*<span\s+aria-hidden="true"/,
  );
  const card = read("alerts/HandoffCard.tsx");
  assert.match(card, /<HandoffHead[\s\S]*?onLeave=\{onClose\}/);
});

test("#334's × is gone; the task line keeps only its ↗ (#341)", () => {
  const title = read("alerts/HandoffTitleRow.tsx");
  assert.equal([...title.matchAll(/<GoButton/g)].length, 1);
  assert.doesNotMatch(title, /onClose|icon="close"/);
  const button = read("GoButton.tsx");
  assert.doesNotMatch(button, /\bX\b/);
  assert.match(button, /icon === "relay" \? Send : ArrowUpRight/);
  assert.match(button, /aria-pressed=\{pressed\}/);
});

test("the pointer leaving still keeps the card open (#334)", () => {
  const scene = read("HUDScene.tsx");
  assert.match(
    scene,
    /const sidebarShown = open \|\| Boolean\(event \|\| request\);/,
  );
});
