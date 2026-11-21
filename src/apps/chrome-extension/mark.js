// Registered with data.js, in the same call, to run as each chatgpt.com page
// loads (#488 review round 4, P1-01). It runs in the extension's own world
// of the page, which nothing of the page reaches, and leaves a mark there:
// the extension asks for it before trusting what data.js read in this page.
// A page that has it began loading after data.js was registered, so data.js
// went in as it loaded, before any script of the page. data.js put into a
// page after it loaded leaves no mark. Structure: docs/chatgpt-channel.md.
globalThis.postpaneLoadedWithData = true;
