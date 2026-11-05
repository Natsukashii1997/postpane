import { useState, type CSSProperties } from "react";
import {
  pendantLayout,
  type PendantEdge,
  type PendantRect,
} from "../app-pendant";
import { PAPER_GRAIN, PAPER_SEAL } from "../paper";

const BALL = new URL("../assets/float-notes-ball.png", import.meta.url).href;
const SHADOW =
  "drop-shadow(0 1px 1px rgba(0,0,0,.22)) drop-shadow(0 8px 14px rgba(0,0,0,.24))";

/** 随手记, hanging off the resting strip (app-pendant.ts). A click opens or
 * hides the notes beside it; `anchor` is the ring, in the page's points. */
export function AppPendant({
  strip,
  edge,
  logo,
  light,
  zh,
  room,
  onToggle,
}: {
  strip: PendantRect;
  edge: PendantEdge;
  logo: number;
  light: boolean;
  zh: boolean;
  room: { width: number; height: number };
  onToggle: (anchor: PendantRect) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const layout = pendantLayout(strip, edge, logo, room);
  const { frame, horizontal, reversed, cord, ring, ball, tag } = layout;
  const paper = light ? "#f3f1eb" : "#e9e6de";
  const cordColor = light ? "rgba(42,41,37,.5)" : "rgba(236,231,220,.5)";
  const name = zh ? "随手记" : "Notes";
  // Along the top or bottom the cord meets the ring at its middle.
  const cordStyle: CSSProperties = horizontal
    ? {
        width: cord,
        height: 0,
        marginTop: edge === "bottom" ? frame.height - ring / 2 : ring / 2,
        borderTop: `1.5px dashed ${cordColor}`,
      }
    : { width: 0, height: cord, borderLeft: `1.5px dashed ${cordColor}` };
  const ringButton = (
    <button
      type="button"
      className="hud-app-pendant-ball"
      aria-label={name}
      aria-pressed={open}
      onClick={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        void onToggle({
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
        }).then(setOpen, () => setOpen(false));
      }}
      style={{
        width: ring,
        height: ring,
        flex: "none",
        padding: (ring - ball) / 2,
        border: 0,
        borderRadius: "50%",
        background: `${PAPER_GRAIN} 0 0 / 160px 160px, ${paper}`,
        filter: SHADOW,
        cursor: "pointer",
      }}
    >
      <img
        src={BALL}
        alt=""
        draggable={false}
        style={{
          display: "block",
          width: ball,
          height: ball,
          borderRadius: "50%",
        }}
      />
    </button>
  );
  const nameTag = (
    <span
      aria-hidden="true"
      style={{
        height: tag,
        padding: `0 ${Math.round(tag * 0.45)}px`,
        borderRadius: tag,
        background: paper,
        color: "#2a2925",
        font: `600 ${Math.round(tag * 0.66)}px/${tag}px ${PAPER_SEAL}`,
        letterSpacing: ".08em",
        whiteSpace: "nowrap",
        filter: "drop-shadow(0 1px 1px rgba(0,0,0,.2))",
      }}
    >
      {name}
    </span>
  );
  // The ring and its tag hang together; the cord leads to the strip.
  const hanging = (
    <span
      key="hanging"
      style={{
        display: "flex",
        // The tag stays on the screen's side of the ring, and the ring next
        // to the cord.
        flexDirection:
          edge === "bottom" || (!horizontal && reversed)
            ? "column-reverse"
            : "column",
        alignItems: "center",
        gap: 4,
      }}
    >
      {ringButton}
      {nameTag}
    </span>
  );
  const parts = [
    <span
      key="cord"
      aria-hidden="true"
      style={{ flex: "none", ...cordStyle }}
    />,
    hanging,
  ];
  return (
    <div
      className="hud-app-pendant"
      style={{
        position: "absolute",
        left: frame.x,
        top: frame.y,
        width: frame.width,
        height: frame.height,
        zIndex: 3,
        display: "flex",
        flexDirection: horizontal ? "row" : "column",
        alignItems: horizontal ? "flex-start" : "center",
        userSelect: "none",
      }}
    >
      {reversed ? parts.reverse() : parts}
    </div>
  );
}
