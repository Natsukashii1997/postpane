// What relays print on the stubs (#171, the owner's 定稿 · 纸飞机 + 票根印章):
// a blue 「审」 stamp over ChatGPT's reading while it has the words, and the
// same stamp as 「回」 over Claude's while an answer waits (#218: the relay's
// two ends in one style), in ochre so the two read apart (`stampInk`). Each
// lands with its letter (`stampWait`) and simply shows when motion is reduced.
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { STAMP_INK, stampInk, stampWait } from "../relay-stamps";

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
 * lands; the reading gives way at that moment. Ripples while ChatGPT answers,
 * and 「未审」 ripples in wax red once it has lingered (#213). As `reply` it
 * is Claude's 「回」: the same stamp, still, while an answer waits (#218). */
export function ReviewStamp({
  unit,
  zh,
  reply = false,
  answering,
  overdue = false,
  lingering = false,
  since,
  reduceMotion,
  children,
}: {
  unit: number;
  zh: boolean;
  /** Claude's 「回」 rather than ChatGPT's 「审」. */
  reply?: boolean;
  answering: boolean;
  /** Left unanswered past the wait: 「未审」 in the wax red (owner,
   * 2026-11-07). */
  overdue?: boolean;
  /** 「未审」 left long enough that its border spreads, as 「审」 does. */
  lingering?: boolean;
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
  const ripples = overdue ? lingering : answering;
  const ink = stampInk({ overdue, reply });
  useLayoutEffect(() => {
    if (!ripples || reduceMotion) return;
    const animation = ring.current?.animate(
      [
        { scale: "1", opacity: 0.55 },
        { scale: "1.9", opacity: 0 },
      ],
      { duration: 2400, easing: "ease-out", iterations: Infinity },
    );
    return () => animation?.cancel();
  }, [ripples, reduceMotion]);
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
      {ripples && !reduceMotion && (
        <span
          ref={ring}
          aria-hidden="true"
          style={{
            ...square,
            ...(overdue ? { width: 17 * unit } : null),
            border: `${unit}px solid ${ink}`,
            opacity: 0,
          }}
        />
      )}
      <span
        ref={stamp}
        data-relay-stamp={overdue ? "overdue" : reply ? "reply" : "review"}
        style={{
          ...square,
          ...(overdue ? { width: 17 * unit } : null),
          display: "grid",
          placeItems: "center",
          border: `${1.2 * unit}px solid ${ink}`,
          color: ink,
          font: `900 ${overdue ? 6.4 * unit : 8 * unit}px/1 "Songti SC", "STSong", serif`,
          whiteSpace: "nowrap",
        }}
      >
        {overdue
          ? zh
            ? "未审"
            : "LATE"
          : reply
            ? zh
              ? "回"
              : "↩"
            : zh
              ? "审"
              : "R"}
      </span>
    </span>
  );
}

/** A relay's ChatGPT answer PostPane let pass, on the receipt (owner
 * 2026-11-19, #409): 「过」 in the relay paper's blue, the 「审」 stamp's
 * square, pressed over the row's end beside its time. The row's place and
 * how long the receipt stays do not change. */
export function PassStamp({ zh }: { zh: boolean }) {
  return (
    <span
      aria-label={zh ? "审核通过" : "Passed"}
      data-relay-stamp="pass"
      style={{
        position: "absolute",
        // Left of the time (about 34px) and the ↗ column (26px + 12px gap).
        right: 80,
        top: 11,
        width: 22,
        height: 22,
        boxSizing: "border-box",
        display: "grid",
        placeItems: "center",
        borderRadius: 4,
        rotate: "-10deg",
        border: `2px solid ${STAMP_INK.review}`,
        color: STAMP_INK.review,
        font: `900 14px/1 "Songti SC", "STSong", serif`,
        pointerEvents: "none",
      }}
    >
      {zh ? "过" : "OK"}
    </span>
  );
}
