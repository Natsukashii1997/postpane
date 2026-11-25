// #432: real title fragments, constructed editor. The observed historical
// second prompt starts with round one's title; do not normalize that away.
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const words = JSON.parse(
  readFileSync(
    new URL("../../../fixtures/chatgpt-432-prompts.json", import.meta.url),
  ),
);
const fixture = readFileSync(
  new URL("fixtures/conversation.html", import.meta.url),
  "utf8",
);
// Test-only override to run the same regression against the saved pre-#410
// script. Normal test runs always exercise this worktree's page.js.
const script =
  process.env.POSTPANE_TEST_PAGE ??
  fileURLToPath(new URL("../page.js", import.meta.url));

test("#432 a second review clears the first review's real title before sending", async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(fixture);
    await page.evaluate((old) => {
      const box = document.querySelector(".ProseMirror");
      box.textContent = old;
      // Leave the cursor after the old draft, as a composer the person last
      // used there. A paste then appends unless submit first empties it.
      box.focus();
      document.execCommand("selectAll", false);
      getSelection().collapseToEnd();
      box.addEventListener("paste", (event) => {
        event.preventDefault();
        document.execCommand(
          "insertText",
          false,
          event.clipboardData.getData("text/plain"),
        );
      });
    }, words.firstRoundTitle);
    await page.addScriptTag({ path: script });
    const result = await page.evaluate(
      (text) => PostPanePage.submit(document, text),
      words.secondRoundTitle,
    );
    assert.equal(result.ok, true);
    assert.equal(
      await page.evaluate(() => window.sent),
      words.secondRoundTitle,
    );
    assert.equal(
      await page.evaluate(
        () => document.querySelector(".ProseMirror").textContent,
      ),
      "",
    );
  } finally {
    await browser.close();
  }
});
