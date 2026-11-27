// The card's one button (owner, 2026-11-28: one component, one look
// everywhere), 11px, two or four characters. Its full size, 22 high with an
// icon, answers a card: the ASK card's 提交 / 跳过 / 知道了 and an open
// reply's 知道了. Its quiet size, 20 high, a thin rule like the row's ↗ and
// no icon, sits at the end of a line of text: the backlog's 继续 / 停止.
import type { ReactNode } from "react";
import { useGround } from "../ground";
import { usePaper } from "../paper";
import { permissionColors } from "../tokens";
import { tagColor } from "./approval-list";

export type CardButtonTone =
  /** Filled with ink: the way on (提交, 下一题的继续). */
  | "primary"
  /** A thin grey box: aside (跳过, 返回, 知道了, 取消). */
  | "secondary"
  /** Quiet, in the text's ink: 继续, 取消 at the end of a line. */
  | "quiet"
  /** Quiet with red words: one that stops something (停止). */
  | "quietStop"
  /** Quiet in a red rule: that stop confirmed. */
  | "quietSure";

export function CardButton({
  tone,
  light,
  icon,
  disabled = false,
  faded = false,
  onClick,
  children,
}: {
  tone: CardButtonTone;
  light: boolean;
  icon?: ReactNode;
  disabled?: boolean;
  /** Drawn faint while it cannot be used yet (提交 with nothing picked). */
  faded?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  // On paper the button is printed in the paper's inks; in the notch it
  // takes the HUD's own.
  const paper = usePaper();
  const controls = permissionColors(useGround(light));
  const rgba = (alpha: number) =>
    light ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`;
  const quiet = tone.startsWith("quiet");
  const red = paper?.red ?? tagColor("ask", light);
  const edge =
    tone === "quietSure"
      ? red
      : quiet
        ? (paper?.line ?? rgba(0.16))
        : paper
          ? paper.text(0.54)
          : rgba(0.18);
  const filled =
    tone === "primary"
      ? {
          background: paper ? paper.ink : controls.allowFill,
          color: paper ? paper.paper : controls.onAllow,
        }
      : null;
  const words =
    tone === "quietStop" || tone === "quietSure"
      ? red
      : tone === "quiet"
        ? paper
          ? paper.text(0.76)
          : rgba(0.84)
        : paper
          ? paper.dim
          : rgba(0.55);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        height: quiet ? 20 : 22,
        boxSizing: "border-box",
        padding: quiet ? "0 8px" : "0 9px",
        borderRadius: paper ? 2 : 6,
        border: filled ? 0 : `1px solid ${edge}`,
        background: filled?.background ?? "transparent",
        color: filled?.color ?? words,
        fontSize: 11,
        fontWeight: 500,
        whiteSpace: "nowrap",
        opacity: faded ? 0.45 : 1,
        cursor: disabled || faded ? "default" : "pointer",
      }}
    >
      {icon}
      {children}
    </button>
  );
}
