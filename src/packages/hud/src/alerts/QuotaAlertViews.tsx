import { X } from "lucide-react";
import type { IslandEvent, Snapshot } from "@agent-hud/protocol";
import type { FormatSettings } from "@agent-hud/ui/format";
import { vendorKey } from "../model";
import { clientDisplayName } from "../IslandNews";
import { ReminderMark } from "./ReminderMark";
import { useAlertPalette } from "./alert-palette";
import { quotaAccent } from "./alert-tones";
import { useGround } from "../ground";
import { cardColumn } from "../card-column";
import {
  receiptMeterBox,
  receiptMeterFill,
  usePanelPalette,
} from "../panel/theme";
import { useFormat } from "@agent-hud/ui/format-context";
import {
  quotaAlertCopy,
  resetCreditCopy,
  signInCopy,
  type QuotaTone,
} from "./quota-alert-copy";

/** What one quota strip says, whatever the news: the sentence after the
 * agent, the figure (or a framed tag) on the right in the strip's colour,
 * the bar's share, the lines under it, and whether opening it shows the
 * usage statistics. */
export interface StripCopy {
  status: string;
  display: string;
  tone: QuotaTone;
  /** The figure is a framed tag (a sign-out's). */
  framed: boolean;
  /** The bar's share; null draws none. */
  bar: number | null;
  when: string | null;
  /** After a reset, the windows still used up, in red after `when`. */
  stillEmpty: string | null;
  /** A fainter line under `when`. */
  note: string | null;
  /** Opening the strip shows the usage statistics; a sign-out's does nothing. */
  opens: boolean;
}

/** The strip's words for any quota news: a window running low, used up or
 * reset (quotaAlertCopy), resets added to an account (resetCreditCopy, with
 * the account the snapshot holds), or an agent signed out (signInCopy, timed
 * by its windows' latest reading). */
export function stripCopy(
  event: IslandEvent,
  snapshot: Snapshot | undefined,
  settings: FormatSettings,
): StripCopy {
  if (event.kind === "reset-credits") {
    const copy = resetCreditCopy(
      event,
      snapshot?.accounts?.find((account) => account.id === event.accountId),
      settings,
    );
    return {
      status: copy.status,
      display: copy.display,
      tone: "reset",
      framed: false,
      bar: null,
      when: copy.when,
      stillEmpty: null,
      note: null,
      opens: true,
    };
  }
  if (event.kind === "bot-offline") {
    const zh = settings.language === "zh";
    return {
      status: `${event.title ?? "Hermes"} · ${event.message ?? (zh ? "断线" : "Offline")}`,
      display: zh ? "断线" : "Offline",
      tone: "critical",
      framed: true,
      bar: null,
      when: zh
        ? "机器人暂时收不到飞书消息"
        : "The bot cannot get Feishu messages",
      stillEmpty: null,
      note: null,
      opens: false,
    };
  }
  if (event.kind === "sign-in-needed") {
    const agent = vendorKey(event.source);
    const copy = signInCopy(
      event,
      (snapshot?.quotas ?? [])
        .filter((quota) => vendorKey(quota.vendor) === agent)
        .map((quota) => quota.observedAt),
      settings,
    );
    return {
      status: copy.status,
      display: copy.tag,
      tone: "critical",
      framed: true,
      bar: null,
      when: copy.message,
      stillEmpty: null,
      note: copy.note,
      opens: false,
    };
  }
  const copy = quotaAlertCopy(event, settings);
  return {
    status: copy.status,
    display: copy.display,
    tone: copy.tone,
    framed: false,
    bar: copy.tone !== "reset" ? copy.displayPct : null,
    when: copy.when,
    stillEmpty: copy.stillEmpty,
    note: null,
    opens: true,
  };
}

/** The strip's words in the interface's settings. */
export function useStripCopy(
  event: IslandEvent,
  snapshot: Snapshot | undefined,
  zh: boolean,
): StripCopy {
  const settings = useFormat();
  return stripCopy(event, snapshot, {
    ...settings,
    language: zh ? "zh" : "en",
  });
}

/** One quota notice as a strip: the agent's mark, the agent with what
 * happened, the figure (or a framed tag) in the strip's colour and a close,
 * then a thin bar (none after a reset, for resets added or a sign-out) and a
 * line or two of times. `onOpen` makes the whole strip a button; without
 * `onClose` there is no close (the usage panel's own row). */
export function AlertStrip({
  event,
  copy,
  first,
  onOpen,
  onClose,
  bar = true,
  light,
  botLogos,
  zh,
}: {
  event: IslandEvent;
  copy: StripCopy;
  first: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  /** Draws the bar where the news has one. */
  bar?: boolean;
  light: boolean;
  botLogos: boolean;
  zh: boolean;
}) {
  const colors = useAlertPalette(light);
  const ink = colors.ink;
  const ground = useGround(light);
  const track = usePanelPalette(light).track;
  const accent = quotaAccent(copy.tone, ground, colors.paper);
  const red = quotaAccent("critical", ground, colors.paper);
  const line = colors.paper ? colors.paper.line : ink(0.16);
  const meter = bar && copy.bar != null;
  const sub = {
    gridColumn: "2 / 4",
    fontSize: 12,
    fontVariantNumeric: "tabular-nums",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } as const;
  return (
    <div
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      style={{
        display: "grid",
        gridTemplateColumns: onClose
          ? "18px minmax(0, 1fr) auto 16px"
          : "18px minmax(0, 1fr) auto",
        columnGap: 10,
        alignItems: "center",
        padding: first ? "0 0 10px" : "10px 0",
        borderTop: first ? undefined : `1px dotted ${line}`,
        cursor: onOpen ? "pointer" : "default",
        textAlign: "left",
      }}
    >
      <ReminderMark event={event} size={18} light={light} botLogos={botLogos} />
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: ink(0.94),
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          minWidth: 0,
        }}
      >
        {clientDisplayName(event.source)}
        <span style={{ fontWeight: 400, color: ink(0.72) }}>
          {` · ${copy.status}`}
        </span>
      </span>
      {copy.framed ? (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            height: 18,
            padding: "0 6px",
            boxSizing: "border-box",
            border: `1.5px solid ${accent}`,
            borderRadius: 2,
            fontSize: 11,
            fontWeight: 700,
            lineHeight: 1,
            color: accent,
            whiteSpace: "nowrap",
          }}
        >
          {copy.display}
        </span>
      ) : (
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
            color: accent,
            whiteSpace: "nowrap",
          }}
        >
          {copy.display}
        </span>
      )}
      {onClose && (
        <button
          type="button"
          aria-label={zh ? "关闭" : "Dismiss"}
          onClick={(click) => {
            click.stopPropagation();
            onClose();
          }}
          style={{
            width: 16,
            height: 16,
            padding: 0,
            display: "grid",
            placeItems: "center",
            border: 0,
            background: "transparent",
            color: ink(0.45),
            cursor: "pointer",
          }}
        >
          <X size={12} strokeWidth={2.2} />
        </button>
      )}
      {meter && (
        <div
          style={{
            gridColumn: "2 / 4",
            marginTop: 8,
            height: 6,
            borderRadius: 3,
            background: track,
            overflow: "hidden",
            ...(colors.paper && receiptMeterBox(colors.paper)),
          }}
        >
          <div
            style={{
              width: `${copy.bar ?? 0}%`,
              height: "100%",
              borderRadius: 3,
              background: accent,
              ...(colors.paper && receiptMeterFill(accent)),
            }}
          />
        </div>
      )}
      {(copy.when || copy.stillEmpty) && (
        <div style={{ ...sub, marginTop: meter ? 6 : 4, color: ink(0.5) }}>
          {copy.when}
          {copy.when && copy.stillEmpty && " · "}
          {copy.stillEmpty && (
            <span style={{ color: red }}>{copy.stillEmpty}</span>
          )}
        </div>
      )}
      {copy.note && (
        <div
          style={{
            ...sub,
            marginTop: copy.when || copy.stillEmpty ? 2 : 4,
            color: ink(0.36),
          }}
        >
          {copy.note}
        </div>
      )}
    </div>
  );
}

/** One notice of the card's list: opening it shows the usage statistics and
 * puts it away (a sign-out's does nothing); the close only puts it away. */
function QueuedStrip({
  event,
  snapshot,
  first,
  drop,
  onStats,
  light,
  botLogos,
  zh,
}: {
  event: IslandEvent;
  snapshot?: Snapshot;
  first: boolean;
  drop: (ids: readonly string[]) => void;
  onStats?: () => void;
  light: boolean;
  botLogos: boolean;
  zh: boolean;
}) {
  const copy = useStripCopy(event, snapshot, zh);
  return (
    <AlertStrip
      event={event}
      copy={copy}
      first={first}
      onOpen={
        copy.opens
          ? () => {
              drop([event.id]);
              onStats?.();
            }
          : undefined
      }
      onClose={() => drop([event.id])}
      light={light}
      botLogos={botLogos}
      zh={zh}
    />
  );
}

/** The quota news waiting (Open's QuotaAlertDetailView, drawn as strips):
 * windows running low, used up or reset, resets added and sign-outs, one
 * strip per notice, newest first, dotted rules between them. */
export function QuotaAlertView({
  events,
  snapshot,
  drop,
  onStats,
  light = false,
  botLogos = true,
  zh = false,
}: {
  /** Newest first. */
  events: IslandEvent[];
  /** For resets added (the account) and a sign-out (the last reading). */
  snapshot?: Snapshot;
  drop: (ids: readonly string[]) => void;
  onStats?: () => void;
  light?: boolean;
  botLogos?: boolean;
  zh?: boolean;
}) {
  return (
    <article style={{ ...cardColumn(0), fontSize: 12, color: "inherit" }}>
      {events.map((event, index) => (
        <QueuedStrip
          key={event.id}
          event={event}
          snapshot={snapshot}
          first={index === 0}
          drop={drop}
          onStats={onStats}
          light={light}
          botLogos={botLogos}
          zh={zh}
        />
      ))}
    </article>
  );
}
