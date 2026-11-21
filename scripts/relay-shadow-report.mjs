#!/usr/bin/env node
// 影子读取对账（#488）：把 <数据目录>/chatgpt/shadow.jsonl 和 handoffs.json 对一遍，
// 看「读对话数据」这一路和「读页面」那一路差多少，够不够切换门槛。只读，不改任何文件。
// 用法：node scripts/relay-shadow-report.mjs [数据目录]
// 字段含义见 docs/chatgpt-channel.md「影子读取」。
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// 切换门槛（docs/design/接力第1批探测结果-2026-11-20.md 第六节第 10 条，常浩未另定）。
export const BAR = { replies: 20, days: 3, hidden: 5 };

const day = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** 对账结果。`records` 是 shadow.jsonl 的各行，`handoffs` 是 handoffs.json 的数组。 */
export function summarize(records, handoffs = []) {
  const asked = new Set();
  for (const handoff of handoffs)
    for (const step of handoff.steps ?? [])
      if (step.askedId)
        asked.add(`${handoff.chatgptConversation}:${step.askedId}`);
  const count = (list, key) =>
    list.reduce(
      (all, item) => ({ ...all, [key(item)]: (all[key(item)] ?? 0) + 1 }),
      {},
    );
  const read = records.filter((record) => record.outcome === "read");
  // 读页面报了回信时的那一次：两路能直接比。
  const complete = records.filter((record) => record.why === "complete");
  const compared = complete.filter(
    (record) => record.outcome === "read" && record.final,
  );
  const sameId = compared.filter(
    (record) => record.final.id === record.pageMessageId,
  );
  // 读页面拿到了，数据一路没拿到（没读成、没找到回信，或回信没标成写完）。
  // 页面里还没有 data.js（no-script）的那次只是待补证：同一条提问之后有一次
  // 读成且写完才算补上，没补上的照样算漏读（#488 审查 P2-02）。
  const good = (record) =>
    record.outcome === "read" && record.final && record.written;
  const promptOf = (record) =>
    record.pagePromptId ?? record.asked ?? record.prompt;
  const later = (record) =>
    records.some(
      (other) =>
        other !== record &&
        (other.heardAt ?? other.at) >= (record.heardAt ?? record.at) &&
        other.conversation === record.conversation &&
        promptOf(other) === promptOf(record) &&
        good(other),
    );
  const missed = complete.filter(
    (record) =>
      !good(record) && !(record.outcome === "no-script" && later(record)),
  );
  // 驿窗重读时页面那一路没拿到，数据一路拿到了写完的回信：本可以不卡。
  const rereads = records.filter((record) => record.why === "reread");
  const rescued = rereads.filter(
    (record) =>
      record.pageOutcome !== "told" &&
      record.outcome === "read" &&
      record.written,
  );
  // 提问发出 20 秒后的那一次：回答生成中数据长什么样。
  const writing = records.filter(
    (record) => record.why === "writing" && record.outcome === "read",
  );
  const refused = records.filter(
    (record) => record.outcome === "http" || record.outcome === "error",
  );
  const limited = refused.filter((record) =>
    [401, 403, 429].includes(record.status),
  );
  const days = new Set(
    compared.map((record) => day.format(new Date(record.heardAt ?? record.at))),
  );
  const hidden = compared.filter((record) => record.hidden);
  const known = compared.filter((record) =>
    asked.has(`${record.conversation}:${record.prompt}`),
  );
  const result = {
    records: records.length,
    byWhy: count(records, (record) => record.why),
    byOutcome: count(records, (record) => record.outcome),
    bySignIn: count(read, (record) => record.login ?? "?"),
    compared: compared.length,
    sameId: sameId.length,
    differentId: compared.length - sameId.length,
    promptInHandoffs: known.length,
    missed: missed.map((record) => ({
      conversation: record.conversation,
      outcome: record.outcome,
      written: record.written ?? null,
      pageMessageId: record.pageMessageId ?? null,
    })),
    rereads: rereads.length,
    rescued: rescued.length,
    writing: {
      reads: writing.length,
      alreadyWritten: writing.filter((record) => record.written).length,
      finalStatus: count(
        writing,
        (record) => record.final?.status ?? "还没有回信",
      ),
      lastStatus: count(writing, (record) => record.last?.status ?? "没有消息"),
    },
    hidden: hidden.length,
    days: days.size,
    refused: refused.length,
    limited: limited.length,
  };
  result.bar = {
    replies: result.compared >= BAR.replies,
    days: result.days >= BAR.days,
    hidden: result.hidden >= BAR.hidden,
    sameId: result.compared > 0 && result.differentId === 0,
    noMiss: result.missed.length === 0,
    // 认到的提问都是驿窗记下的那条（#488 审查 P2-02）。
    promptKnown:
      result.compared > 0 && result.promptInHandoffs === result.compared,
    noLimit: result.limited === 0,
  };
  result.reached = Object.values(result.bar).every(Boolean);
  return result;
}

export function lines(text) {
  return text
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

function print(result) {
  const mark = (ok) => (ok ? "够" : "不够");
  const list = (counts) =>
    Object.entries(counts)
      .map(([name, n]) => `${name} ${n}`)
      .join("，") || "无";
  console.log(
    `影子记录 ${result.records} 行。按原因：${list(result.byWhy)}。按结果：${list(result.byOutcome)}。`,
  );
  console.log(`读成的用的登录信息：${list(result.bySignIn)}。`);
  console.log(
    `两路都拿到回信、能直接比的 ${result.compared} 封：编号一致 ${result.sameId}，不一致 ${result.differentId}；提问编号在 handoffs.json 里找得到的 ${result.promptInHandoffs}。`,
  );
  console.log(
    `读页面拿到、数据一路没拿到：${result.missed.length} 次${result.missed.length ? "：" + JSON.stringify(result.missed) : ""}。`,
  );
  console.log(
    `驿窗重读 ${result.rereads} 次，其中页面那一路没拿到、数据一路拿到写完的回信：${result.rescued} 次。`,
  );
  console.log(
    `发出 20 秒后读到 ${result.writing.reads} 次：已写完 ${result.writing.alreadyWritten}；回信状态：${list(result.writing.finalStatus)}；最后一条消息状态：${list(result.writing.lastStatus)}。`,
  );
  console.log(
    `没读成（非 200 或请求没发出去）${result.refused} 次，其中限流或被拒 ${result.limited} 次。`,
  );
  console.log("");
  console.log(
    `切换门槛：回信 ${result.compared} / ${BAR.replies}（${mark(result.bar.replies)}）；跨 ${result.days} / ${BAR.days} 天（${mark(result.bar.days)}）；隐藏时读到 ${result.hidden} / ${BAR.hidden}（${mark(result.bar.hidden)}）；编号全一致（${mark(result.bar.sameId)}）；提问都在 handoffs.json 里（${mark(result.bar.promptKnown)}）；没有漏读（${mark(result.bar.noMiss)}）；没有限流（${mark(result.bar.noLimit)}）。`,
  );
  console.log(
    result.reached
      ? "结论：达到门槛。切换要常浩另行决定。"
      : "结论：还没达到门槛。",
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const data =
    process.argv[2] ??
    join(homedir(), "Library/Application Support/app.postpane.mac");
  const shadow = join(data, "chatgpt/shadow.jsonl");
  const handoffs = join(data, "chatgpt/handoffs.json");
  if (!existsSync(shadow)) {
    console.log(
      `还没有影子记录：${shadow} 不存在。开关（chatgpt/config.json 的 dataShadow）开着并跑过接力后才有。`,
    );
  } else {
    print(
      summarize(
        lines(readFileSync(shadow, "utf8")),
        existsSync(handoffs) ? JSON.parse(readFileSync(handoffs, "utf8")) : [],
      ),
    );
  }
}
