// A next step done in another Claude session (owner, 2026-11-28, 「丙」),
// when that session has no card of its own to carry it: what the finished
// session said, then where to go, then 跳过 and 前往. Nothing is answered
// here; 前往 opens that session and puts this card away.
import { ArrowRight, ArrowUpRight, LoaderCircle } from "lucide-react";
import type { Approval, RequestDecision } from "@agent-hud/protocol";
import { HUDArtwork } from "../HUDArtwork";
import { cardColumn } from "../card-column";
import { usePaper } from "../paper";
import { CardButton } from "./CardButton";
import { cardInks } from "./ListCard";

export function ElsewhereCard({
  request,
  title,
  disabled,
  pending,
  light = false,
  zh = false,
  answer,
  go,
}: {
  request: Approval;
  /** The other session's title as the sidebar lists it, else the link's. */
  title: string;
  disabled: boolean;
  pending: boolean;
  light?: boolean;
  zh?: boolean;
  answer: (decision: RequestDecision) => Promise<boolean>;
  /** Opens the other session; absent when it is not here to open. */
  go?: () => void;
}) {
  const paper = usePaper();
  const inks = cardInks(paper, light);
  const gone = !request.elsewhere?.sessionId;
  const detail = request.detail?.trim();
  const question = request.questions?.[0]?.question ?? request.title;
  const fill = paper
    ? paper.fill
    : light
      ? "rgba(0,0,0,0.045)"
      : "rgba(255,255,255,0.055)";
  return (
    <div style={cardColumn(8)}>
      {detail && (
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.7,
            marginBottom: 6,
            color: paper ? paper.text(0.76) : inks.mid,
            overflowWrap: "anywhere",
          }}
        >
          {detail}
        </div>
      )}
      <div
        style={{
          fontSize: 15,
          fontWeight: 600,
          lineHeight: 1.45,
          color: inks.ink,
          overflowWrap: "anywhere",
        }}
      >
        {question}
      </div>
      <div
        style={{
          ...cardColumn(5),
          padding: "8px 10px",
          borderRadius: paper ? 2 : 6,
          background: fill,
        }}
      >
        <span
          style={{ fontSize: 11, letterSpacing: "0.04em", color: inks.dim }}
        >
          {gone
            ? zh
              ? "这个会话已不在"
              : "That session is gone"
            : zh
              ? "下一步在这个会话"
              : "The next step is in this session"}
        </span>
        <span
          style={{
            display: "grid",
            gridTemplateColumns: "14px minmax(0, 1fr)",
            columnGap: 8,
            alignItems: "center",
          }}
        >
          <HUDArtwork source={request.source} size={14} light={light} />
          <span
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              color: gone ? inks.dim : inks.ink,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
          >
            {title}
          </span>
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <CardButton
          tone="secondary"
          light={light}
          disabled={disabled}
          icon={<ArrowRight size={9} strokeWidth={2.6} />}
          onClick={() => void answer({ kind: "leave" })}
        >
          {zh ? "跳过" : "Skip"}
        </CardButton>
        <span style={{ flex: 1, minWidth: 8 }} />
        {go && !gone && (
          <CardButton
            tone="primary"
            light={light}
            disabled={disabled}
            icon={
              pending ? (
                <LoaderCircle size={9} className="animate-spin" />
              ) : (
                <ArrowUpRight size={9} strokeWidth={2.6} />
              )
            }
            onClick={go}
          >
            {zh ? "前往" : "Go"}
          </CardButton>
        )}
      </div>
    </div>
  );
}
