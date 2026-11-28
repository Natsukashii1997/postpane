// 本机同一时刻只跑一份全量测试或打包（L-91）：2026-11-28 四份全量和三次打包同时跑，负载 211，计时测试成片误报。
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, enqueue, readOwner } from "../src/tooling/heavy-queue.mjs";

function place(t) {
  const root = mkdtempSync(join(tmpdir(), "heavy-queue-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return join(root, "heavy-queue");
}

function occupy(dir, owner) {
  mkdirSync(dir);
  writeFileSync(join(dir, "owner.json"), JSON.stringify(owner));
}

const OTHER = {
  pid: 4242,
  what: "全量测试",
  cwd: "/w/reply-elsewhere",
  started: new Date(0).toISOString(),
};

test("位子空着就直接占上，写下是谁；做完放手", async (t) => {
  const dir = place(t);
  const lines = [];
  const done = await enqueue(
    { pid: 7, what: "全量测试" },
    { dir, log: (l) => lines.push(l), chain: [7] },
  );
  assert.equal(readOwner(dir).pid, 7);
  assert.equal(readOwner(dir).what, "全量测试");
  done();
  assert.equal(readOwner(dir), null);
  assert.deepEqual(lines, []);
});

test("别的会话占着：排队，每分钟说一次在等谁；它跑完就轮到自己", async (t) => {
  const dir = place(t);
  occupy(dir, OTHER);
  const lines = [];
  let clock = 0;
  const done = await enqueue(
    { pid: 7, what: "打包" },
    {
      dir,
      log: (l) => lines.push(l),
      chain: [7, 1],
      isAlive: (pid) => pid === 4242,
      now: () => clock,
      every: 5000,
      sleep: async (ms) => {
        clock += ms;
        if (clock >= 125_000) rmSync(dir, { recursive: true, force: true });
      },
    },
  );
  assert.equal(readOwner(dir).pid, 7);
  const waiting = lines.filter((l) => l.startsWith("排队："));
  assert.equal(waiting.length, 3, lines.join("\n")); // 0、60、120 秒各一次
  assert.match(waiting[0], /全量测试（reply-elsewhere，进程 4242/);
  assert.match(lines.at(-1), /排到了，开始打包（排了 2 分钟）/);
  done();
});

test("占位的进程已经不在了：直接接手，不排队", async (t) => {
  const dir = place(t);
  occupy(dir, OTHER);
  const lines = [];
  const done = await enqueue(
    { pid: 7, what: "全量测试" },
    {
      dir,
      log: (l) => lines.push(l),
      chain: [7],
      isAlive: () => false,
      sleep: () => assert.fail("不该等"),
    },
  );
  assert.equal(readOwner(dir).pid, 7);
  assert.deepEqual(lines, []);
  done();
});

test("占位的是自己的上级（全量测试里又起了编引擎）：不排队，放手也不动人家的位子", async (t) => {
  const dir = place(t);
  occupy(dir, { ...OTHER, pid: 50 });
  const done = await enqueue(
    { pid: 7, what: "编打包用的程序" },
    {
      dir,
      chain: [7, 30, 50, 1],
      isAlive: () => true,
      sleep: () => assert.fail("不该等"),
    },
  );
  done();
  assert.equal(readOwner(dir).pid, 50);
});

test("占了位子一分钟还没写下是谁，当成没人；不到一分钟就等", async (t) => {
  const dir = place(t);
  mkdirSync(dir);
  let clock = Date.now();
  let slept = 0;
  const done = await enqueue(
    { pid: 7, what: "全量测试" },
    {
      dir,
      log: () => {},
      chain: [7],
      now: () => clock,
      sleep: async (ms) => {
        slept += ms;
        clock += ms;
      },
    },
  );
  assert.ok(slept >= 60_000 && slept <= 65_000, `等了 ${slept}`);
  assert.equal(readOwner(dir).pid, 7);
  done();
  mkdirSync(dir);
  const old = (Date.now() - 120_000) / 1000;
  utimesSync(dir, old, old);
  const again = await enqueue(
    { pid: 8, what: "打包" },
    { dir, chain: [8], sleep: () => assert.fail("不该等") },
  );
  assert.equal(readOwner(dir).pid, 8);
  again();
});

test("等的提示写清是谁、在哪、跑了多久", () => {
  assert.equal(
    describe({ ...OTHER, started: new Date(0).toISOString() }, 7 * 60_000),
    "全量测试（reply-elsewhere，进程 4242，已跑 7 分钟）",
  );
  assert.equal(describe(null), "有人刚占上，还没写下是谁");
});

test("pnpm test 和生成打包资源都先排队（L-91）", () => {
  const all = readFileSync("src/tooling/test-all.mjs", "utf8");
  assert.match(
    all,
    /await enqueue\(\{ pid: process\.pid, what: "全量测试" \}\)/,
  );
  assert.ok(
    all.indexOf("await enqueue") < all.indexOf("runSuites(SUITES)"),
    "先排队再跑",
  );
  const resources = readFileSync("src/tooling/package-resources.mjs", "utf8");
  assert.ok(
    resources.indexOf("await enqueue") < resources.indexOf('run("cargo"'),
    "先排队再编引擎",
  );
  assert.match(resources, /pid: build \?\? process\.pid/);
});
