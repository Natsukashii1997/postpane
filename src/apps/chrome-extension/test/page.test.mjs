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
    { ok: false, reason: "busy", pressed: false },
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
// there before the words come, as a failed earlier try would leave it;
// `draft` leaves words in the box; `keep` takes in only that share of each
// paste, as a page cutting it short would; `alter` takes each paste in with
// its first character changed, as many characters but not the words.
const composer = async ({
  limit = 9000,
  attachFrom = Infinity,
  leftover = false,
  draft = "",
  keep = 1,
  alter = false,
} = {}) => {
  const fresh = await browser.newPage();
  await fresh.setContent(fixture);
  await fresh.addScriptTag({ path: script });
  await fresh.evaluate(
    ({ limit, attachFrom, leftover, draft, keep, alter }) => {
      window.pastes = [];
      const box = document.querySelector(".ProseMirror");
      box.textContent = draft;
      const attach = () => {
        const tile = document.createElement("div");
        tile.className = "attachment";
        tile.textContent = "粘贴的文本.txt";
        box.before(tile);
        document.getElementById("slot").disabled = false;
      };
      // An attachment keeps send lit with the box empty, as on the page.
      new MutationObserver(() => {
        if (document.querySelector(".attachment"))
          document.getElementById("slot").disabled = false;
      }).observe(box, { childList: true, subtree: true, characterData: true });
      if (leftover) attach();
      box.addEventListener("paste", (event) => {
        event.preventDefault();
        const text = event.clipboardData.getData("text/plain");
        window.pastes.push(text);
        if (text.length <= limit && window.pastes.length <= attachFrom) {
          let kept = text.slice(0, Math.ceil(text.length * keep));
          if (alter) kept = "某" + kept.slice(1);
          document.execCommand("insertText", false, kept);
        } else attach();
      });
    },
    {
      limit,
      attachFrom: Number.isFinite(attachFrom) ? attachFrom : 1e9,
      leftover,
      draft,
      keep,
      alter,
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
    pressed: false,
  });
  assert.equal(await fresh.evaluate(() => window.sent), undefined);
  await fresh.close();
});

test("a later piece turned attachment stops the sending", async () => {
  const fresh = await composer({ attachFrom: 1 });
  assert.deepEqual(await send(fresh, brief(800)), {
    ok: false,
    reason: "composer-mismatch",
    pressed: false,
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
    pressed: false,
  });
  assert.equal(await fresh.evaluate(() => window.pastes.length), 0);
  assert.equal(await fresh.evaluate(() => window.sent), undefined);
  await fresh.close();
});

// #466: PostPane takes words send was never pressed for as not sent, and
// lets them go again; pressed with nothing seen to start, they may have
// gone, so it stays unsure of them.
test("a press that starts nothing is told as pressed", async () => {
  const fresh = await composer();
  await fresh.evaluate(() => {
    document.getElementById("slot").addEventListener(
      "click",
      (event) => {
        window.pressed = true;
        event.stopImmediatePropagation();
      },
      true,
    );
  });
  assert.deepEqual(await send(fresh, "P1-05 专项复核"), {
    ok: false,
    reason: "send-failed",
    pressed: true,
  });
  assert.equal(await fresh.evaluate(() => window.pressed), true);
  await fresh.close();
});

// #466 review P1-01: past the time PostPane waits for word, send is not
// pressed: said after that, "not pressed" would not be heard.
test("out of time before send is pressed, it is not pressed", async () => {
  const fresh = await composer();
  const late = await fresh.evaluate(
    (text) => PostPanePage.submit(document, text, Date.now() - 1),
    "P1-05 专项复核",
  );
  assert.deepEqual(late, { ok: false, reason: "timeout", pressed: false });
  assert.equal(await fresh.evaluate(() => window.sent), undefined);
  // Nor is the box touched (#466 review P1-02).
  const box = () =>
    fresh.evaluate(() => [
      window.pastes.length,
      document.querySelector(".ProseMirror").textContent,
    ]);
  assert.deepEqual(await box(), [0, ""]);
  // In time, the same words go.
  const inTime = await fresh.evaluate(
    (text) => PostPanePage.submit(document, text, Date.now() + 20000),
    "P1-05 专项复核",
  );
  assert.equal(inTime.ok, true);
  assert.equal(await fresh.evaluate(() => window.sent), "P1-05 专项复核");
  await fresh.close();
});

// #507 review P1-03: the page may be moved to another conversation while the
// words go in. Looked to before each thing done to the box, and before send.
test("moved to another conversation before send is pressed, it is not pressed", async () => {
  const fresh = await composer();
  // As PostPane's words go into a conversation that holds a review: their
  // first line names their request.
  const text = `【驿窗送审 h1a2~send1795233002405】\n${brief(800)}`;
  const moved = await fresh.evaluate((text) => {
    // The first piece in, the page shows another conversation.
    let shows = true;
    document.addEventListener("paste", () => (shows = false), { once: true });
    return PostPanePage.submit(document, text, Date.now() + 20000, () => shows);
  }, text);
  assert.deepEqual(moved, {
    ok: false,
    reason: "other-conversation",
    pressed: false,
  });
  const pastes = await fresh.evaluate(() => window.pastes.length);
  assert.equal(pastes, 1, `pasted ${pastes} times`);
  assert.equal(await fresh.evaluate(() => window.sent), undefined);
  // The piece that went in is taken out again (review P2-03): it would sit
  // in the other conversation's box for the person to send by hand.
  const boxOf = (page) =>
    page.evaluate(() => document.querySelector(".ProseMirror").textContent);
  assert.equal(await boxOf(fresh), "");
  // Not the conversation's from the start: the box is not touched.
  const never = await composer();
  const untouched = await never.evaluate(
    (text) =>
      PostPanePage.submit(document, text, Date.now() + 20000, () => false),
    text,
  );
  assert.equal(untouched.reason, "other-conversation");
  assert.equal(await never.evaluate(() => window.pastes.length), 0);
  // Moved just as send is to be pressed: the words are in, and not sent.
  const last = await composer();
  const short = "【驿窗送审 h1a2~send1795233002409】\nP1-03 专项复核";
  const unpressed = await last.evaluate((text) => {
    let shows = true;
    const box = document.querySelector(".ProseMirror");
    new MutationObserver(() => {
      if (box.textContent.includes("P1-03 专项复核")) shows = false;
    }).observe(box, { childList: true, subtree: true, characterData: true });
    return PostPanePage.submit(document, text, Date.now() + 20000, () => shows);
  }, short);
  assert.deepEqual(unpressed, {
    ok: false,
    reason: "other-conversation",
    pressed: false,
  });
  assert.equal(await last.evaluate(() => window.sent), undefined);
  assert.equal(await boxOf(last), "", "all of them in: taken out again");
  // What the box holds by then is not only these words: the person wrote
  // on, or it is the other conversation's draft. Left, and said so.
  const written = await composer();
  const kept = await written.evaluate((text) => {
    let shows = true;
    const box = document.querySelector(".ProseMirror");
    // The first piece in (the box's own listener ran first), the person
    // writes in the box, and the page shows another conversation.
    const moved = () => {
      box.prepend("我自己写的：");
      shows = false;
    };
    document.addEventListener("paste", moved, { once: true });
    return PostPanePage.submit(document, text, Date.now() + 20000, () => shows);
  }, text);
  assert.deepEqual(kept, {
    ok: false,
    reason: "other-conversation",
    pressed: false,
    left: true,
  });
  assert.match(await boxOf(written), /^我自己写的：/);
  // The other conversation's own draft, alike to the words but not naming
  // a request of PostPane's whole (round 4 review P2-03): words alike are no
  // proof they are these. Left, and said so.
  for (const [words, draft] of [
    [brief(800), brief(800).slice(0, 12)],
    [text, text.slice(0, 8)],
  ]) {
    const alike = await composer();
    const said = await alike.evaluate(
      ([words, draft]) => {
        let shows = true;
        const box = document.querySelector(".ProseMirror");
        const moved = () => {
          box.textContent = draft;
          shows = false;
        };
        document.addEventListener("paste", moved, { once: true });
        return PostPanePage.submit(
          document,
          words,
          Date.now() + 20000,
          () => shows,
        );
      },
      [words, draft],
    );
    assert.equal(said.left, true, draft);
    assert.equal(await boxOf(alike), draft);
    await alike.close();
  }
  // Moved before anything of these went in: what the box holds is the other
  // conversation's own draft, not touched and not said to be left by these.
  const drafted = await composer({ draft: "另一个会话的草稿" });
  const own = await drafted.evaluate((text) => {
    let asked = 0;
    const shows = () => ++asked < 2;
    return PostPanePage.submit(document, text, Date.now() + 20000, shows);
  }, text);
  assert.deepEqual(own, {
    ok: false,
    reason: "other-conversation",
    pressed: false,
  });
  assert.equal(await boxOf(drafted), "另一个会话的草稿");
  // Out of time and moved at once: told as out of time, and the piece that
  // went in is taken out of the other conversation's box all the same.
  const both = await composer();
  const lateToo = await both.evaluate((text) => {
    const until = Date.now() + 20000;
    let shows = true;
    const moved = () => {
      shows = false;
      Date.now = () => until;
    };
    document.addEventListener("paste", moved, { once: true });
    return PostPanePage.submit(document, text, until, () => shows);
  }, text);
  assert.deepEqual(lateToo, { ok: false, reason: "timeout", pressed: false });
  assert.equal(await boxOf(both), "");
  await fresh.close();
  await never.close();
  await last.close();
  await written.close();
  await drafted.close();
  await both.close();
});

// #507 review P1-04: a page just loaded may not have drawn yet that an
// answer is being written (the person's own prompt, in the tab beside it).
test("an answer begun while the words went in: send is not pressed", async () => {
  const fresh = await composer();
  const text = "P1-04 专项复核";
  const busy = await fresh.evaluate((text) => {
    const box = document.querySelector(".ProseMirror");
    new MutationObserver(() => {
      if (!box.textContent.includes(text)) return;
      if (document.querySelector("[data-testid=stop-button]")) return;
      const stop = document.createElement("button");
      stop.dataset.testid = "stop-button";
      document.querySelector("main").append(stop);
    }).observe(box, { childList: true, subtree: true, characterData: true });
    return PostPanePage.submit(document, text, Date.now() + 20000);
  }, text);
  assert.deepEqual(busy, { ok: false, reason: "busy", pressed: false });
  assert.equal(await fresh.evaluate(() => window.sent), undefined);
  await fresh.close();
});

test("out of time between pieces, no more is put in the box", async () => {
  const fresh = await composer();
  const text = brief(800);
  const late = await fresh.evaluate((text) => {
    // The first piece in, the time is up, to the millisecond: the same
    // moment the extension counts as none left (#466 review P2-03).
    const until = Date.now() + 20000;
    document.addEventListener("paste", () => (Date.now = () => until), {
      once: true,
    });
    return PostPanePage.submit(document, text, until);
  }, text);
  assert.deepEqual(late, { ok: false, reason: "timeout", pressed: false });
  const [pastes, held] = await fresh.evaluate(() => [
    window.pastes,
    document.querySelector(".ProseMirror").textContent,
  ]);
  assert.equal(pastes.length, 1, `pasted ${pastes.length} times`);
  const bare = (words) => words.replace(/\s/g, "");
  assert.ok(bare(held) === bare(pastes[0]), "nor typed in instead");
  assert.equal(await fresh.evaluate(() => window.sent), undefined);
  await fresh.close();
});

// #466 review P2-03: the extension counts the moment the time is up as none
// left; so does the page, and it looks before each thing it does to the box.
test("at the moment the time is up nothing is put in the box or pressed", async () => {
  const untouched = { ok: false, reason: "timeout", pressed: false };
  const state = (page) =>
    page.evaluate(() => [
      window.pastes.length,
      document.querySelector(".ProseMirror").textContent,
      window.sent,
    ]);
  // Asked at that moment.
  const asked = await composer();
  const atOnce = await asked.evaluate((text) => {
    const until = Date.now();
    Date.now = () => until;
    return PostPanePage.submit(document, text, until);
  }, "P2-03 定向复核");
  assert.deepEqual(atOnce, untouched);
  assert.deepEqual(await state(asked), [0, "", undefined]);
  await asked.close();
  // Up as the box is taken hold of: nothing is pasted after.
  const focused = await composer();
  const onFocus = await focused.evaluate((text) => {
    const until = Date.now() + 20000;
    const box = document.querySelector(".ProseMirror");
    const focus = box.focus.bind(box);
    box.focus = () => {
      focus();
      Date.now = () => until;
    };
    return PostPanePage.submit(document, text, until);
  }, "P2-03 定向复核");
  assert.deepEqual(onFocus, untouched);
  assert.deepEqual(await state(focused), [0, "", undefined]);
  await focused.close();
  // Up after the last wait, as the page is read before the press: not
  // pressed.
  const lit = await composer();
  const onPress = await lit.evaluate((text) => {
    const until = Date.now() + 20000;
    const box = document.querySelector(".ProseMirror");
    let pasted = false;
    box.addEventListener("paste", () => (pasted = true));
    // The newest prompt's id is read just before the press, and only then.
    const all = document.querySelectorAll.bind(document);
    document.querySelectorAll = (selector) => {
      if (pasted) Date.now = () => until;
      return all(selector);
    };
    return PostPanePage.submit(document, text, until);
  }, "P2-03 定向复核");
  assert.deepEqual(onPress, untouched);
  const [pastes, , sent] = await state(lit);
  assert.deepEqual([pastes, sent], [1, undefined]);
  await lit.close();
});

// #466 review P2-03, round 5: the look comes right before what changes the
// box, not a few steps ahead of it.
test("the time up as the box is about to be changed, it is not changed", async () => {
  const untouched = { ok: false, reason: "timeout", pressed: false };
  const state = (page) =>
    page.evaluate(() => [
      window.pastes.length,
      document.querySelector(".ProseMirror").textContent,
      window.sent,
    ]);
  // Sends with the time up once `step` of getting ready is taken.
  const upAt = (page, step) =>
    page.evaluate(
      ([text, step]) => {
        const until = Date.now() + 20000;
        const up = () => (Date.now = () => until);
        if (step === "selection") {
          // Up once the place to paste is set, before the paste goes out.
          const selection = document.getSelection.bind(document);
          document.getSelection = () => {
            const found = selection();
            const collapse = found.collapseToEnd.bind(found);
            found.collapseToEnd = () => {
              collapse();
              up();
            };
            return found;
          };
        } else {
          const command = document.execCommand.bind(document);
          document.execCommand = (name, ...rest) => {
            const done = command(name, ...rest);
            if (name === "selectAll") up();
            return done;
          };
        }
        return PostPanePage.submit(document, text, until);
      },
      ["P2-03 定向复核", step],
    );
  // As the place to paste is set: no paste goes out.
  const pasting = await composer();
  assert.deepEqual(await upAt(pasting, "selection"), untouched);
  assert.deepEqual(await state(pasting), [0, "", undefined]);
  await pasting.close();
  // As a draft is selected to be taken out: it stays.
  const drafted = await composer({ draft: "上一轮留下的草稿" });
  assert.deepEqual(await upAt(drafted, "selectAll"), untouched);
  assert.deepEqual(await state(drafted), [0, "上一轮留下的草稿", undefined]);
  await drafted.close();
  // Paste not taken, as all is selected to type over: nothing is typed.
  const typed = await composer({ keep: 0 });
  assert.deepEqual(await upAt(typed, "selectAll"), untouched);
  const [pastes, held, sent] = await state(typed);
  assert.deepEqual([pastes, held, sent], [1, "", undefined]);
  await typed.close();
});

test("send that never lights is told as not pressed", async () => {
  const fresh = await composer();
  await fresh.evaluate(() => {
    const slot = document.getElementById("slot");
    // Whatever lights it, it is put out again (once: the same value set
    // again would call the observer again).
    new MutationObserver(() => {
      if (!slot.disabled) slot.disabled = true;
    }).observe(slot, { attributes: true });
  });
  assert.deepEqual(await send(fresh, "P1-05 专项复核"), {
    ok: false,
    reason: "send-failed",
    pressed: false,
  });
  assert.equal(await fresh.evaluate(() => window.sent), undefined);
  await fresh.close();
});

// #435 review P1-01: a cut right before a blank line left a piece of only a
// line break, and it was skipped: the words went out a line short, and
// counting them without spaces could not tell.
test("a blank line at a cut still goes in", async () => {
  const fresh = await composer();
  const text = "a".repeat(5999) + "\n\n" + "b".repeat(6000);
  assert.deepEqual(await send(fresh, text), { ok: true });
  const pastes = await fresh.evaluate(() => window.pastes);
  assert.ok(pastes.join("") === text, "the pieces make up the words");
  assert.ok(
    pastes.every((piece) => piece.trim()),
    `pieces ${JSON.stringify(pastes.map((piece) => piece.length))}`,
  );
  await fresh.close();
});

// #435 review round 2 P2-02: spaces glued to the next words without end made
// one piece of 10001 characters, an attachment again.
test("a long run of spaces or blank lines still goes in pieces", async () => {
  for (const run of [" ".repeat(10000), "\n".repeat(10000)]) {
    const fresh = await composer();
    const text = run + "x";
    assert.deepEqual(await send(fresh, text), { ok: true });
    const pastes = await fresh.evaluate(() => window.pastes);
    assert.ok(pastes.join("") === text, "the pieces make up the words");
    const largest = Math.max(...pastes.map((piece) => piece.length));
    assert.ok(largest <= 7000, `largest piece ${largest}`);
    assert.equal(await attachments(fresh), 0);
    await fresh.close();
  }
});

test("a piece that went in short stops the sending", async () => {
  const fresh = await composer({ keep: 0.9 });
  assert.deepEqual(await send(fresh, brief(800)), {
    ok: false,
    reason: "composer-mismatch",
    pressed: false,
  });
  assert.equal(await fresh.evaluate(() => window.sent), undefined);
  await fresh.close();
});

test("words the page changed, as many characters, are not sent", async () => {
  const fresh = await composer({ alter: true });
  assert.deepEqual(await send(fresh, brief(20)), {
    ok: false,
    reason: "composer-mismatch",
    pressed: false,
  });
  assert.equal(await fresh.evaluate(() => window.sent), undefined);
  await fresh.close();
});

test("a long line is not cut between its CR and LF", async () => {
  const fresh = await composer();
  const text = "x".repeat(5999) + "\r\n" + "y".repeat(100);
  assert.deepEqual(await send(fresh, text), { ok: true });
  const pastes = await fresh.evaluate(() => window.pastes);
  assert.ok(pastes.join("") === text, "the pieces make up the words");
  assert.ok(
    pastes.every((piece) => !piece.endsWith("\r")),
    `pieces ${JSON.stringify(pastes.map((piece) => piece.length))}`,
  );
  await fresh.close();
});

test("a draft with an attachment left beside it is not sent along", async () => {
  const fresh = await composer({
    draft: "上一轮的送审：第 2 轮复审",
    leftover: true,
  });
  assert.deepEqual(await send(fresh, "P1-05 专项复核"), {
    ok: false,
    reason: "composer-mismatch",
    pressed: false,
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

// #410 (2026-11-19): ChatGPT turned a long brief into an attachment, so the
// prompt had no bubble, only the file; the answer was never told and the
// handoff waited 30 minutes. The prompt is its turn, known by ChatGPT's id.
const attached = (turn, id) =>
  unit(
    turn,
    0,
    "user",
    '<div><span><button aria-label="粘贴的文本 (1).txt"></button><span><svg></svg><span>粘贴的文本 (1).txt</span><span>文档</span></span></span></div>',
    id,
  );

test("a prompt ChatGPT made an attachment is still the newest prompt, known by its id", async () => {
  const two = await twice(
    attached("A", "p1") + answer("A", "a1"),
    attached("A", "p1") + answer("A", "a1", "复核结论"),
  );
  assert.equal(
    await two.evaluate(() => PostPanePage.lastPrompt(document)),
    "粘贴的文本 (1).txt文档",
  );
  assert.equal(
    await two.evaluate(() => PostPanePage.lastPromptId(document)),
    "p1",
  );
  assert.equal(await two.evaluate(() => PostPanePage.answered(document)), true);
  await two.close();
});

test("the newest prompt's id is its own, not an older one's", async () => {
  const two = await twice(
    unit(
      "A",
      0,
      "user",
      '<div data-user-message-bubble="true">第 1 轮</div>',
      "p1",
    ) +
      answer("A", "a1") +
      attached("B", "p2"),
    unit(
      "A",
      0,
      "user",
      '<div data-user-message-bubble="true">第 1 轮</div>',
      "p1",
    ) + answer("A", "a1", "第 1 轮的回信"),
  );
  assert.equal(
    await two.evaluate(() => PostPanePage.lastPromptId(document)),
    "p2",
  );
  assert.equal(
    await two.evaluate(() => PostPanePage.answered(document)),
    false,
  );
  await two.close();
});

test("submit reports the id of the prompt it sent", async () => {
  const fresh = await browser.newPage();
  await fresh.setContent(fixture);
  await fresh.addScriptTag({ path: script });
  // The page draws the sent prompt with its id a moment after the click.
  await fresh.evaluate(
    (html) => {
      document
        .getElementById("slot")
        .addEventListener("click", () =>
          setTimeout(
            () =>
              document
                .querySelector("main")
                .insertAdjacentHTML("beforeend", html),
            300,
          ),
        );
    },
    attached("N", "p9"),
  );
  const result = await fresh.evaluate(() =>
    PostPanePage.submit(document, "很长的送审"),
  );
  assert.deepEqual(result, { ok: true, promptId: "p9" });
  await fresh.close();
});

// #433：后台计时器一秒才醒一次，仍按墙钟截止，不累计轮询次数。
test("a throttled composer wait expires by wall time", async () => {
  const fresh = await browser.newPage();
  try {
    await fresh.setContent("<main></main>");
    await fresh.addScriptTag({ path: script });
    const result = await fresh.evaluate(async () => {
      const nativeTimer = window.setTimeout.bind(window);
      let now = 0;
      let timers = 0;
      Date.now = () => now;
      window.setTimeout = (callback, ms) => {
        timers++;
        return nativeTimer(() => {
          now += Math.max(1000, ms);
          callback();
        }, 0);
      };
      const answer = await PostPanePage.submit(document, "送审正文");
      return { answer, elapsed: now, timers };
    });
    assert.deepEqual(result.answer, {
      ok: false,
      reason: "no-composer",
      pressed: false,
    });
    assert.equal(result.elapsed, 15000);
    assert.equal(result.timers, 1);
  } finally {
    await fresh.close();
  }
});

// #433：条件通过 DOM 变化唤醒，不等后台标签页被限流的计时器。
test("DOM changes wake composer waits while timers are parked", async () => {
  const fresh = await browser.newPage();
  try {
    await fresh.setContent(fixture);
    await fresh.addScriptTag({ path: script });
    const answer = await fresh.evaluate(async () => {
      const nativeTimer = window.setTimeout.bind(window);
      const box = document.querySelector(".ProseMirror");
      const parent = box.parentElement;
      box.remove();
      document.addEventListener("paste", (event) => {
        event.preventDefault();
        box.textContent += event.clipboardData.getData("text/plain");
      });
      // The test's watchdog uses the original timer; page timers never fire.
      window.setTimeout = () => 0;
      document.getElementById("slot").addEventListener("click", () => {
        const prompt = document.createElement("div");
        prompt.setAttribute("data-chatgpt-search-unit-key", "new:user");
        prompt.setAttribute("data-chatgpt-search-message-ids", "new-prompt");
        prompt.textContent = "送审正文";
        document.querySelector("main").append(prompt);
      });
      const result = PostPanePage.submit(document, "送审正文");
      queueMicrotask(() => parent.prepend(box));
      return Promise.race([
        result,
        new Promise((resolve) =>
          nativeTimer(() => resolve("未被 DOM 唤醒"), 500),
        ),
      ]);
    });
    assert.deepEqual(answer, { ok: true, promptId: "new-prompt" });
  } finally {
    await fresh.close();
  }
});
