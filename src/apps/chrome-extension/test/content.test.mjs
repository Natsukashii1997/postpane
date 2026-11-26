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

// #410: an answer to a brief ChatGPT made an attachment is told, with the
// id of the prompt it answers, so PostPane holds it to the words it sent.
test("a reply to a prompt ChatGPT made an attachment is told with that prompt's id", async () => {
  const page = await open();
  await page.evaluate(async () => {
    const result = await new Promise((resolve) =>
      window.listener({ op: "submit", text: "很长的送审" }, {}, resolve),
    );
    if (!result.ok) throw new Error(JSON.stringify(result));
    const slot = document.getElementById("slot");
    slot.type = "submit";
    slot.setAttribute("aria-label", "发送");
    document
      .querySelector("main")
      .insertAdjacentHTML(
        "beforeend",
        '<div data-chatgpt-search-unit-key="y:0:user" data-chatgpt-search-message-ids="p7"><span><span>粘贴的文本.txt</span><span>文档</span></span></div>' +
          '<div data-chatgpt-search-unit-key="y:2:assistant" data-chatgpt-search-message-ids="m7"><p data-d-component="text">复核结论</p></div>',
      );
  });
  await page.waitForTimeout(1500);
  const done = (await turns(page)).filter((m) => m.phase === "complete");
  assert.deepEqual(
    done.map((m) => [m.messageId, m.promptId, m.prompt]),
    [["m7", "p7", null]],
  );
  assert.equal(done[0].unreadable, true);
});

// #507 review round 5, P1-04: an answer begins before its prompt is drawn.
// The newest prompt then is the one before, answered already: the beginning
// does not name it, and is told again naming its own prompt once drawn.
test("an answer begun before its prompt is drawn names that prompt only once drawn", async () => {
  const page = await open(() => {
    const units = document.querySelectorAll(
      '[data-chatgpt-search-unit-key$=":user"]',
    );
    units[units.length - 1].setAttribute(
      "data-chatgpt-search-message-ids",
      "p1",
    );
  });
  await page.evaluate(async () => {
    const slot = document.getElementById("slot");
    slot.type = "button";
    slot.setAttribute("aria-label", "停止");
    await new Promise((r) => setTimeout(r, 900));
    document
      .querySelector("main")
      .insertAdjacentHTML(
        "beforeend",
        '<div data-chatgpt-search-unit-key="y:0:user" data-chatgpt-search-message-ids="p2"><div data-message-author-role="user">又一问</div></div>',
      );
    await new Promise((r) => setTimeout(r, 900));
  });
  const starts = (await turns(page)).filter((m) => m.phase === "start");
  assert.deepEqual(
    starts.map((m) => [m.promptId, !!m.again]),
    [
      [null, false],
      ["p2", true],
    ],
  );
  assert.equal(starts[1].at, starts[0].at, "the same turn, begun when it did");
});

// #507 review round 6, P1-04: put in again over a copy from before this
// change, which hands over no `done`, while an answer is being written and
// its prompt is not drawn yet: the prompt before is not named; this one is,
// once drawn, and its end names it too.
test("put in over an older copy mid-answer, the answer names its prompt only once drawn", async () => {
  const page = await open(() => {
    const units = document.querySelectorAll(
      '[data-chatgpt-search-unit-key$=":user"]',
    );
    units[units.length - 1].setAttribute(
      "data-chatgpt-search-message-ids",
      "p1",
    );
    const slot = document.getElementById("slot");
    slot.type = "button";
    slot.setAttribute("aria-label", "停止");
    // What a copy before this change hands over.
    globalThis.PostPaneContentStop = () => ({
      reported: "m2",
      expecting: true,
    });
  });
  await page.evaluate(async () => {
    // The page changes while only the prompt before is drawn: it is not
    // named (the fixture has no address, so no beginning is told at load).
    await new Promise((r) => setTimeout(r, 300));
    document.querySelector("main").append(document.createElement("span"));
    await new Promise((r) => setTimeout(r, 700));
    document
      .querySelector("main")
      .insertAdjacentHTML(
        "beforeend",
        '<div data-chatgpt-search-unit-key="y:0:user" data-chatgpt-search-message-ids="p2"><div data-message-author-role="user">又一问</div></div>' +
          '<div data-chatgpt-search-unit-key="y:1:assistant" data-chatgpt-search-message-ids="m9"><p data-d-component="text">答完了</p></div>',
      );
    await new Promise((r) => setTimeout(r, 700));
    const slot = document.getElementById("slot");
    slot.type = "submit";
    slot.setAttribute("aria-label", "发送");
  });
  await page.waitForTimeout(1500);
  const told = await turns(page);
  assert.deepEqual(
    told.map((m) => [m.phase, m.promptId, !!m.again]),
    [
      ["start", "p2", true],
      ["complete", "p2", false],
    ],
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

// #507: a script is put in again when the page did not say it is there in
// two seconds. A page that was only slow has its copy still running: what
// that one was waiting on is handed over, or the answer to words it sent
// would pass for one already there.
test("put in again while an answer is due, the script still reports that answer", async () => {
  const page = await open();
  await page.evaluate(async () => {
    const result = await new Promise((resolve) =>
      window.listener({ op: "submit", text: "请审核" }, {}, resolve),
    );
    if (!result.ok) throw new Error(JSON.stringify(result));
    // Streaming ended with nothing drawn yet, as in a slow background tab.
    const slot = document.getElementById("slot");
    slot.type = "submit";
    slot.setAttribute("aria-label", "发送");
  });
  await page.waitForTimeout(1200);
  for (const path of scripts) await page.addScriptTag({ path });
  await page.evaluate(() =>
    document
      .querySelector("main")
      .insertAdjacentHTML(
        "beforeend",
        '<div data-chatgpt-search-unit-key="x:7:assistant" data-chatgpt-search-message-ids="m4"><p data-d-component="text">好的</p></div>',
      ),
  );
  await page.waitForTimeout(1500);
  const done = (await turns(page)).filter((m) => m.phase === "complete");
  assert.deepEqual(
    done.map((m) => [m.messageId, m.reply]),
    [["m4", "好的"]],
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

// #507 review P1-03: words for a conversation go into no other. The tab may
// show another since it was asked whether it is there.
test("words for another conversation than the page shows are not put in or sent", async () => {
  const page = await open();
  const answer = await page.evaluate(
    () =>
      new Promise((resolve) =>
        window.listener(
          { op: "submit", text: "下一轮", conversation: "another" },
          {},
          resolve,
        ),
      ),
  );
  assert.deepEqual(answer, {
    ok: false,
    reason: "other-conversation",
    pressed: false,
  });
  const box = await page.evaluate(
    () => document.querySelector(".ProseMirror")?.textContent ?? "",
  );
  assert.equal(box, "");
  await page.close();
});

// #542 review round 4, P1-06: words that open a conversation go from a new
// chat's page only: not into one the tab shows, nor once it moves on to one
// as they go in.
const OPENED = "6aed31aa-e880-83ee-9327-cd83363c9021";
/** A page at chatgpt.com `path`, `before` run in it (with `arg`) first. */
async function at(path, before = () => {}, arg = null) {
  const page = await browser.newPage();
  await page.route("https://chatgpt.com/**", (route) =>
    route.fulfill({ contentType: "text/html", body: fixture }),
  );
  await page.goto(`https://chatgpt.com${path}`);
  await page.evaluate(before, arg);
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
const command = (page, message) =>
  page.evaluate(
    (message) =>
      new Promise((resolve) => window.listener(message, {}, resolve)),
    message,
  );

test("words that open a conversation go from a new chat's page only", async () => {
  const shown = await at(`/c/${OPENED}`);
  assert.deepEqual(
    await command(shown, { op: "submit", text: "第 1 轮", conversation: null }),
    { ok: false, reason: "other-conversation", pressed: false },
  );
  assert.equal(await shown.evaluate(() => window.sent), undefined);
  await shown.close();
  // Moved on to a conversation as the words go in: not sent there.
  const moved = await at("/", () => {
    const box = document.querySelector(".ProseMirror");
    new MutationObserver(() => {
      if (location.pathname === "/")
        history.pushState({}, "", "/c/6aed31aa-e880-83ee-9327-cd83363c9022");
    }).observe(box, { childList: true, subtree: true, characterData: true });
  });
  const answer = await command(moved, {
    op: "submit",
    text: "第 1 轮",
    conversation: null,
  });
  assert.equal(answer.reason, "other-conversation");
  assert.equal(answer.pressed, false);
  assert.equal(await moved.evaluate(() => window.sent), undefined);
  await moved.close();
  const blank = await at("/");
  const sent = await command(blank, {
    op: "submit",
    text: "第 1 轮",
    conversation: null,
  });
  assert.equal(sent.ok, true);
  assert.equal(await blank.evaluate(() => window.sent), "第 1 轮");
  await blank.close();
});

test("asked whether it shows the words it was opened with, a page answers by its prompts", async () => {
  const LONG = "长".repeat(7000);
  // The page holding one prompt only: `words`, or none of its own (null).
  const one = (words) => [
    (words) => {
      for (const node of document.querySelectorAll(
        '[data-chatgpt-search-unit-key$=":user"]',
      ))
        node.remove();
      document
        .querySelector("main")
        .insertAdjacentHTML(
          "beforeend",
          `<div data-chatgpt-search-unit-key="t9:0:user" data-chatgpt-search-message-ids="p9">${
            words === null
              ? ""
              : `<div data-user-message-bubble="true">${words}</div>`
          }</div>`,
        );
    },
    words,
  ];

  const opened = async ([before, arg], text, more = {}) => {
    const page = await at(`/c/${OPENED}`, before, arg);
    const said = await command(page, {
      op: "opened",
      conversation: OPENED,
      text,
      ...more,
    });
    await page.close();
    return said.ours;
  };
  // Its only prompt, beginning as the words do; spaces aside.
  assert.equal(await opened(one("第 1 轮\n请审核"), "第 1 轮 请审核"), true);
  // Another's words, or more than one prompt: one of his own.
  assert.equal(await opened(one("我自己的问题"), "第 1 轮"), false);
  assert.equal(await opened([() => {}], "请审核这次改动"), false);
  // The prompt the words became, newest: theirs, whatever else is there.
  const newest = () =>
    document
      .querySelector("main")
      .insertAdjacentHTML(
        "beforeend",
        `<div data-chatgpt-search-unit-key="t9:0:user" data-chatgpt-search-message-ids="p9"><div data-user-message-bubble="true">附件</div></div>`,
      );
  assert.equal(await opened([newest], "x", { promptId: "p9" }), true);
  assert.equal(await opened([newest], "x", { promptId: "p8" }), false);
  // No words of its own: a long paste ChatGPT made a file; a short one is
  // not drawn yet.
  assert.equal(await opened(one(null), LONG), true);
  assert.equal(await opened(one(null), "第 1 轮"), false);
  // Another conversation than the one asked of.
  const other = await at(
    "/c/6aed31aa-e880-83ee-9327-cd83363c9023",
    ...one("第 1 轮"),
  );
  const said = await command(other, {
    op: "opened",
    conversation: OPENED,
    text: "第 1 轮",
  });
  assert.equal(said.ours, false);
  assert.equal(said.conversation, "6aed31aa-e880-83ee-9327-cd83363c9023");
  await other.close();
});

// #356: put in while a reply is being written (the extension installed,
// updated or reloaded), the script reports that reply once it ends.
// #507 review round 4, P1-04: no change to writing is seen by a script that
// begins mid-answer, so the beginning is told as it begins: PostPane holds
// words back by it. Not writing, nothing is told.
test("a script that begins mid-answer tells the beginning at once", async () => {
  const id = "6af7ec47-c0f4-83ee-9b9e-bf518660767e";
  const at = async (writing) => {
    const page = await browser.newPage();
    await page.route("https://chatgpt.com/**", (route) =>
      route.fulfill({ contentType: "text/html", body: fixture }),
    );
    await page.goto(`https://chatgpt.com/c/${id}`);
    await page.evaluate((writing) => {
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
      if (!writing) return;
      const slot = document.getElementById("slot");
      slot.type = "button";
      slot.setAttribute("aria-label", "停止");
    }, writing);
    for (const path of scripts) await page.addScriptTag({ path });
    const told = await turns(page);
    await page.close();
    return told.map((m) => [m.phase, m.again, m.conversation]);
  };
  assert.deepEqual(await at(true), [["start", true, id]]);
  assert.deepEqual(await at(false), []);
});

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
  assert.deepEqual(answer, {
    ok: true,
    streaming: false,
    told: true,
    loaded: true,
  });
  const done = (await turns(page)).filter((m) => m.phase === "complete");
  assert.equal(done.length, 1);
  assert.equal(done[0].messageId, "m2");
  assert.equal(done[0].reread, true);
  await page.evaluate(() => {
    const slot = document.getElementById("slot");
    slot.type = "button";
    slot.setAttribute("aria-label", "停止");
  });
  assert.deepEqual(await ask(), {
    ok: true,
    streaming: true,
    told: false,
    loaded: true,
  });
  assert.equal(
    (await turns(page)).filter((m) => m.phase === "complete").length,
    1,
  );
});

// #507: before words go to a tab, the extension asks whether its page is
// there: a tab Chrome discarded or froze says nothing.
test("asked whether it is there, the page says which conversation it shows", async () => {
  const page = await open(() => {});
  const answer = await page.evaluate(
    () =>
      new Promise((resolve) => window.listener({ op: "alive" }, {}, resolve)),
  );
  assert.deepEqual(Object.keys(answer), ["conversation", "hidden"]);
  assert.equal(answer.hidden, false);
  const shown = await page.evaluate(() => location.href);
  assert.equal(answer.conversation, shown.split("/c/")[1] ?? null);
  await page.close();
});

// #509: PostPane looks for words it sent: they begin with a line naming
// their request. Every prompt the page holds is read, not only the newest
// (round 1 P1-01): Changhao may have asked something after them.
const prompt = (n, words) =>
  `<div data-chatgpt-search-unit-key="t${n}:0:user" data-chatgpt-search-message-ids="p${n}"><div data-user-message-bubble="true">${words}</div></div>`;
/** The fixture with `html` added to its conversation. */
async function withTurns(html) {
  const page = await open();
  await page.evaluate((html) => {
    document.querySelector("main").insertAdjacentHTML("beforeend", html);
  }, html);
  return page;
}
const ask = (page, command) =>
  page.evaluate(
    (command) =>
      new Promise((resolve) =>
        window.listener({ op: "asked", ...command }, {}, resolve),
      ),
    command,
  );

test("asked whether words are there, the page reads every prompt it holds", async () => {
  const page = await withTurns(
    `<div style="height:0;overflow:hidden">${
      prompt(7, "上一轮") +
      prompt(8, "【驿窗送审 h1~send5】\n第二轮") +
      prompt(9, "顺便问一句：【驿窗送审 h1~send6】")
    }</div>${prompt(9, "顺便问一句：【驿窗送审 h1~send6】")}`,
  );
  const conversation = await page.evaluate(
    () => location.href.split("/c/")[1] ?? null,
  );
  // Not the newest prompt, and found all the same, by its id (P1-02).
  assert.deepEqual(
    await ask(page, { conversation, request: "h1~send5", after: "p7" }),
    {
      here: true,
      loaded: true,
      there: true,
      twice: false,
      promptId: "p8",
      anchored: true,
      unreadable: false,
      streaming: false,
    },
  );
  // Named only inside a prompt, not as its first line: not theirs.
  const quoted = await ask(page, { conversation, request: "h1~send6" });
  assert.deepEqual([quoted.there, quoted.promptId], [false, null]);
  // Words not there; the prompt before them is on the page, or is not.
  const absent = await ask(page, {
    conversation,
    request: "h1~send9",
    after: "p7",
  });
  assert.deepEqual(
    [absent.there, absent.anchored, absent.unreadable],
    [false, true, false],
  );
  for (const after of ["p1", undefined])
    assert.equal(
      (await ask(page, { conversation, request: "h1~send9", after })).anchored,
      false,
    );
  // Another conversation's page says nothing of this one, and that it is
  // not this one's (#507 review P1-01: it is not loaded again to look).
  const other = await ask(page, {
    conversation: "another",
    request: "h1~send5",
  });
  assert.deepEqual(
    [other.here, other.loaded, other.there],
    [false, false, false],
  );
  await page.close();
});

// #509 round 1 P1-01, P1-02: words that may be in a prompt drawn with no
// words (ChatGPT made it an attachment, #410), or two prompts naming them.
test("asked whether words are there, a prompt without words, or a request named twice, is told", async () => {
  const page = await withTurns(
    prompt(7, "上一轮") +
      `<div data-chatgpt-search-unit-key="t8:0:user" data-chatgpt-search-message-ids="p8"><div>brief.md</div></div>` +
      prompt(9, "【驿窗送审 h1~send5】\n第二轮") +
      prompt(10, "【驿窗送审 h1~send5】\n第二轮"),
  );
  const conversation = await page.evaluate(
    () => location.href.split("/c/")[1] ?? null,
  );
  const named = await ask(page, {
    conversation,
    request: "h1~send5",
    after: "p7",
  });
  assert.deepEqual(
    [named.there, named.twice, named.promptId, named.unreadable],
    [false, true, null, true],
  );
  // Before the prompt known to have gone in, a prompt without words is
  // older than the words looked for.
  const past = await ask(page, {
    conversation,
    request: "h1~send9",
    after: "p10",
  });
  assert.equal(past.unreadable, false);
  await page.close();
});

// #509 round 2 P1-01: a prompt's turn not drawn yet (no bubble, or an
// empty one) after the last prompt known to have gone in may hold the
// words; a turn drawn in one copy and still empty in another is read.
test("asked whether words are there, a prompt not drawn yet is told", async () => {
  const empty = (n, inner) =>
    `<div data-chatgpt-search-unit-key="t${n}:0:user" data-chatgpt-search-message-ids="p${n}">${inner}</div>`;
  const conversationOf = (page) =>
    page.evaluate(() => location.href.split("/c/")[1] ?? null);
  for (const drawing of ["", '<div data-user-message-bubble="true"></div>']) {
    const page = await withTurns(
      prompt(7, "上一轮") + empty(8, drawing) + prompt(9, "又问了一句"),
    );
    const said = await ask(page, {
      conversation: await conversationOf(page),
      request: "h1~send5",
      after: "p7",
    });
    assert.deepEqual(
      [said.there, said.anchored, said.unreadable],
      [false, true, true],
      drawing,
    );
    await page.close();
  }
  // Drawn in the hidden copy, still empty where it is drawn: read.
  const page = await withTurns(
    `<div style="height:0;overflow:hidden">${
      prompt(7, "上一轮") + prompt(8, "【驿窗送审 h1~send5】\n第二轮")
    }</div>${empty(8, '<div data-user-message-bubble="true"></div>')}${prompt(
      9,
      "又问了一句",
    )}`,
  );
  const said = await ask(page, {
    conversation: await conversationOf(page),
    request: "h1~send5",
    after: "p7",
  });
  assert.deepEqual(
    [said.there, said.promptId, said.unreadable],
    [true, "p8", false],
  );
  await page.close();
});

// #509 round 1 P1-03: the page loads itself again to look only when it
// shows the conversation, writes nothing and holds no words in hand.
test("asked to load again to look, a page writing, holding a draft or showing another conversation does not", async () => {
  const reload = (page, conversation) =>
    page.evaluate(
      (conversation) =>
        new Promise((resolve) =>
          window.listener({ op: "reload", conversation }, {}, resolve),
        ),
      conversation,
    );
  const page = await open();
  const conversation = await page.evaluate(
    () => location.href.split("/c/")[1] ?? null,
  );
  assert.equal(await reload(page, "another"), false);
  await page.evaluate(() => {
    document.querySelector(".ProseMirror").textContent = "还没发的问题";
  });
  assert.equal(await reload(page, conversation), false);
  await page.evaluate(() => {
    document.querySelector(".ProseMirror").textContent = "";
    document
      .querySelector("main")
      .insertAdjacentHTML(
        "beforeend",
        '<div data-chatgpt-search-unit-key="t3:0:user"><textarea>改一下</textarea></div>',
      );
  });
  assert.equal(
    await reload(page, conversation),
    false,
    "a prompt being edited",
  );
  // Round 2 P1-03: edited in an editable box of its turn.
  await page.evaluate(() => {
    document.querySelector("textarea").outerHTML =
      '<div contenteditable="true">改一下</div>';
  });
  assert.equal(await reload(page, conversation), false, "edited in a box");
  // Round 2 P1-03: send lit with the box empty, a file waiting beside it.
  await page.evaluate(() => {
    document.querySelector('main [contenteditable="true"]').remove();
    document.getElementById("slot").disabled = false;
  });
  assert.equal(await reload(page, conversation), false, "a file waiting");
  await page.evaluate(() => {
    document.getElementById("slot").disabled = true;
    const slot = document.getElementById("slot");
    slot.type = "button";
    slot.setAttribute("aria-label", "停止");
  });
  assert.equal(
    await reload(page, conversation),
    false,
    "an answer being written",
  );
  await page.close();
});

// #542: an ended relay's tab is closed only when its page says it may: it
// shows the conversation, writes nothing and holds no words in hand.
test("asked whether it may be closed, a page says no while writing, holding a draft or showing another conversation", async () => {
  const closable = (page, conversation) =>
    page.evaluate(
      (conversation) =>
        new Promise((resolve) =>
          window.listener({ op: "closable", conversation }, {}, resolve),
        ),
      conversation,
    );
  const page = await open();
  const conversation = await page.evaluate(
    () => location.href.split("/c/")[1] ?? null,
  );
  await page.evaluate(() => (window.stillHere = true));
  assert.equal(await closable(page, conversation), true);
  assert.equal(await closable(page, "another"), false);
  await page.evaluate(() => {
    document.querySelector(".ProseMirror").textContent = "还没发的问题";
  });
  assert.equal(await closable(page, conversation), false, "a draft");
  await page.evaluate(() => {
    document.querySelector(".ProseMirror").textContent = "";
    const slot = document.getElementById("slot");
    slot.type = "button";
    slot.setAttribute("aria-label", "停止");
  });
  assert.equal(await closable(page, conversation), false, "writing");
  assert.equal(
    await page.evaluate(() => window.stillHere),
    true,
    "the page is not loaded again",
  );
  await page.close();
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
  assert.deepEqual(answer, {
    ok: true,
    streaming: false,
    told: false,
    loaded: false,
  });
  assert.equal(
    (await turns(page)).filter((m) => m.phase === "complete").length,
    0,
  );
});

const reread = (page, command = {}) =>
  page.evaluate(
    (command) =>
      new Promise((resolve) =>
        window.listener({ op: "reread", ...command }, {}, resolve),
      ),
    command,
  );

// #356 P2-01: the stop button gone, the last words may still be drawn; asked
// then, the reply is told only once it stays the same for 600 ms, in full.
test("asked to read again while the reply still changes, only the finished reply is told", async () => {
  const page = await open();
  const asking = reread(page);
  await page.evaluate(() => {
    document.querySelector(
      '[data-chatgpt-search-message-ids="m2 m2"] [data-d-component="text"]',
    ).textContent += "（补一句）";
  });
  assert.equal((await asking).told, false);
  assert.equal(
    (await turns(page)).filter((m) => m.phase === "complete").length,
    0,
  );
  assert.equal((await reread(page)).told, true);
  const done = (await turns(page)).filter((m) => m.phase === "complete");
  assert.equal(done.length, 1);
  assert.ok(done[0].reply.includes("修好边界（补一句）"));
});

// #356 P2-02: the command names its conversation and a tab showing another
// tells nothing; a page that has not drawn its history says so.
test("asked to read again, a tab checks its conversation and says whether its history is there", async () => {
  const page = await open();
  assert.deepEqual(await reread(page, { conversation: "6af7-other" }), {
    ok: false,
    reason: "other-conversation",
  });
  await page.evaluate(() => {
    for (const node of document.querySelectorAll(
      '[data-user-message-bubble], [data-chatgpt-search-unit-key$=":assistant"]',
    ))
      node.remove();
  });
  assert.deepEqual(await reread(page), {
    ok: true,
    streaming: false,
    told: false,
    loaded: false,
  });
  assert.equal(
    (await turns(page)).filter((m) => m.phase === "complete").length,
    0,
  );
});

// #356 P1-02: put in while a stop button shows that is not this turn's (or
// is seen by mistake), with the newest prompt still unanswered: when it goes,
// the older reply is not news.
test("a stop button going away does not make a reply before the newest prompt news", async () => {
  const page = await open(() => {
    const slot = document.getElementById("slot");
    slot.type = "button";
    slot.setAttribute("aria-label", "停止");
    const turn = document.createElement("div");
    turn.innerHTML =
      '<div data-user-message-bubble="true">第三轮：只看 P1-10</div>';
    document.querySelector("main").append(turn);
  });
  await page.evaluate(() => {
    const slot = document.getElementById("slot");
    slot.type = "submit";
    slot.setAttribute("aria-label", "发送");
  });
  await page.waitForTimeout(1800);
  assert.equal(
    (await turns(page)).filter((m) => m.phase === "complete").length,
    0,
  );
});

// #356 P1-02: replies drawn before their prompts (the history loading)
// answer nothing known yet.
test("a reply with no prompt drawn yet is not taken as answered", async () => {
  const page = await open(() => {
    for (const node of document.querySelectorAll(
      '[data-user-message-bubble], [data-chatgpt-search-unit-key$=":user"]',
    ))
      node.remove();
  });
  const answer = await reread(page);
  assert.deepEqual(answer, {
    ok: true,
    streaming: false,
    told: false,
    loaded: false,
  });
});

// #356 P2-02 (round 2): the prompt drawn before its answer is not the history
// loaded; asked again once the answer shows, the answer is told.
test("a page showing the newest prompt without its answer yet is not loaded", async () => {
  const page = await open(() => {
    const turn = document.createElement("div");
    turn.id = "late";
    turn.innerHTML =
      '<div data-user-message-bubble="true">第三轮：只看 P1-10</div>';
    document.querySelector("main").append(turn);
  });
  assert.equal((await reread(page)).loaded, false);
  await page.evaluate(() => {
    document
      .getElementById("late")
      .insertAdjacentHTML(
        "beforeend",
        '<div data-chatgpt-search-unit-key="x:7:assistant" data-chatgpt-search-message-ids="m7"><p data-d-component="text">P1-10 已关闭。结论：通过</p></div>',
      );
  });
  const answer = await reread(page);
  assert.deepEqual(answer, {
    ok: true,
    streaming: false,
    told: true,
    loaded: true,
  });
  const done = (await turns(page)).filter((m) => m.phase === "complete");
  assert.equal(done.at(-1).messageId, "m7");
});

// #410: the newest turn answered, its answer only in the page's hidden copy
// (the drawn one shows older turns): nothing is told, and the conversation
// is scrolled to its end so the answer gets drawn.
test("an answer held only in the hidden copy is not told, and the page scrolls to it", async () => {
  const page = await open(() => {
    const main = document.querySelector("main");
    main.style.cssText = "height:200px;overflow-y:auto";
    // The hidden copy lists every turn, the fixture's and a later one.
    const hidden = [0, 1, 2, 3]
      .map(
        (n) =>
          `<div data-chatgpt-search-unit-key="fallback-turn-0:${n}:${n % 2 ? "assistant" : "user"}"></div>`,
      )
      .join("");
    main.insertAdjacentHTML(
      "afterbegin",
      `<div style="height:0;overflow:hidden">${hidden}` +
        '<div data-chatgpt-search-unit-key="later:0:user"><div data-user-message-bubble="true">专项复核</div></div>' +
        '<div data-chatgpt-search-unit-key="later:2:assistant" data-chatgpt-search-message-ids="m9 m9"></div>' +
        "</div>",
    );
    main.insertAdjacentHTML("beforeend", '<div style="height:3000px"></div>');
  });
  const answer = await reread(page);
  assert.deepEqual(answer, {
    ok: true,
    streaming: false,
    told: false,
    loaded: true,
    undrawn: true,
  });
  assert.ok(
    await page.evaluate(() => document.querySelector("main").scrollTop > 0),
  );
  assert.equal(
    (await turns(page)).filter((m) => m.phase === "complete").length,
    0,
  );
});

// #526 (owner 2026-11-24 「12改」): an answer stopped before a word of it
// was written ends no turn PostPane hears of, and held words back 30
// minutes. Read twice 2 s apart, nothing after the newest prompt but an
// empty placeholder or nothing at all, the page tells it stopped.
const stoppedEmpty = (placeholder) => async () => {
  const page = await open(() => {
    const slot = document.getElementById("slot");
    slot.type = "button";
    slot.setAttribute("aria-label", "停止");
    const turn = document.createElement("div");
    turn.innerHTML =
      '<div data-user-message-bubble="true">我自己问的，然后点了停止</div>';
    document.querySelector("main").append(turn);
  });
  await page.evaluate((placeholder) => {
    if (placeholder)
      document
        .querySelector("main")
        .insertAdjacentHTML(
          "beforeend",
          '<div data-chatgpt-search-unit-key="x:9:assistant" data-chatgpt-search-message-ids="m9"><h6 class="sr-only">ChatGPT 说：</h6><p data-d-component="text"></p></div>',
        );
    const slot = document.getElementById("slot");
    slot.type = "submit";
    slot.setAttribute("aria-label", "发送");
  }, placeholder);
  const stopped = async () =>
    (await turns(page)).filter((m) => m.phase === "stopped");
  await page.waitForTimeout(1500);
  assert.equal((await stopped()).length, 0, "not on one read");
  await page.waitForTimeout(2500);
  const told = await stopped();
  assert.equal(told.length, 1, JSON.stringify(told));
  const start = (await turns(page)).find((m) => m.phase === "start");
  assert.equal(told[0].promptId, start?.promptId ?? null, "the turn it began");
  assert.equal(
    (await turns(page)).filter((m) => m.phase === "complete").length,
    0,
  );
};
test(
  "an answer stopped before a word of it is told stopped",
  stoppedEmpty(false),
);
test(
  "an answer stopped on an empty placeholder is told stopped",
  stoppedEmpty(true),
);

test("an answer written within the second read is not told stopped", async () => {
  const page = await open(() => {
    const slot = document.getElementById("slot");
    slot.type = "button";
    slot.setAttribute("aria-label", "停止");
    const turn = document.createElement("div");
    turn.innerHTML = '<div data-user-message-bubble="true">再问一句</div>';
    document.querySelector("main").append(turn);
  });
  await page.evaluate(async () => {
    const slot = document.getElementById("slot");
    slot.type = "submit";
    slot.setAttribute("aria-label", "发送");
    document
      .querySelector("main")
      .insertAdjacentHTML(
        "beforeend",
        '<div data-chatgpt-search-unit-key="x:9:assistant" data-chatgpt-search-message-ids="m9"><h6 class="sr-only">ChatGPT 说：</h6><p data-d-component="text"></p></div>',
      );
    await new Promise((r) => setTimeout(r, 1200));
    document.querySelector(
      '[data-chatgpt-search-message-ids="m9"] p',
    ).textContent = "写出来了";
  });
  await page.waitForTimeout(3500);
  const phases = (await turns(page)).map((m) => m.phase);
  assert.ok(!phases.includes("stopped"), JSON.stringify(phases));
});

// #431: the attachment user unit is constructed from the documented unit key.
test("an attachment-only user turn is reported as unreadable instead of the old prompt", async () => {
  const page = await open();
  await page.evaluate(async () => {
    const slot = document.getElementById("slot");
    slot.type = "button";
    slot.setAttribute("aria-label", "停止");
    await new Promise((r) => setTimeout(r, 600));
    document
      .querySelector("main")
      .insertAdjacentHTML(
        "beforeend",
        '<div data-chatgpt-search-unit-key="attachment:0:user" data-chatgpt-search-message-ids="p-attachment"><svg></svg></div>' +
          '<div data-chatgpt-search-unit-key="attachment:1:assistant" data-chatgpt-search-message-ids="a-attachment"><p data-d-component="text">附件回答</p></div>',
      );
    slot.type = "submit";
    slot.setAttribute("aria-label", "发送");
  });
  await page.waitForFunction(() =>
    window.told.some((m) => m.type === "turn" && m.phase === "complete"),
  );
  const done = (await turns(page)).filter((m) => m.phase === "complete");
  assert.equal(done[0].prompt, null);
  assert.equal(done[0].unreadable, true);
  assert.equal(done[0].promptId, "p-attachment");
  await page.close();
});

// #431: retain #509's decided search across all prompts, even when the last
// user unit has no bubble. This unit is constructed, not a live DOM capture.
test("a known request before an unreadable latest user unit is still found", async () => {
  const page = await withTurns(
    prompt(7, "【驿窗送审 h1~send5】\n审核") +
      '<div data-chatgpt-search-unit-key="attachment:0:user" data-chatgpt-search-message-ids="p8"><svg></svg></div>',
  );
  const said = await ask(page, {
    conversation: await page.evaluate(
      () => location.href.split("/c/")[1] ?? null,
    ),
    request: "h1~send5",
    after: "p7",
  });
  assert.deepEqual(
    [said.loaded, said.there, said.promptId, said.unreadable],
    [true, true, "p7", true],
  );
  await page.close();
});
