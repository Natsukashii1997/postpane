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

async function open() {
  const page = await browser.newPage();
  await page.setContent(fixture);
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
