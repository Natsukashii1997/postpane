import { test } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EngineClient } from "../src/index.ts";

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
if (!fs.existsSync(${JSON.stringify(marker)})) {
  fs.writeFileSync(${JSON.stringify(marker)}, "");
  // The first engine never answers; told to stop, it writes half a frame late.
  process.on("SIGTERM", () => {
    setTimeout(() => {
      process.stdout.write('{"id":1,');
      setTimeout(() => process.exit(0), 50);
    }, 20);
  });
  setInterval(() => {}, 1000);
} else {
  process.stdin.once("data", (line) => {
    const { id } = JSON.parse(String(line));
    setTimeout(() => process.stdout.write(JSON.stringify({ id, result: "fresh" }) + "\\n"), 200);
  });
}
`,
  );
  chmodSync(engine, 0o755);
  const client = new EngineClient(engine);
  try {
    await assert.rejects(client.request("snapshot", {}, { timeoutMs: 1500 }));
    assert.equal(await client.request("snapshot"), "fresh");
  } finally {
    client.close();
    rmSync(folder, { recursive: true, force: true });
  }
});
