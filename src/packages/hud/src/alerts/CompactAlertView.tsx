import { Hand } from "lucide-react";
import type { Approval, IslandEvent, Session } from "@agent-hud/protocol";
import { labelWidth } from "../geometry";
import { agentVendorName } from "../model";
import { clientDisplayName, projectName } from "../IslandNews";
import { ReminderMark } from "./ReminderMark";
import {
  quotaAlertCopy,
  resetCreditCopy,
  signInCopy,
  type QuotaTone,
} from "./quota-alert-copy";
import { systemCalendar, type QuotaDisplay } from "@agent-hud/ui/format";
import { useFormat } from "@agent-hud/ui/format-context";
import { alertInk, alertText } from "../tokens";
import { quotaAccent } from "./alert-tones";
import { isQuotaEvent } from "./quota-list";
import { useGround } from "../ground";
import { PAPER_FIGURES, PAPER_SEAL, paperLevel, type Paper } from "../paper";
import { ApprovalTag } from "../permissions/ApprovalTag";
import { REPLY_BADGE, requestTitle } from "../permissions/approval-list";
import type { ReplyChip } from "./reply-list";

/** What a quota reminder says beside its agent (Open's QuotaAlertCopy.compactTitle). */
export function compactQuotaStatus(event: IslandEvent, zh = false): string {
  return quotaAlertCopy(event, {
    language: zh ? "zh" : "en",
    calendar: systemCalendar(navigator.language),
  }).compactTitle;
}

/** A quota notice's folded tag: what it is about in dim ink, then its
 * figure in the notice's colour. A window's name and the share shown (or that
 * it reset); "重置" and the resets added, in blue; a sign-out's words alone, in
 * red. */
export function quotaChipLabels(
  event: IslandEvent,
  zh: boolean,
  quotaDisplay?: QuotaDisplay,
): { who: string; status: string; tone: QuotaTone } {
  const settings = {
    language: zh ? ("zh" as const) : ("en" as const),
    quotaDisplay,
    calendar: systemCalendar(navigator.language),
  };
  if (event.kind === "reset-credits") {
    const copy = resetCreditCopy(event, undefined, settings);
    return { who: copy.chipLabel, status: copy.chipValue, tone: "reset" };
  }
  if (event.kind === "sign-in-needed")
    return {
      who: "",
      status: signInCopy(event, [], settings).chip,
      tone: "critical",
    };
  const copy = quotaAlertCopy(event, settings);
  return { who: copy.windowName, status: copy.chipStatus, tone: copy.tone };
}

export function compactAlertLabels(
  request: Approval | undefined,
  event: IslandEvent | undefined,
  requestCount: number,
  zh: boolean,
  /** The replies waiting, for a reply's tag: the newest one's title and the
   * count beside REPLY. */
  reply?: ReplyChip,
  /** The sessions, for a request's title as the waiting list writes it. */
  sessions: readonly Session[] = [],
): { who: string; status: string; badge?: string } {
  if (request) {
    const who = requestTitle(
      request,
      sessions,
      projectName(request.cwd) ??
        request.vendor ??
        clientDisplayName(request.source),
    );
    const status =
      request.kind === "question"
        ? zh
          ? "待回答"
          : "Question"
        : request.kind === "plan"
          ? zh
            ? "待确认计划"
            : "Plan"
          : zh
            ? "待批准"
            : "Waiting";
    return {
      who,
      status,
      badge: requestCount > 1 ? `×${requestCount}` : undefined,
    };
  }
  if (!event) return { who: "", status: "" };
  if (event.kind === "completion" && reply) {
    return {
      who: reply.title,
      status: REPLY_BADGE,
      badge: String(reply.count),
    };
  }
  if (event.kind === "completion") {
    return {
      who: clientDisplayName(event.source),
      status: zh ? "有新回复" : "New reply",
    };
  }
  if (event.kind === "sign-in-needed") {
    return {
      who: event.title ?? agentVendorName(event.source),
      status: zh ? "需要重新登录" : "Sign in again",
    };
  }
  if (event.kind === "reset-credits") {
    const added = event.added ?? 1;
    return {
      who: agentVendorName(event.source),
      status: zh
        ? `+${added} 次重置`
        : `+${added} reset${added === 1 ? "" : "s"}`,
    };
  }
  return {
    who: agentVendorName(event.source),
    status: compactQuotaStatus(event, zh),
  };
}

/** How wide a reply's tag lets the newest reply's title run. */
export const replyTitleWidth = (scale: number) => Math.round(150 * scale);

export function compactAlertDockWidth(
  request: Approval | undefined,
  event: IslandEvent | undefined,
  requestCount: number,
  scale: number,
  zh: boolean,
  reply?: ReplyChip,
  quotaDisplay?: QuotaDisplay,
  sessions: readonly Session[] = [],
): number {
  const { who, status, badge } = compactAlertLabels(
    request,
    event,
    requestCount,
    zh,
    reply,
    sessions,
  );
  const font = Math.round(9 * scale);
  const icon = Math.round(17 * scale);
  if (!request && event && isQuotaEvent(event)) {
    // The mark, the window in dim ink, then the share in bold colour (a
    // sign-out's tag has no dim word).
    const chip = quotaChipLabels(event, zh, quotaDisplay);
    return Math.ceil(
      icon +
        (chip.who ? Math.round(5 * scale) + labelWidth(chip.who, font) : 0) +
        Math.round(8 * scale) +
        Math.ceil(labelWidth(chip.status, font) * 1.05) +
        Math.round(20 * scale),
    );
  }
  if (!request && event?.kind === "completion" && reply) {
    // The newest reply's title in bold, cut at replyTitleWidth, a tear, then
    // the REPLY tag with its count (ApprovalTag: 18px high, mono 10.5px).
    const title = Math.min(
      Math.ceil(labelWidth(who, font) * 1.05),
      replyTitleWidth(scale),
    );
    const tag =
      15 +
      Math.ceil(status.length * 10.5 * 0.7) +
      5 +
      Math.ceil((badge ?? "").length * 10.5 * 0.62);
    return Math.ceil(
      icon +
        Math.round(5 * scale) +
        title +
        Math.round(8 * scale) +
        2 +
        Math.round(8 * scale) +
        tag +
        Math.round(20 * scale),
    );
  }
  if (request) {
    // Printed on paper: the name in bold (a session's title cut as a reply's
    // is), a tear, then a seal and the status in spaced bold red
    // (CompactAlertView's paper tag).
    const bold = (text: string) => Math.ceil(labelWidth(text, font) * 1.05);
    const leading =
      icon +
      Math.round(5 * scale) +
      Math.min(bold(who), replyTitleWidth(scale));
    const tear = Math.round(8 * scale) + 2;
    const trailing =
      Math.round(12 * scale) +
      Math.round(4 * scale) +
      bold(status) +
      Math.ceil(status.length * font * 0.06) +
      (badge
        ? Math.round(4 * scale) + labelWidth(badge, Math.round(8 * scale))
        : 0);
    return Math.ceil(
      leading +
        tear +
        Math.round(8 * scale) +
        trailing +
        Math.round(20 * scale),
    );
  }
  // A notice beside the dock is printed too: its name in bold, then a tear.
  const glyph = Math.round(9 * scale);
  const leading =
    icon +
    Math.round(5 * scale) +
    Math.ceil(labelWidth(who, font) * 1.05) +
    Math.round(8 * scale) +
    2;
  const badgeExtra = badge
    ? Math.round(4 * scale) + labelWidth(badge, Math.round(8 * scale)) + 8
    : 0;
  const trailing =
    glyph + Math.round(4 * scale) + labelWidth(status, font) + badgeExtra;
  return Math.ceil(
    leading + Math.round(8 * scale) + trailing + Math.round(20 * scale),
  );
}

export function CompactAlertView({
  request,
  event,
  requestCount,
  onDock,
  notchWidth,
  surfaceFlare,
  scale,
  light,
  botLogos,
  zh,
  paper: printed = null,
  reply,
  sessions,
  onOpen,
  onDismissAndStats,
}: {
  request?: Approval;
  event?: IslandEvent;
  requestCount: number;
  onDock: boolean;
  notchWidth: number;
  surfaceFlare: number;
  scale: number;
  light: boolean;
  botLogos: boolean;
  zh: boolean;
  /** The paper a request's tag is printed on, beside the dock. */
  paper?: Paper | null;
  /** The replies waiting, when a reply's tag shows. */
  reply?: ReplyChip;
  /** The sessions, for a request's title. */
  sessions?: readonly Session[];
  onOpen: () => void;
  onDismissAndStats: () => void;
}) {
  const { quotaDisplay } = useFormat();
  const quota =
    !request && event && isQuotaEvent(event)
      ? quotaChipLabels(event, zh, quotaDisplay)
      : null;
  const labels = compactAlertLabels(
    request,
    event,
    requestCount,
    zh,
    reply,
    sessions,
  );
  const { badge } = labels;
  const who = quota?.who ?? labels.who;
  const status = quota?.status ?? labels.status;
  // A reply's tag names the newest reply, with that reply's mark.
  const replyTag = !request && event?.kind === "completion" && reply;
  const font = onDock ? Math.round(9 * scale) : 12;
  const iconSize = onDock ? Math.round(17 * scale) : 17;
  const glyphSize = onDock ? Math.round(9 * scale) : 11;
  const ground = useGround(light);
  // Beside the dock a request is a paper tag and a notice a receipt's
  // (HUDExpandedSurface prints them): a reply in blue, a warning in amber.
  const paper = printed;
  const signalText = alertText("warning", ground);
  const warnAccent = paper
    ? paperLevel("warning", paper)
    : alertText("warning", ground);
  const dimInk = paper ? paper.dim : alertInk(0.55, ground);
  const secondary = light ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.55)";
  const segmentBg = light ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)";
  // PermissionAlertViews.swift line 55: "Clicking the collapsed form does nothing on purpose".
  // CompletionAlertCompactView opens the detail card; Quota / ResetCredit compact views open usage stats.
  const handleClick = request
    ? undefined
    : event?.kind === "completion" || event?.kind === "sign-in-needed"
      ? onOpen
      : onDismissAndStats;

  const printedWhat =
    request && paper ? (
      <>
        <span
          aria-hidden="true"
          style={{
            display: "grid",
            placeItems: "center",
            width: Math.round(12 * scale),
            height: Math.round(12 * scale),
            boxSizing: "border-box",
            border: `${1.2 * scale}px solid ${paper.red}`,
            borderRadius: 2 * scale,
            color: paper.red,
            font: `900 ${7.5 * scale}px/1 ${PAPER_SEAL}`,
            transform: "rotate(-9deg)",
            flexShrink: 0,
          }}
        >
          {request.kind === "question" ? (zh ? "答" : "?") : zh ? "批" : "!"}
        </span>
        <span
          style={{
            fontSize: font,
            fontWeight: 600,
            letterSpacing: "0.06em",
            color: paper.red,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {status}
        </span>
        {badge && (
          <span
            style={{
              font: `600 ${Math.round(8 * scale)}px/1 ${PAPER_FIGURES}`,
              fontVariantNumeric: "tabular-nums",
              color: paper.dim,
              flexShrink: 0,
            }}
          >
            {badge}
          </span>
        )}
      </>
    ) : null;

  const trailingWhat = request ? (
    <>
      <Hand
        size={glyphSize}
        color={signalText}
        fill={signalText}
        style={{ flexShrink: 0 }}
      />
      <span
        style={{
          fontSize: font,
          fontWeight: 500,
          color: secondary,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {status}
      </span>
      {badge && (
        <span
          style={{
            fontSize: onDock ? Math.round(8 * scale) : 10,
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
            padding: "1px 4px",
            borderRadius: 4,
            background: segmentBg,
            flexShrink: 0,
          }}
        >
          {badge}
        </span>
      )}
    </>
  ) : event?.kind === "completion" ? (
    // The waiting card's REPLY tag, its count in the row's ink.
    <ApprovalTag
      label={REPLY_BADGE}
      tone="reply"
      light={light}
      count={reply?.count ?? 1}
      ink={paper ? paper.ink : alertInk(0.96, ground)}
      color={paper?.blue}
    />
  ) : quota ? (
    <span
      style={{
        fontSize: font,
        fontWeight: 600,
        fontVariantNumeric: "tabular-nums",
        color: quotaAccent(quota.tone, ground, paper),
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  ) : (
    <>
      <span
        style={{
          fontSize: font,
          fontWeight: 500,
          color: warnAccent,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {status}
      </span>
    </>
  );

  return (
    <div
      className="hud-compact-request"
      role={handleClick ? "button" : undefined}
      onClick={handleClick}
      style={{
        cursor: handleClick ? "pointer" : "default",
        position: "relative",
        height: "100%",
        display: "flex",
        alignItems: "center",
        padding: onDock
          ? `0 ${Math.round(10 * scale)}px`
          : `0 ${16 + surfaceFlare}px`,
        gap: onDock ? Math.round(8 * scale) : 0,
        fontSize: font,
        whiteSpace: "nowrap",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: onDock ? Math.round(5 * scale) : 6,
          width: onDock ? undefined : 112,
          // No clipping here: the name ellipsizes itself, and the mark's
          // canvas reaches past the row for Clawd's jumps and props.
          flexShrink: 0,
        }}
      >
        <ReminderMark
          request={request}
          event={replyTag ? reply.event : event}
          size={iconSize}
          light={light}
          botLogos={botLogos}
        />
        {who && (
          <span
            style={{
              fontSize: font,
              fontWeight: quota ? 500 : paper || replyTag ? 600 : 500,
              // The row's own ink: the scene's may be the light HUD's while the
              // row itself is drawn dark (on the notch); a quota's window is dim.
              color: quota
                ? dimInk
                : paper
                  ? paper.ink
                  : alertInk(0.96, ground),
              maxWidth:
                (replyTag || request) && onDock
                  ? replyTitleWidth(scale)
                  : undefined,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {who}
          </span>
        )}
      </div>
      {!onDock && (
        <span
          style={{
            flex: 1,
            minWidth: Math.max(0, notchWidth - 48),
          }}
        />
      )}
      {paper && !quota && (
        // The tag's tear between its owner and its status.
        <span
          aria-hidden="true"
          style={{
            alignSelf: "stretch",
            margin: `${Math.round(5 * scale)}px 0`,
            borderLeft: `1.2px dashed ${paper.line}`,
            flexShrink: 0,
          }}
        />
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: onDock ? "flex-start" : "flex-end",
          gap: onDock ? Math.round(4 * scale) : 5,
          width: onDock ? undefined : 112,
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {printedWhat ?? trailingWhat}
      </div>
    </div>
  );
}
