// The command and event names the front end uses must be the ones the host
// actually registers and emits (7b). A rename on either side fails here
// instead of failing silently at run time.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { COMMANDS } from "../src/commands.ts";
import { HOST_EVENTS } from "../src/events.ts";

// Reads the host sources as data (like hud/test/director-cases.test.ts).
const root = join(import.meta.dirname, "..", "..", "..", "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

test("COMMANDS is exactly the host's generate_handler! list, in order", () => {
  const lib = read("src/crates/host/src/lib.rs");
  const block = lib.match(/generate_handler!\[([^\]]*)\]/);
  assert.ok(block, "generate_handler![...] not found in host/src/lib.rs");
  const registered = block[1]
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((path) => path.split("::").at(-1));
  assert.deepEqual([...COMMANDS], registered);
});

test("HOST_EVENTS is exactly the names in host/src/events.rs", () => {
  const source = read("src/crates/host/src/events.rs");
  const constants = [
    ...source.matchAll(/pub const (\w+): &str = "([^"]+)";/g),
  ].filter(([, name]) => name !== "SNAPSHOT"); // internal, never emitted
  assert.ok(constants.length > 0, "no event constants found in events.rs");
  assert.deepEqual(
    [...HOST_EVENTS].sort(),
    constants.map(([, , value]) => value).sort(),
  );
});

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

test("only app/src/lib/native.ts imports invoke, listen or emit", () => {
  const appSrc = join(root, "src/packages/app/src");
  const banned = { core: ["invoke"], event: ["listen", "emit"] } as const;
  const offenders: string[] = [];
  for (const file of sources(appSrc)) {
    const path = relative(appSrc, file);
    if (path === join("lib", "native.ts")) continue;
    const text = readFileSync(file, "utf8");
    const imports = text.matchAll(
      /import\s+([^;]*?)\s+from\s+["']@tauri-apps\/api\/(core|event)["']/g,
    );
    for (const [, clause, module] of imports) {
      const names = (clause.match(/\{([^}]*)\}/)?.[1] ?? "")
        .split(",")
        .map((name) => name.trim().split(/\s+as\s+/)[0]);
      const hit =
        clause.includes("*") ||
        names.some((name) =>
          (banned[module as keyof typeof banned] as readonly string[]).includes(
            name,
          ),
        );
      if (hit)
        offenders.push(`${path}: ${clause} from @tauri-apps/api/${module}`);
    }
  }
  assert.deepEqual(offenders, []);
});
