// Registered with data.js, in the same call, to run as each chatgpt.com page
// loads (#488 review rounds 4-5, P1-01). It runs in the extension's own
// world of the page, which nothing of the page reaches, and marks the page
// as loaded with data.js only on data.js's own sign: the element data.js
// puts in the document once its handle is in. At document_start nothing of
// the page is there yet, no markup and no script, so the sign can only be a
// script's of an extension. data.js not running, its handle not going in,
// or this running before it: no sign, no mark, nothing read there trusted.
// The sign is taken away. Structure: docs/chatgpt-channel.md.
(() => {
  const sign = document.documentElement?.querySelector("postpane-installed");
  globalThis.postpaneLoadedWithData = !!sign;
  sign?.remove();
})();
