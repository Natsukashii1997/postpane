import { test } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EngineClient } from "../src/index.ts";

// Starting a stand-in engine gets a deadline of its own (LESSONS L-48): on a
// busy machine a script written a moment ago can take seconds to start.
const START = 60_000;

// Audit 2026-11-11 (#351 B14): after a timeout the client starts a new
// engine; half a line the old one still writes on its way out must not land
// in the new one's buffer and kill it.
test("an old engine's late output leaves the new engine alone", async () => {
  const folder = mkdtempSync(join(tmpdir(), "engine-client-"));
  const engine = join(folder, "engine");
  const marker = join(folder, "started-once");
  writeFileSync(
    engine,
    `#!${process.execPath}
const fs = require("node:fs");
const answer = (line, result, after) => {
  const { id } = JSON.parse(String(line));
  setTimeout(() => process.stdout.write(JSON.stringify({ id, result }) + "\\n"), after);
};
if (!fs.existsSync(${JSON.stringify(marker)})) {
  fs.writeFileSync(${JSON.stringify(marker)}, "");
  // The first engine says once that it is up and never answers again; told
  // to stop, it writes half a frame late.
  process.on("SIGTERM", () => {
    setTimeout(() => {
      process.stdout.write('{"id":2,');
      setTimeout(() => process.exit(0), 50);
    }, 20);
  });
  process.stdin.once("data", (line) => answer(line, "up", 0));
  setInterval(() => {}, 1000);
} else {
  process.stdin.once("data", (line) => answer(line, "fresh", 200));
}
`,
  );
  chmodSync(engine, 0o755);
  const client = new EngineClient(engine);
  try {
    // The first engine is running, with its marker written and its SIGTERM
    // handler in place, before the short deadline under test begins. An
    // engine stopped before it ran would leave the second one without the
    // marker, playing the first one's part and never answering (#393).
    assert.equal(
      await client.request("snapshot", {}, { timeoutMs: START }),
      "up",
    );
    await assert.rejects(client.request("snapshot", {}, { timeoutMs: 1500 }));
    assert.equal(
      await client.request("snapshot", {}, { timeoutMs: START }),
      "fresh",
    );
  } finally {
    client.close();
    rmSync(folder, { recursive: true, force: true });
  }
});
