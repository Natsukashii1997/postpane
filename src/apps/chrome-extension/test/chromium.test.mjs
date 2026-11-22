// Runs the extension itself in Chromium (#507 review): the worker, the
// content scripts and Chrome's own tabs. What the stubbed tests cannot show:
// what Chrome does to a tab it discards, and to messages for a page too busy
// to take them. PostPane is not there (no native host): the worker's own
// functions are called.
//
// chatgpt.com is a server here, answering every address with the fixture:
// Chromium is told to find the name at it. Not by Playwright's routes: a
// tab the extension makes loads before they are set, from the real site.
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

const extension = fileURLToPath(new URL("..", import.meta.url));
// The fixture, with what chatgpt.com does and its stand-in composer leaves
// out: a paste goes into the box, and words sent show as a new prompt. A
// tab in the background runs its timers once a second, so each wait the
// page would sit out in full takes ten times as long.
const fixture = readFileSync(
  new URL("fixtures/conversation.html", import.meta.url),
  "utf8",
).replace(
  "</body>",
  `<script>
    box.addEventListener("paste", (event) => {
      event.preventDefault();
      box.append(event.clipboardData.getData("text/plain"));
    });
    slot.addEventListener("click", () => {
      const turn = document.createElement("div");
      turn.dataset.chatgptSearchUnitKey = "x:9:user";
      turn.dataset.chatgptSearchMessageIds = "p9";
      turn.innerHTML = "<div data-user-message-bubble></div>";
      turn.firstChild.textContent = window.sent;
      document.querySelector("main").append(turn);
    });
  </script></body>`,
);
const conversation = (n) =>
  `6af7ec47-c0f4-83ee-9b9e-${String(n).padStart(12, "0")}`;
const address = (id) => `https://chatgpt.com/c/${id}`;

let context;
let worker;
let server;
let scratch;
// How often each address was loaded: a tab loaded again loads its own.
const loads = new Map();

before(async () => {
  scratch = mkdtempSync(join(tmpdir(), "postpane-extension-"));
  const [key, cert] = [join(scratch, "key.pem"), join(scratch, "cert.pem")];
  execFileSync(
    "openssl",
    `req -x509 -newkey rsa:2048 -nodes -days 1 -subj /CN=chatgpt.com -keyout ${key} -out ${cert}`.split(
      " ",
    ),
    { stdio: "ignore" },
  );
  server = createServer(
    { key: readFileSync(key), cert: readFileSync(cert) },
    (request, response) => {
      const url = `https://chatgpt.com${request.url}`;
      loads.set(url, (loads.get(url) ?? 0) + 1);
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(fixture);
    },
  );
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context = await chromium.launchPersistentContext(join(scratch, "profile"), {
    channel: "chromium",
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
      // Every name is found at the server, past any proxy the machine is
      // set to use, so nothing leaves it.
      `--host-resolver-rules=MAP * 127.0.0.1:${server.address().port}`,
      "--no-proxy-server",
      "--ignore-certificate-errors",
    ],
  });
  worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker"));
});
after(async () => {
  await context?.close();
  server?.close();
  if (scratch) rmSync(scratch, { recursive: true, force: true });
});

/** A tab showing conversation `n`, once the worker lists it: its page, its
 * id, and the conversation. */
async function open(n) {
  const id = conversation(n);
  const page = await context.newPage();
  await page.goto(address(id));
  const tabId = await listed(id);
  await worker.evaluate((id) => watched.add(id), id);
  return { page, tabId, id };
}

/** The id of the tab the worker lists for `id`, waited for. */
async function listed(id) {
  for (let tries = 0; tries < 50; tries++) {
    const tabId = await worker.evaluate((id) => tabFor(id), id);
    if (tabId !== null) return tabId;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`no tab listed for ${id}`);
}

/** The tabs at `id`'s address, as Chrome has them. */
const tabsAt = (id) =>
  worker.evaluate(
    async (url) =>
      (await chrome.tabs.query({ url })).map(({ id, discarded }) => ({
        id,
        discarded,
      })),
    address(id),
  );

/** Puts a tab in front, so the others are in the background. */
async function inFront() {
  const page = await context.newPage();
  await page.goto("about:blank");
  await page.bringToFront();
}

/** Discards `tabId`: the id Chrome gives the discarded tab. */
const discard = (tabId) =>
  worker.evaluate(
    async (tabId) => (await chrome.tabs.discard(tabId)).id,
    tabId,
  );

test("Chrome gives a discarded tab a new id; words for its conversation load it again and go in", async () => {
  const { tabId, id } = await open(1);
  await inFront();
  const renamed = await discard(tabId);
  // The fact the stubbed tests stand on (2026-11-22, Chromium 156).
  assert.notEqual(renamed, tabId, "a discarded tab keeps its id");
  assert.deepEqual(await tabsAt(id), [{ id: renamed, discarded: true }]);
  const before = loads.get(address(id));
  const sent = await worker.evaluate((id) => send(id, "下一轮"), id);
  assert.equal(sent.ok, true, JSON.stringify(sent));
  assert.equal(loads.get(address(id)), before + 1, "loaded again, once");
  assert.deepEqual(
    await tabsAt(id),
    [{ id: renamed, discarded: false }],
    "and no other tab made for it",
  );
  const page = context.pages().find((page) => page.url() === address(id));
  assert.equal(await page.evaluate(() => window.sent), "下一轮");
});

test("reading again loads a discarded tab again, and reads it", async () => {
  const { tabId, id } = await open(2);
  await inFront();
  await discard(tabId);
  const before = loads.get(address(id));
  const read = await worker.evaluate((id) => readAgain(id), id);
  assert.equal(read.reloaded, true, JSON.stringify(read));
  assert.notEqual(read.outcome, "unreachable");
  assert.notEqual(read.outcome, "unopened");
  assert.equal(loads.get(address(id)), before + 1);
  assert.equal((await tabsAt(id)).length, 1);
});

// #507 review P1-01: a page that says nothing may be writing an answer.
test("a page too busy to answer is not loaded again: the words go to a tab made for them", async () => {
  const { page, tabId, id } = await open(3);
  await inFront();
  // Its thread held for longer than a sending waits on it: no message is
  // answered and no script goes in meanwhile.
  await page.evaluate(() => {
    window.kept = "not loaded again";
    setTimeout(() => {
      const until = Date.now() + 14000;
      while (Date.now() < until);
    }, 0);
  });
  const before = loads.get(address(id));
  const sent = await worker.evaluate((id) => send(id, "下一轮"), id);
  assert.equal(sent.ok, true, JSON.stringify(sent));
  const there = await tabsAt(id);
  assert.equal(there.length, 2, "one made beside it");
  assert.ok(there.some((tab) => tab.id === tabId));
  assert.equal(loads.get(address(id)), before + 1, "only the one made loads");
  // Free again, the page is the one it was, and took no words.
  assert.equal(await page.evaluate(() => window.kept), "not loaded again");
  assert.equal(await page.evaluate(() => window.sent), undefined);
});

// #507 review P1-03: words for a conversation go into no other.
test("a tab moved to another conversation takes none of the words", async () => {
  const { page, tabId, id } = await open(4);
  const other = conversation(5);
  // The page moves on without loading, as chatgpt.com does; nothing tells
  // the worker, which still lists the tab for the conversation it showed.
  await page.evaluate((path) => history.pushState({}, "", path), `/c/${other}`);
  assert.equal(await worker.evaluate((id) => tabFor(id), id), tabId);
  // Asked to send as if it still showed it: refused by the page itself.
  const refused = await worker.evaluate(
    ([tabId, id]) => submit(tabId, "下一轮", Date.now() + 20000, id),
    [tabId, id],
  );
  assert.deepEqual(refused, {
    ok: false,
    reason: "other-conversation",
    pressed: false,
  });
  // A sending finds it shows another, and makes a tab for the words.
  const sent = await worker.evaluate((id) => send(id, "下一轮"), id);
  assert.equal(sent.ok, true, JSON.stringify(sent));
  assert.equal(await page.evaluate(() => window.sent), undefined);
  assert.equal(
    await page.evaluate(
      () => document.querySelector(".ProseMirror").textContent,
    ),
    "",
  );
  const made = context
    .pages()
    .find((made) => made !== page && made.url() === address(id));
  assert.equal(await made.evaluate(() => window.sent), "下一轮");
});

// A listed tab that went to another site: Chrome tells the extension no
// address but chatgpt.com's, so it is listed still, and takes no script.
test("a listed tab gone to another site is not loaded again", async () => {
  const { page, tabId, id } = await open(6);
  const elsewhere = "https://example.com/form";
  await page.goto(elsewhere);
  await page.evaluate(() => (window.kept = "not loaded again"));
  assert.equal(
    await worker.evaluate((id) => tabFor(id), id),
    tabId,
    "nothing told the worker it left",
  );
  const before = loads.get(elsewhere);
  const sent = await worker.evaluate((id) => send(id, "下一轮"), id);
  assert.equal(sent.ok, true, JSON.stringify(sent));
  assert.equal(loads.get(elsewhere), before);
  assert.equal(await page.evaluate(() => window.kept), "not loaded again");
  assert.equal(await page.evaluate(() => window.sent), undefined);
});
