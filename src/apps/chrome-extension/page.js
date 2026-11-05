// Everything that depends on chatgpt.com's page structure lives here, so a
// redesign is fixed in one file. Pure DOM helpers; no extension APIs.
(() => {
  const SEL = {
    assistant: '[data-chatgpt-search-unit-key$=":assistant"]',
    user: "[data-user-message-bubble]",
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

  const last = (doc, selector) => {
    const all = doc.querySelectorAll(selector);
    return all.length ? all[all.length - 1] : null;
  };

  function lastReply(doc) {
    const node = last(doc, SEL.assistant);
    if (!node) return null;
    const ids = (node.getAttribute("data-chatgpt-search-message-ids") || "").split(/\s+/).filter(Boolean);
    return { messageId: ids[ids.length - 1] || null, markdown: markdown(node) };
  }

  function lastPrompt(doc) {
    const node = last(doc, SEL.user);
    return node ? node.textContent.trim() : null;
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

  /** Puts `text` in the composer and presses send. Resolves `{ok, reason?}`. */
  async function submit(doc, text) {
    if (streaming(doc)) return { ok: false, reason: "busy" };
    const box = await waitFor(() => doc.querySelector(SEL.composer), 15000);
    if (!box) return { ok: false, reason: "no-composer" };
    box.focus();
    // Paste keeps paragraphs and lets ChatGPT turn a very long text into an attachment.
    const data = new DataTransfer();
    data.setData("text/plain", text);
    box.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
    let button = await waitFor(() => sendReady(doc), 3000);
    if (!button) {
      doc.execCommand("selectAll", false);
      doc.execCommand("insertText", false, text);
      button = await waitFor(() => sendReady(doc), 5000);
    }
    if (!button) return { ok: false, reason: "send-failed" };
    button.click();
    const started = await waitFor(() => streaming(doc) || !sendReady(doc), 5000);
    return started ? { ok: true } : { ok: false, reason: "send-failed" };
  }

  globalThis.PostPanePage = { SEL, conversationId, streaming, title, lastReply, lastPrompt, markdown, submit };
})();
