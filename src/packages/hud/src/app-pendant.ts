// A self-built app hangs off the resting ticket strip as a pendant: a dashed
// cord from the strip's end and the app's own ball, bare (no paper ring since
// 2026-11-11, the chain drawn up tight where the ring was). Several
// apps hang one under another, each the same (串挂同款, #155). It sits outside the strip, so hovering it never
// opens the agents' panel, and the strip's size stays the agents' alone.
// Kept free of the UI so the tests can run it.
import { stubSize } from "./ticket-stub.ts";

export interface PendantRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type PendantEdge = "left" | "right" | "top" | "bottom";

export interface PendantLayout {
  frame: PendantRect;
  /** Down (or right) from the strip, or up (or left) where the window
   * has no room after it. */
  reversed: boolean;
  horizontal: boolean;
  cord: number;
  ball: number;
}

/** The pendant's parts for a strip of `logo`-point bots, in points. */
export function pendantParts(logo: number) {
  const stub = stubSize(logo).width;
  // The ball keeps the size it had inside the paper ring it used to sit in
  // (a stub less 4, less the ring's band).
  const span = stub - 4;
  return {
    stub,
    cord: Math.round(logo * 0.55),
    ball: span - 2 * Math.max(3, Math.round(span * 0.08)),
  };
}

/**
 * Where the pendant hangs for the resting strip at `strip` on an `edge`, in a
 * window of `room`: after the strip's end along it, centred across it, or
 * before its start when the window ends too soon.
 */
export function pendantLayout(
  strip: PendantRect,
  edge: PendantEdge,
  logo: number,
  room: { width: number; height: number },
): PendantLayout {
  return pendantChain(strip, edge, logo, room, 1)[0]!;
}

/**
 * `count` pendants hung one under another (串挂同款, #155): each the same
 * cord and ball, the first off the strip's end and every next off the one
 * before. When the window has no room after the strip for all of them but
 * has before its start, the whole chain hangs there instead, still in order
 * from the strip; with room on neither side it takes the roomier one.
 */
export function pendantChain(
  strip: PendantRect,
  edge: PendantEdge,
  logo: number,
  room: { width: number; height: number },
  count: number,
): PendantLayout[] {
  const parts = pendantParts(logo);
  const horizontal = edge === "top" || edge === "bottom";
  const along = parts.cord + parts.ball;
  const across = horizontal ? parts.ball : parts.stub;
  const start = horizontal ? strip.x : strip.y;
  const end = start + (horizontal ? strip.width : strip.height);
  const limit = horizontal ? room.width : room.height;
  const need = along * count;
  const roomAfter = limit - end;
  const reversed = roomAfter < need && (start >= need || start > roomAfter);
  return Array.from({ length: count }, (_, index) => {
    const at = reversed ? start - along * (index + 1) : end + along * index;
    const frame = horizontal
      ? {
          x: at,
          y: strip.y + strip.height / 2 - parts.ball / 2,
          width: along,
          height: across,
        }
      : {
          x: strip.x + strip.width / 2 - across / 2,
          y: at,
          width: across,
          height: along,
        };
    return { frame, reversed, horizontal, ...parts };
  });
}
