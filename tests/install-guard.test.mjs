// install.sh 的装机锁与归属记录（L-05），以及装后冒烟接进装机流程（L-35）。
// 全在临时目录里跑：HOME、安装位、git 仓库都是临时的，osascript / pgrep / open / codesign / screencapture 是替身，
// sandbox() 会先核对替身生效，否则直接报错，不碰正在用的驿窗。
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  utimesSync,
  writeFileSync,
  chmodSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { frame, frames, sandbox } from "./install-stubs.mjs";

const SH = fileURLToPath(
  new URL(
    "../.agents/skills/postpane-round/scripts/install.sh",
    import.meta.url,
  ),
);

function git(cwd, ...args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null" },
  }).trim();
}

// 一个带 origin 的临时仓库：main 目录 + 两个会话各自的 worktree（分支 claude/a、claude/b，各多一个提交）
function repo(box) {
  const origin = join(box.dir, "origin.git");
  const main = join(box.dir, "main");
  git(box.dir, "init", "-q", "--bare", "-b", "main", origin);
  git(box.dir, "init", "-q", "-b", "main", main);
  for (const [k, v] of [
    ["user.name", "t"],
    ["user.email", "t@t"],
    ["commit.gpgsign", "false"],
  ])
    git(main, "config", k, v);
  writeFileSync(join(main, "a.txt"), "base\n");
  git(main, "add", ".");
  git(main, "commit", "-q", "-m", "base");
  git(main, "remote", "add", "origin", origin);
  git(main, "push", "-q", "-u", "origin", "main");
  const wt = {};
  for (const name of ["a", "b"]) {
    wt[name] = join(box.dir, `wt-${name}`);
    git(
      main,
      "worktree",
      "add",
      "-q",
      wt[name],
      "-b",
      `claude/${name}`,
      "origin/main",
    );
    writeFileSync(join(wt[name], `${name}.txt`), `${name}\n`);
    git(wt[name], "add", ".");
    git(wt[name], "commit", "-q", "-m", name);
  }
  return { main, ...wt };
}

// 假的打包产物：主程序内容不同，shasum 就不同
function build(box, name) {
  const app = join(box.dir, "builds", name, "PostPane.app");
  mkdirSync(join(app, "Contents/MacOS"), { recursive: true });
  writeFileSync(
    join(app, "Contents/MacOS/PostPane"),
    `#!/bin/sh\n# build ${name}\n`,
  );
  chmodSync(join(app, "Contents/MacOS/PostPane"), 0o755);
  return app;
}

// 替身截图按调用次序吐：第 1 张给装前，第 2、3 张给装后（小人挪了位置）
function moving(box) {
  return frames(join(box.dir, `frames-${Math.random()}`), [
    frame(10),
    frame(10),
    frame(20),
  ]);
}

function install(box, cwd, args, extra = {}) {
  return spawnSync("bash", [SH, ...args], {
    cwd,
    env: { ...box.env, STUB_FRAMES: moving(box), ...extra },
    encoding: "utf8",
  });
}

const STATE = (box) =>
  join(box.env.HOME, "Library/Application Support/postpane/install");
const installedBuild = (box) =>
  readFileSync(join(box.app, "Contents/MacOS/PostPane"), "utf8").match(
    /build (\S+)/,
  )?.[1];
const record = (box) =>
  Object.fromEntries(
    readFileSync(join(STATE(box), "installed.txt"), "utf8")
      .trim()
      .split("\n")
      .map((l) => l.split(/=(.*)/s).slice(0, 2)),
  );
const quits = (box) =>
  existsSync(box.log)
    ? (readFileSync(box.log, "utf8").match(/osascript -e quit app/g)?.length ??
      0)
    : 0;

// 安装位先放一个「旧版」：真机上 /Applications 里总有驿窗
function setup() {
  const box = sandbox();
  const r = repo(box);
  execFileSync("ditto", [build(box, "old"), box.app]);
  return { box, r };
}

test("第一次装：没有记录照装，装完记下来源、放掉锁、冒烟通过", () => {
  const { box, r } = setup();
  const res = install(box, r.a, ["t1", build(box, "a1")]);
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /还没有归属记录/);
  assert.match(res.stdout, /冒烟：侧栏在动/);
  assert.equal(installedBuild(box), "a1");
  const rec = record(box);
  assert.equal(
    rec.worktree,
    execFileSync("bash", ["-c", "pwd -P"], {
      cwd: r.a,
      encoding: "utf8",
    }).trim(),
  );
  assert.equal(rec.branch, "claude/a");
  assert.equal(rec.commit, git(r.a, "rev-parse", "HEAD"));
  assert.equal(rec.dirty, "no");
  assert.match(rec.time, /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/);
  assert.equal(existsSync(join(STATE(box), "lock")), false, "装完放掉锁");
  assert.equal(quits(box), 1);
});

test("归属：装着的是别的会话的分支包就拒装，写清是谁、什么时候、怎么继续；--takeover 才装", () => {
  const { box, r } = setup();
  assert.equal(install(box, r.a, ["t1", build(box, "a1")]).status, 0);
  const before = quits(box);
  const refused = install(box, r.b, ["t2", build(box, "b1")]);
  assert.equal(refused.status, 5);
  assert.match(
    refused.stderr,
    /wt-a（分支 claude\/a，提交 [0-9a-f]{12}）\d{4}-\d\d-\d\d \d\d:\d\d:\d\d 装的/,
  );
  assert.match(refused.stderr, /不是 main 构建的，也不是本 worktree 装的/);
  assert.match(refused.stderr, /先确认对方的包不再需要.*--takeover/);
  assert.equal(installedBuild(box), "a1", "没覆盖");
  assert.equal(quits(box), before, "没退出旧应用");
  assert.equal(existsSync(join(STATE(box), "lock")), false, "拒装也放掉锁");

  const taken = install(box, r.b, ["t2", build(box, "b1"), "--takeover"]);
  assert.equal(taken.status, 0, taken.stderr);
  assert.match(taken.stdout, /接管（--takeover）：现在装着的是 .*wt-a/);
  assert.equal(installedBuild(box), "b1");
  assert.equal(record(box).branch, "claude/b");
});

test("归属：本 worktree 上次装的、main 构建的、已 squash 合进 main 的分支包，都直接装", () => {
  const { box, r } = setup();
  assert.equal(install(box, r.a, ["t1", build(box, "a1")]).status, 0);
  assert.equal(
    install(box, r.a, ["t1", build(box, "a2")]).status,
    0,
    "同一 worktree 重装",
  );

  // a 的改动 squash 合进 main：b 从自己的分支装，不用 --takeover
  execFileSync(
    "bash",
    [
      "-c",
      "git checkout -q claude/a -- a.txt && git commit -q -m 'a (#1)' && git push -q origin main",
    ],
    {
      cwd: r.main,
      env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null" },
    },
  );
  const afterMerge = install(box, r.b, ["t2", build(box, "b1")]);
  assert.equal(afterMerge.status, 0, afterMerge.stderr);

  // 主目录装 main 的包；之后别的 worktree 装也直接装
  assert.equal(
    install(box, r.main, ["t3", build(box, "m1"), "--takeover"]).status,
    0,
  );
  assert.equal(record(box).branch, "main");
  const overMain = install(box, r.a, ["t4", build(box, "a3")]);
  assert.equal(overMain.status, 0, overMain.stderr);
});

test("归属：主目录带没提交的改动打的包不算 main 构建的", () => {
  const { box, r } = setup();
  writeFileSync(join(r.main, "a.txt"), "dirty\n");
  assert.equal(install(box, r.main, ["t1", build(box, "m1")]).status, 0);
  assert.equal(record(box).dirty, "yes");
  const res = install(box, r.a, ["t2", build(box, "a1")]);
  assert.equal(res.status, 5);
  assert.match(res.stderr, /带没提交的改动/);
});

test("归属：装着的包不在记录里（旧版脚本装的、手动 ditto 过）就拒装", () => {
  const { box, r } = setup();
  assert.equal(install(box, r.a, ["t1", build(box, "a1")]).status, 0);
  execFileSync("ditto", [build(box, "manual"), box.app]);
  const res = install(box, r.a, ["t2", build(box, "a2")]);
  assert.equal(res.status, 5);
  assert.match(res.stderr, /现在装着的 [0-9a-f]{12} 不在归属记录里/);
  assert.equal(installedBuild(box), "manual");
});

function holdLock(box, { pid, ageSeconds = 0, owner = true } = {}) {
  const lock = join(STATE(box), "lock");
  mkdirSync(lock, { recursive: true });
  if (owner)
    writeFileSync(
      join(lock, "owner"),
      `worktree=/别的/worktree\nbranch=claude/other\ncommit=abc\ndirty=no\npid=${pid}\ntime=2026-11-18 10:00:00\n`,
    );
  const t = Date.now() / 1000 - ageSeconds;
  utimesSync(lock, t, t);
  return lock;
}

test("锁：别的会话正在装（持锁进程还在）就明确失败，不动应用，也不删人家的锁", () => {
  const { box, r } = setup();
  const holder = spawn("sleep", ["30"]);
  try {
    const lock = holdLock(box, { pid: holder.pid });
    const res = install(box, r.a, ["t1", build(box, "a1")]);
    assert.equal(res.status, 4);
    assert.match(res.stderr, /另一个会话正在装机/);
    assert.match(res.stderr, /worktree=\/别的\/worktree/);
    assert.equal(installedBuild(box), "old", "没装");
    assert.equal(quits(box), 0);
    assert.match(
      readFileSync(join(lock, "owner"), "utf8"),
      new RegExp(`pid=${holder.pid}`),
      "锁还是人家的",
    );
  } finally {
    holder.kill();
  }
});

test("锁：刚拿锁还没写下是谁的，当成正在装；超过一分钟没写就当死锁接管", () => {
  const { box, r } = setup();
  holdLock(box, { owner: false });
  const busy = install(box, r.a, ["t1", build(box, "a1")]);
  assert.equal(busy.status, 4);
  assert.match(busy.stderr, /还没写下是谁/);
  holdLock(box, { owner: false, ageSeconds: 120 });
  const taken = install(box, r.a, ["t1", build(box, "a1")]);
  assert.equal(taken.status, 0, taken.stderr);
  assert.match(taken.stdout, /接管上次装机异常退出留下的锁/);
});

test("死锁恢复：持锁进程已经不在、或锁超过 30 分钟，接管后照装", () => {
  const { box, r } = setup();
  const gone = spawnSync("bash", ["-c", "echo $$"], {
    encoding: "utf8",
  }).stdout.trim();
  holdLock(box, { pid: gone });
  const res = install(box, r.a, ["t1", build(box, "a1")]);
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /接管上次装机异常退出留下的锁/);
  assert.match(res.stdout, /worktree=\/别的\/worktree/);
  assert.equal(existsSync(join(STATE(box), "lock")), false);

  const holder = spawn("sleep", ["30"]);
  try {
    holdLock(box, { pid: holder.pid, ageSeconds: 31 * 60 });
    const old = install(box, r.a, ["t2", build(box, "a2")]);
    assert.equal(old.status, 0, old.stderr);
    assert.equal(installedBuild(box), "a2");
  } finally {
    holder.kill();
  }
});

function installAsync(box, cwd, args, extra) {
  return new Promise((resolve) => {
    const child = spawn("bash", [SH, ...args], {
      cwd,
      env: { ...box.env, STUB_FRAMES: moving(box), ...extra },
    });
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (status) => resolve({ status, stderr }));
  });
}

test("两个会话同时装：只有一个装上，另一个明确失败（锁或归属），不交错", async () => {
  const seen = new Set();
  for (let round = 0; round < 3; round++) {
    const { box, r } = setup();
    const slow = { STUB_QUIT_SLEEP: "1" }; // 退出旧应用那一步慢一点，保证两边重叠
    const [a, b] = await Promise.all([
      installAsync(box, r.a, ["t1", build(box, "a1")], slow),
      installAsync(box, r.b, ["t2", build(box, "b1")], slow),
    ]);
    const ok = [a, b].filter((x) => x.status === 0);
    assert.equal(
      ok.length,
      1,
      `正好一个装上：${a.status} / ${b.status}\n${a.stderr}\n${b.stderr}`,
    );
    const loser = a.status === 0 ? b : a;
    assert.ok(
      [4, 5].includes(loser.status),
      `另一个明确失败：${loser.status} ${loser.stderr}`,
    );
    seen.add(loser.status);
    assert.equal(installedBuild(box), a.status === 0 ? "a1" : "b1");
    assert.equal(quits(box), 1, "只退出过一次旧应用");
  }
  assert.ok(
    seen.has(4),
    `至少有一轮是被锁挡下的（两边真的重叠了）：${[...seen]}`,
  );
});

test("装上了但小人不动：冒烟没过退出 6，归属照记（装着的就是它），回滚命令已打印", () => {
  const { box, r } = setup();
  const still = frames(join(box.dir, "still"), [frame(10)]);
  const res = install(box, r.a, ["t1", build(box, "a1")], {
    STUB_FRAMES: still,
  });
  assert.equal(res.status, 6);
  assert.match(res.stderr, /小人一直没动/);
  assert.match(res.stderr, /冒烟没过/);
  assert.match(res.stdout, /回滚：/);
  assert.equal(record(box).branch, "claude/a");
  assert.equal(existsSync(join(STATE(box), "lock")), false);
});

test("装前截侧栏、装后对比：有旧应用时写出装前装后差异图；截不到装前也照装", () => {
  const { box, r } = setup();
  const res = install(box, r.a, ["t1", build(box, "a1")]);
  assert.equal(res.status, 0, res.stderr);
  const evidence = join(
    box.env.HOME,
    "Library/Application Support/postpane/evidence",
  );
  const day = execFileSync("date", ["+%F"], { encoding: "utf8" }).trim();
  assert.ok(existsSync(join(evidence, `${day}-t1`, "smoke-before-1.png")));
  assert.ok(
    existsSync(join(evidence, `${day}-t1`, "smoke-before-after-1.png")),
  );
  assert.match(res.stdout, /装前装后：/);

  const blind = install(box, r.a, ["t2", build(box, "a2")], {
    STUB_WINDOWS: "[]",
  });
  assert.equal(blind.status, 6, "装后也截不到：冒烟没过");
  assert.match(blind.stdout, /装前没截到侧栏/);
  assert.equal(installedBuild(box), "a2");
});

test("check 说现在装的是谁的", () => {
  const { box, r } = setup();
  const a1 = build(box, "a1");
  assert.equal(install(box, r.a, ["t1", a1]).status, 0);
  const res = install(box, r.a, ["check", a1]);
  assert.equal(res.status, 0);
  assert.match(res.stdout, /已装的是 .*wt-a（分支 claude\/a/);
  assert.match(res.stdout, /一致/);
});
