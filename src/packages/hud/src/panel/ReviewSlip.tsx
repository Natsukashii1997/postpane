import type { ReactNode } from "react";
import type { Handoff } from "@agent-hud/protocol";
import { useHandoffCard } from "../alerts/HandoffCard";
import { progressLine, round } from "../alerts/handoff-card";
import { airmailStripes, relayPaperOf } from "../paper";
import { useBoardInks } from "./AgentBoard";
import { noButtonChrome } from "./theme";

/** ChatGPT's reviews in the list (#145): a slip of the reviews' paper under
 * an airmail band, below the owner's own sessions. Moved out of
 * SessionsSection.tsx for the 300-line ratchet (#288). */
export function ReviewRows({
  zh,
  children,
}: {
  zh: boolean;
  children: ReactNode;
}) {
  const sheet = relayPaperOf(true);
  return (
    <div
      style={{
        position: "relative",
        margin: "10px 0 2px",
        padding: "10px 0 2px",
        background: sheet.paper,
        color: sheet.ink,
        borderRadius: 6,
        overflow: "hidden",
        boxShadow: "inset 0 6px 6px -6px rgba(0,0,0,.35)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 5,
          background: airmailStripes(5),
        }}
      />
      <div
        style={{
          padding: "2px 6px 0",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.3em",
          color: sheet.blue,
        }}
      >
        {zh ? "审核" : "REVIEWS"}
      </div>
      {children}
    </div>
  );
}

/** One quiet handoff on the slip: its round and title, how it stands, and
 * the whole row opens its card, to end it or go on (#288). */
export function QuietRelayRow({
  handoff,
  now,
  zh,
}: {
  handoff: Handoff;
  now: number;
  zh: boolean;
}) {
  const card = useHandoffCard();
  const inks = useBoardInks(true);
  const blue = relayPaperOf(true).blue;
  const { at, of } = round(handoff);
  return (
    <button
      type="button"
      className="hud-quiet-relay"
      title={zh ? "打开接力卡" : "Open the handoff card"}
      disabled={!card}
      onClick={() => card?.open(handoff.id)}
      style={{
        ...noButtonChrome,
        display: "grid",
        gridTemplateColumns: "auto minmax(0, 1fr)",
        columnGap: 10,
        alignItems: "center",
        width: "100%",
        padding: "8px 6px",
        textAlign: "left",
        cursor: card ? "pointer" : undefined,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          height: 17,
          padding: "0 5px",
          boxSizing: "border-box",
          border: "1.5px dashed currentColor",
          borderRadius: 2,
          color: blue,
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: "0.04em",
          lineHeight: 1,
          whiteSpace: "nowrap",
          // Every row's title starts at one place (#288).
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {zh ? `接力 ${at}/${of}` : `Relay ${at}/${of}`}
      </span>
      <span
        style={{
          fontSize: 13.5,
          fontWeight: 600,
          color: inks.text,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          minWidth: 0,
        }}
      >
        {handoff.title}
      </span>
      <span
        style={{
          gridColumn: "2 / 3",
          marginTop: 2,
          fontSize: 12,
          color: inks.secondary,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          minWidth: 0,
        }}
      >
        {progressLine(handoff, now, zh)}
      </span>
    </button>
  );
}
