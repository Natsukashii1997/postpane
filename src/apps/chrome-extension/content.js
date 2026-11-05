// Runs in every chatgpt.com tab. Reports this tab's conversation and turn
// boundaries to the background, which forwards only conversations on
// PostPane's watch list. Page structure lives in page.js.
(() => {
  const page = globalThis.PostPanePage;
  const tell = (message) => chrome.runtime.sendMessage(message).catch(() => {});

  let conversation = page.conversationId(location.href);
  let wasStreaming = page.streaming(document);
  // Replies already on the page when it loaded are not news.
  let reported = page.lastReply(document)?.messageId ?? null;
  let timer = null;

  function report() {
    tell({ type: "page", conversation, hidden: document.visibilityState === "hidden", streaming: wasStreaming });
  }

  function settle() {
    const now = page.conversationId(location.href);
    if (now !== conversation) {
      conversation = now;
      report();
    }
    const streaming = page.streaming(document);
    if (streaming && !wasStreaming) {
      tell({ type: "turn", phase: "start", conversation, title: page.title(document), prompt: page.lastPrompt(document), at: Date.now() });
    }
    // A finished turn is a stop button that went away, or a reply this page has
    // not reported yet: a background tab may never be sampled mid-stream.
    const fresh = !streaming && (page.lastReply(document)?.messageId ?? null) !== reported;
    if (!streaming && (wasStreaming || fresh)) {
      // The last chunk may still be rendering when the stop button goes away.
      setTimeout(() => {
        if (page.streaming(document)) return;
        const reply = page.lastReply(document);
        if (!reply || (reply.messageId && reply.messageId === reported)) return;
        reported = reply.messageId;
        tell({
          type: "turn",
          phase: "complete",
          conversation: page.conversationId(location.href),
          title: page.title(document),
          prompt: page.lastPrompt(document),
          reply: reply?.markdown ?? "",
          messageId: reply?.messageId ?? null,
          at: Date.now(),
        });
      }, 600);
    }
    wasStreaming = streaming;
  }

  // Sample at most every 400 ms while the page changes, never postponing: a
  // streaming page changes without pause, and a background tab's timers are slow.
  new MutationObserver(() => {
    timer ??= setTimeout(() => {
      timer = null;
      settle();
    }, 400);
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["aria-label"] });

  document.addEventListener("visibilitychange", report);

  chrome.runtime.onMessage.addListener((command, _sender, reply) => {
    if (command.op === "submit") {
      page.submit(document, command.text).then(reply, (error) => reply({ ok: false, reason: "send-failed", detail: String(error) }));
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
  });

  report();
})();
