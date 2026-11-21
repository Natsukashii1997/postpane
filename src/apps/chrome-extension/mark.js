// Registered with data.js, in the same call, to run as each chatgpt.com page
// loads (#488 review, P1-01). It runs in the extension's own world of the
// page, which nothing of the page or of another extension reaches, and keeps
// there the token of data.js's sign: the element data.js puts in the
// document once its handle is in. At document_start nothing of the page is
// there yet, no markup and no script. The extension later has the page's
// handle prove it knows that token; a sign another extension put in comes
// with no token a handle of the page could prove. No sign, more than one,
// or a token not of its form: none kept, nothing read there trusted. The
// signs are taken away. Structure: docs/chatgpt-channel.md.
(() => {
  const root = document.documentElement;
  const signs = root ? [...root.querySelectorAll("postpane-installed")] : [];
  const token = signs.length === 1 ? signs[0].getAttribute("data-token") : null;
  globalThis.postpaneDataToken =
    typeof token === "string" && /^[0-9a-f]{32}$/.test(token) ? token : null;
  for (const sign of signs) sign.remove();
})();
