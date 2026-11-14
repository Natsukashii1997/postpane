import { CheckCheck } from "lucide-react";
import type { cardInks } from "../permissions/ListCard";
import { buttonFace } from "./button-face";

/** 「知道了 / 全部知道了」 at the head of the replies' receipt (#55). */
export function DismissAll({
  count,
  zh,
  inks,
  onClick,
}: {
  count: number;
  zh: boolean;
  inks: ReturnType<typeof cardInks>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="hud-press"
      onClick={onClick}
      style={{
        ...buttonFace,
        height: 24,
        padding: "0 10px",
        fontSize: 12,
        flex: "none",
        border: `1.5px solid ${inks.faint}`,
        background: "transparent",
        color: inks.mid,
      }}
    >
      <CheckCheck size={13} strokeWidth={2.2} />
      {count > 1
        ? zh
          ? "全部知道了"
          : "Dismiss all"
        : zh
          ? "知道了"
          : "Got it"}
    </button>
  );
}
