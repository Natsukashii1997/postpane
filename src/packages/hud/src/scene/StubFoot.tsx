// The foot of a stub, under its tear: the reading, a red seal or the relay's
// stamp. What it prints changes in place without a jump (owner chose 改,
// 2026-11-25): a new reading crosses over the old one, and a stamp leaving
// lifts off, smaller and fading, while the reading under it shows again.
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { EASE_OUT, MOTION } from "@agent-hud/ui/lib/motion";

/** What the foot prints, by kind ("seal", "stamp", "reading") and its text. */
export type FootPrint = readonly [kind: string, text: string];

/** The relay's stamp shows only with a relay; without one it is the reading. */
export function footKind(shows: string, relay: unknown): string {
  return shows === "stamp" && !relay ? "reading" : shows;
}

export function StubFoot({
  print,
  still,
  style,
  children,
}: {
  print: FootPrint;
  /** Reduced motion, or animations turned off: it changes at once. */
  still: boolean;
  style: CSSProperties;
  children: ReactNode;
}) {
  const [kind, text] = print;
  // A stamp landing on the reading, or leaving it, keeps the same words:
  // they stay put rather than dimming in and out of themselves.
  const shown = useRef(text);
  const sameWords = shown.current === text;
  useEffect(() => {
    shown.current = text;
  });
  const time = (seconds: number) =>
    still ? { duration: 0 } : { duration: seconds, ease: EASE_OUT };
  return (
    <span aria-hidden="true" style={style}>
      <AnimatePresence initial={false}>
        <motion.span
          key={`${kind}:${text}`}
          initial={sameWords ? false : { opacity: 0 }}
          animate={{ opacity: 1, scale: 1, transition: time(MOTION.quick) }}
          exit={
            kind === "stamp"
              ? { opacity: 0, scale: 0.9, transition: time(MOTION.exit) }
              : { opacity: 0, transition: time(MOTION.quick) }
          }
          style={{
            gridArea: "1 / 1",
            display: "grid",
            placeItems: "center",
            minWidth: 0,
            maxWidth: "100%",
          }}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
