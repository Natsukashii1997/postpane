import { test } from "node:test";
import assert from "node:assert/strict";
import type { Quota } from "@agent-hud/protocol";
import { receiptRows } from "../src/receipt.ts";
import { perforatedSide, perforationMask } from "../src/ticket-stub.ts";

const row = (
  name: string,
  usedPercent: number | null,
  status: Quota["status"] = "normal",
): Quota =>
  ({
    id: `claude:${name}`,
    vendor: "claude",
    name,
    usedPercent,
    status,
  }) as Quota;

const session = row("session", 8);
const weekly = row("weekly", 32);
const opus = row("weekly-opus", 12);
const sonnet = row("weekly-sonnet", 40);

test("an account lists its two tightest windows, in their own order", () => {
  assert.deepEqual(receiptRows([session, weekly, opus, sonnet], undefined), [
    weekly,
    sonnet,
  ]);
  assert.deepEqual(receiptRows([session, weekly, opus], {}), [weekly, opus]);
});

test("a stale or unread window gives way to any read one", () => {
  const stale = row("stale", 90, "stale");
  const unread = row("unread", null);
  assert.deepEqual(receiptRows([stale, unread, session, opus], undefined), [
    session,
    opus,
  ]);
});

test("ties keep the first windows; two or fewer are all listed", () => {
  const a = row("a", 10),
    b = row("b", 10),
    c = row("c", 10);
  assert.deepEqual(receiptRows([a, b, c], undefined), [a, b]);
  assert.deepEqual(receiptRows([session, weekly], undefined), [
    session,
    weekly,
  ]);
});

test("once Settings chose rows, every row it left shown is listed", () => {
  const rows = [session, weekly, opus, sonnet];
  assert.deepEqual(receiptRows(rows, { hiddenRows: [] }), rows);
  assert.deepEqual(receiptRows(rows, { hiddenRows: ["gone"] }), rows);
});

test("the receipt's holes face into the screen, like a stub's", () => {
  assert.equal(perforatedSide("right"), "left");
  assert.equal(perforatedSide("left"), "right");
  assert.equal(perforatedSide("top"), "bottom");
  assert.match(perforationMask("left", 1.4), /circle at 0 7px.*repeat-y$/);
  assert.match(perforationMask("bottom", 1), /circle at 5px 100%.*repeat-x$/);
});
