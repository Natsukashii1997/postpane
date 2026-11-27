// What a flight is drawn with: a plain white envelope in a thin ink line, the
// paper plane it folds into, the letter, the shadow and the count (#570).
// The shapes come from flight-paper; the flight layer animates the refs.
import type { CSSProperties, ReactNode, RefObject } from "react";
import {
  ENVELOPE,
  ENVELOPE_LOW,
  LETTER,
  PAPER,
  PLANE_FACES,
} from "./flight-paper";

/** The inks a flight draws with. */
export interface Tone {
  ink: string;
  edge: string;
}

const fill: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  overflow: "visible",
};

/** A sheet of paper cut to the envelope's (or the plane's) outline: an
 * outline-coloured copy for its edge, the white paper one point inside it,
 * and on the paper its lower half, which greys as it folds under. */
export function Paper({
  tone,
  refs,
  children,
}: {
  tone: Tone;
  refs?: Record<"edge" | "body" | "low", RefObject<HTMLDivElement | null>>;
  children?: ReactNode;
}) {
  const cut = { position: "absolute", clipPath: ENVELOPE } as const;
  return (
    <>
      <div
        ref={refs?.edge}
        style={{ ...cut, inset: 0, background: tone.edge }}
      />
      <div
        ref={refs?.body}
        style={{ ...cut, inset: 1, background: PAPER.sheet }}
      >
        <div
          ref={refs?.low}
          style={{
            position: "absolute",
            inset: 0,
            clipPath: ENVELOPE_LOW,
            background: PAPER.under,
            opacity: 0,
          }}
        />
        {children}
      </div>
    </>
  );
}

/** The envelope's pocket: its front edge from the top corners down to the
 * middle, and the inside seen above it while the flap is open. */
export function Pocket({
  ink,
  refTo,
}: {
  ink: string;
  refTo?: RefObject<SVGSVGElement | null>;
}) {
  return (
    <svg
      ref={refTo}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={fill}
    >
      <path d="M0 0L50 46L100 0Z" fill={PAPER.inside} />
      <path
        d="M0 0L50 46L100 0"
        fill="none"
        stroke={ink}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The envelope's flap: folded down over it (its outer face), or open above
 * it (its inner face). Its colour is its CSS colour, so a swing can turn it. */
export function Flap({
  ink,
  open,
  refTo,
}: {
  ink: string;
  open: boolean;
  refTo?: RefObject<SVGSVGElement | null>;
}) {
  return (
    <svg
      ref={refTo}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: "56%",
        overflow: "visible",
        transformOrigin: "50% 0%",
        scale: open ? "1 -1" : "1 1",
        color: open ? PAPER.flap : PAPER.sheet,
      }}
    >
      <path
        d="M0 0L100 0L50 100Z"
        fill="currentColor"
        stroke={ink}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The paper plane as a drawing: the keel under the fold, the lower wing
 * folded under in grey, the white upper wing, its outline and the crease. */
export function PlaneDrawing({
  tone,
  line,
  refTo,
}: {
  tone: Tone;
  line: number;
  refTo?: RefObject<SVGSVGElement | null>;
}) {
  const stroke = {
    stroke: tone.edge,
    strokeWidth: line,
    strokeLinejoin: "round",
    strokeLinecap: "round",
    vectorEffect: "non-scaling-stroke",
  } as const;
  return (
    <svg
      ref={refTo}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ ...fill, opacity: 0 }}
    >
      <polygon points={PLANE_FACES.keel} fill={PAPER.keel} />
      <polygon points={PLANE_FACES.lower} fill={PAPER.under} />
      <polygon points={PLANE_FACES.upper} fill={PAPER.sheet} />
      <polygon points={PLANE_FACES.outline} fill="none" {...stroke} />
      <path
        d={PLANE_FACES.crease}
        fill="none"
        {...stroke}
        strokeWidth={line * 0.8}
      />
    </svg>
  );
}

/** An envelope at rest (reduced motion), its flap closed or open. */
export function Envelope({
  open,
  tone,
  count,
}: {
  open: boolean;
  tone: Tone;
  count: number;
}) {
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Paper tone={tone}>
        <Pocket ink={tone.ink} />
      </Paper>
      <Flap ink={tone.ink} open={open} />
      {count > 1 && <Count value={count} size={20} />}
    </div>
  );
}

/** A sheet of writing paper, sized to the craft (`width` by `height`). */
export function Letter({
  width,
  height,
  refTo,
}: {
  width: number;
  height: number;
  refTo: RefObject<HTMLDivElement | null>;
}) {
  const sheet = { width: width * LETTER.width, height: height * LETTER.height };
  return (
    <div
      ref={refTo}
      style={{
        position: "absolute",
        left: -sheet.width / 2,
        top: -sheet.height / 2,
        ...sheet,
        boxSizing: "border-box",
        background: PAPER.sheet,
        border: `0.6px solid ${PAPER.letter}`,
        borderRadius: 1,
        backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 20%, ${PAPER.writing} 20% 29%)`,
        backgroundSize: "70% 62%",
        backgroundPosition: "40% 55%",
        backgroundRepeat: "no-repeat",
        opacity: 0,
      }}
    />
  );
}

/** The craft's shadow on the ground, a soft oval as wide as the envelope. */
export function Shadow({
  width,
  refTo,
}: {
  width: number;
  refTo: RefObject<HTMLDivElement | null>;
}) {
  const across = width * (20 / 22);
  const tall = width * (5.2 / 22);
  return (
    <div
      ref={refTo}
      style={{
        position: "absolute",
        left: -across / 2,
        top: -tall / 2,
        width: across,
        height: tall,
        borderRadius: "50%",
        background: "#000",
        opacity: 0,
      }}
    />
  );
}

/** How many flights this plane carries. */
export function Count({ value, size }: { value: number; size: number }) {
  return (
    <span
      style={{
        position: "absolute",
        left: size * 0.2,
        top: -size * 0.5 - 12,
        minWidth: 16,
        height: 16,
        padding: "0 4px",
        boxSizing: "border-box",
        borderRadius: 8,
        background: "#ff453a",
        color: "#fff",
        font: '600 10.5px/16px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
        textAlign: "center",
        boxShadow: "0 1px 2px rgba(0,0,0,0.35)",
      }}
    >
      {value}
    </span>
  );
}
