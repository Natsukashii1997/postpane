// Everything that depends on chatgpt.com's page structure lives here, so a
// redesign is fixed in one file. Pure DOM helpers; no extension APIs.
(() => {
  const SEL = {
    assistant: '[data-chatgpt-search-unit-key$=":assistant"]',
    user: "[data-user-message-bubble]",
    // A prompt's whole turn: one ChatGPT made a long paste into an attachment
    // has no bubble, only the file (#410, 2026-11-19).
    prompt: '[data-chatgpt-search-unit-key$=":user"], [data-user-message-bubble]',
    composer: '.ProseMirror[contenteditable="true"]',
    send: 'form button[type="submit"]',
    stop: '[data-testid="stop-button"], form button[type="button"][aria-label]',
    skip: ".sr-only, button, svg, [role=status], h4[data-conversation-role]",
    prose: "p, li, h1, h2, h3, h5, h6, table, blockquote, [data-d-component=text]",
  };
  const STOP_LABELS = ["停止", "停止生成", "停止流式传输", "Stop", "Stop generating", "Stop streaming"];

  /** `/c/<id>` or `/g/<project>/c/<id>`. */
  function conversationId(url) {
    const match = /\/c\/([0-9a-f]{8}-[0-9a-f-]{8,})/i.exec(new URL(url).pathname);
    return match ? match[1] : null;
  }

  function streaming(doc) {
    return [...doc.querySelectorAll(SEL.stop)].some(
      (button) => button.matches('[data-testid="stop-button"]') || STOP_LABELS.includes(button.getAttribute("aria-label")),
    );
  }

  function title(doc) {
    const text = (doc.title || "").replace(/\s*[-|–]\s*ChatGPT\s*$/i, "").trim();
    return text === "ChatGPT" ? "" : text;
  }

  // The page holds the conversation twice (#410): first a hidden copy with
  // every turn in order (answers not drawn), then the drawn one, which only
  // keeps the turns near the view. The last node in the page can so be an
  // older turn's. Order is each message's first place in the page (its key);
  // of its copies the last, the drawn one when there is one, is read.
  const UNIT = "data-chatgpt-search-unit-key";

  /** The newest of `selector`'s messages, by conversation order, and where
   * it stands in that order. A node outside any unit is a message of its own. */
  function newest(doc, selector, shows = () => true) {
    const order = new Map();
    const keyOf = (node) => node.closest(`[${UNIT}]`)?.getAttribute(UNIT) ?? node;
    // One order for prompts and replies alike, so their places compare.
    for (const node of doc.querySelectorAll(`[${UNIT}], ${SEL.user}, ${SEL.assistant}`)) {
      const key = keyOf(node);
      if (!order.has(key)) order.set(key, order.size);
    }
    let found = null;
    for (const node of doc.querySelectorAll(selector)) {
      if (!shows(node)) continue;
      const place = order.get(keyOf(node));
      if (!found || place >= found.place) found = { node, place };
    }
    return found;
  }

  function lastReply(doc) {
    const node = newest(doc, SEL.assistant)?.node;
    if (!node) return null;
    const ids = (node.getAttribute("data-chatgpt-search-message-ids") || "").split(/\s+/).filter(Boolean);
    return { messageId: ids[ids.length - 1] || null, markdown: markdown(node) };
  }

  /** A prompt's own words on the page, leaving out what only screen
   * readers or buttons say (「你说：」, the copy button). */
  function shownText(node) {
    let text = "";
    const walker = node.ownerDocument.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (!walker.currentNode.parentElement?.closest(SEL.skip)) text += walker.currentNode.textContent;
    }
    return text.trim();
  }

  /** Whether a prompt shows: its bubble, or a turn with words of its own
   * (an attachment's name). One drawn with neither is history still
   * loading, not a prompt yet (#356 P2-04). */
  const promptShows = (node) => node.matches(SEL.user) || !!node.querySelector(SEL.user) || !!shownText(node);

  const newestPrompt = (doc) => newest(doc, SEL.prompt, promptShows);

  /** The newest prompt's words: its bubble's, or the turn's own when it has
   * none (an attachment's name). */
  function lastPrompt(doc) {
    const node = newestPrompt(doc)?.node;
    if (!node) return null;
    const bubble = node.matches(SEL.user) ? node : node.querySelector(SEL.user);
    return bubble ? bubble.textContent.trim() : shownText(node);
  }

  /** ChatGPT's message id of the newest prompt (#410): the one thing that
   * ties an answer to the words it answers however the page draws them. */
  function lastPromptId(doc) {
    const node = newestPrompt(doc)?.node;
    const turn = node?.closest(`[${UNIT}]`);
    const ids = (turn?.getAttribute("data-chatgpt-search-message-ids") || "").split(/\s+/).filter(Boolean);
    return ids[ids.length - 1] || null;
  }

  /** Whether the newest reply comes after the newest prompt: one sent but not
   * answered yet leaves the reply before it as the last one (#356). A reply
   * with no prompt drawn yet (the history loading) answers nothing known. */
  function answered(doc) {
    const reply = newest(doc, SEL.assistant);
    const prompt = newestPrompt(doc);
    return !!reply && !!prompt && reply.place > prompt.place;
  }

  /** Scrolls the conversation to its end, so the newest answer is drawn when
   * only the hidden copy holds it (#410). Whether there was a list to scroll. */
  function reveal(doc) {
    const drawn = [...doc.querySelectorAll(`[${UNIT}]`)].pop();
    for (let node = drawn?.parentElement; node; node = node.parentElement) {
      if (node.scrollHeight > node.clientHeight && /auto|scroll/.test(doc.defaultView.getComputedStyle(node).overflowY)) {
        node.scrollTop = node.scrollHeight;
        return true;
      }
    }
    return false;
  }

  // --- Markdown ------------------------------------------------------------

  function inline(node) {
    let out = "";
    for (const child of node.childNodes) {
      if (child.nodeType === 3) out += child.textContent;
      else if (child.nodeType !== 1 || child.matches(SEL.skip)) continue;
      else if (child.matches("br")) out += "\n";
      else if (child.matches("code, [data-d-component=code]")) out += "`" + child.textContent + "`";
      else if (child.matches("strong, b, [data-d-default-strong]")) out += "**" + inline(child) + "**";
      else if (child.matches("em, i")) out += "*" + inline(child) + "*";
      else if (child.matches("a[href]")) out += `[${inline(child)}](${child.getAttribute("href")})`;
      else out += inline(child);
    }
    return out;
  }

  function codeBlock(wrapper) {
    const out = [];
    for (const content of wrapper.querySelectorAll(".cm-content")) {
      const lines = [...content.querySelectorAll(".cm-line")].map((line) => line.textContent);
      out.push(fence(content.getAttribute("data-language") || "", lines.length ? lines.join("\n") : content.textContent));
    }
    if (out.length) return out;
    for (const pre of wrapper.matches("pre") ? [wrapper] : wrapper.querySelectorAll("pre")) {
      const code = pre.querySelector("code") || pre;
      const named = /language-([\w+-]+)/.exec(code.className || "");
      out.push(fence(named ? named[1] : headerLanguage(wrapper, pre), code.textContent.replace(/\n$/, "")));
    }
    return out;
  }

  // The `pre` rendering puts the language in the block header ("Bash").
  function headerLanguage(wrapper, pre) {
    if (wrapper === pre) return "";
    const walker = wrapper.ownerDocument.createTreeWalker(wrapper, 4);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (pre.contains(node) || node.parentElement?.closest("button")) continue;
      const word = node.textContent.trim();
      if (/^[\w+#.-]{1,20}$/.test(word)) return word.toLowerCase();
    }
    return "";
  }

  const fence = (language, code) => "```" + language + "\n" + code + "\n```";

  function isCode(node) {
    if (node.matches(".cm-editor, pre")) return true;
    return !!node.querySelector(".cm-editor, pre") && !node.querySelector(SEL.prose);
  }

  function blocks(node, depth) {
    const out = [];
    for (const child of node.children) {
      if (child.matches(SEL.skip)) continue;
      if (isCode(child)) out.push(...codeBlock(child));
      else if (child.matches("ul, ol")) out.push(list(child, depth));
      else if (child.matches("h1, h2, h3, h4, h5, h6")) out.push("#".repeat(Number(child.tagName[1])) + " " + inline(child).trim());
      else if (child.matches("p")) out.push(inline(child).trim());
      else if (child.matches("blockquote")) out.push(blocks(child, depth).join("\n\n").replace(/^/gm, "> "));
      else if (child.matches("hr")) out.push("---");
      else if (child.matches("table")) out.push(table(child));
      else if (child.children.length) out.push(...blocks(child, depth));
      else if (child.textContent.trim()) out.push(child.textContent.trim());
    }
    return out.filter(Boolean);
  }

  function list(node, depth) {
    const lines = [];
    let n = 1;
    for (const item of node.children) {
      if (!item.matches("li")) continue;
      const nested = [...item.children].filter((c) => c.matches("ul, ol"));
      const own = [...item.childNodes].filter((c) => !nested.includes(c));
      const text = own
        .map((c) => (c.nodeType === 1 ? (c.matches(SEL.skip) ? "" : inline(c)) : c.textContent))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      lines.push("  ".repeat(depth) + (node.matches("ol") ? `${n++}. ` : "- ") + text);
      for (const sub of nested) lines.push(list(sub, depth + 1));
    }
    return lines.join("\n");
  }

  function table(node) {
    const rows = [...node.querySelectorAll("tr")].map((tr) => [...tr.children].map((cell) => inline(cell).replace(/\s+/g, " ").trim()));
    if (!rows.length) return "";
    const line = (cells) => "| " + cells.join(" | ") + " |";
    return [line(rows[0]), line(rows[0].map(() => "---")), ...rows.slice(1).map(line)].join("\n");
  }

  function markdown(node) {
    return blocks(node, 0).join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  // --- Composer ------------------------------------------------------------

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function sendReady(doc) {
    const button = doc.querySelector(SEL.send);
    return button && !button.disabled && button.getAttribute("aria-disabled") !== "true" ? button : null;
  }

  async function waitFor(check, ms) {
    for (let waited = 0; waited <= ms; waited += 100) {
      const value = check();
      if (value) return value;
      await sleep(100);
    }
    return null;
  }

  const bare = (text) => text.replace(/\s/g, "");

  /** Whether the composer holds no more than `text`: words left from before
   * show as more. The box may draw Markdown (fewer characters) or turn a long
   * paste into an attachment (none), so only more counts; a few characters
   * more (a code block's label) are allowed, a left brief is far more. */
  function holds(box, text) {
    return bare(box.textContent).length <= bare(text).length + 40;
  }

  /** Puts `text` in the composer and presses send. Resolves `{ok, reason?}`,
   * and `promptId`, ChatGPT's id of the prompt it became, once the page
   * shows it (#410). */
  async function submit(doc, text) {
    if (streaming(doc)) return { ok: false, reason: "busy" };
    const box = await waitFor(() => doc.querySelector(SEL.composer), 15000);
    if (!box) return { ok: false, reason: "no-composer" };
    box.focus();
    // A draft ChatGPT kept (an earlier turn's words) would go out in front of
    // these (#410): the box is emptied first, and send is waited off, so the
    // button the draft lit is not taken for these words'.
    if (bare(box.textContent)) {
      doc.execCommand("selectAll", false);
      doc.execCommand("delete", false);
      await waitFor(() => !sendReady(doc), 2000);
    }
    // Paste keeps paragraphs and lets ChatGPT turn a very long text into an attachment.
    const data = new DataTransfer();
    data.setData("text/plain", text);
    box.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
    let button = await waitFor(() => holds(box, text) && sendReady(doc), 3000);
    if (!button) {
      doc.execCommand("selectAll", false);
      doc.execCommand("insertText", false, text);
      button = await waitFor(() => sendReady(doc), 5000);
    }
    if (!button) return { ok: false, reason: "send-failed" };
    if (!holds(box, text)) return { ok: false, reason: "composer-mismatch" };
    const before = lastPromptId(doc);
    button.click();
    const started = await waitFor(() => streaming(doc) || !sendReady(doc), 5000);
    if (!started) return { ok: false, reason: "send-failed" };
    const promptId = await waitFor(() => {
      const id = lastPromptId(doc);
      return id && id !== before ? id : null;
    }, 3000);
    return promptId ? { ok: true, promptId } : { ok: true };
  }

  globalThis.PostPanePage = { SEL, conversationId, streaming, title, lastReply, lastPrompt, lastPromptId, answered, reveal, markdown, submit };
})();
