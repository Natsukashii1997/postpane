// The one way into a handoff card and back out (#341, the owner chose 丙 on
// 2026-11-14 over a worded button and a switch): a paper plane in the ↗'s
// square, left of the stamp in the card's head. On the waiting card it opens
// the handoff that moved last, with how many are open on its corner when
// more than one; on the handoff card the same square, held down, goes back
// to what the sidebar showed. It replaces #334's × beside the ↗.
import type { Handoff } from "@agent-hud/protocol";
import { GoButton } from "../GoButton";
import type { Paper } from "../paper";
import { useHandoffCard } from "./HandoffCard";
import { liveHandoffs } from "./handoff-doer";

/** The plane's inks on `paper`, the notch's ground without one. */
function planeInks(paper: Paper | null) {
  const blue = paper?.blue ?? "#8fb0ec";
  const ground = paper?.paper ?? "#1f1f1f";
  return {
    inks: {
      line: blue,
      ink: blue,
      faint: blue,
      strong: blue,
      onStrong: ground,
    },
    red: paper?.red ?? "#ff6a57",
    ground,
  };
}

/** On the handoff card: held down, back out. */
export function LeaveRelay({
  paper,
  zh,
  onLeave,
}: {
  paper: Paper | null;
  zh: boolean;
  onLeave(): void;
}) {
  return (
    <GoButton
      icon="relay"
      pressed
      label={zh ? "退出接力" : "Leave the handoff"}
      enabled
      inks={planeInks(paper).inks}
      onClick={onLeave}
    />
  );
}

/** On the waiting card: into the handoff that moved last, while one is
 * open and a sidebar can show its card. */
export function EnterRelay({
  handoffs,
  paper,
  zh,
}: {
  handoffs: readonly Handoff[] | null | undefined;
  paper: Paper | null;
  zh: boolean;
}) {
  const card = useHandoffCard();
  const live = liveHandoffs(handoffs ?? []);
  if (!card || live.length === 0) return null;
  const { inks, red, ground } = planeInks(paper);
  return (
    <GoButton
      icon="relay"
      pressed={false}
      label={
        zh
          ? `进入接力${live.length > 1 ? `（共 ${live.length} 单，进最近的）` : ""}`
          : "Open the handoff"
      }
      enabled
      inks={inks}
      badge={
        live.length > 1
          ? { text: String(live.length), fill: red, ink: ground }
          : undefined
      }
      onClick={() => card.open(live[0].id)}
    />
  );
}
