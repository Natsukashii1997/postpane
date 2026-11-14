// Runs in every chatgpt.com tab. Reports this tab's conversation and turn
// boundaries to the background, which forwards only conversations on
// PostPane's watch list. Page structure lives in page.js.
(() => {
  const page = globalThis.PostPanePage;
  // background.js injects this again into tabs already open when the
  // extension is installed, updated or reloaded: a copy still running here
  // steps aside, so the page is reported once.
  globalThis.PostPaneContentStop?.();
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
  let reported = wasStreaming ? null : (page.lastReply(document)?.messageId ?? null);
  let expecting = wasStreaming;
  let timer = null;

  function report() {
    tell({ type: "page", conversation, hidden: document.visibilityState === "hidden", streaming: wasStreaming });
  }

  function tellStart() {
    tell({ type: "turn", phase: "start", conversation, title: page.title(document), prompt: page.lastPrompt(document), at: Date.now() });
  }

  function tellComplete(reply, extra = {}) {
    reported = reply.messageId;
    expecting = false;
    tell({
      type: "turn",
      phase: "complete",
      conversation: page.conversationId(location.href),
      title: page.title(document),
      prompt: page.lastPrompt(document),
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
    if (!expecting && !streaming) reported = page.lastReply(document)?.messageId ?? reported;
    if (streaming && !wasStreaming) tellStart();
    // A finished turn is a stop button that went away, or a reply this page has
    // not reported yet: a background tab may never be sampled mid-stream.
    const fresh = expecting && !streaming && (page.lastReply(document)?.messageId ?? null) !== reported;
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
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["aria-label"] });

  document.addEventListener("visibilitychange", report);

  function onCommand(command, _sender, reply) {
    if (command.op === "submit") {
      page.submit(document, command.text).then((result) => {
        if (result.ok) expecting = true;
        reply(result);
      }, (error) => reply({ ok: false, reason: "send-failed", detail: String(error) }));
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
      if (command.conversation && page.conversationId(location.href) !== command.conversation) {
        reply({ ok: false, reason: "other-conversation" });
        return false;
      }
      const ready = () => !page.streaming(document) && page.answered(document);
      const seen = page.lastReply(document);
      const loaded = page.answered(document) || page.streaming(document);
      if (!ready() || !seen?.markdown.trim()) {
        reply({ ok: true, streaming: page.streaming(document), told: false, loaded });
        return false;
      }
      setTimeout(() => {
        const now = page.lastReply(document);
        const told = ready() && now?.messageId === seen.messageId && now.markdown === seen.markdown;
        if (told) tellComplete(now, { reread: true });
        reply({ ok: true, streaming: page.streaming(document), told, loaded });
      }, 600);
      return true;
    }
    if (command.op === "state") {
      reply({
        conversation: page.conversationId(location.href),
        streaming: page.streaming(document),
        hidden: document.visibilityState === "hidden",
        title: page.title(document),
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
  }
  globalThis.PostPaneContentStop = stop;

  report();
})();
