// 「驿窗一轮」skill 自查：引用的坑、路径、命令都还在，进化记录格式对，统计脚本在夹具上数得对。
// skill 改了、坑改了编号、脚本挪了位置，这里就会失败，防止 skill 悄悄变成过时文档。
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { analyze, commandKeys, loadSteps, segments, stripBodies } from "../.agents/skills/postpane-round/scripts/round-stats.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKILL_DIR = join(ROOT, ".agents/skills/postpane-round");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const skill = read(".agents/skills/postpane-round/SKILL.md");
const evolution = read(".agents/skills/postpane-round/EVOLUTION.md");
const stepsDef = JSON.parse(read(".agents/skills/postpane-round/steps.json"));
const GLOBAL_LESSONS = process.env.AGENT_KIT_LESSONS ?? "/Users/nat/Documents/ChatGPT/个人/work/agent-kit/LESSONS.md";
const FIX = join(ROOT, "tests/fixtures/round-stats");

test("SKILL.md 带 name 与 description", () => {
  const fm = /^---\n([\s\S]*?)\n---\n/.exec(skill)?.[1] ?? "";
  assert.match(fm, /^name: postpane-round$/m);
  assert.match(fm, /^description: .{40,}$/m);
});

test("SKILL.md 的步骤与 steps.json 一一对应、顺序一致", () => {
  const headings = [...skill.matchAll(/^## (\d+)\. (\S+?)（([a-z-]+)）$/gm)].map((m) => ({ n: Number(m[1]), title: m[2], id: m[3] }));
  assert.deepEqual(
    headings.map((h) => [h.id, h.title]),
    stepsDef.steps.map((s) => [s.id, s.title]),
  );
  headings.forEach((h, i) => assert.equal(h.n, i + 1));
  for (const s of stepsDef.steps) {
    assert.ok(s.signals.length > 0, `${s.id} 至少要有一条痕迹`);
    s.signals.forEach((r) => new RegExp(r));
  }
});

test("引用的 L-xx 都在 docs/LESSONS.md 里", () => {
  const have = new Set([...read("docs/LESSONS.md").matchAll(/^## (L-\d+)/gm)].map((m) => m[1]));
  for (const id of new Set([...(skill + evolution).matchAll(/\bL-\d+\b/g)].map((m) => m[0]))) {
    assert.ok(have.has(id), `${id} 不在 docs/LESSONS.md`);
  }
});

test("引用的 G-xx 都在全局坑里", (t) => {
  if (!existsSync(GLOBAL_LESSONS)) return t.skip(`没有 ${GLOBAL_LESSONS}（不在常浩的电脑上）`);
  const have = new Set([...readFileSync(GLOBAL_LESSONS, "utf8").matchAll(/^## (G-\d+)/gm)].map((m) => m[1]));
  for (const id of new Set([...skill.matchAll(/\bG-\d+\b/g)].map((m) => m[0]))) {
    assert.ok(have.has(id), `${id} 不在全局坑`);
  }
});

test("SKILL.md 里写的仓库路径与 pnpm 命令都存在", () => {
  const paths = [...skill.matchAll(/`([^`\s]+)`/g)]
    .map((m) => m[1])
    .filter((p) => /^(docs|src|tests|scripts|\.agents|\.github)\/[^<>*]+$/.test(p) || /^[A-Z]+\.md$/.test(p));
  assert.ok(paths.length >= 5);
  for (const p of paths) assert.ok(existsSync(join(ROOT, p)) || existsSync(join(SKILL_DIR, p)), `${p} 不存在`);
  const scripts = JSON.parse(read("package.json")).scripts;
  for (const [, name] of skill.matchAll(/pnpm run ([\w:-]+)/g)) assert.ok(scripts[name], `package.json 没有 ${name}`);
});

test("EVOLUTION.md 每条都有步骤、证据、状态，编号连续", () => {
  const ids = new Set(stepsDef.steps.map((s) => s.id));
  const entries = [...evolution.matchAll(/^## (E-\d+) .+\n([\s\S]*?)(?=^## |(?![\s\S]))/gm)];
  assert.ok(entries.length > 0);
  entries.forEach(([, id, body], i) => {
    assert.equal(id, `E-${String(i + 1).padStart(2, "0")}`, "编号要从 E-01 起连续");
    const step = /^- 步骤：(.+)$/m.exec(body)?.[1];
    assert.ok(step && step.split(/\s*[,，、]\s*/).every((s) => ids.has(s)), `${id} 的步骤不在 steps.json`);
    assert.match(body, /^- 证据：.+$/m, `${id} 缺证据`);
    assert.match(body, /^- 状态：(待批|已采纳 `[0-9a-f]{7,}`|已采纳（本 PR，#\d+）|已否（.+）)$/m, `${id} 状态写法不对`);
  });
});

test("Claude 通过 .claude/skills 软链接用同一份", () => {
  const link = join(ROOT, ".claude/skills/postpane-round");
  assert.equal(realpathSync(link), realpathSync(SKILL_DIR));
});

test("install.sh 语法正确，不带参数只打印用法、不动应用", () => {
  const sh = join(SKILL_DIR, "scripts/install.sh");
  execFileSync("bash", ["-n", sh]);
  const r = spawnSync("bash", [sh], { encoding: "utf8" });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /用法/);
});

test("install.sh 短名带日期就拒绝、不动应用（E-17）", () => {
  const sh = join(SKILL_DIR, "scripts/install.sh");
  const r = spawnSync("bash", [sh, "2026-11-14-341-relay-toggle"], {
    encoding: "utf8",
  });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /短名不带日期/);
  assert.match(r.stderr, /用 341-relay-toggle/);
});

test("命令拆段：heredoc 与多行引号里的字不算命令，单行引号里的分隔符不拆", () => {
  const cmd = "git commit -m \"$(cat <<'EOF'\n标题\nlsof 不算\nEOF\n)\" && grep -n \"a|b\" x; pgrep -f \"Contents/MacOS/PostPane$\"";
  const segs = segments(stripBodies(cmd)).map((s) => s.trim());
  assert.ok(!segs.some((s) => s.startsWith("lsof")));
  assert.ok(segs.includes('grep -n "a|b" x'));
  const { ignore } = loadSteps();
  assert.deepEqual(
    commandKeys(cmd, ignore).map((k) => k.key),
    ["pgrep"],
  );
});

test("统计脚本在夹具上：按工作目录筛会话、跳过子代理、两家格式都认", async () => {
  const r = await analyze({ claudeDir: join(FIX, "claude"), codexDir: join(FIX, "codex"), match: "postpane" });
  assert.equal(r.claude, 2);
  assert.equal(r.codex, 1);
  const by = Object.fromEntries(r.steps.map((s) => [s.id, s.sessions]));
  assert.deepEqual(by, { start: 1, test: 3, install: 0, handoff: 2, "merge-clean": 2, retro: 0 });
  assert.deepEqual(
    r.uncovered.map((e) => [e.key, e.sessions]),
    [["xcrun", 2]],
  );
  const since = await analyze({ claudeDir: join(FIX, "claude"), codexDir: join(FIX, "codex"), match: "postpane", since: "2026-11-06" });
  assert.equal(since.steps.find((s) => s.id === "merge-clean").sessions, 1, "--since 只数当天起的调用");
});

// L-44：装机会重启驿窗。重启不再暂停自动往返（2026-11-14），只剩「回信刚到、正在转回」那一刻重启可能出岔子，
// 装前查这一种，有就拒装、要 --force 才装（常浩选甲）。只测查的那一步和它在脚本里的位置，
// 不在测试里真跑 install.sh（会退出正在用的驿窗）。
const AUTO = join(SKILL_DIR, "scripts/live-auto-relays.mjs");
function relays(list) {
  const dir = mkdtempSync(join(tmpdir(), "postpane-auto-"));
  const file = join(dir, "handoffs.json");
  if (list !== undefined) writeFileSync(file, typeof list === "string" ? list : JSON.stringify(list));
  return spawnSync(process.execPath, [AUTO, file], { encoding: "utf8" });
}

test("live-auto-relays 只列开着自动往返、回信已到还没转回的接力", () => {
  const r = relays([
    { id: "a", title: "回信刚到", auto: true, status: "open", phase: "replied" },
    { id: "b", title: "等 ChatGPT 回信", auto: true, status: "open", phase: "delivered" },
    { id: "c", title: "已转回等 Claude", auto: true, status: "open", phase: "returned" },
    { id: "d", title: "没开自动", auto: false, status: "open", phase: "replied" },
    { id: "e", title: "已结束", auto: true, status: "closed", phase: "replied" },
  ]);
  assert.equal(r.status, 0);
  assert.deepEqual(r.stdout.trim().split("\n"), ["a\t回信刚到"]);
});

test("live-auto-relays：没有接力文件算没有；文件坏了报错退出", () => {
  const none = relays(undefined);
  assert.equal(none.status, 0);
  assert.equal(none.stdout, "");
  const broken = relays("{坏");
  assert.equal(broken.status, 1);
  assert.match(broken.stderr, /读不了/);
});

test("install.sh 在备份和退出旧应用之前查正在转回的接力，有就拒装，--force 才装", () => {
  const sh = read(".agents/skills/postpane-round/scripts/install.sh");
  const guard = sh.indexOf("live-auto-relays.mjs");
  assert.ok(guard > 0, "调用了 live-auto-relays.mjs");
  assert.ok(guard < sh.indexOf("ditto \"$APP\" \"$BACKUP\""), "在备份之前");
  assert.ok(guard < sh.indexOf("osascript -e 'quit app"), "在退出旧应用之前");
  assert.match(sh, /--force/);
  assert.match(sh, /exit 3/);
});
