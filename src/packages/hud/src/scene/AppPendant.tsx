import { useState, type CSSProperties } from "react";
import {
  pendantLayout,
  type PendantEdge,
  type PendantRect,
} from "../app-pendant";
import { PAPER_GRAIN } from "../paper";

const BALL = new URL("../assets/float-notes-ball.png", import.meta.url).href;
const SHADOW =
  "drop-shadow(0 1px 1px rgba(0,0,0,.22)) drop-shadow(0 8px 14px rgba(0,0,0,.24))";

/** Where the cat's eyes and star sit on the ball, as shares of its side
 * (measured on float-notes-ball.png). */
const EYES = [
  { x: 0.309, y: 0.52 },
  { x: 0.608, y: 0.547 },
] as const;
const EYE = 0.13;
const STAR = { x: 0.5, y: 0.19 };

/** 随手记, hanging off the resting strip (app-pendant.ts). A click opens or
 * hides the notes beside it; `anchor` is the ring, in the page's points.
 * Five small motions, all in global.css (`hud-pendant-*`): the pendant sways
 * now and then, the cat blinks, its star twinkles, a hover lifts the ball
 * and lights the eyes, and a press squashes it; while the notes show, a
 * faint gold halo breathes round the ring. `still` stops them all. */
export function AppPendant({
  strip,
  edge,
  logo,
  light,
  zh,
  room,
  still,
  onToggle,
}: {
  strip: PendantRect;
  edge: PendantEdge;
  logo: number;
  light: boolean;
  zh: boolean;
  room: { width: number; height: number };
  /** Reduced motion, or animations turned off. */
  still: boolean;
  onToggle: (anchor: PendantRect) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const layout = pendantLayout(strip, edge, logo, room);
  const { frame, horizontal, reversed, cord, ring, ball } = layout;
  const paper = light ? "#f3f1eb" : "#e9e6de";
  const cordColor = light ? "rgba(42,41,37,.5)" : "rgba(236,231,220,.5)";
  const name = zh ? "随手记" : "Notes";
  // Along the top or bottom the cord meets the ring at its middle.
  const cordStyle: CSSProperties = horizontal
    ? {
        width: cord,
        height: 0,
        marginTop: ring / 2,
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
      <span
        className="hud-pendant-face"
        style={{
          position: "relative",
          display: "block",
          width: ball,
          height: ball,
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
        <span
          className="hud-pendant-star"
          aria-hidden="true"
          style={{
            left: `${(STAR.x - 0.14) * 100}%`,
            top: `${(STAR.y - 0.14) * 100}%`,
            width: "28%",
            height: "28%",
          }}
        />
        {EYES.map((eye, index) => (
          <span key={index} aria-hidden="true">
            <span
              className="hud-pendant-eyeglow"
              style={{
                left: `${(eye.x - EYE) * 100}%`,
                top: `${(eye.y - EYE) * 100}%`,
                width: `${EYE * 200}%`,
                height: `${EYE * 200}%`,
              }}
            />
            <span
              className="hud-pendant-lid"
              style={{
                left: `${(eye.x - EYE / 2) * 100}%`,
                top: `${(eye.y - EYE / 2) * 100}%`,
                width: `${EYE * 100}%`,
                height: `${EYE * 100}%`,
              }}
            />
          </span>
        ))}
      </span>
    </button>
  );
  const parts = [
    <span
      key="cord"
      aria-hidden="true"
      style={{ flex: "none", ...cordStyle }}
    />,
    <span key="ring" style={{ display: "flex" }}>
      {ringButton}
    </span>,
  ];
  // The pendant swings from where its cord is tied.
  const pivot = horizontal
    ? reversed
      ? "100% 50%"
      : "0 50%"
    : reversed
      ? "50% 100%"
      : "50% 0";
  return (
    <div
      className="hud-app-pendant"
      data-motion={still ? "still" : "on"}
      data-open={open}
      style={{
        position: "absolute",
        left: frame.x,
        top: frame.y,
        width: frame.width,
        height: frame.height,
        zIndex: 3,
        userSelect: "none",
      }}
    >
      <div
        className="hud-pendant-sway"
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: horizontal ? "row" : "column",
          alignItems: horizontal ? "flex-start" : "center",
          transformOrigin: pivot,
        }}
      >
        {reversed ? parts.reverse() : parts}
      </div>
    </div>
  );
}
