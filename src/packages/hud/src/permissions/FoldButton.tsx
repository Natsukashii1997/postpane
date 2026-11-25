// The list cards' fold, moved out of ListCard.tsx for the 300-line ratchet.
import {
  createContext,
  useContext,
  type CSSProperties,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { EASE_OUT, GEOMETRY, MOTION } from "@agent-hud/ui/lib/motion";
import { cardFolds } from "../panel/fold-store";
import { GRID } from "../panel/theme";
import type { Inks } from "./ListCard";
export { cardFolds };

/** Set where the panel is in view and may move: the hidden copy that
 * measures the panel's height draws its rows at once, so the paper's height
 * is the folded or unfolded one from the first frame. */
const FoldMotion = createContext(false);
const Moving = createContext(false);

/** The panel in view: a box whose folds may move. */
export function FoldScope({
  moves,
  style,
  children,
}: {
  moves: boolean;
  style: CSSProperties;
  children: ReactNode;
}) {
  return (
    <FoldMotion.Provider value={moves}>
      <div style={style}>{children}</div>
    </FoldMotion.Provider>
  );
}

/** The rows 「展开其余 / 收起」 brings and takes fade as they open or close,
 * on the paper's own spring, so the list and the paper move together instead
 * of the rows vanishing and the empty paper shrinking after them (owner
 * chose 改, 2026-11-25). Wrap a list's rows, each in a keyed `FoldRow`. */
export function FoldRows({ children }: { children: ReactNode }) {
  const moving = useContext(FoldMotion) && cardFolds.moving();
  return (
    <Moving.Provider value={moving}>
      <AnimatePresence initial={false} custom={moving}>
        {children}
      </AnimatePresence>
    </Moving.Provider>
  );
}

const ROW: Variants = {
  shut: (moving: boolean) =>
    moving
      ? {
          height: 0,
          opacity: 0,
          overflow: "hidden",
          // Leaving, it no longer takes a click meant for what stays.
          pointerEvents: "none",
          transition: {
            height: GEOMETRY,
            opacity: { duration: MOTION.exit, ease: EASE_OUT },
          },
        }
      : { opacity: 0, pointerEvents: "none", transition: { duration: 0 } },
  open: {
    height: "auto",
    opacity: 1,
    pointerEvents: "auto",
    transition: {
      height: GEOMETRY,
      opacity: { duration: MOTION.enter, ease: EASE_OUT },
    },
    transitionEnd: { overflow: "visible" },
  },
};

/** A list whose rows a fold brings and takes, each wrapped in a `FoldRow`. */
export function FoldList<T>({
  items,
  keyOf,
  row,
}: {
  items: readonly T[];
  keyOf: (item: T) => string;
  row: (item: T, index: number, list: readonly T[]) => ReactNode;
}) {
  return (
    <FoldRows>
      {items.map((item, index, list) => (
        <FoldRow key={keyOf(item)}>{row(item, index, list)}</FoldRow>
      ))}
    </FoldRows>
  );
}

/** One row of a `FoldRows` list; give it the row's key. */
export function FoldRow({ children }: { children: ReactNode }) {
  const moving = useContext(Moving);
  return (
    <motion.div
      custom={moving}
      variants={ROW}
      initial={moving ? "shut" : false}
      animate="open"
      exit="shut"
    >
      {children}
    </motion.div>
  );
}

/** The fold: a small line hung under the list's last row, on the text line,
 * 「展开其余 n 条 ⌄」; unfolded, 「收起 ⌃」 folds them back (owner, 2026-11-14:
 * once open the list could not be folded again). No rule above and no block
 * of space round it: owner, 2026-11-15, the dotted line and the gap stood
 * out between the two sections (#382, 乙). */
export function FoldButton({
  hidden,
  unfolded,
  onToggle,
  inks,
  zh,
}: {
  hidden: number;
  unfolded: boolean;
  onToggle: () => void;
  inks: Inks;
  zh: boolean;
}) {
  if (!unfolded && hidden <= 0) return null;
  return (
    <button
      type="button"
      className="hud-list-fold"
      aria-expanded={unfolded}
      onClick={onToggle}
      style={{
        display: "flex",
        width: "fit-content",
        alignItems: "center",
        gap: 6,
        margin: "-4px 0 0",
        padding: `2px 0 10px ${GRID.text}px`,
        border: 0,
        background: "transparent",
        color: inks.dim,
        fontSize: 12,
        cursor: "pointer",
      }}
    >
      {unfolded
        ? zh
          ? "收起"
          : "Fold"
        : zh
          ? `展开其余 ${hidden} 条`
          : `Show ${hidden} more`}
      {/* One chevron that turns over, so the press shows which way it went. */}
      <span
        aria-hidden
        className="hud-list-fold-chevron"
        style={{
          fontSize: 10,
          transform: unfolded ? "rotate(180deg)" : "none",
        }}
      >
        ⌄
      </span>
    </button>
  );
}
