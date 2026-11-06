type Rect = { x: number; y: number; width: number; height: number };

const meet = (a: Rect, b: Rect) =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height;

/** A tag moved clear of the tags already hung (#162): on the top or bottom
 * edge the marks sit closer than a tag is wide, so it drops a row away from
 * the edge past whatever it meets; on a side edge it steps further in. */
export function clearOf(
  rect: Rect,
  hung: readonly Rect[],
  edge: "top" | "bottom" | "left" | "right",
  gap = 4,
): Rect {
  let at = rect;
  for (let tries = 0; tries <= hung.length; tries += 1) {
    const blocker = hung.find((other) => meet(at, other));
    if (!blocker) return at;
    at =
      edge === "top"
        ? { ...at, y: blocker.y + blocker.height + gap }
        : edge === "bottom"
          ? { ...at, y: blocker.y - gap - at.height }
          : edge === "left"
            ? { ...at, x: blocker.x + blocker.width + gap }
            : { ...at, x: blocker.x - gap - at.width };
  }
  return at;
}
