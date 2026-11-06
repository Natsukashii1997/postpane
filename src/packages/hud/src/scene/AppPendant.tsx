import { useState } from "react";
import type { PendantLayout, PendantRect } from "../app-pendant";
import { PendantShell } from "./PendantShell";

const BALL = new URL("../assets/float-notes-ball.png", import.meta.url).href;

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
 * Five small motions, all in global.css (`hud-pendant-*`): under the
 * pointer the pendant sways now and then, the cat blinks and its star
 * twinkles (at rest it stays still); a hover lifts the ball and lights the
 * eyes, and a press squashes it; while the notes show, a faint gold halo
 * breathes round the ring. `still` stops them all. */
export function AppPendant({
  layout,
  light,
  zh,
  still,
  carried = false,
  onToggle,
}: {
  layout: PendantLayout;
  light: boolean;
  zh: boolean;
  /** Reduced motion, or animations turned off. */
  still: boolean;
  /** The strip is being dragged: the pendant rides along with it and takes
   * no pointer. */
  carried?: boolean;
  onToggle: (anchor: PendantRect) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <PendantShell
      app="notes"
      layout={layout}
      name={zh ? "随手记" : "Notes"}
      light={light}
      still={still}
      carried={carried}
      open={open}
      onPress={(anchor) => {
        void onToggle(anchor).then(setOpen, () => setOpen(false));
      }}
    >
      <img
        src={BALL}
        alt=""
        draggable={false}
        style={{
          display: "block",
          width: layout.ball,
          height: layout.ball,
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
    </PendantShell>
  );
}
