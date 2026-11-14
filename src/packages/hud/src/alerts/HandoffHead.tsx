// The handoff card's head: 接力, whether the round trip runs by itself, the
// round, the paper plane back out (#341) and the stamp. Moved out of
// HandoffCard.tsx for the 300-line ratchet when the plane took #334's ×.
import type { Handoff } from "@agent-hud/protocol";
import { PAPER_SEAL, type Paper } from "../paper";
import type { Inks } from "../permissions/ListCard";
import type { Tones } from "./HandoffCard";
import { LeaveRelay } from "./RelayToggle";
import { autoLabel, round, stamp } from "./handoff-card";

export function HandoffHead({
  handoff,
  paper,
  inks,
  tones,
  zh,
  onLeave,
}: {
  handoff: Handoff;
  paper: Paper | null;
  inks: Inks;
  tones: Tones;
  zh: boolean;
  /** Back to what the sidebar showed before. */
  onLeave(): void;
}) {
  const { at, of } = round(handoff);
  const mark = stamp(handoff, zh);
  const autoMark = autoLabel(handoff, zh);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        minHeight: 44,
        // Clear of the airmail stripe along the top.
        padding: `${paper?.airmail ? 6 : 0}px 2px 8px 0`,
      }}
    >
      <span
        style={{
          fontSize: 12.5,
          letterSpacing: zh ? "0.32em" : "0.12em",
          color: inks.dim,
          whiteSpace: "nowrap",
        }}
      >
        {zh ? "接力" : "HANDOFF"}
      </span>
      {autoMark && (
        <span
          title={handoff.halt ?? undefined}
          style={{
            fontSize: 11.5,
            color: handoff.auto ? inks.ink : tones.amber,
            border: `1.2px solid ${handoff.auto ? inks.faint : tones.amber}`,
            borderRadius: 3,
            padding: "1px 6px",
            whiteSpace: "nowrap",
          }}
        >
          {autoMark}
        </span>
      )}
      <span
        style={{
          marginLeft: "auto",
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          fontSize: 12,
          color: inks.dim,
          whiteSpace: "nowrap",
        }}
      >
        {zh ? `第 ${at} / ${of} 轮` : `Round ${at} / ${of}`}
        <span style={{ display: "inline-flex", gap: 3 }} aria-hidden="true">
          {Array.from({ length: of }, (_, index) => (
            <i
              key={index}
              style={{
                width: 6,
                height: 6,
                boxSizing: "border-box",
                border: `1.2px solid ${index < at ? inks.ink : inks.dim}`,
                background: index < at ? inks.ink : "transparent",
              }}
            />
          ))}
        </span>
      </span>
      <LeaveRelay paper={paper} zh={zh} onLeave={onLeave} />
      <span
        aria-hidden="true"
        style={{
          width: 42,
          height: 42,
          boxSizing: "border-box",
          display: "grid",
          placeItems: "center",
          flex: "none",
          border: `2px solid ${tones[mark.tone]}`,
          borderRadius: "50%",
          color: tones[mark.tone],
          font: `900 ${zh ? (mark.text.length > 2 ? 10.5 : 12) : 8.5}px/1 ${PAPER_SEAL}`,
          opacity: 0.88,
          pointerEvents: "none",
        }}
      >
        {mark.text}
      </span>
    </div>
  );
}
