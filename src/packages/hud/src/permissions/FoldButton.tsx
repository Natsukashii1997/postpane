// The list cards' fold, moved out of ListCard.tsx for the 300-line ratchet.
import type { Inks } from "./ListCard";

/** The fold: "还有 n 条" unfolds the rest; unfolded, "收起" folds them back
 * (owner, 2026-11-14: once open the list could not be folded again). */
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
        display: "block",
        width: "100%",
        padding: "12px 0 12px 30px",
        border: 0,
        borderTop: `1px dotted ${inks.line}`,
        background: "transparent",
        color: inks.dim,
        fontSize: 12.5,
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      {unfolded
        ? zh
          ? "收起"
          : "Fold"
        : zh
          ? `还有 ${hidden} 条`
          : `${hidden} more`}
    </button>
  );
}
