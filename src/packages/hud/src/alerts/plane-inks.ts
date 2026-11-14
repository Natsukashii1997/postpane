// The paper plane's colours (#341), apart from its button so they can be
// tested without React.
import type { Paper } from "../paper";

/** The plane is white, its own colour apart from the cards' blue (owner,
 * 2026-11-14): a white square on dark paper and in the notch; held down,
 * a white plane on the paper's ink. Light paper cannot show white, so its
 * unpressed square takes the ink. */
export function planeInks(paper: Paper | null, pressed: boolean) {
  const white = "#ffffff";
  const ink = paper?.light ? paper.ink : white;
  const ground = paper?.paper ?? "#1f1f1f";
  return {
    inks: {
      line: ink,
      ink,
      faint: ink,
      strong: ink,
      onStrong: pressed && paper?.light ? white : ground,
    },
    red: paper?.red ?? "#ff6a57",
    ground,
  };
}
