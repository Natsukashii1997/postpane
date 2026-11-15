// The list cards' fold, moved out of ListCard.tsx for the 300-line ratchet.
import { GRID } from "../panel/theme";
import type { Inks } from "./ListCard";

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
      <span aria-hidden style={{ fontSize: 10 }}>
        {unfolded ? "⌃" : "⌄"}
      </span>
    </button>
  );
}
