import type { CardWeekly } from "../card-weekly";
import { usePaper } from "../paper";

/** This agent's weekly figure pressed faintly into the bottom right of a card
 * that covers its panel (#319, owner chose 甲 on 2026-11-12: the number alone,
 * no words). It sits behind the card's words (`.hud-panel-content` isolates
 * it from the paper) and stays at the bottom of the card while it scrolls. */
export function WeeklyMark({ weekly }: { weekly: CardWeekly | undefined }) {
  const paper = usePaper();
  if (!weekly || !paper) return null;
  return (
    <div
      aria-hidden="true"
      className="hud-weekly-mark"
      style={{
        position: "sticky",
        bottom: 0,
        height: 0,
        zIndex: -1,
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <span
        style={{
          position: "absolute",
          right: 0,
          bottom: 2,
          fontSize: 118,
          fontWeight: 800,
          lineHeight: 0.8,
          letterSpacing: "-0.04em",
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
          color: weekly.critical ? paper.red : paper.ink,
          opacity: weekly.critical ? 0.075 : 0.055,
          filter: "blur(0.6px)",
        }}
      >
        {weekly.percent}
        <span style={{ fontSize: 44, fontWeight: 700, verticalAlign: 52 }}>
          %
        </span>
      </span>
    </div>
  );
}
