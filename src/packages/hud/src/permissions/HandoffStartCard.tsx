import { ArrowRight, LoaderCircle, Play } from "lucide-react";
import type { Approval, RequestDecision } from "@agent-hud/protocol";
import { clientDisplayName } from "../IslandNews";
import { permissionColors } from "../tokens";
import { useGround } from "../ground";
import { cardColumn } from "../card-column";
import { usePaper } from "../paper";
import { ApprovalTag } from "./ApprovalTag";
import { START_WORDS, startDecision } from "./approval-list";

/**
 * A handoff card the sidebar can start (#292): its heading and title as the
 * question card prints them, what 开始 does, then 跳过 and 开始. 开始 sends
 * 「开始」 into the card's session, which starts the card it proposed, as
 * the person's own reply there would; 跳过 only puts the card away.
 */
export function HandoffStartCard({
  request,
  disabled,
  pending,
  light = false,
  zh = false,
  answer,
}: {
  request: Approval;
  disabled: boolean;
  pending: boolean;
  light?: boolean;
  zh?: boolean;
  answer: (decision: RequestDecision) => Promise<boolean>;
}) {
  const t = (en: string, cn: string) => (zh ? cn : en);
  const paper = usePaper();
  const text = (alpha: number) =>
    paper
      ? paper.text(alpha)
      : light
        ? `rgba(0,0,0,${alpha})`
        : `rgba(255,255,255,${alpha})`;
  const primary = paper ? paper.ink : text(0.92);
  const secondary = paper ? paper.dim : text(0.55);
  const edge = paper ? paper.text(0.54) : text(0.18);
  const inset = paper
    ? paper.fill
    : light
      ? "rgba(0,0,0,0.045)"
      : "rgba(255,255,255,0.055)";
  const round = (radius: number) => (paper ? 2 : radius);
  const controls = permissionColors(useGround(light));
  const allow = paper ? paper.ink : controls.allowFill;
  const onAllow = paper ? paper.paper : controls.onAllow;
  const vendor = request.vendor ?? clientDisplayName(request.source);
  const question = request.questions?.[0];
  const button = {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    height: 22,
    padding: "0 9px",
    borderRadius: round(6),
    fontSize: 11,
    fontWeight: 500,
    cursor: disabled ? "default" : "pointer",
  } as const;

  return (
    <div style={cardColumn(8)}>
      <div style={{ ...cardColumn(6), justifyItems: "start" }}>
        {question?.header && (
          <ApprovalTag
            label={question.header}
            tone="ask"
            light={light}
            dashed
          />
        )}
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: primary,
            lineHeight: 1.45,
          }}
        >
          {question?.question ?? request.title}
        </div>
      </div>
      <div
        style={{
          ...cardColumn(3),
          padding: "7px 8px",
          borderRadius: round(6),
          background: inset,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: primary }}>
          {t("Start it from here", "在这里开始")}
        </span>
        <span
          style={{
            fontSize: 10,
            lineHeight: 1.4,
            color: secondary,
            overflowWrap: "anywhere",
          }}
        >
          {t(
            `Start replies “${START_WORDS}” in the session for you; it starts this handoff card in ${vendor}, and the new session hangs under it.`,
            `点「开始」会替你在原会话里回一句「${START_WORDS}」，由它在 ${vendor} 里启动这张交接卡，新会话挂在原会话下面。`,
          )}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => void answer({ kind: "leave" })}
          style={{
            ...button,
            border: `1px solid ${edge}`,
            background: "transparent",
            color: secondary,
          }}
        >
          <ArrowRight size={9} strokeWidth={2.6} />
          {t("Skip", "跳过")}
        </button>
        <span style={{ flex: 1, minWidth: 8 }} />
        <button
          type="button"
          disabled={disabled}
          onClick={() => void answer(startDecision(request))}
          style={{ ...button, border: 0, background: allow, color: onAllow }}
        >
          {pending ? (
            <LoaderCircle size={9} className="animate-spin" />
          ) : (
            <Play size={9} strokeWidth={2.6} />
          )}
          {t("Start", "开始")}
        </button>
      </div>
    </div>
  );
}
