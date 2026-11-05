// Scrollbars across the app (#85): the system's bars are hidden (global.css),
// and a thin thumb is drawn over whatever is being scrolled, only while it
// scrolls, fading out a second after it stops. The thumb floats above the
// page and takes no width, so a panel growing past its content never shows
// a gutter at its side.

const SHOW_FOR_MS = 1000;
const FADE_MS = 600;
const INSET = 2;
const THICKNESS = 4;
const MIN_LENGTH = 24;
const OPACITY = "0.45";

/** The thumb along one axis of a box `length` long that shows `client` of
 * `total` scrolled by `offset`; null when the box does not scroll. */
export function thumbSpan(
  start: number,
  length: number,
  client: number,
  total: number,
  offset: number,
): { start: number; length: number } | null {
  const room = total - client;
  const track = length - INSET * 2;
  if (room <= 0 || track <= 0) return null;
  const size = Math.min(track, Math.max(MIN_LENGTH, (track * client) / total));
  const at = Math.min(1, Math.max(0, offset / room));
  return { start: start + INSET + at * (track - size), length: size };
}

interface Thumb {
  node: HTMLElement;
  hide?: ReturnType<typeof setTimeout>;
  remove?: ReturnType<typeof setTimeout>;
}

/** Draws the thumbs for every scroll in `doc`; returns the uninstaller. */
export function installScrollThumbs(doc: Document = document): () => void {
  const view = doc.defaultView;
  if (!view) return () => {};
  const thumbs = new Map<Element, Thumb>();
  const offsets = new WeakMap<Element, { top: number; left: number }>();

  const place = (box: Element, node: HTMLElement) => {
    const was = offsets.get(box) ?? { top: 0, left: 0 };
    const now = { top: box.scrollTop, left: box.scrollLeft };
    offsets.set(box, now);
    const horizontal = now.left !== was.left && now.top === was.top;
    const rect =
      box === doc.scrollingElement
        ? { left: 0, top: 0, width: view.innerWidth, height: view.innerHeight }
        : box.getBoundingClientRect();
    const span = horizontal
      ? thumbSpan(
          rect.left,
          rect.width,
          box.clientWidth,
          box.scrollWidth,
          now.left,
        )
      : thumbSpan(
          rect.top,
          rect.height,
          box.clientHeight,
          box.scrollHeight,
          now.top,
        );
    if (!span) return false;
    const across = horizontal
      ? rect.top + rect.height - INSET - THICKNESS
      : rect.left + rect.width - INSET - THICKNESS;
    Object.assign(node.style, {
      left: `${horizontal ? span.start : across}px`,
      top: `${horizontal ? across : span.start}px`,
      width: `${horizontal ? span.length : THICKNESS}px`,
      height: `${horizontal ? THICKNESS : span.length}px`,
      background: view.getComputedStyle(box).color,
    });
    return true;
  };

  const onScroll = (event: Event) => {
    const box =
      event.target === doc ? doc.scrollingElement : (event.target as Element);
    if (!box || typeof box.getBoundingClientRect !== "function") return;
    let thumb = thumbs.get(box);
    if (!thumb) {
      const node = doc.createElement("div");
      node.className = "app-scroll-thumb";
      node.setAttribute("aria-hidden", "true");
      Object.assign(node.style, {
        position: "fixed",
        zIndex: "2147483647",
        pointerEvents: "none",
        borderRadius: `${THICKNESS / 2}px`,
        opacity: "0",
      });
      thumb = { node };
      thumbs.set(box, thumb);
    }
    const { node } = thumb;
    if (!place(box, node)) {
      if (!node.isConnected) thumbs.delete(box);
      return;
    }
    if (!node.isConnected) {
      doc.body.appendChild(node);
      void node.offsetWidth; // start the fade-in from 0
    }
    clearTimeout(thumb.hide);
    clearTimeout(thumb.remove);
    node.style.transition = "opacity 0.15s ease";
    node.style.opacity = OPACITY;
    const shown = thumb;
    shown.hide = setTimeout(() => {
      node.style.transition = `opacity ${FADE_MS / 1000}s ease`;
      node.style.opacity = "0";
      shown.remove = setTimeout(() => {
        node.remove();
        thumbs.delete(box);
      }, FADE_MS);
    }, SHOW_FOR_MS);
  };

  doc.addEventListener("scroll", onScroll, { capture: true, passive: true });
  return () => {
    doc.removeEventListener("scroll", onScroll, { capture: true });
    for (const thumb of thumbs.values()) {
      clearTimeout(thumb.hide);
      clearTimeout(thumb.remove);
      thumb.node.remove();
    }
    thumbs.clear();
  };
}
