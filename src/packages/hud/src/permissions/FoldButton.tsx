// The list cards' fold, moved out of ListCard.tsx for the 300-line ratchet.
import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { EASE_OUT, GEOMETRY, MOTION } from "@agent-hud/ui/lib/motion";
import { cardFolds, rowsMove, type RowsSeen } from "../panel/fold-store";
import { GRID } from "../panel/theme";
import { useLeaving } from "../scene/Present";
import type { Inks } from "./ListCard";
export { cardFolds };

/** Set where the panel is in view and may move: the hidden copy that
 * measures the panel's height draws its rows at once, so the paper's height
 * is the folded or unfolded one from the first frame. */
const FoldMotion = createContext(false);
const Moving = createContext(false);
/** When a card's list was opened or folded just now (WorkSections' `Folded`,
 * 0 if not): the lists drawn inside it go by that fold. */
export const ListFolding = createContext(0);
/** The fold of the list a list is drawn in, for a group's own list. */
const ParentFold = createContext(0);

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
export function FoldRows({
  moving: own = 0,
  children,
}: {
  /** When this list's own fold was opened or folded just now (a store's
   * third value); a card list or a list around it counts too. */
  moving?: number;
  children: ReactNode;
}) {
  const fold = Math.max(own, useContext(ListFolding), useContext(ParentFold));
  const rows = Children.toArray(children)
    .map((row) => (isValidElement(row) ? String(row.key) : ""))
    .join("\n");
  // Only the rows that fold itself brings or takes move (`rowsMove`).
  const seen = useRef<RowsSeen | null>(null);
  const moving = useContext(FoldMotion) && rowsMove(seen.current, fold, rows);
  useLayoutEffect(() => {
    seen.current = { fold, rows };
  });
  return (
    <ParentFold.Provider value={fold}>
      <Moving.Provider value={moving}>
        <AnimatePresence initial={false} custom={moving}>
          {children}
        </AnimatePresence>
      </Moving.Provider>
    </ParentFold.Provider>
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
    // Back to whatever the card around it says (a drag turns it off there).
    pointerEvents: "inherit",
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
  moving,
}: {
  items: readonly T[];
  keyOf: (item: T) => string;
  row: (item: T, index: number, list: readonly T[]) => ReactNode;
  moving?: number;
}) {
  return (
    <FoldRows moving={moving}>
      {items.map((item, index, list) => (
        <FoldRow key={keyOf(item)}>{row(item, index, list)}</FoldRow>
      ))}
    </FoldRows>
  );
}

/** One row of a `FoldRows` list; give it the row's key. */
export function FoldRow({ children }: { children: ReactNode }) {
  const moving = useContext(Moving);
  // Leaving, it is out of the keyboard's reach too, not only the pointer's.
  const leaving = useLeaving<HTMLDivElement>();
  return (
    <motion.div
      {...leaving}
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
