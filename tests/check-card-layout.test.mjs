// 卡片版式机检（src/tooling/check-card-layout.mjs）。第一条用 2026-11-28 真实出错的
// 写法（#564 分支提交 f8cebde 的积压行，原样摘出）：WAIT 类型签顶替「等你」章进了
// 图标列，常浩指出后才发现；这条测试证明那次的写法现在过不了 `pnpm run check`。
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkCardLayout,
  checkFile,
} from "../src/tooling/check-card-layout.mjs";

const FILE = "src/packages/hud/src/panel/Row.tsx";
const rules = (text, file = FILE) => checkFile(file, text).map((f) => f.rule);
const row = (first, extra = "") => `
export function Row({ waiting, backlog, zh, light, inks, bot }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: \`\${waiting ? "auto" : \`\${GRID.mark}px\`} minmax(0, 1fr)\${bot ? " auto" : ""} 26px\`,
        columnGap: GRID.gap,
      }}
    >
      ${first}
      <span>标题</span>
      ${extra}
    </div>
  );
}`;

// f8cebde 的 SessionsSection.tsx 第 554–563 行，一字未改。
const WRONG_2026_11_28 = `{waiting ? (
            <ApprovalTag
              label={backlog ? WAIT_BADGE : zh ? "等你" : "WAITING"}
              tone={backlog ? "wait" : "ask"}
              light={light}
              color={backlog ? undefined : inks.red}
            />
          ) : (
            <RunningMark label={zh ? "在跑" : "Running"} color={inks.green} />
          )}`;

test("2026-11-28 积压行：WAIT 类型签放进图标列，被拦下", () => {
  const found = checkFile(FILE, row(WRONG_2026_11_28));
  const icon = found.filter((f) => f.rule === "icon-column");
  assert.equal(icon.length, 1);
  assert.match(icon[0].detail, /WAIT_BADGE/);
  // 同一个签还自己传了颜色（等你的红），也拦。
  assert.ok(found.some((f) => f.rule === "tag-color"));
});

test("改之前的写法：图标列里只有「等你」章，通过（11-15 定的例外）", () => {
  const stamp = `{waiting ? (
            <ApprovalTag label={zh ? "等你" : "WAITING"} tone="ask" light={light} color={inks.red} />
          ) : (
            <RunningMark label={zh ? "在跑" : "Running"} color={inks.green} />
          )}`;
  assert.deepEqual(rules(row(stamp)), []);
});

test("对的写法：类型签在标题下面一行（gridColumn 2 起），通过", () => {
  const right = row(
    `<span style={{ display: "inline-flex" }}><Mark /></span>`,
    `<div style={{ gridColumn: "2 / 5", display: "flex" }}>{tag}<span>问你：……</span></div>`,
  ).replace(
    "return (",
    `const tag = <ApprovalTag label={WAIT_BADGE} tone="wait" light={light} />;\n  return (`,
  );
  assert.deepEqual(rules(right), []);
});

test("签藏在变量、外面套一层 span 放进图标列，照样拦下", () => {
  const viaName = row("{tag}").replace(
    "return (",
    `const tag = <ApprovalTag label={entry.badge} tone="ask" light={light} />;\n  return (`,
  );
  assert.deepEqual(rules(viaName), ["icon-column"]);
  const wrapped = row(
    `<span style={{ display: "inline-flex" }}><ApprovalTag label="REPLY" tone="reply" light={light} /></span>`,
  );
  assert.deepEqual(rules(wrapped), ["icon-column"]);
});

test("类型签的颜色：自己挑（小签 REPLY 黄、面板蓝那次）拦下，从入口取的通过", () => {
  const own = `
const askedColor = (tone, on) => tone === "ask" ? on.red : tone === "start" ? on.green : on.ochre;
export const A = () => <ApprovalTag label={asked.label} tone={asked.tone} light={light} color={askedColor(asked.tone, paper)} />;
export const B = () => <ApprovalTag label={REPLY_BADGE} tone="reply" light={light} color={paper?.blue} />;`;
  assert.deepEqual(rules(own, "src/packages/hud/src/alerts/X.tsx"), [
    "tag-color",
    "tag-color",
    "tag-color",
    "tag-color",
  ]);
  const entry = `export const A = () => <ApprovalTag label={asked.label} tone={asked.tone} light={light} color={toneInk(asked.tone, paper)} />;`;
  assert.deepEqual(rules(entry, "src/packages/hud/src/alerts/X.tsx"), []);
  // 取色入口自己按种类挑颜色，是它的本职。
  const table = `export function tagColor(tone) { return tone === "ask" ? red : blue; }`;
  assert.deepEqual(
    rules(table, "src/packages/hud/src/permissions/approval-list.ts"),
    [],
  );
});

test("缩进写死数字拦下，从 GRID 取的通过", () => {
  const literal = `export const R = () => (
    <div style={{ display: "grid", gridTemplateColumns: \`\${seal ? SEAL_COLUMN : 18}px minmax(0, 1fr)\`, columnGap: 12 }}>
      <Mark />
      <div style={{ padding: "14px 0 20px 30px" }} />
    </div>
  );`;
  assert.deepEqual(rules(literal), [
    "grid-literal",
    "grid-literal",
    "grid-literal",
  ]);
  const grid = `export const R = () => (
    <div style={{ display: "grid", gridTemplateColumns: \`\${GRID.mark}px minmax(0, 1fr)\`, columnGap: GRID.gap }}>
      <Mark />
      <div style={{ paddingLeft: GRID.text }} />
    </div>
  );`;
  assert.deepEqual(rules(grid), []);
  // 不是卡片行的网格（第一列是 1fr）不管。
  const table = `export const T = () => <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 64px", columnGap: 12 }} />;`;
  assert.deepEqual(rules(table), []);
});

test("写明理由的 card-layout-ok 注释放行这一处", () => {
  const ok = `export const R = () => (
    // card-layout-ok: 看板表格，不在卡片的两条线上
    <div style={{ display: "grid", gridTemplateColumns: "18px minmax(0, 1fr)", columnGap: 10 }} />
  );`;
  assert.deepEqual(rules(ok), []);
  const bare = ok.replace("card-layout-ok: 看板表格，不在卡片的两条线上", "card-layout-ok:");
  assert.equal(rules(bare).length, 2);
});

test("基线只许变少：多出一处报错，少了提示收紧", () => {
  const root = mkdtempSync(join(tmpdir(), "card-layout-"));
  try {
    const dir = join(root, "src/packages/hud/src/panel");
    mkdirSync(dir, { recursive: true });
    mkdirSync(join(root, "src/tooling"), { recursive: true });
    writeFileSync(join(dir, "Row.tsx"), row(WRONG_2026_11_28));
    assert.equal(checkCardLayout(root).errors.length, 2);
    checkCardLayout(root, { update: true });
    assert.deepEqual(checkCardLayout(root).errors, []);
    writeFileSync(
      join(dir, "Row.tsx"),
      row(`<RunningMark label="在跑" color={inks.green} />`),
    );
    const { errors, notes } = checkCardLayout(root);
    assert.deepEqual(errors, []);
    assert.equal(notes.length, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("仓库本身过机检（旧问题都在基线里）", () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  assert.deepEqual(checkCardLayout(root).errors, []);
});
