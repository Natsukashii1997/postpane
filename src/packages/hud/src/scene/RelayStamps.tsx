// What relays print on the stubs (#171, the owner's 定稿 · 纸飞机 + 票根印章):
// a blue 「审」 stamp over ChatGPT's reading while it has the words, and a
// red 「回」 wax seal in Claude's stub corner while an answer waits. Each
// lands with its letter (`stampWait`) and simply shows when motion is reduced.
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { stampWait } from "../relay-stamps";

/** The relay paper's blue ink (relayPaperOf). */
const REVIEW_BLUE = "#3a5c96";
const WAX = "#b3261e";

/** Lands once, `wait` ms after it first shows: pressed down from above. */
function useLanding(
  wait: number,
  reduceMotion: boolean,
): React.RefObject<HTMLSpanElement | null> {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (reduceMotion) return;
    const animation = ref.current?.animate(
      [
        { scale: "2.3", opacity: 0 },
        { scale: "0.88", opacity: 1, offset: 0.7 },
        { scale: "1", opacity: 1 },
      ],
      {
        duration: 260,
        delay: wait,
        easing: "cubic-bezier(.3,.6,.4,1)",
        fill: "backwards",
      },
    );
    return () => animation?.cancel();
    // Only when it first shows: a later snapshot does not land it again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ref;
}

/** ChatGPT's reading, with the 「审」 stamp pressed over it as the letter
 * lands; the reading gives way at that moment. Ripples while ChatGPT answers. */
export function ReviewStamp({
  unit,
  zh,
  answering,
  since,
  reduceMotion,
  children,
}: {
  unit: number;
  zh: boolean;
  answering: boolean;
  since: number | null;
  reduceMotion: boolean;
  /** The reading it covers. */
  children: ReactNode;
}) {
  const [wait] = useState(() =>
    reduceMotion ? 0 : stampWait(since, Date.now()),
  );
  const stamp = useLanding(wait, reduceMotion);
  const reading = useRef<HTMLSpanElement>(null);
  const ring = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const animation = reading.current?.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: reduceMotion ? 0 : 120, delay: wait, fill: "both" },
    );
    return () => animation?.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useLayoutEffect(() => {
    if (!answering || reduceMotion) return;
    const animation = ring.current?.animate(
      [
        { scale: "1", opacity: 0.55 },
        { scale: "1.9", opacity: 0 },
      ],
      { duration: 2400, easing: "ease-out", iterations: Infinity },
    );
    return () => animation?.cancel();
  }, [answering, reduceMotion]);
  const square = {
    gridArea: "1 / 1",
    width: 12 * unit,
    height: 12 * unit,
    boxSizing: "border-box",
    borderRadius: 2.5 * unit,
    rotate: "-10deg",
  } as const;
  return (
    <span
      style={{
        display: "grid",
        placeItems: "center",
        maxWidth: "100%",
      }}
    >
      <span ref={reading} style={{ gridArea: "1 / 1", maxWidth: "100%" }}>
        {children}
      </span>
      {answering && !reduceMotion && (
        <span
          ref={ring}
          aria-hidden="true"
          style={{
            ...square,
            border: `${unit}px solid ${REVIEW_BLUE}`,
            opacity: 0,
          }}
        />
      )}
      <span
        ref={stamp}
        data-relay-stamp="review"
        style={{
          ...square,
          display: "grid",
          placeItems: "center",
          border: `${1.2 * unit}px solid ${REVIEW_BLUE}`,
          color: REVIEW_BLUE,
          font: `900 ${8 * unit}px/1 "Songti SC", "STSong", serif`,
        }}
      >
        {zh ? "审" : "R"}
      </span>
    </span>
  );
}

/** Claude's 「回」 wax seal, in the stub's top corner (on its perforated side
 * when docked left or right) so the reading on the foot stays in view. */
export function ReplySeal({
  unit,
  side,
  zh,
  since,
  reduceMotion,
}: {
  unit: number;
  side: "left" | "right" | "top" | "bottom";
  zh: boolean;
  since: number | null;
  reduceMotion: boolean;
}) {
  const [wait] = useState(() =>
    reduceMotion ? 0 : stampWait(since, Date.now()),
  );
  const seal = useLanding(wait, reduceMotion);
  const size = 10 * unit;
  return (
    <span
      ref={seal}
      aria-hidden="true"
      data-relay-stamp="reply"
      style={{
        position: "absolute",
        zIndex: 2,
        pointerEvents: "none",
        // The top corner, away from the reading on the stub's foot.
        ...(side === "right" ? { right: 0 } : { left: 0 }),
        top: 0,
        width: size,
        height: size,
        display: "grid",
        placeItems: "center",
        borderRadius: "50%",
        background: `radial-gradient(circle at 38% 34%, #d2453a, ${WAX} 55%, #7e1a14)`,
        boxShadow: `0 0 0 ${0.6 * unit}px rgba(80,10,6,.55), 0 ${0.6 * unit}px 0 ${0.6 * unit}px rgba(0,0,0,.3)`,
        color: "rgba(255,228,214,.92)",
        font: `900 ${5.6 * unit}px/1 "Songti SC", "STSong", serif`,
        rotate: "-12deg",
      }}
    >
      {zh ? "回" : "↩"}
    </span>
  );
}
