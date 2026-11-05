import { test } from "node:test";
import assert from "node:assert/strict";
import type { IslandEvent } from "@agent-hud/protocol";
import { glowAlert } from "../src/glow-alert.ts";
import { isQuotaEvent } from "../src/alerts/quota-list.ts";

const offline: IslandEvent = {
  id: "hermes:agumon:offline:1",
  kind: "bot-offline",
  at: "2026-11-05T12:00:00Z",
  source: "hermes",
  title: "亚古兽",
  message: "飞书断线",
  bot: { id: "agumon", name: "亚古兽" },
};

test("a Hermes bot going offline is a strip like a sign-out", () => {
  assert.equal(isQuotaEvent(offline), true);
});

test("it glows as a warning", () => {
  assert.equal(
    glowAlert({ id: offline.id, kind: "bot-offline", vendor: "hermes" }, [
      "hermes",
    ])?.color,
    "#e9a16d",
  );
});
