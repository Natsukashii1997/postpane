// The ↗ that goes somewhere else: back to a session, to a Feishu chat. Every
// one in the sidebar is this button, so they all light up under the pointer,
// sink when pressed and fade when they cannot go (owner, 2026-11-07, #200:
// copies with their own styles had none of it). The give is `.hud-go-button`
// in global.css. The same square with a paper plane goes into a handoff card
// and, held down there, back out (#341).
import type { CSSProperties, MouseEvent } from "react";
import { ArrowUpRight, Send } from "lucide-react";

export interface GoInks {
  /** The frame. */
  line: string;
  /** The arrow at rest. */
  ink: string;
  /** The arrow when it cannot go. */
  faint: string;
  /** Frame and arrow under the pointer, and the pressed fill. */
  strong: string;
  /** The arrow on the pressed fill, while held down. */
  onStrong?: string;
}

export function GoButton({
  label,
  enabled,
  inks,
  onClick,
  size = 26,
  icon = "go",
  pressed,
  badge,
}: {
  /** What it does, for the tooltip and screen readers. */
  label: string;
  enabled: boolean;
  inks: GoInks;
  /** Called on every click, enabled or not, so a row can close its tray;
   * the caller goes only when it can. */
  onClick(event: MouseEvent<HTMLButtonElement>): void;
  /** The square's side: 26, or 20 in a compact row. */
  size?: 20 | 26;
  /** ↗ to go somewhere, the paper plane into a handoff card (#341). */
  icon?: "go" | "relay";
  /** A toggle's state: held down, filled with `strong`. */
  pressed?: boolean;
  /** A count on the corner, with its fill and ink. */
  badge?: { text: string; fill: string; ink: string };
}) {
  const Icon = icon === "relay" ? Send : ArrowUpRight;
  return (
    <button
      type="button"
      className="hud-go-button"
      aria-label={label}
      title={label}
      aria-disabled={!enabled}
      aria-pressed={pressed}
      onClick={onClick}
      style={
        {
          "--go-line": inks.line,
          "--go-ink": enabled ? inks.ink : inks.faint,
          "--go-strong": inks.strong,
          position: "relative",
          display: "inline-grid",
          placeItems: "center",
          flex: "none",
          width: size,
          height: size,
          boxSizing: "border-box",
          padding: 0,
          borderRadius: 3,
          opacity: enabled ? 1 : 0.6,
          cursor: enabled ? "pointer" : "default",
          ...(pressed && {
            background: inks.strong,
            color: inks.onStrong ?? inks.ink,
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.35)",
          }),
        } as CSSProperties
      }
    >
      <Icon size={size === 20 ? 12 : 13} strokeWidth={2} />
      {badge && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            minWidth: 14,
            height: 14,
            boxSizing: "border-box",
            padding: "0 3px",
            borderRadius: 7,
            display: "grid",
            placeItems: "center",
            background: badge.fill,
            color: badge.ink,
            font: "700 9.5px/1 system-ui, sans-serif",
          }}
        >
          {badge.text}
        </span>
      )}
    </button>
  );
}
