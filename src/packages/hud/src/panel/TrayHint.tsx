import {
  CornerDownRight,
  EyeOff,
  FileSearch,
  FlaskConical,
  MessagesSquare,
  type LucideIcon,
} from "lucide-react";
import { useBoardInks } from "./AgentBoard";
import type { TrayKind, trayText } from "./relay-tray";

/** The swipe tray's blocks (relay design 第 2 版, 左滑发起): colour, icon,
 * and the paler colour its name takes in the dark hint. */
export const TRAY: Record<
  TrayKind,
  { color?: string; tint: string; Icon: LucideIcon }
> = {
  review: { color: "#366657", tint: "#8fcdb9", Icon: FileSearch },
  test: { color: "#415d7a", tint: "#9cc2ea", Icon: FlaskConical },
  cont: { color: "#6e5635", tint: "#d9b88b", Icon: CornerDownRight },
  disc: { color: "#69506f", tint: "#d2b0da", Icon: MessagesSquare },
  rm: { tint: "#ffb3a8", Icon: EyeOff },
};

/** The line under the tray saying where the block under the pointer or the
 * keyboard hands the work, and what it asks. */
export function TrayHint({
  hint,
  kind,
  caret,
  width,
  above,
  light,
}: {
  hint: ReturnType<typeof trayText>;
  kind: TrayKind;
  /** The block's middle, from the tray's left. */
  caret: number;
  width: number;
  above: boolean;
  light: boolean;
}) {
  const inks = useBoardInks(light);
  const face = light ? "#fbfaf6" : "#383530";
  const edge = light ? "rgba(42,41,37,0.14)" : "rgba(236,231,220,0.09)";
  return (
    <div
      role="tooltip"
      style={{
        position: "absolute",
        right: 0,
        ...(above
          ? { bottom: "calc(100% + 7px)" }
          : { top: "calc(100% + 7px)" }),
        zIndex: 5,
        width,
        boxSizing: "border-box",
        padding: "9px 12px 10px",
        borderRadius: 3,
        background: face,
        boxShadow: `0 10px 24px rgba(0,0,0,${light ? 0.18 : 0.42}), inset 0 0 0 1px ${edge}`,
        fontSize: 11.5,
        lineHeight: 1.55,
        color: inks.secondary,
        pointerEvents: "none",
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: caret - 4,
          ...(above ? { bottom: -4 } : { top: -4 }),
          width: 8,
          height: 8,
          background: face,
          transform: "rotate(45deg)",
          boxShadow: above ? `1px 1px 0 0 ${edge}` : `-1px -1px 0 0 ${edge}`,
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 3,
          fontSize: 12,
          fontWeight: 600,
          // Pale on the dark hint; on the light one the block's own colour.
          color: light ? (TRAY[kind].color ?? inks.red) : TRAY[kind].tint,
        }}
      >
        {hint.label}
        {hint.to && (
          <span style={{ fontWeight: 400, color: inks.secondary }}>
            {hint.to}
          </span>
        )}
      </div>
      <div style={{ position: "relative" }}>{hint.line}</div>
    </div>
  );
}
