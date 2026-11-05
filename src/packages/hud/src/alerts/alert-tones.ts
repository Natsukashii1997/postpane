import { paperLevel, type Paper } from "../paper.ts";
import {
  alertFill,
  alertInk,
  alertText,
  levelText,
  onAlertFill,
  type AlertTone,
} from "../tokens.ts";

export interface AlertPalette {
  /** The paper the alert is printed on, or null on the HUD's own ground. */
  paper: Paper | null;
  /** The alert's ink at `alpha`. */
  ink: (alpha: number) => string;
  /** A filled control's colour. */
  fill: (tone: AlertTone) => string;
  /** A tone as text or a glyph. */
  text: (tone: AlertTone) => string;
  /** Ink on a filled control. */
  onFill: string;
}

/** A notice's colours: the HUD's alert tones on its own ground, or, printed
 * as a receipt beside the dock, ink with blue for a reply, amber for a
 * warning, and filled controls in solid ink. */
export function alertPalette(
  ground: Parameters<typeof alertFill>[1],
  paper: Paper | null,
): AlertPalette {
  if (!paper)
    return {
      paper,
      ink: (alpha) => alertInk(alpha, ground),
      fill: (tone) => alertFill(tone, ground),
      text: (tone) => alertText(tone, ground),
      onFill: onAlertFill(ground),
    };
  return {
    paper,
    ink: (alpha) => paper.text(alpha),
    fill: () => paper.ink,
    text: (tone) =>
      tone === "turn"
        ? paper.blue
        : tone === "warning"
          ? paperLevel("warning", paper)
          : paper.ink,
    onFill: paper.paper,
  };
}

/** A quota strip's accent, as its figure and its bar: amber running low, red
 * used up, blue reset (on the HUD's own ground, its calm reset tone), and the
 * dim ink with no reading. */
export function quotaAccent(
  tone: "warning" | "critical" | "reset" | "none",
  ground: Parameters<typeof alertFill>[1],
  paper: Paper | null,
): string {
  if (tone === "warning")
    return paper ? paperLevel("warning", paper) : alertText("warning", ground);
  if (tone === "critical")
    return paper ? paper.red : levelText("critical", ground);
  if (tone === "reset") return paper ? paper.blue : alertText("calm", ground);
  return paper ? paper.dim : alertInk(0.55, ground);
}
