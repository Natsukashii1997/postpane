// Runs content.js on the fixture with a stubbed extension runtime.
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
const scripts = ["../page.js", "../content.js"].map((file) =>
  fileURLToPath(new URL(file, here)),
);

let browser;
before(async () => {
  browser = await chromium.launch();
});
after(() => browser?.close());

async function open(before = () => {}) {
  const page = await browser.newPage();
  await page.setContent(fixture);
  await page.evaluate(before);
  await page.evaluate(() => {
    window.told = [];
    window.chrome = {
      runtime: {
        sendMessage: (message) => (
          window.told.push(message),
          Promise.resolve()
        ),
        onMessage: {
          addListener(listener) {
            window.listener = listener;
          },
        },
      },
    };
  });
  for (const path of scripts) await page.addScriptTag({ path });
  return page;
}

const turns = (page) =>
  page.evaluate(() => window.told.filter((m) => m.type === "turn"));

test("a reply streamed without pause is reported once when it ends", async () => {
  const page = await open();
  await page.evaluate(async () => {
    const slot = document.getElementById("slot");
    slot.type = "button";
    slot.setAttribute("aria-label", "停止");
    const main = document.querySelector("main");
    const turn = document.createElement("div");
    turn.innerHTML =
      '<div data-chatgpt-search-unit-key="x:5:assistant" data-chatgpt-search-message-ids="m3"><p data-d-component="text"></p></div>';
    main.append(turn);
    const text = turn.querySelector("p");
    // A chunk every 50 ms for 2 s: a debounce would never fire.
    for (let i = 0; i < 40; i++) {
      text.textContent += "字";
      await new Promise((r) => setTimeout(r, 50));
    }
    text.textContent += "。结论：通过";
    slot.type = "submit";
    slot.setAttribute("aria-label", "发送");
  });
  await page.waitForTimeout(1800);
  const done = (await turns(page)).filter((m) => m.phase === "complete");
  assert.equal(done.length, 1);
  assert.equal(done[0].messageId, "m3");
  assert.equal(done[0].reply, "字".repeat(40) + "。结论：通过");
  assert.equal(done[0].prompt, "请审核这次改动");
  assert.ok((await turns(page)).some((m) => m.phase === "start"));
});

test("after its own send, a reply counts even if no stop button was seen", async () => {
  const page = await open();
  await page.evaluate(async () => {
    const result = await new Promise((resolve) =>
      window.listener({ op: "submit", text: "请审核" }, {}, resolve),
    );
    if (!result.ok) throw new Error(JSON.stringify(result));
    // Streaming ended before any sample saw it, as in a slow background tab.
    const slot = document.getElementById("slot");
    slot.type = "submit";
    slot.setAttribute("aria-label", "发送");
    document
      .querySelector("main")
      .insertAdjacentHTML(
        "beforeend",
        '<div data-chatgpt-search-unit-key="x:7:assistant" data-chatgpt-search-message-ids="m4"><p data-d-component="text">好的</p></div>',
      );
  });
  await page.waitForTimeout(1500);
  const done = (await turns(page)).filter((m) => m.phase === "complete");
  assert.deepEqual(
    done.map((m) => [m.messageId, m.reply]),
    [["m4", "好的"]],
  );
});

test("an empty placeholder is not the reply that fills it later", async () => {
  // 2026-11-07 h1a1b1fed89e00: ChatGPT put an empty reply up first, the
  // extension reported it as finished, and the answer that then filled the
  // same message id was taken as already reported.
  const page = await open();
  await page.evaluate(async () => {
    const result = await new Promise((resolve) =>
      window.listener({ op: "submit", text: "请审核" }, {}, resolve),
    );
    if (!result.ok) throw new Error(JSON.stringify(result));
    const slot = document.getElementById("slot");
    slot.type = "submit";
    slot.setAttribute("aria-label", "发送");
    document
      .querySelector("main")
      .insertAdjacentHTML(
        "beforeend",
        '<div data-chatgpt-search-unit-key="x:9:assistant" data-chatgpt-search-message-ids="m5"><h6 class="sr-only">ChatGPT 说：</h6><p data-d-component="text"></p></div>',
      );
    await new Promise((r) => setTimeout(r, 1500));
    document.querySelector(
      '[data-chatgpt-search-message-ids="m5"] p',
    ).textContent = "收到。结论：通过";
  });
  await page.waitForTimeout(1500);
  const done = (await turns(page)).filter((m) => m.phase === "complete");
  assert.deepEqual(
    done.map((m) => [m.messageId, m.reply]),
    [["m5", "收到。结论：通过"]],
  );
});

test("a reply still being written without a stop button waits until it stops changing", async () => {
  const page = await open();
  await page.evaluate(async () => {
    const result = await new Promise((resolve) =>
      window.listener({ op: "submit", text: "请审核" }, {}, resolve),
    );
    if (!result.ok) throw new Error(JSON.stringify(result));
    const slot = document.getElementById("slot");
    slot.type = "submit";
    slot.setAttribute("aria-label", "发送");
    document
      .querySelector("main")
      .insertAdjacentHTML(
        "beforeend",
        '<div data-chatgpt-search-unit-key="x:11:assistant" data-chatgpt-search-message-ids="m6"><p data-d-component="text">一</p></div>',
      );
    const text = document.querySelector(
      '[data-chatgpt-search-message-ids="m6"] p',
    );
    for (const chunk of ["二", "三", "四", "。结论：通过"]) {
      await new Promise((r) => setTimeout(r, 300));
      text.textContent += chunk;
    }
  });
  await page.waitForTimeout(1500);
  const done = (await turns(page)).filter((m) => m.phase === "complete");
  assert.deepEqual(
    done.map((m) => [m.messageId, m.reply]),
    [["m6", "一二三四。结论：通过"]],
  );
});

test("history rendering after the page loads is not news", async () => {
  const page = await open();
  await page.evaluate(async () => {
    for (const id of ["h1", "h2"]) {
      document
        .querySelector("main")
        .insertAdjacentHTML(
          "beforeend",
          `<div data-chatgpt-search-unit-key="x:${id}:assistant" data-chatgpt-search-message-ids="${id}"><p data-d-component="text">旧回复</p></div>`,
        );
      await new Promise((r) => setTimeout(r, 300));
    }
  });
  await page.waitForTimeout(1500);
  assert.deepEqual(await turns(page), []);
});

test("replies already on the page are not news", async () => {
  const page = await open();
  await page.evaluate(() => document.body.append(document.createElement("i")));
  await page.waitForTimeout(1200);
  assert.deepEqual(await turns(page), []);
});

test("a new conversation's start is told again once its address has an id", async () => {
  // A relay opens a new conversation on the home page: the reply starts
  // before the address turns into /c/<id>.
  const page = await browser.newPage();
  await page.route("https://chatgpt.com/**", (route) =>
    route.fulfill({ contentType: "text/html", body: fixture }),
  );
  await page.goto("https://chatgpt.com/");
  await page.evaluate(() => {
    window.told = [];
    window.chrome = {
      runtime: {
        sendMessage: (message) => (
          window.told.push(message),
          Promise.resolve()
        ),
        onMessage: { addListener() {} },
      },
    };
  });
  for (const path of scripts) await page.addScriptTag({ path });
  await page.evaluate(() => {
    const slot = document.getElementById("slot");
    slot.type = "button";
    slot.setAttribute("aria-label", "停止");
  });
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    history.pushState({}, "", "/c/6aed31aa-e880-83ee-9327-cd83363c9020");
    document.querySelector("main").append(document.createElement("div"));
  });
  await page.waitForTimeout(700);
  const starts = (await turns(page)).filter((m) => m.phase === "start");
  assert.deepEqual(
    starts.map((m) => m.conversation),
    [null, "6aed31aa-e880-83ee-9327-cd83363c9020"],
  );
});

// Streams one reply: stop button, words, send button back.
async function streamReply(page, id, text) {
  await page.evaluate(
    async ([id, text]) => {
      const slot = document.getElementById("slot");
      slot.type = "button";
      slot.setAttribute("aria-label", "停止");
      await new Promise((r) => setTimeout(r, 700));
      document
        .querySelector("main")
        .insertAdjacentHTML(
          "beforeend",
          `<div data-chatgpt-search-unit-key="x:${id}:assistant" data-chatgpt-search-message-ids="${id}"><p data-d-component="text">${text}</p></div>`,
        );
      await new Promise((r) => setTimeout(r, 500));
      slot.type = "submit";
      slot.setAttribute("aria-label", "发送");
    },
    [id, text],
  );
  await page.waitForTimeout(1500);
}

test("injected again into an open tab, the page reports each turn once", async () => {
  // background.js injects the scripts into tabs already open when the
  // extension is reloaded (#206); the manifest may inject them too.
  const page = await open();
  for (const path of scripts) await page.addScriptTag({ path });
  await streamReply(page, "m8", "第二份");
  const told = await turns(page);
  assert.equal(told.filter((m) => m.phase === "start").length, 1);
  assert.deepEqual(
    told.filter((m) => m.phase === "complete").map((m) => m.messageId),
    ["m8"],
  );
});

test("a copy cut off by an extension reload stops instead of throwing on every change", async () => {
  const page = await open();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.evaluate(() => {
    window.sends = 0;
    window.chrome.runtime.sendMessage = () => {
      window.sends++;
      throw new Error("Extension context invalidated.");
    };
  });
  await streamReply(page, "m9", "没人收");
  await streamReply(page, "m10", "也没人收");
  assert.equal(await page.evaluate(() => window.sends), 1);
  assert.deepEqual(errors, []);
});

// #356: put in while a reply is being written (the extension installed,
// updated or reloaded), the script reports that reply once it ends.
test("a script put in mid-reply reports that reply when it ends", async () => {
  const page = await open(() => {
    const slot = document.getElementById("slot");
    slot.type = "button";
    slot.setAttribute("aria-label", "停止");
    const turn = document.createElement("div");
    turn.innerHTML =
      '<div data-chatgpt-search-unit-key="x:5:assistant" data-chatgpt-search-message-ids="m3"><p data-d-component="text">写到一半</p></div>';
    document.querySelector("main").append(turn);
  });
  await page.evaluate(async () => {
    const text = document.querySelector(
      '[data-chatgpt-search-message-ids="m3"] p',
    );
    text.textContent += "，写完了。结论：通过";
    const slot = document.getElementById("slot");
    slot.type = "submit";
    slot.setAttribute("aria-label", "发送");
  });
  await page.waitForTimeout(1800);
  const done = (await turns(page)).filter((m) => m.phase === "complete");
  assert.equal(done.length, 1);
  assert.equal(done[0].messageId, "m3");
  assert.equal(done[0].reply, "写到一半，写完了。结论：通过");
});

// #356: PostPane asks for a turn it heard nothing of; the newest reply is
// told again once written, never while it is being written.
test("asked to read again, the newest written reply is told again", async () => {
  const page = await open();
  const ask = () =>
    page.evaluate(
      () =>
        new Promise((resolve) =>
          window.listener({ op: "reread" }, {}, resolve),
        ),
    );
  const answer = await ask();
  assert.deepEqual(answer, { ok: true, streaming: false, told: true });
  const done = (await turns(page)).filter((m) => m.phase === "complete");
  assert.equal(done.length, 1);
  assert.equal(done[0].messageId, "m2");
  assert.equal(done[0].reread, true);
  await page.evaluate(() => {
    const slot = document.getElementById("slot");
    slot.type = "button";
    slot.setAttribute("aria-label", "停止");
  });
  assert.deepEqual(await ask(), { ok: true, streaming: true, told: false });
  assert.equal(
    (await turns(page)).filter((m) => m.phase === "complete").length,
    1,
  );
});

// #356: words sent and not answered yet leave the reply before them as the
// last one; it is an older turn's, so asking again tells nothing.
test("asked to read again before the newest prompt is answered, nothing is told", async () => {
  const page = await open(() => {
    const turn = document.createElement("div");
    turn.innerHTML =
      '<div data-user-message-bubble="true">第三轮：只看 P1-10</div>';
    document.querySelector("main").append(turn);
  });
  const answer = await page.evaluate(
    () =>
      new Promise((resolve) => window.listener({ op: "reread" }, {}, resolve)),
  );
  assert.deepEqual(answer, { ok: true, streaming: false, told: false });
  assert.equal(
    (await turns(page)).filter((m) => m.phase === "complete").length,
    0,
  );
});
