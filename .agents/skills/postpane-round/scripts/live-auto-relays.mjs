#!/usr/bin/env node
// 列出开着自动往返、回信已到还没转回 Claude 的接力：每行「id<TAB>标题」，没有就什么都不打印。
// 驿窗重启不再暂停自动往返（2026-11-14），重启后由 catch_up 接着转回；只有这一刻重启，转回可能
// 送了一半，所以只查这一种（常浩选甲）。install.sh 装机前调它，有就拒装（L-44）。
//
//   node live-auto-relays.mjs [handoffs.json 路径]
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const file =
  process.argv[2] ??
  join(homedir(), "Library/Application Support/app.postpane.mac/chatgpt/handoffs.json");

let list;
try {
  list = JSON.parse(readFileSync(file, "utf8"));
} catch (error) {
  if (error.code === "ENOENT") process.exit(0); // 还没有过接力
  console.error(`读不了接力记录 ${file}：${error.message}`);
  process.exit(1);
}

for (const handoff of Array.isArray(list) ? list : []) {
  if (handoff.auto === true && handoff.status === "open" && handoff.phase === "replied")
    console.log(`${handoff.id}\t${handoff.title ?? ""}`);
}
