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

// #429: chatgpt.com turns one paste of between 8000 and 10000 characters into
// an attachment (2026-11-19: 8000 stayed text, 10000 became 「粘贴的文本.txt」).
// The page then shows no prompt bubble and the words are not on it, so the
// answer was never read back. A stand-in for that composer: a paste up to
// `limit` goes in as text, a longer one (or any from paste `attachFrom` on)
// becomes an attachment beside the box that lights send. `leftover` puts one
// there before the words come, as a failed earlier try would leave it.
const composer = async ({
  limit = 9000,
  attachFrom = Infinity,
  leftover = false,
} = {}) => {
  const fresh = await browser.newPage();
  await fresh.setContent(fixture);
  await fresh.addScriptTag({ path: script });
  await fresh.evaluate(
    ({ limit, attachFrom, leftover }) => {
      window.pastes = [];
      const box = document.querySelector(".ProseMirror");
      const attach = () => {
        const tile = document.createElement("div");
        tile.className = "attachment";
        tile.textContent = "粘贴的文本.txt";
        box.before(tile);
        document.getElementById("slot").disabled = false;
      };
      if (leftover) attach();
      box.addEventListener("paste", (event) => {
        event.preventDefault();
        const text = event.clipboardData.getData("text/plain");
        window.pastes.push(text);
        if (text.length <= limit && window.pastes.length <= attachFrom) {
          document.execCommand("insertText", false, text);
        } else attach();
      });
    },
    {
      limit,
      attachFrom: Number.isFinite(attachFrom) ? attachFrom : 1e9,
      leftover,
    },
  );
  return fresh;
};
const brief = (lines) =>
  Array.from(
    { length: lines },
    (_, n) => `第 ${n} 行：送审说明，改了什么、为什么这样改。`,
  ).join("\n");
const send = (page, text) =>
  page.evaluate((text) => PostPanePage.submit(document, text), text);
const attachments = (page) =>
  page.evaluate(() => document.querySelectorAll(".attachment").length);

test("a long brief goes in as text, pasted a piece at a time", async () => {
  const fresh = await composer();
  const text = brief(800);
  assert.ok(text.length > 20000);
  assert.deepEqual(await send(fresh, text), { ok: true });
  const bare = (words) => words.replace(/\s/g, "");
  const sent = bare(await fresh.evaluate(() => window.sent));
  assert.ok(
    sent === bare(text),
    `sent ${sent.length} of ${bare(text).length} characters`,
  );
  const pastes = await fresh.evaluate(() => window.pastes);
  assert.ok(pastes.length > 1, `pasted ${pastes.length} times`);
  assert.ok(pastes.join("") === text, "the pieces make up the words");
  assert.ok(
    pastes.slice(0, -1).every((piece) => piece.endsWith("\n")),
    "each piece but the last ends with its line",
  );
  const largest = Math.max(...pastes.map((piece) => piece.length));
  assert.ok(largest <= 6000, `largest piece ${largest}`);
  assert.equal(await attachments(fresh), 0);
  await fresh.close();
});

test("one line longer than a piece is cut within", async () => {
  const fresh = await composer();
  const text = "长".repeat(13000);
  assert.deepEqual(await send(fresh, text), { ok: true });
  assert.equal(await fresh.evaluate(() => window.sent), text);
  assert.deepEqual(
    await fresh.evaluate(() => window.pastes.map((piece) => piece.length)),
    [6000, 6000, 1000],
  );
  await fresh.close();
});

// A character outside the BMP (an emoji) is two UTF-16 units: a cut between
// them would paste half a character at each end.
test("a long line is not cut inside a character", async () => {
  const fresh = await composer();
  const text = "a" + "😀".repeat(4000);
  assert.deepEqual(await send(fresh, text), { ok: true });
  const pastes = await fresh.evaluate(() => window.pastes);
  assert.ok(pastes.join("") === text, "the pieces make up the words");
  assert.ok(
    pastes.every((piece) => piece.isWellFormed()),
    `pieces ${pastes.map((piece) => piece.length)}`,
  );
  await fresh.close();
});

test("words that did not go in as text are not sent", async () => {
  const fresh = await composer({ limit: 1000 });
  assert.deepEqual(await send(fresh, brief(100)), {
    ok: false,
    reason: "composer-mismatch",
  });
  assert.equal(await fresh.evaluate(() => window.sent), undefined);
  await fresh.close();
});

test("a later piece turned attachment stops the sending", async () => {
  const fresh = await composer({ attachFrom: 1 });
  assert.deepEqual(await send(fresh, brief(800)), {
    ok: false,
    reason: "composer-mismatch",
  });
  assert.equal(await fresh.evaluate(() => window.pastes.length), 2);
  assert.equal(await fresh.evaluate(() => window.sent), undefined);
  await fresh.close();
});

// An attachment left from an earlier try sits beside the box, where emptying
// the box does not reach: short words sent now would take it along, and
// ChatGPT would review the old words.
test("an attachment already in the composer is not sent along", async () => {
  const fresh = await composer({ leftover: true });
  assert.deepEqual(await send(fresh, "P1-05 专项复核"), {
    ok: false,
    reason: "composer-mismatch",
  });
  assert.equal(await fresh.evaluate(() => window.pastes.length), 0);
  assert.equal(await fresh.evaluate(() => window.sent), undefined);
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
