import { PAPER_SEAL } from "../paper";
import { agentArtwork } from "../agent-artwork";
import type { Inks } from "../permissions/ListCard";
import type { Who } from "./handoff-card";

/** A timeline's avatar: Clawd for Claude, Codex's cloud (#282), ChatGPT's
 * knot, PostPane's 「驿」. Moved out of HandoffCard.tsx for the 300-line
 * ratchet. */
export function Avatar({
  who,
  size,
  light,
  inks,
}: {
  who: Who;
  size: number;
  light: boolean;
  inks: Inks;
}) {
  if (who === "post")
    return (
      <span
        aria-hidden="true"
        style={{
          display: "inline-grid",
          placeItems: "center",
          width: 18,
          height: 18,
          boxSizing: "border-box",
          border: `1.3px solid ${inks.dim}`,
          borderRadius: 3,
          color: inks.dim,
          font: `900 11px/1 ${PAPER_SEAL}`,
        }}
      >
        驿
      </span>
    );
  if (who === "claude") {
    const scale = (size / 24) * 1.05;
    return (
      <svg
        width={24 * scale}
        height={16 * scale}
        viewBox="0 0 24 16"
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        <path
          fill="#d97757"
          d="M4 0H20V4H24V8H20V12H4V8H0V4H4Z M4 12h2v4h-2z M8 12h2v4h-2z M14 12h2v4h-2z M18 12h2v4h-2z"
        />
        <g fill="#141413">
          <rect x="6" y="2" width="2" height="2" />
          <rect x="14" y="2" width="2" height="2" />
        </g>
      </svg>
    );
  }
  const artwork = agentArtwork(who, light);
  const side = size - 2;
  // Codex's cloud keeps its own paint; ChatGPT's knot takes its green.
  if (who === "codex" && artwork)
    return (
      <img
        src={artwork.url}
        alt=""
        aria-hidden="true"
        width={side}
        height={side}
      />
    );
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: side,
        height: side,
        background: "#10a37f",
        ...(artwork
          ? {
              maskImage: `url("${artwork.url}")`,
              WebkitMaskImage: `url("${artwork.url}")`,
              maskSize: "contain",
              WebkitMaskSize: "contain",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              maskPosition: "center",
            }
          : { borderRadius: "50%" }),
      }}
    />
  );
}
