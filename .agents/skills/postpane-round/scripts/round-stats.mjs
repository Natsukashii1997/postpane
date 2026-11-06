#!/usr/bin/env node
// 驿窗一轮：从本机 Claude Code / Codex 会话记录里数每一步实际做了几次，
// 再列出不属于任何一步的高频命令，作为 skill 进化的数据（SKILL.md 第 6 步）。
// 只读会话记录，不写任何文件。步骤与痕迹定义在 ../steps.json。
//
//   node round-stats.mjs [--since 2026-11-01] [--match postpane] [--top 15] [--json]
//                        [--claude ~/.claude/projects] [--codex ~/.codex/sessions]
import { createReadStream, existsSync, openSync, readFileSync, readSync, closeSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { homedir } from "node:os";
import { createInterface } from "node:readline";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STEPS_FILE = join(HERE, "..", "steps.json");
const HEAD_BYTES = 256 * 1024;

export function loadSteps(file = STEPS_FILE) {
  const def = JSON.parse(readFileSync(file, "utf8"));
  return {
    steps: def.steps.map((s) => ({ ...s, regexes: s.signals.map((r) => new RegExp(r)) })),
    ignore: new Set(def.ignore ?? []),
  };
}

// 一次工具调用压成一行文字，steps.json 的正则对它匹配。
export function callLine(name, input = {}) {
  if (name === "Bash") return `Bash ${input.command ?? ""}`;
  if (["Edit", "Write", "Read", "NotebookEdit"].includes(name)) return `${name} ${input.file_path ?? input.notebook_path ?? ""}`;
  if (name === "Skill") return `Skill ${input.skill ?? ""}`;
  return name;
}

function head(file) {
  const fd = openSync(file, "r");
  try {
    const buf = Buffer.alloc(HEAD_BYTES);
    const n = readSync(fd, buf, 0, HEAD_BYTES, 0);
    return buf.subarray(0, n).toString("utf8");
  } finally {
    closeSync(fd);
  }
}

async function* lines(file) {
  const rl = createInterface({ input: createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    try {
      yield JSON.parse(line);
    } catch {
      // 认不出的行跳过（格式随版本会变）
    }
  }
}

function listClaude(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) => readdirSync(join(dir, d.name)).filter((f) => f.endsWith(".jsonl")).map((f) => join(dir, d.name, f)));
}

function listCodex(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true, recursive: true })) {
    if (entry.isFile() && entry.name.endsWith(".jsonl")) out.push(join(entry.parentPath ?? entry.path, entry.name));
  }
  return out;
}

async function claudeSession(file, match) {
  const cwd = /"cwd":"([^"]*)"/.exec(head(file))?.[1] ?? "";
  if (!cwd.includes(match)) return null;
  const calls = [];
  for await (const obj of lines(file)) {
    if (obj.type !== "assistant" || obj.isSidechain || !Array.isArray(obj.message?.content)) continue;
    for (const block of obj.message.content) {
      if (block?.type === "tool_use") calls.push({ ts: obj.timestamp, line: callLine(block.name, block.input) });
    }
  }
  return { id: `claude:${basename(file, ".jsonl")}`, calls };
}

function codexCommand(name, rawArgs) {
  let args = rawArgs;
  if (typeof rawArgs === "string") {
    try {
      args = JSON.parse(rawArgs);
    } catch {
      args = { input: rawArgs };
    }
  }
  if (name === "shell") {
    const cmd = args?.command;
    return [`Bash ${Array.isArray(cmd) ? cmd[cmd.length - 1] : (cmd ?? "")}`];
  }
  if (name === "exec_command") return [`Bash ${args?.cmd ?? ""}`];
  if (name === "apply_patch") {
    const text = args?.input ?? "";
    return [...text.matchAll(/^\*\*\* (?:Update|Add) File: (.+)$/gm)].map((m) => `Edit ${m[1].trim()}`);
  }
  return [name];
}

async function codexSession(file, match) {
  const first = head(file).split("\n", 1)[0];
  let meta;
  try {
    meta = JSON.parse(first);
  } catch {
    return null;
  }
  const p = meta?.payload ?? {};
  if (meta?.type !== "session_meta" || !(p.cwd ?? "").includes(match)) return null;
  if (p.source && typeof p.source === "object" && "subagent" in p.source) return null;
  const calls = [];
  for await (const obj of lines(file)) {
    if (obj.type !== "response_item") continue;
    const it = obj.payload ?? {};
    if (it.type === "function_call") for (const line of codexCommand(it.name, it.arguments)) calls.push({ ts: obj.timestamp, line });
    if (it.type === "custom_tool_call") for (const line of codexCommand(it.name, { input: it.input })) calls.push({ ts: obj.timestamp, line });
  }
  return { id: `codex:${basename(file, ".jsonl")}`, calls };
}

// Bash 命令拆成一段段，取能代表「做什么」的头一两个词。
// heredoc 正文和引号里的多行文字（提交说明、PR 正文、内嵌脚本）先去掉，不当成命令；单行引号保留，痕迹正则要靠它认。
export function stripBodies(command) {
  const multi = (q) => (s) => (s.includes("\n") ? q + q : s);
  return command
    .replace(/<<-?\s*(['"]?)(\w+)\1([^\n]*)\n[\s\S]*?\n\s*\2[ \t]*(?=\n|$)/g, "<<$2$3")
    .replace(/"(?:[^"\\]|\\.)*"/g, multi('"'))
    .replace(/'[^']*'/g, multi("'"));
}

// 按 && || ; | 换行拆段，引号里的不拆。
export function segments(command) {
  const out = [];
  let cur = "";
  let quote = "";
  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    if (quote) {
      if (ch === quote && command[i - 1] !== "\\") quote = "";
      cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
    } else if (ch === ";" || ch === "\n" || ch === "|" || (ch === "&" && command[i + 1] === "&")) {
      if (command[i + 1] === ch) i++;
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

export function commandKeys(command, ignore) {
  const keys = [];
  for (const raw of segments(stripBodies(command))) {
    const words = raw.trim().split(/\s+/).filter((w) => w && !/^[A-Za-z_][A-Za-z0-9_]*=/.test(w));
    if (!words.length) continue;
    const [a, b] = words;
    const two = ["git", "pnpm", "gh", "cargo", "npm", "bun", "node", "python3", "osascript", "codesign", "security", "launchctl"];
    const key = two.includes(a) && b && !b.startsWith("-") ? `${a} ${b}` : a;
    if (ignore.has(a) || ignore.has(key) || !/^[\w.~/$]/.test(a)) continue;
    keys.push({ key, seg: raw.trim() });
  }
  return keys;
}

export async function analyze({ claudeDir, codexDir, match = "postpane", since, top = 15, stepsFile } = {}) {
  const { steps, ignore } = loadSteps(stepsFile);
  const sinceMs = since ? Date.parse(`${since}T00:00:00+08:00`) : 0;
  const keep = (f) => !sinceMs || statSync(f).mtimeMs >= sinceMs;
  const sessions = [];
  for (const f of listClaude(claudeDir).filter(keep)) {
    const s = await claudeSession(f, match);
    if (s) sessions.push(s);
  }
  for (const f of listCodex(codexDir).filter(keep)) {
    const s = await codexSession(f, match);
    if (s) sessions.push(s);
  }

  const stepStats = steps.map((s) => ({ id: s.id, title: s.title, sessions: new Set(), calls: 0, last: "" }));
  const loose = new Map();
  let counted = 0;
  for (const s of sessions) {
    const calls = s.calls.filter((c) => !sinceMs || Date.parse(c.ts) >= sinceMs);
    if (calls.length) counted++;
    for (const c of calls) {
      steps.forEach((step, i) => {
        if (!step.regexes.some((r) => r.test(c.line))) return;
        const st = stepStats[i];
        st.sessions.add(s.id);
        st.calls++;
        if ((c.ts ?? "") > st.last) st.last = c.ts;
      });
      if (!c.line.startsWith("Bash ")) continue;
      for (const { key, seg } of commandKeys(c.line.slice(5), ignore)) {
        if (steps.some((step) => step.regexes.some((r) => r.test(`Bash ${seg}`)))) continue;
        const e = loose.get(key) ?? { key, sessions: new Set(), example: seg.slice(0, 80) };
        e.sessions.add(s.id);
        loose.set(key, e);
      }
    }
  }
  return {
    match,
    since: since ?? null,
    sessions: counted,
    claude: sessions.filter((s) => s.id.startsWith("claude:")).length,
    codex: sessions.filter((s) => s.id.startsWith("codex:")).length,
    steps: stepStats.map((s) => ({ id: s.id, title: s.title, sessions: s.sessions.size, calls: s.calls, last: s.last || null })),
    uncovered: [...loose.values()]
      .map((e) => ({ key: e.key, sessions: e.sessions.size, example: e.example }))
      .filter((e) => e.sessions >= 2)
      .sort((a, b) => b.sessions - a.sessions || a.key.localeCompare(b.key))
      .slice(0, top),
  };
}

// 北京时间
const fmt = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
const beijing = (iso) => (iso ? fmt.format(new Date(iso)).replace(/\//g, "-") : "从未");

export function render(r) {
  const out = [
    "# 驿窗一轮：各步实际做了几次",
    "",
    `范围：工作目录含「${r.match}」的会话 ${r.sessions} 个（Claude ${r.claude}、Codex ${r.codex}）${r.since ? `，自 ${r.since} 起` : ""}。`,
    "",
    "| 步骤 | 做过的会话 | 调用次数 | 最近一次（北京时间） |",
    "|---|---|---|---|",
    ...r.steps.map((s) => `| ${s.title}（${s.id}） | ${s.sessions} | ${s.calls} | ${beijing(s.last)} |`),
    "",
    "## 不属于任何一步的高频命令（新步骤或新痕迹的候选，至少 2 个会话）",
    "",
  ];
  if (!r.uncovered.length) out.push("无。");
  else out.push("| 命令 | 会话数 | 例子 |", "|---|---|---|", ...r.uncovered.map((e) => `| \`${e.key}\` | ${e.sessions} | \`${e.example.replace(/\|/g, "\\|").replace(/`/g, "'")}\` |`));
  out.push("", "怎么用：做过的会话很少的步骤，看是不是该删或并进别的步骤；高频却不属于任何一步的命令，看是不是漏了一步，或该补进 steps.json 的痕迹。结论写成 EVOLUTION.md 里的 E-xx 待批。");
  return out.join("\n");
}

function parseArgs(argv) {
  const o = { claudeDir: join(homedir(), ".claude", "projects"), codexDir: join(homedir(), ".codex", "sessions"), match: "postpane", top: 15, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") o.json = true;
    else if (a === "--since") o.since = argv[++i];
    else if (a === "--match") o.match = argv[++i];
    else if (a === "--top") o.top = Number(argv[++i]);
    else if (a === "--claude") o.claudeDir = argv[++i];
    else if (a === "--codex") o.codexDir = argv[++i];
    else throw new Error(`不认识的参数：${a}`);
  }
  return o;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const o = parseArgs(process.argv.slice(2));
  const r = await analyze(o);
  console.log(o.json ? JSON.stringify(r, null, 2) : render(r));
}
