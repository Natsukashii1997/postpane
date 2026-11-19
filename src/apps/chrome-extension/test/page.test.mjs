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

// #410: words an earlier turn left in the box (a draft ChatGPT kept) go out
// in front of the new ones unless the box is emptied first.
test("submit empties a draft left in the composer before sending", async () => {
  const fresh = await browser.newPage();
  await fresh.setContent(fixture);
  await fresh.addScriptTag({ path: script });
  await fresh.evaluate(() => {
    document.querySelector(".ProseMirror").textContent =
      "上一轮的送审：第 2 轮复审";
  });
  const result = await fresh.evaluate(() =>
    PostPanePage.submit(document, "P1-05 专项复核"),
  );
  assert.deepEqual(result, { ok: true });
  assert.equal(await fresh.evaluate(() => window.sent), "P1-05 专项复核");
  await fresh.close();
});

// #410: chatgpt.com holds the conversation twice: a hidden copy with every
// turn in order (answers not drawn), then the drawn one with only the turns
// near the view. The newest turn is read by conversation order, from its
// drawn copy when there is one.
const unit = (turn, n, role, body, ids = "") =>
  `<div data-chatgpt-search-unit-key="${turn}:${n}:${role}" data-chatgpt-search-message-ids="${ids}">${body}</div>`;
const user = (turn, words) =>
  unit(turn, 0, "user", `<div data-user-message-bubble="true">${words}</div>`);
const answer = (turn, id, words = "") =>
  unit(
    turn,
    2,
    "assistant",
    words && `<p data-d-component="text">${words}</p>`,
    `${id} ${id}`,
  );

async function twice(hidden, drawn) {
  const two = await browser.newPage();
  await two.setContent(
    `<main><div style="height:0;overflow:hidden">${hidden}</div><div>${drawn}</div></main>`,
  );
  await two.addScriptTag({ path: script });
  return two;
}

test("the newest turn is read by conversation order, not the page's last node", async () => {
  // The drawn copy still shows only the first turn; the second is answered.
  const two = await twice(
    user("A", "第 2 轮复审") +
      answer("A", "a1") +
      user("B", "专项复核") +
      answer("B", "b1"),
    user("A", "第 2 轮复审") + answer("A", "a1", "第 2 轮的回信"),
  );
  assert.equal(
    await two.evaluate(() => PostPanePage.lastPrompt(document)),
    "专项复核",
  );
  assert.deepEqual(await two.evaluate(() => PostPanePage.lastReply(document)), {
    messageId: "b1",
    markdown: "",
  });
  assert.equal(await two.evaluate(() => PostPanePage.answered(document)), true);
  // Drawn now: its words are read from the drawn copy.
  await two.evaluate(
    (html) => {
      document
        .querySelector("main > div:last-child")
        .insertAdjacentHTML("beforeend", html);
    },
    user("B", "专项复核") + answer("B", "b1", "专项复核的回信"),
  );
  assert.deepEqual(await two.evaluate(() => PostPanePage.lastReply(document)), {
    messageId: "b1",
    markdown: "专项复核的回信",
  });
  await two.close();
});

test("a newest prompt not answered yet leaves the older answer before it", async () => {
  const two = await twice(
    user("A", "第 2 轮复审") + answer("A", "a1") + user("B", "专项复核"),
    user("A", "第 2 轮复审") + answer("A", "a1", "第 2 轮的回信"),
  );
  assert.equal(
    await two.evaluate(() => PostPanePage.lastPrompt(document)),
    "专项复核",
  );
  assert.equal(
    await two.evaluate(() => PostPanePage.answered(document)),
    false,
  );
  await two.close();
});
