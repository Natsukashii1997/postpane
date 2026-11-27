// The card's one button (owner, 2026-11-28: one component, one look
// everywhere): 22 high, 11px, an icon then two or four characters. The ASK
// card's 提交 / 跳过 / 知道了, an open reply's 知道了 and the backlog's
// 继续 / 停止 are all this one.
import type { ReactNode } from "react";
import { useGround } from "../ground";
import { usePaper } from "../paper";
import { permissionColors } from "../tokens";
import { tagColor } from "./approval-list";

export type CardButtonTone =
  /** Filled with ink: the way on (提交, 继续). */
  | "primary"
  /** A thin grey box: aside (跳过, 返回, 知道了, 取消). */
  | "secondary"
  /** A thin grey box with red words: one that stops something (停止). */
  | "danger"
  /** Filled red: that stop confirmed. */
  | "confirm";

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
  const edge = paper ? paper.text(0.54) : rgba(0.18);
  const red = paper?.red ?? tagColor("ask", light);
  const filled =
    tone === "primary"
      ? {
          background: paper ? paper.ink : controls.allowFill,
          color: paper ? paper.paper : controls.onAllow,
        }
      : tone === "confirm"
        ? { background: red, color: paper ? paper.paper : "#fff" }
        : null;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        height: 22,
        boxSizing: "border-box",
        padding: "0 9px",
        borderRadius: paper ? 2 : 6,
        border: filled ? 0 : `1px solid ${edge}`,
        background: filled?.background ?? "transparent",
        color:
          filled?.color ??
          (tone === "danger" ? red : paper ? paper.dim : rgba(0.55)),
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
