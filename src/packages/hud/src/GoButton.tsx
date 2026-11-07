// The ↗ that goes somewhere else: back to a session, to a Feishu chat. Every
// one in the sidebar is this button, so they all light up under the pointer,
// sink when pressed and fade when they cannot go (owner, 2026-11-07, #200:
// copies with their own styles had none of it). The give is `.hud-go-button`
// in global.css.
import type { CSSProperties, MouseEvent } from "react";
import { ArrowUpRight } from "lucide-react";

export interface GoInks {
  /** The frame. */
  line: string;
  /** The arrow at rest. */
  ink: string;
  /** The arrow when it cannot go. */
  faint: string;
  /** Frame and arrow under the pointer, and the pressed fill. */
  strong: string;
}

export function GoButton({
  label,
  enabled,
  inks,
  onClick,
  size = 26,
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
}) {
  return (
    <button
      type="button"
      className="hud-go-button"
      aria-label={label}
      title={label}
      aria-disabled={!enabled}
      onClick={onClick}
      style={
        {
          "--go-line": inks.line,
          "--go-ink": enabled ? inks.ink : inks.faint,
          "--go-strong": inks.strong,
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
        } as CSSProperties
      }
    >
      <ArrowUpRight size={size === 20 ? 12 : 13} strokeWidth={2} />
    </button>
  );
}
