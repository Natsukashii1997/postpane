// Runs page.js against a saved-structure fixture in real Chromium.
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

const here = new URL(".", import.meta.url);
const fixture = readFileSync(
  new URL("fixtures/conversation.html", here),
  "utf8",
);
const script = fileURLToPath(new URL("../page.js", here));

let browser;
let page;
before(async () => {
  browser = await chromium.launch();
  page = await browser.newPage();
  await page.setContent(fixture);
  await page.addScriptTag({ path: script });
});
after(() => browser?.close());

test("last reply becomes Markdown", async () => {
  const reply = await page.evaluate(() => PostPanePage.lastReply(document));
  assert.equal(reply.messageId, "m2");
  assert.equal(
    reply.markdown,
    [
      "## 审核意见",
      "1. 修好边界\n2. 检查 **挂件位置** 和 `pendantLayout`\n3. 补测试\n  - 底边",
      "| 项目 | 状态 |\n| --- | --- |\n| 连接 | 正常 |",
      "```python\na = 1\nprint(a)\n```",
      '```bash\necho "开始"\nls -la\n```',
      "结论：[PR](https://github.com/x/y/pull/1) 需修改",
    ].join("\n\n"),
  );
});

test("prompt, title and conversation id", async () => {
  assert.equal(
    await page.evaluate(() => PostPanePage.lastPrompt(document)),
    "请审核这次改动",
  );
  assert.equal(
    await page.evaluate(() => PostPanePage.title(document)),
    "驿窗接力测试",
  );
  const ids = await page.evaluate(() =>
    [
      "https://chatgpt.com/c/6aec83b7-cc00-83ee-88af-09d3b38538de",
      "https://chatgpt.com/g/g-p-abc/c/6aec83b7-cc00-83ee-88af-09d3b38538de?model=x",
      "https://chatgpt.com/",
      "https://chatgpt.com/g/g-p-abc/project",
    ].map((url) => PostPanePage.conversationId(url)),
  );
  assert.deepEqual(ids, [
    "6aec83b7-cc00-83ee-88af-09d3b38538de",
    "6aec83b7-cc00-83ee-88af-09d3b38538de",
    null,
    null,
  ]);
});

test("submit fills the composer, sends, and sees streaming start", async () => {
  assert.equal(
    await page.evaluate(() => PostPanePage.streaming(document)),
    false,
  );
  const result = await page.evaluate(() =>
    PostPanePage.submit(document, "请审核：第二轮"),
  );
  assert.deepEqual(result, { ok: true });
  assert.equal(await page.evaluate(() => window.sent), "请审核：第二轮");
  assert.equal(
    await page.evaluate(() => PostPanePage.streaming(document)),
    true,
  );
  assert.deepEqual(
    await page.evaluate(() => PostPanePage.submit(document, "again")),
    { ok: false, reason: "busy" },
  );
});
