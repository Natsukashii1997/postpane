import type { CSSProperties } from "react";
import { stubBotTop, stubHoleStart, stubSize } from "../ticket-stub";
import { PAPER_GRAIN } from "../paper";

export type StubSide = "left" | "right" | "top" | "bottom";

/** A stub's own box: its size, with the bot's room at its top. The bot sits
 * on the stub like a sticker; the paper is its own layer behind it, so the
 * bot's moves and props are never clipped by the paper. */
export function stubBoxStyle(logo: number, side: StubSide): CSSProperties {
  const stub = stubSize(logo, side === "top" || side === "bottom"),
    unit = logo / 20;
  return {
    width: stub.width,
    height: stub.height,
    boxSizing: "border-box",
    flexDirection: "column",
    justifyContent: "flex-start",
    paddingTop: stubBotTop(logo) + (side === "top" ? 3 * unit : 0),
    paddingLeft: side === "left" ? 3 * unit : 0,
    paddingRight: side === "right" ? 3 * unit : 0,
    paddingBottom: side === "bottom" ? 3 * unit : 0,
  };
}

/** A mask punching the stub's row of holes down `edge`, one every 10 units,
 * centred down a side (`stubHoleStart`); `shift` is how far along the row the
 * masked box starts from the stub's corner, so a box laid over part of the
 * stub keeps the stub's holes. */
export function stubHoles(edge: StubSide, unit: number, shift = 0): string {
  const hole = `transparent ${2.1 * unit}px, #000 ${2.5 * unit}px`;
  const start = stubHoleStart(20 * unit) - 5 * unit;
  return edge === "top" || edge === "bottom"
    ? `radial-gradient(circle at ${5 * unit}px ${edge === "top" ? "0" : "100%"}, ${hole}) ${-shift}px 0 / ${10 * unit}px 100% repeat-x`
    : `radial-gradient(circle at ${edge === "left" ? "0" : "100%"} ${5 * unit}px, ${hole}) 0 ${start - shift}px / 100% ${10 * unit}px repeat-y`;
}

/** The stub's paper, perforated along the side that meets the screen edge;
 * `bothEdges` perforates the opposite side too (the joined preview ticket). */
export function StubPaper({
  unit,
  side,
  light,
  bothEdges = false,
}: {
  unit: number;
  side: StubSide;
  light: boolean;
  bothEdges?: boolean;
}) {
  const holes = (edge: StubSide) => stubHoles(edge, unit);
  const opposite = {
    top: "bottom",
    bottom: "top",
    left: "right",
    right: "left",
  } as const;
  const perforation = bothEdges
    ? `${holes(side)}, ${holes(opposite[side])}`
    : holes(side);
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        filter:
          "drop-shadow(0 1px 1px rgba(0,0,0,.22)) drop-shadow(0 8px 14px rgba(0,0,0,.24))",
      }}
    >
      <span
        style={{
          position: "absolute",
          inset: 0,
          background: `${PAPER_GRAIN} 0 0 / 160px 160px, ${light ? "#f3f1eb" : "#e9e6de"}`,
          WebkitMask: perforation,
          mask: perforation,
          // Two rows of holes: the paper is what both masks keep.
          ...(bothEdges
            ? { WebkitMaskComposite: "source-in", maskComposite: "intersect" }
            : null),
        }}
      />
    </span>
  );
}
