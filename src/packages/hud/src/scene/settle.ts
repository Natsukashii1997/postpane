// A pendant let go mid-swing eases back upright (PendantShell.tsx), moved out
// for the 300-line ratchet, with the check of whether WebKit can add that
// settle onto the swing, tried with the settle itself (ENG-10).
import { EASE_OUT, cssCurve } from "@agent-hud/ui/lib/motion";

/** What swings under the pointer: the cord and ball, and 磁盘瘦身's broom. */
const SWINGS = ".hud-pendant-sway, .hud-disk-broom";
/** The pointer leaves mid-swing: it eases back upright over this long
 * instead of snapping from up to 13° (2026-11-25, owner chose 改). */
const SETTLE_MS = 400;

/** The settle each swinging part has playing: one at a time (ENG-05). */
const settling = new WeakMap<Element, Animation>();

/** One part's settle: from `from` (its transform now) back to none. */
export function settleBack(
  part: HTMLElement,
  from: string,
  composite: CompositeOperation,
): Animation {
  return part.animate([{ transform: from }, { transform: "none" }], {
    duration: SETTLE_MS,
    easing: cssCurve(EASE_OUT),
    composite,
  });
}

let adds: boolean | undefined;

/** Whether this WebKit adds a settle onto the swing as it should. The API
 * alone does not say: Safari 16.0 and 16.1, which macOS 12 can run, have
 * `composite` but added wrongly until 16.2 (WebKit bug 248944). So it is
 * tried once on a hidden box the way a pendant does it: a CSS animation holds
 * it at rotate(4deg) as the swing would, a settle from where a part was
 * (3deg, as a matrix) is added, and at its start the box must stand at 7deg.
 * Anything else, or no box to try it on, counts as no. Where it is no, a
 * settle replaces the swing, and a pointer back mid-way stops the settle and
 * lets the swing take over from upright: a small jump (1.3° in the WebKit
 * test, webkit/settle-replace.txt) where up to 13° snapped before. */
export function addsOnto(page: Document = document): boolean {
  if (adds !== undefined) return adds;
  adds = false;
  if (
    typeof KeyframeEffect === "undefined" ||
    !new KeyframeEffect(null, []).composite ||
    !page.body
  )
    return adds;
  const sheet = page.createElement("style");
  sheet.textContent =
    "@keyframes hud-adds-onto{from,to{transform:rotate(4deg)}}";
  const box = page.createElement("div");
  box.style.cssText =
    "position:absolute;visibility:hidden;pointer-events:none;animation:hud-adds-onto 1s paused";
  page.head.append(sheet);
  page.body.append(box);
  const from = new DOMMatrix().rotate(3).toString();
  const back = settleBack(box, from, "add");
  back.pause();
  back.currentTime = 0;
  adds = Math.abs(degrees(getComputedStyle(box).transform) - 7) < 0.1;
  back.cancel();
  box.remove();
  sheet.remove();
  return adds;
}

/** The turn a computed transform stands at, in degrees. */
export function degrees(transform: string): number {
  if (!transform || transform === "none") return 0;
  const m = new DOMMatrix(transform);
  return (Math.atan2(m.b, m.a) * 180) / Math.PI;
}

/** Before the swing stops, take each swinging part from where it is now back
 * to rest, so the leave reads as the pendant coming to a stop: quick at first,
 * then easing in, with no second swing. It adds onto the swing rather than
 * replacing it, so a pointer back mid-way picks the swing up from there; a
 * second leave starts from all of it, swing and settle, and replaces the
 * first settle rather than piling onto it. */
export function settle(root: HTMLElement | null) {
  for (const part of root?.querySelectorAll<HTMLElement>(SWINGS) ?? []) {
    const from = getComputedStyle(part).transform;
    settling.get(part)?.cancel();
    settling.delete(part);
    if (from === "none" || from === "") continue;
    settling.set(part, settleBack(part, from, addsOnto() ? "add" : "replace"));
  }
}

/** The pointer is back: where settles cannot add onto the swing, end them. */
export function resume(root: HTMLElement | null) {
  if (addsOnto()) return;
  for (const part of root?.querySelectorAll<HTMLElement>(SWINGS) ?? [])
    settling.get(part)?.cancel();
}
