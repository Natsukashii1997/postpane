import { BadgeCheck, Check, LoaderCircle, X } from "lucide-react";
import type { Approval, RequestDecision } from "@agent-hud/protocol";
import { permissionColors } from "../tokens";
import { useGround } from "../ground";
import { cardColumn } from "../card-column";
import { usePaper } from "../paper";
import { asksOnlyHere } from "./approval-list";

export function PermissionToolCard({
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
  // On paper the buttons are printed boxes: Allow filled with the ink,
  // Always allow outlined in it, Deny in red (HUDExpandedSurface's paper).
  const paper = usePaper();
  const text = (alpha: number) =>
    paper
      ? paper.text(alpha)
      : light
        ? `rgba(0,0,0,${alpha})`
        : `rgba(255,255,255,${alpha})`;
  const secondary = paper ? paper.dim : text(0.55);
  const inset = paper
    ? paper.fill
    : light
      ? "rgba(0,0,0,0.045)"
      : "rgba(255,255,255,0.055)";
  const round = (radius: number) => (paper ? 2 : radius);
  const controls = permissionColors(useGround(light));
  const allow = paper ? paper.ink : controls.allowFill;
  const allowText = controls.alwaysText;
  const alwaysText = paper ? paper.ink : controls.alwaysText;
  const allowEdge = paper ? paper.ink : controls.alwaysEdge;
  const onAllow = paper ? paper.paper : controls.onAllow;
  const denyText = controls.denyText;
  const denyButtonText = paper ? paper.red : controls.denyText;
  const denyFill = paper ? "transparent" : controls.denyFill;
  const denyStroke = paper ? paper.red : controls.denyEdge;
  const weight = paper ? 600 : 500;

  return (
    <div style={cardColumn(9)}>
      {request.removed || request.added ? (
        <div
          aria-label={t("Edit preview", "修改预览")}
          style={{
            ...cardColumn(2),
            padding: 9,
            borderRadius: round(7),
            background: inset,
            fontSize: 11,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {request.removed &&
            request.removed
              .split("\n")
              .slice(0, 4)
              .map((line, idx) => (
                <div
                  key={`r-${idx}`}
                  style={{
                    display: "flex",
                    gap: 6,
                    color: denyText,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span>−</span>
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {line}
                  </span>
                </div>
              ))}
          {request.added &&
            request.added
              .split("\n")
              .slice(0, 4)
              .map((line, idx) => (
                <div
                  key={`a-${idx}`}
                  style={{
                    display: "flex",
                    gap: 6,
                    color: allowText,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span>+</span>
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {line}
                  </span>
                </div>
              ))}
        </div>
      ) : (
        (request.detail ?? request.input) && (
          <div
            style={{
              padding: "8px 9px",
              borderRadius: round(7),
              background: inset,
              fontSize: 11,
              fontVariantNumeric: "tabular-nums",
              color: text(0.84),
              display: "-webkit-box",
              WebkitLineClamp: 6,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
            }}
          >
            {request.detail ?? request.input}
          </div>
        )
      )}
      {/* Claude Code asked through PostPane's hook: Claude's own window shows
          nothing while it waits, and let go it may be refused (#292). */}
      {asksOnlyHere(request) && (
        <div style={{ fontSize: 11, lineHeight: 1.45, color: secondary }}>
          {t(
            "The Claude desktop window doesn't show this one: approve it here. Left waiting, Claude may refuse it and the session can stall.",
            "Claude 桌面窗口里不会弹这条，请在这里批；放着不管，Claude 可能直接拒绝，会话也会卡住。",
          )}
        </div>
      )}
      {request.alwaysAllowRule && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            minWidth: 0,
          }}
        >
          <BadgeCheck
            size={9}
            strokeWidth={2.5}
            color={allowText}
            style={{ flexShrink: 0 }}
          />
          <span style={{ fontSize: 11, color: secondary, flexShrink: 0 }}>
            {t("Always allow adds", "总是允许会添加")}
          </span>
          <span
            style={{
              fontSize: 11,
              fontVariantNumeric: "tabular-nums",
              color: text(0.78),
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {request.alwaysAllowRule}
          </span>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => void answer({ kind: "deny" })}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            height: 22,
            padding: "0 9px",
            borderRadius: round(6),
            border: `1px solid ${denyStroke}`,
            background: denyFill,
            color: denyButtonText,
            fontSize: 11,
            fontWeight: weight,
            whiteSpace: "nowrap",
            cursor: disabled ? "default" : "pointer",
          }}
        >
          <X size={9} strokeWidth={2.6} />
          {t("Deny", "拒绝")}
        </button>
        <span style={{ flex: 1, minWidth: 8 }} />
        {request.allowsAlways && (
          <button
            type="button"
            disabled={disabled}
            title={request.alwaysAllowRule ?? undefined}
            onClick={() => void answer({ kind: "always" })}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              height: 22,
              padding: "0 9px",
              borderRadius: round(6),
              border: `1px solid ${allowEdge}`,
              background: "transparent",
              color: alwaysText,
              fontSize: 11,
              fontWeight: weight,
              whiteSpace: "nowrap",
              cursor: disabled ? "default" : "pointer",
            }}
          >
            <BadgeCheck size={9} strokeWidth={2.6} />
            {t("Always allow", "总是允许")}
          </button>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() => void answer({ kind: "allow" })}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            height: 22,
            padding: "0 9px",
            borderRadius: round(6),
            border: 0,
            background: allow,
            color: onAllow,
            fontSize: 11,
            fontWeight: weight,
            whiteSpace: "nowrap",
            cursor: disabled ? "default" : "pointer",
          }}
        >
          {pending ? (
            <LoaderCircle size={9} className="animate-spin" />
          ) : (
            <Check size={9} strokeWidth={2.6} />
          )}
          {request.allowLabel ?? t("Allow once", "允许一次")}
        </button>
      </div>
    </div>
  );
}
