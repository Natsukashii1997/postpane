// Whether this WebKit adds one animation onto another as it should, for the
// pendants' settle (PendantShell.tsx, ENG-10). The API alone does not say:
// Safari 16.0 and 16.1, which macOS 12 can run, have `composite` but added
// wrongly until 16.2 (WebKit bug 248944). So it is tried once, the way the
// settle uses it: on a hidden box a CSS animation holds it 10px over, a
// settle adds 10px more, and it must come to 20px. Anything else, or no
// box to try it on, counts as no: settles then replace the swing.

let known: boolean | undefined;

export function addsOnto(page: Document = document): boolean {
  if (known !== undefined) return known;
  known = false;
  if (
    typeof KeyframeEffect === "undefined" ||
    !new KeyframeEffect(null, []).composite ||
    !page.body
  )
    return known;
  const sheet = page.createElement("style");
  sheet.textContent =
    "@keyframes hud-adds-onto{from,to{transform:translateX(10px)}}";
  const box = page.createElement("div");
  box.style.cssText =
    "position:absolute;visibility:hidden;pointer-events:none;animation:hud-adds-onto 1s paused";
  page.head.append(sheet);
  page.body.append(box);
  const settle = box.animate(
    [{ transform: "translateX(10px)" }, { transform: "translateX(10px)" }],
    { duration: 1000, fill: "both", composite: "add" },
  );
  settle.pause();
  settle.currentTime = 500;
  const now = getComputedStyle(box).transform;
  known = now !== "none" && Math.round(new DOMMatrix(now).m41) === 20;
  settle.cancel();
  box.remove();
  sheet.remove();
  return known;
}
