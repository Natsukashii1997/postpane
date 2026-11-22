// Runs in every chatgpt.com tab. Reports this tab's conversation and turn
// boundaries to the background, which forwards only conversations on
// PostPane's watch list. Page structure lives in page.js.
(() => {
  const page = globalThis.PostPanePage;
  // background.js injects this again into tabs already open when the
  // extension is installed, updated or reloaded, and into one that did not
  // say it is there (#507): a copy still running here steps aside, so the
  // page is reported once, and hands over what it was waiting on.
  const kept = globalThis.PostPaneContentStop?.();
  let stopped = false;
  // A copy left behind by a reload is cut off from the extension and every
  // send throws: it stops instead of failing silently on every change.
  const tell = (message) => {
    if (stopped) return;
    try {
      chrome.runtime.sendMessage(message).catch(() => {});
    } catch {
      stop();
    }
  };

  let conversation = page.conversationId(location.href);
  let wasStreaming = page.streaming(document);
  // Replies that render without a turn here (the history loading after the
  // page) are not news: a reply counts once this page saw a stop button or
  // sent something itself. Put in while one is being written (the extension
  // installed, updated or reloaded), that one is news once it ends (#356).
  // A copy that stepped aside knew which reply it told last, and whether
  // one is due (words it sent, not answered yet): with those, a page that
  // was only slow to answer loses no reply to the script put in again.
  let reported = kept
    ? kept.reported
    : wasStreaming
      ? null
      : (page.lastReply(document)?.messageId ?? null);
  let expecting = wasStreaming || !!kept?.expecting;
  // The newest prompt known to be answered here (#507 review round 5,
  // P1-04): an answer begins before its prompt is drawn, and the newest
  // prompt on the page is then the one before, answered already. A
  // beginning never names that one; it names its own once drawn.
  // Not handed over (a copy from before this change knows nothing of it, round 6
  // review P1-04) and writing already: the newest prompt shown may be the
  // one before, or this answer's own with its answer begun after it; which,
  // the page cannot tell, so it is taken as answered. A beginning then names
  // no prompt, and is ended by this tab's own end; one drawn later is named.
  let done =
    kept && "done" in kept
      ? kept.done
      : wasStreaming
        ? page.lastPromptId(document)
        : answeredPrompt();
  // The prompt the last beginning named (null: not known yet), and when it
  // was told.
  let begun = null;
  let begunAt = 0;
  let timer = null;

  function answeredPrompt() {
    return page.answered(document) ? page.lastPromptId(document) : null;
  }

  /** The prompt an answer being written now answers, when the page shows it. */
  function writingFor() {
    const id = page.lastPromptId(document);
    return id && id !== done ? id : null;
  }

  function report() {
    tell({
      type: "page",
      conversation,
      hidden: document.visibilityState === "hidden",
      streaming: wasStreaming,
    });
  }

  function tellStart(extra = {}) {
    begun = writingFor();
    begunAt = extra.at ?? Date.now();
    tell({
      type: "turn",
      phase: "start",
      conversation,
      title: page.title(document),
      prompt: page.lastPrompt(document),
      promptId: begun,
      ...extra,
      at: begunAt,
    });
  }

  function tellComplete(reply, extra = {}) {
    reported = reply.messageId;
    expecting = false;
    done = page.lastPromptId(document) ?? done;
    tell({
      type: "turn",
      phase: "complete",
      conversation: page.conversationId(location.href),
      title: page.title(document),
      prompt: page.lastPrompt(document),
      // Which prompt it answers, by ChatGPT's id (#410): PostPane holds the
      // answer to the words it sent by it, not by how the page draws them.
      promptId: page.lastPromptId(document),
      reply: reply.markdown,
      messageId: reply.messageId ?? null,
      at: Date.now(),
      ...extra,
    });
  }

  function settle() {
    if (stopped) return;
    const now = page.conversationId(location.href);
    const streaming = page.streaming(document);
    if (now !== conversation) {
      conversation = now;
      report();
      // A new conversation (a relay opens one) gets its address after the
      // reply began on the home page, where the start had no conversation to
      // name: tell it again now that it has one.
      if (now && streaming && wasStreaming) tellStart();
    }
    if (streaming) expecting = true;
    if (!expecting && !streaming) {
      reported = page.lastReply(document)?.messageId ?? reported;
      done = answeredPrompt() ?? done;
    }
    if (streaming && !wasStreaming) tellStart();
    // Its prompt drawn after the answer began: the beginning is told again,
    // naming it, so its own end is the one that ends it.
    // The same turn: told as beginning when it did.
    else if (streaming && writingFor() && writingFor() !== begun)
      tellStart({ again: true, at: begunAt });
    // A finished turn is a stop button that went away, or a reply this page has
    // not reported yet: a background tab may never be sampled mid-stream.
    const fresh =
      expecting &&
      !streaming &&
      (page.lastReply(document)?.messageId ?? null) !== reported;
    if (!streaming && (wasStreaming || fresh)) {
      const seen = page.lastReply(document)?.markdown;
      // The last chunk may still be rendering when the stop button goes away.
      setTimeout(() => {
        if (page.streaming(document)) return;
        const reply = page.lastReply(document);
        if (!reply || (reply.messageId && reply.messageId === reported)) return;
        // An empty reply is ChatGPT's placeholder, and one that changed since
        // is still being written: the answer fills the same message id, so
        // reporting either now would lose it. A later change samples again.
        if (!reply.markdown.trim() || reply.markdown !== seen) return;
        // A reply before the newest prompt is an older turn's: a stop button
        // seen by mistake must not make it news (#356 P1-02).
        if (!page.answered(document)) return;
        tellComplete(reply);
      }, 600);
    }
    wasStreaming = streaming;
  }

  // Sample at most every 400 ms while the page changes, never postponing: a
  // streaming page changes without pause, and a background tab's timers are slow.
  const observer = new MutationObserver(() => {
    timer ??= setTimeout(() => {
      timer = null;
      settle();
    }, 400);
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["aria-label"],
  });

  document.addEventListener("visibilitychange", report);

  function onCommand(command, _sender, reply) {
    if (command.op === "submit") {
      // Words for a conversation go into no other (#507 review P1-03): the
      // tab may show another since it was asked whether it is there. Looked
      // to here, and by page.js before each thing it does to the box.
      const here = () => page.conversationId(location.href);
      if (command.conversation && here() !== command.conversation) {
        reply({ ok: false, reason: "other-conversation", pressed: false });
        return false;
      }
      const shows = command.conversation
        ? () => here() === command.conversation
        : undefined;
      page.submit(document, command.text, command.until, shows).then(
        (result) => {
          if (result.ok) expecting = true;
          reply(result);
        },
        (error) =>
          reply({ ok: false, reason: "send-failed", detail: String(error) }),
      );
      return true;
    }
    // PostPane heard nothing of a turn it waits on (#356): the newest reply,
    // once written, is told again; it counts once by its message id. One
    // before the newest prompt is an older turn's, never this one's answer.
    // Written means unchanged over the same 600 ms a finished turn waits.
    // `loaded`: the newest prompt shows with its answer after it, or one is
    // being written; a page that shows only a prompt yet (its history still
    // drawing) or nothing is asked again soon.
    if (command.op === "reread") {
      if (
        command.conversation &&
        page.conversationId(location.href) !== command.conversation
      ) {
        reply({ ok: false, reason: "other-conversation" });
        return false;
      }
      const ready = () => !page.streaming(document) && page.answered(document);
      const seen = page.lastReply(document);
      const loaded = page.answered(document) || page.streaming(document);
      if (!ready() || !seen?.markdown.trim()) {
        // Answered, but the answer is only in the hidden copy (#410): scroll
        // to it, so it is drawn by the next ask. A tab in the background is
        // not drawn at all: `undrawn` asks for it to be put in front.
        const undrawn = ready();
        if (undrawn) page.reveal(document);
        reply({
          ok: true,
          streaming: page.streaming(document),
          told: false,
          loaded,
          ...(undrawn && { undrawn }),
        });
        return false;
      }
      setTimeout(() => {
        const now = page.lastReply(document);
        const told =
          ready() &&
          now?.messageId === seen.messageId &&
          now.markdown === seen.markdown;
        if (told) tellComplete(now, { reread: true });
        reply({ ok: true, streaming: page.streaming(document), told, loaded });
      }, 600);
      return true;
    }
    // Whether this page is there, and which conversation it shows (#507).
    if (command.op === "alive") {
      reply({
        conversation: page.conversationId(location.href),
        hidden: document.visibilityState === "hidden",
      });
      return false;
    }
    if (command.op === "state") {
      reply({
        conversation: page.conversationId(location.href),
        streaming: page.streaming(document),
        hidden: document.visibilityState === "hidden",
        title: page.title(document),
        promptId: page.lastPromptId(document),
        // The prompt being answered, when the page shows it yet (P1-04).
        writingFor: page.streaming(document) ? writingFor() : null,
      });
    }
    return false;
  }
  chrome.runtime.onMessage.addListener(onCommand);

  function stop() {
    stopped = true;
    observer.disconnect();
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", report);
    try {
      chrome.runtime.onMessage.removeListener(onCommand);
    } catch {
      // Cut off from the extension: nothing left to remove.
    }
    return { reported, expecting, done };
  }
  globalThis.PostPaneContentStop = stop;

  report();
  // Writing already as it begins (loaded mid-answer, or put in again): no
  // change to writing is seen here, so the beginning is told now; PostPane
  // holds words back by it (#507 review round 4, P1-04).
  if (wasStreaming && conversation) tellStart({ again: true });
})();
