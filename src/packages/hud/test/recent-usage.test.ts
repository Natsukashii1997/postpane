import { test } from "node:test";
import assert from "node:assert/strict";
import { recentCost, recentLabel, recentUsage } from "../src/recent-usage.ts";

const provider = (
  id: string,
  recent: {
    tokens: number;
    costs: Record<string, number>;
    unpricedTokens: number;
  } | null,
) => ({
  id,
  name: id,
  detected: true,
  enabled: true,
  notice: null,
  sessions: 0,
  recent,
});

const snapshot = {
  providers: [
    provider("hermes", {
      tokens: 1_260_000,
      costs: {},
      unpricedTokens: 1_260_000,
    }),
    provider("claude", {
      tokens: 5_000,
      costs: { USD: 1.2 },
      unpricedTokens: 0,
    }),
    provider("codex", {
      tokens: 9_000,
      costs: { USD: 412.5 },
      unpricedTokens: 300,
    }),
    provider("kimi", {
      tokens: 9_000,
      costs: { CNY: 2, USD: 0.5 },
      unpricedTokens: 0,
    }),
    provider("pi", null),
    provider("opencode", { tokens: 700, costs: { USD: 0 }, unpricedTokens: 0 }),
  ],
} as never;

const label = (key: string) => recentLabel(recentUsage(snapshot, key));

test("an agent with no window shows its last 24 hours in tokens, never money, as vendors.rs writes them", () => {
  assert.equal(label("hermes"), "1.3M");
  assert.equal(label("claude"), "5.0k", "priced: still its tokens");
  assert.equal(label("openai"), "9.0k", "Codex under the OpenAI mark");
  assert.equal(label("kimi"), "9.0k", "two currencies: still its tokens");
  assert.equal(label("pi"), null, "nothing used: nothing to show");
  assert.equal(label("opencode"), "700", "a local model: its tokens");
});

test("the panel still prices the last 24 hours", () => {
  assert.equal(recentCost(recentUsage(snapshot, "claude")!, "en"), "≈$1.20");
  assert.equal(recentCost(recentUsage(snapshot, "opencode")!, "zh"), "免费");
});

test("recent usage sums the providers behind one mark", () => {
  const twice = {
    providers: [
      provider("codex", { tokens: 100, costs: { USD: 1 }, unpricedTokens: 0 }),
      provider("chatgpt", {
        tokens: 50,
        costs: { USD: 2 },
        unpricedTokens: 10,
      }),
    ],
  } as never;
  assert.deepEqual(recentUsage(twice, "openai"), {
    tokens: 150,
    costs: { USD: 3 },
    unpricedTokens: 10,
  });
  assert.equal(
    recentCost({ tokens: 10, costs: {}, unpricedTokens: 10 }, "en"),
    null,
  );
});
