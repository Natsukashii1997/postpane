import { paperLevel, type Paper } from "../paper.ts";
import {
  alertFill,
  alertInk,
  alertText,
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
