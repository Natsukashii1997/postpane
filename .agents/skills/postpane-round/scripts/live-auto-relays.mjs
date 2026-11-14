#!/usr/bin/env node
// 列出开着自动往返、还没结束的接力：每行「id<TAB>标题」，没有就什么都不打印。
// 条件和驿窗重启时暂停的一致（platform/clients/chatgpt/handoffs.rs 的 restarted：auto 且 live，
// live 即 opening / open）。install.sh 装机前调它，有就拒装（L-44）。
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
  if (handoff.auto === true && (handoff.status === "open" || handoff.status === "opening"))
    console.log(`${handoff.id}\t${handoff.title ?? ""}`);
}
