import { useId, useLayoutEffect, useRef, useState } from "react";
import type { Handoff } from "@agent-hud/protocol";
import { AIRMAIL_BLUE, AIRMAIL_RED, type Paper } from "../paper";
import type { Inks } from "../permissions/ListCard";
import { relayLegend, relayLegendInks } from "./relay-legend";

/** Where the frame's legend starts along its top edge. */
const LEGEND_LEFT = 14;

/** The airmail frame round a relay's reply on the receipt (owner,
 * 2026-11-07, 甲 · 航空虚线框): red and blue dashes in turn, as an airmail
 * envelope's edge, with 「接力」, the round and ChatGPT's verdict set into its
 * top edge. */
export function RelayFrame({
  handoff,
  paper,
  inks,
  light,
  zh,
}: {
  handoff: Handoff;
  paper: Paper | null;
  inks: Inks;
  light: boolean;
  zh: boolean;
}) {
  const { trip, verdict, missing } = relayLegend(handoff, zh);
  const tone = relayLegendInks(paper, light, missing);
  // The legend breaks the top edge instead of covering it: in the notch there
  // is no paper to cover it with, and on paper a flat patch shows against the
  // grain (#190).
  const legend = useRef<HTMLSpanElement>(null);
  const [gap, setGap] = useState(0);
  useLayoutEffect(() => {
    const element = legend.current;
    if (!element) return;
    const measure = () => setGap(element.offsetWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const mask = `relay-gap-${useId().replace(/[^\w-]/g, "")}`;
  const dash = {
    x: 0.75,
    y: 0.75,
    width: "calc(100% - 1.5px)",
    height: "calc(100% - 1.5px)",
    rx: 6,
    fill: "none",
    strokeWidth: 1.5,
    strokeDasharray: "7 7",
  } as const;
  return (
    <>
      <svg
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          overflow: "visible",
          pointerEvents: "none",
          opacity: 0.9,
        }}
      >
        <mask
          id={mask}
          maskUnits="userSpaceOnUse"
          x="-5%"
          y="-5%"
          width="110%"
          height="110%"
        >
          <rect x="-5%" y="-5%" width="110%" height="110%" fill="white" />
          <rect x={LEGEND_LEFT} y={-4} width={gap} height={8} fill="black" />
        </mask>
        <g mask={`url(#${mask})`}>
          <rect style={{ ...dash, stroke: AIRMAIL_RED }} />
          <rect
            style={{ ...dash, stroke: AIRMAIL_BLUE, strokeDashoffset: 7 }}
          />
        </g>
      </svg>
      <span
        ref={legend}
        style={{
          position: "absolute",
          top: -8,
          left: LEGEND_LEFT,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 6px",
          maxWidth: "calc(100% - 28px)",
          fontSize: 11,
          lineHeight: "16px",
          fontWeight: 500,
          color: inks.dim,
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: tone.relay,
          }}
        >
          {zh ? "接力" : "RELAY"}
        </span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
          {trip}
          {verdict && (
            <>
              {" · "}
              <span style={{ color: tone.verdict, fontWeight: 600 }}>
                {verdict}
              </span>
            </>
          )}
        </span>
      </span>
    </>
  );
}
