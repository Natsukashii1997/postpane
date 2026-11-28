// 本机同一时刻只跑一份重活（全量测试、打包时编引擎）：几个会话各自在 worktree 里同时跑，
// 负载上 200，计时测试成片误报，误报又引来整套重跑，越跑越挤（L-91）。
// 后来的排队等，每分钟说一次在等谁；占位的进程已经不在了就直接接手。
//
//   <dir>/            占位：mkdir 成功即拿到（原子）
//   <dir>/owner.json  谁占着：pid、做什么、在哪个目录、几点开始
//
// pid 是占位要守到它退出的那个进程：全量测试是自己；打包是 tauri build 那个进程，
// 生成资源这一步退出后编 app 还在跑，位子要一直占到整个打包结束。
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";

export const QUEUE_DIR = join(
  homedir(),
  "Library/Application Support/postpane/heavy-queue",
);

export function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

/** 从 pid 往上的进程号：[pid, 父, 祖父, ...]。读不了（没有 ps）就只有自己。 */
export function ancestry(pid = process.pid) {
  const chain = [pid];
  try {
    const table = new Map(
      execFileSync("ps", ["-A", "-o", "pid=,ppid="], { encoding: "utf8" })
        .trim()
        .split("\n")
        .map((line) => line.trim().split(/\s+/).map(Number)),
    );
    for (
      let at = table.get(pid);
      at > 1 && !chain.includes(at);
      at = table.get(at)
    )
      chain.push(at);
  } catch {}
  return chain;
}

/** 祖先里第一个命令行像 `tauri build` 的进程；没有就是 null。 */
export function tauriBuild(chain = ancestry()) {
  for (const pid of chain.slice(1)) {
    try {
      const command = execFileSync(
        "ps",
        ["-o", "command=", "-p", String(pid)],
        {
          encoding: "utf8",
        },
      );
      if (/tauri(\.js)?\s+build\b/.test(command)) return pid;
    } catch {}
  }
  return null;
}

export function readOwner(dir) {
  try {
    return JSON.parse(readFileSync(join(dir, "owner.json"), "utf8"));
  } catch {
    return null;
  }
}

function minutes(ms) {
  return Math.max(0, Math.round(ms / 60000));
}

export function describe(owner, now = Date.now()) {
  if (!owner) return "有人刚占上，还没写下是谁";
  const since = minutes(now - Date.parse(owner.started));
  return `${owner.what}（${basename(owner.cwd)}，进程 ${owner.pid}，已跑 ${since} 分钟）`;
}

/** 位子空出来了吗：占位进程不在了，或拿了位子一分钟还没写下是谁。 */
export function free(dir, { now = Date.now(), isAlive = alive } = {}) {
  const owner = readOwner(dir);
  if (owner) return !isAlive(owner.pid);
  try {
    return now - statSync(dir).mtimeMs > 60_000;
  } catch {
    return true;
  }
}

/**
 * 排队占位，拿到后返回放手的函数。占位的是自己的祖先（全量测试里又起了打包这类）就不再排，直接跑。
 * owner：{ pid, what }；cwd、started 自动补。
 */
export async function enqueue(owner, options = {}) {
  const {
    dir = QUEUE_DIR,
    log = (line) => console.error(line),
    sleep = (ms) => new Promise((done) => setTimeout(done, ms)),
    every = 5000,
    isAlive = alive,
    now = Date.now,
    chain = ancestry(),
  } = options;
  const mine = {
    cwd: process.cwd(),
    started: new Date(now()).toISOString(),
    ...owner,
  };
  mkdirSync(dirname(dir), { recursive: true });
  let waited = 0;
  let said = -Infinity;
  for (;;) {
    try {
      mkdirSync(dir);
      writeFileSync(join(dir, "owner.json"), JSON.stringify(mine));
      if (waited)
        log(`排到了，开始${mine.what}（排了 ${minutes(waited)} 分钟）`);
      return () => {
        if (readOwner(dir)?.pid === mine.pid)
          rmSync(dir, { recursive: true, force: true });
      };
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
    const holder = readOwner(dir);
    if (holder && chain.includes(holder.pid)) return () => {};
    if (free(dir, { now: now(), isAlive })) {
      rmSync(dir, { recursive: true, force: true });
      continue;
    }
    if (waited - said >= 60_000) {
      log(
        `排队：${describe(holder, now())} 跑完后自动开始${mine.what}。本机同一时刻只跑一份全量测试或打包（L-91）。`,
      );
      said = waited;
    }
    await sleep(every);
    waited += every;
  }
}
