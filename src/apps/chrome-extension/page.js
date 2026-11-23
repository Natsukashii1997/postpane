// Everything that depends on chatgpt.com's page structure lives here, so a
// redesign is fixed in one file. Pure DOM helpers; no extension APIs.
(() => {
  const SEL = {
    assistant: '[data-chatgpt-search-unit-key$=":assistant"]',
    user: "[data-user-message-bubble]",
    // A prompt's whole turn: one ChatGPT made a long paste into an attachment
    // has no bubble, only the file (#410, 2026-11-19).
    prompt:
      '[data-chatgpt-search-unit-key$=":user"], [data-user-message-bubble]',
    composer: '.ProseMirror[contenteditable="true"]',
    send: 'form button[type="submit"]',
    stop: '[data-testid="stop-button"], form button[type="button"][aria-label]',
    skip: ".sr-only, button, svg, [role=status], h4[data-conversation-role]",
    prose:
      "p, li, h1, h2, h3, h5, h6, table, blockquote, [data-d-component=text]",
  };
  const STOP_LABELS = [
    "停止",
    "停止生成",
    "停止流式传输",
    "Stop",
    "Stop generating",
    "Stop streaming",
  ];

  /** `/c/<id>` or `/g/<project>/c/<id>`. */
  function conversationId(url) {
    const match = /\/c\/([0-9a-f]{8}-[0-9a-f-]{8,})/i.exec(
      new URL(url).pathname,
    );
    return match ? match[1] : null;
  }

  function streaming(doc) {
    return [...doc.querySelectorAll(SEL.stop)].some(
      (button) =>
        button.matches('[data-testid="stop-button"]') ||
        STOP_LABELS.includes(button.getAttribute("aria-label")),
    );
  }

  function title(doc) {
    const text = (doc.title || "")
      .replace(/\s*[-|–]\s*ChatGPT\s*$/i, "")
      .trim();
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
    const keyOf = (node) =>
      node.closest(`[${UNIT}]`)?.getAttribute(UNIT) ?? node;
    // One order for prompts and replies alike, so their places compare.
    for (const node of doc.querySelectorAll(
      `[${UNIT}], ${SEL.user}, ${SEL.assistant}`,
    )) {
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
    const ids = (node.getAttribute("data-chatgpt-search-message-ids") || "")
      .split(/\s+/)
      .filter(Boolean);
    return { messageId: ids[ids.length - 1] || null, markdown: markdown(node) };
  }

  /** A prompt's own words on the page, leaving out what only screen
   * readers or buttons say (「你说：」, the copy button). */
  function shownText(node) {
    let text = "";
    const walker = node.ownerDocument.createTreeWalker(
      node,
      NodeFilter.SHOW_TEXT,
    );
    while (walker.nextNode()) {
      if (!walker.currentNode.parentElement?.closest(SEL.skip))
        text += walker.currentNode.textContent;
    }
    return text.trim();
  }

  /** Whether a prompt shows: its bubble, or a turn with words of its own
   * (an attachment's name). One drawn with neither is history still
   * loading, not a prompt yet (#356 P2-04). */
  const promptShows = (node) =>
    node.matches(SEL.user) ||
    !!node.querySelector(SEL.user) ||
    !!shownText(node);

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
    const ids = (turn?.getAttribute("data-chatgpt-search-message-ids") || "")
      .split(/\s+/)
      .filter(Boolean);
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

  /** Where PostPane's words sent as `request` stand in the conversation
   * (#509 round 1 P1-01, P1-02), over every prompt the page holds, not only
   * the newest: Changhao may have asked something after them.
   * - `marked`: ChatGPT's id (or null) of each turn whose words begin with
   *   the line naming `request`;
   * - `anchored`: prompt `after` (the one before them that PostPane knows
   *   went in) is on the page, so the history reaches back past them;
   * - `unreadable`: a prompt after it has no words of its own drawn (one
   *   ChatGPT made an attachment, #410): they may be in it, unseen. */
  function marked(doc, request, after) {
    const mark = bare(`${OWN}${request}】`);
    const order = new Map();
    const turns = new Map();
    const keyOf = (node) =>
      node.closest(`[${UNIT}]`)?.getAttribute(UNIT) ?? node;
    for (const node of doc.querySelectorAll(
      `[${UNIT}], ${SEL.user}, ${SEL.assistant}`,
    )) {
      const key = keyOf(node);
      if (!order.has(key)) order.set(key, order.size);
    }
    // Of a turn's copies the last, the drawn one when there is one.
    for (const node of doc.querySelectorAll(SEL.prompt))
      if (promptShows(node)) turns.set(keyOf(node), node);
    const idsOf = (node) =>
      (node?.getAttribute("data-chatgpt-search-message-ids") || "")
        .split(/\s+/)
        .filter(Boolean);
    const idOf = (node) => idsOf(node.closest(`[${UNIT}]`)).pop() ?? null;
    const bubbleOf = (node) =>
      node.matches(SEL.user) ? node : node.querySelector(SEL.user);
    const anchor = after
      ? [...doc.querySelectorAll("[data-chatgpt-search-message-ids]")].find(
          (node) => idsOf(node).includes(after),
        )
      : null;
    const from = anchor ? order.get(keyOf(anchor)) : Infinity;
    const shown = [...turns.entries()];
    return {
      marked: shown
        .filter(([, node]) => {
          const bubble = bubbleOf(node);
          return !!bubble && bare(shownText(bubble)).startsWith(mark);
        })
        .map(([, node]) => idOf(node)),
      anchored: !!anchor,
      unreadable: shown.some(
        ([key, node]) => order.get(key) > from && !bubbleOf(node),
      ),
    };
  }

  /** Whether Changhao has words in hand on the page (#509 round 1 P1-03):
   * a draft in the composer, or a prompt being edited. Loading the page
   * again would lose them. */
  function drafting(doc) {
    const box = doc.querySelector(SEL.composer);
    return (
      !!(box && bare(box.textContent)) ||
      !!doc.querySelector(
        `[${UNIT}] textarea, [data-message-author-role] textarea`,
      )
    );
  }

  /** Scrolls the conversation to its end, so the newest answer is drawn when
   * only the hidden copy holds it (#410). Whether there was a list to scroll. */
  function reveal(doc) {
    const drawn = [...doc.querySelectorAll(`[${UNIT}]`)].pop();
    for (let node = drawn?.parentElement; node; node = node.parentElement) {
      if (
        node.scrollHeight > node.clientHeight &&
        /auto|scroll/.test(doc.defaultView.getComputedStyle(node).overflowY)
      ) {
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
      else if (child.matches("code, [data-d-component=code]"))
        out += "`" + child.textContent + "`";
      else if (child.matches("strong, b, [data-d-default-strong]"))
        out += "**" + inline(child) + "**";
      else if (child.matches("em, i")) out += "*" + inline(child) + "*";
      else if (child.matches("a[href]"))
        out += `[${inline(child)}](${child.getAttribute("href")})`;
      else out += inline(child);
    }
    return out;
  }

  function codeBlock(wrapper) {
    const out = [];
    for (const content of wrapper.querySelectorAll(".cm-content")) {
      const lines = [...content.querySelectorAll(".cm-line")].map(
        (line) => line.textContent,
      );
      out.push(
        fence(
          content.getAttribute("data-language") || "",
          lines.length ? lines.join("\n") : content.textContent,
        ),
      );
    }
    if (out.length) return out;
    for (const pre of wrapper.matches("pre")
      ? [wrapper]
      : wrapper.querySelectorAll("pre")) {
      const code = pre.querySelector("code") || pre;
      const named = /language-([\w+-]+)/.exec(code.className || "");
      out.push(
        fence(
          named ? named[1] : headerLanguage(wrapper, pre),
          code.textContent.replace(/\n$/, ""),
        ),
      );
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
    return (
      !!node.querySelector(".cm-editor, pre") && !node.querySelector(SEL.prose)
    );
  }

  function blocks(node, depth) {
    const out = [];
    for (const child of node.children) {
      if (child.matches(SEL.skip)) continue;
      if (isCode(child)) out.push(...codeBlock(child));
      else if (child.matches("ul, ol")) out.push(list(child, depth));
      else if (child.matches("h1, h2, h3, h4, h5, h6"))
        out.push(
          "#".repeat(Number(child.tagName[1])) + " " + inline(child).trim(),
        );
      else if (child.matches("p")) out.push(inline(child).trim());
      else if (child.matches("blockquote"))
        out.push(blocks(child, depth).join("\n\n").replace(/^/gm, "> "));
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
        .map((c) =>
          c.nodeType === 1
            ? c.matches(SEL.skip)
              ? ""
              : inline(c)
            : c.textContent,
        )
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      lines.push(
        "  ".repeat(depth) + (node.matches("ol") ? `${n++}. ` : "- ") + text,
      );
      for (const sub of nested) lines.push(list(sub, depth + 1));
    }
    return lines.join("\n");
  }

  function table(node) {
    const rows = [...node.querySelectorAll("tr")].map((tr) =>
      [...tr.children].map((cell) => inline(cell).replace(/\s+/g, " ").trim()),
    );
    if (!rows.length) return "";
    const line = (cells) => "| " + cells.join(" | ") + " |";
    return [
      line(rows[0]),
      line(rows[0].map(() => "---")),
      ...rows.slice(1).map(line),
    ].join("\n");
  }

  function markdown(node) {
    return blocks(node, 0)
      .join("\n\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  // --- Composer ------------------------------------------------------------

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function sendReady(doc) {
    const button = doc.querySelector(SEL.send);
    return button &&
      !button.disabled &&
      button.getAttribute("aria-disabled") !== "true"
      ? button
      : null;
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

  /** Whether the composer holds `text`, spaces aside, give or take a few
   * characters: a code block's label more, a Markdown mark the box drew
   * fewer. Words left from before show as far more; words that went into an
   * attachment as fewer (#429). Only words typed in with `insertText`, when
   * paste is not taken, are held to this; pasted ones must be the same. */
  function holds(box, text) {
    return Math.abs(bare(box.textContent).length - bare(text).length) <= 40;
  }

  /** chatgpt.com turns one paste of somewhere between 8000 and 10000
   * characters into an attachment (#429, 2026-11-19: 8000 stayed text, 10000
   * did not). */
  const PIECE = 6000;
  const GLUE = 1000;

  /** `text` in pieces of at most `max` characters, cut after a line where it
   * can be: a line longer than `max` is cut within, never inside a character
   * of two UTF-16 units (an emoji) nor between a CR and its LF. A piece of
   * only spaces and line breaks is not cut off: it goes with the next words,
   * a few characters over `max`, so every piece shows it went in; only a run
   * of them longer than `GLUE` more is cut off by itself (#435 review P2-02),
   * so no piece nears the attachment length. */
  function pieces(text, max = PIECE) {
    const out = [];
    let piece = "";
    for (const line of text.match(/[^\n]*\n|[^\n]+$/g) ?? []) {
      for (let at = 0, end; at < line.length; at = end) {
        end = Math.min(at + max, line.length);
        if (end < line.length && /[\uD800-\uDBFF\r]/.test(line[end - 1]))
          end -= 1;
        const part = line.slice(at, end);
        if (
          piece.length + part.length > max &&
          (bare(piece) || piece.length + part.length > max + GLUE)
        ) {
          out.push(piece);
          piece = "";
        }
        piece += part;
      }
    }
    if (piece) out.push(piece);
    return out;
  }

  /** Pastes `text` at the end of the box a piece at a time; paste keeps its
   * paragraphs. Whether each piece went in whole: the box grew by all of its
   * characters, spaces aside (the page takes a paste as typed, #429). */
  async function paste(doc, box, text, wait = waitFor, timely = () => {}) {
    for (const piece of pieces(text)) {
      const want = bare(box.textContent).length + bare(piece).length;
      const data = new DataTransfer();
      data.setData("text/plain", piece);
      const event = new ClipboardEvent("paste", {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      });
      const selection = doc.getSelection();
      timely();
      selection.selectAllChildren(box);
      selection.collapseToEnd();
      timely();
      box.dispatchEvent(event);
      if (!(await wait(() => bare(box.textContent).length >= want, 3000)))
        return false;
    }
    return true;
  }

  /** Words that did not go, send never pressed for them: they are not in
   * the conversation, and PostPane lets them go again (#466). */
  const unsent = (reason) => ({ ok: false, reason, pressed: false });

  /** Thrown by a wait that ends out of the time a sending has; and when the
   * page no longer shows the conversation the words are for. */
  const LATE = Symbol("late");
  const ELSEWHERE = Symbol("elsewhere");

  /** Puts `text` in the composer and presses send. Resolves `{ok, reason?}`;
   * not ok, `pressed` says whether send was pressed (then they may have
   * gone all the same); ok, `promptId`, ChatGPT's id of the prompt it
   * became, once the page shows it (#410). Send is pressed by `until` or not
   * at all (#466 review P1-01): PostPane stops waiting for word, and what is
   * said after of words not pressed is not heard, so the waits before the
   * press end by then, and out of time nothing is pressed. Nor is the box
   * touched again (#466 review P1-02): `timely` ends the try out of time,
   * looked to when asked, after each wait, and right before each thing
   * done to the box. The moment the time is up is out of it, as the extension
   * counts (#466 review P2-03). With `shows`, whether the page still shows
   * the conversation the words are for, the try ends the same way once it
   * does not (#507 review P1-03): the page may be moved to another
   * conversation while the words go in, and they are not sent into that
   * one. What these put in the box by then is taken out again (`takeBack`,
   * review P2-03), so the person does not send it there by hand; `left`
   * when words stay in it that are not known to be these. Out of time in
   * the conversation they are for, the box stays as it is. */
  async function submit(doc, text, until = Infinity, shows = () => true) {
    // Whether anything of `text` was put in the box.
    const put = { begun: false };
    const timely = () => {
      if (Date.now() >= until) throw LATE;
      if (!shows()) throw ELSEWHERE;
    };
    const wait = async (check, ms) => {
      const got = await waitFor(
        check,
        Math.max(0, Math.min(ms, until - Date.now())),
      );
      timely();
      return got;
    };
    try {
      timely();
      return await press(doc, text, wait, timely, put);
    } catch (error) {
      if (error !== LATE && error !== ELSEWHERE) throw error;
      // Out of time, the page may show another conversation as well.
      const left = put.begun && !shows() && takeBack(doc, text);
      const reason = error === LATE ? "timeout" : "other-conversation";
      return { ...unsent(reason), ...(left && { left }) };
    }
  }

  /** The first line PostPane's words begin with in a conversation that
   * holds a review: 「【驿窗送审 <request>】」, the request naming when they
   * went (the host's `handoff/sending/book_unsure.rs`, `TAG_OPEN`). */
  const OWN = "【驿窗送审 ";

  /** Empties the composer of words `submit` put in it for a conversation
   * the page no longer shows (#507 review P2-03): only when all it holds is
   * `text`, whole or its beginning, and that holds its first line naming
   * its request whole. Words alike are not proof they are these (round 4
   * review P2-03): a draft of the other conversation's may begin as they
   * do, but not with a request of PostPane's, named to the millisecond.
   * Anything else stays. Whether words stay. */
  function takeBack(doc, text) {
    const box = doc.querySelector(SEL.composer);
    const held = box ? bare(box.textContent) : "";
    if (!held) return false;
    const named = bare(text.split("\n", 1)[0]);
    const ours =
      named.startsWith(bare(OWN)) &&
      held.startsWith(named) &&
      bare(text).startsWith(held);
    if (!ours) return true;
    box.focus();
    doc.execCommand("selectAll", false);
    doc.execCommand("delete", false);
    return !!bare(box.textContent);
  }

  async function press(doc, text, wait, timely, put = {}) {
    if (streaming(doc)) return unsent("busy");
    const box = await wait(() => doc.querySelector(SEL.composer), 15000);
    if (!box) return unsent("no-composer");
    timely();
    box.focus();
    // A draft ChatGPT kept (an earlier turn's words) would go out in front of
    // these (#410): the box is emptied first, and send is waited off, so the
    // button the draft lit is not taken for these words'.
    if (bare(box.textContent)) {
      timely();
      doc.execCommand("selectAll", false);
      timely();
      doc.execCommand("delete", false);
      await wait(() => !sendReady(doc), 2000);
    }
    // Send lit with the box empty: an attachment an earlier try left beside
    // the box, which emptying it does not reach, would go out with these
    // words and be reviewed in their place (#429).
    if (sendReady(doc)) return unsent("composer-mismatch");
    // Pasted, the box holds the words as typed: spaces aside, the very same
    // ones (#435 review P1-01). Typed in when paste is not taken, a few
    // characters either way (`holds`).
    let held = () => bare(box.textContent) === bare(text);
    put.begun = true;
    const pasted = await paste(doc, box, text, wait, timely);
    let button = pasted
      ? await wait(() => held() && sendReady(doc), 3000)
      : null;
    if (!button) {
      // Send lit with the words not in the box: something else is in the
      // composer, such as a paste ChatGPT made an attachment (#429). Sent,
      // the page would show no words to know the answer by.
      if (sendReady(doc)) return unsent("composer-mismatch");
      timely();
      doc.execCommand("selectAll", false);
      timely();
      doc.execCommand("insertText", false, text);
      held = () => holds(box, text);
      button = await wait(() => sendReady(doc), 5000);
    }
    if (!button) return unsent("send-failed");
    if (!held()) return unsent("composer-mismatch");
    // An answer begun since the words started going in (review P1-04): a
    // page just loaded may not have drawn yet that one is being written.
    if (streaming(doc)) return unsent("busy");
    const before = lastPromptId(doc);
    timely();
    button.click();
    const started = await waitFor(
      () => streaming(doc) || !sendReady(doc),
      5000,
    );
    if (!started) return { ok: false, reason: "send-failed", pressed: true };
    const promptId = await waitFor(() => {
      const id = lastPromptId(doc);
      return id && id !== before ? id : null;
    }, 3000);
    return promptId ? { ok: true, promptId } : { ok: true };
  }

  globalThis.PostPanePage = {
    SEL,
    conversationId,
    streaming,
    title,
    lastReply,
    lastPrompt,
    lastPromptId,
    answered,
    marked,
    drafting,
    reveal,
    markdown,
    submit,
  };
})();
