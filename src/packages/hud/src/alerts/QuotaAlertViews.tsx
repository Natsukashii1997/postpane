import { ArrowUpRight, X } from "lucide-react";
import type { IslandEvent, Snapshot } from "@agent-hud/protocol";
import { agentVendorName } from "../model";
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
import { MiddleTruncated } from "../panel/MiddleTruncated";
import { useFormat } from "@agent-hud/ui/format-context";
import { quotaAlertCopy, resetCreditCopy } from "./quota-alert-copy";

/** A card's three figures, each over its label (23 pt medium figures, 10 pt labels). */
function Metric({
  value,
  label,
  light,
}: {
  value: string;
  label: string;
  light: boolean;
}) {
  const colors = useAlertPalette(light);
  const ink = colors.ink;
  return (
    <div style={{ ...cardColumn(4), minWidth: 0 }}>
      <span
        style={{
          fontSize: 23,
          fontWeight: 500,
          fontVariantNumeric: "tabular-nums",
          color: ink(0.96),
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value}
      </span>
      <span style={{ fontSize: 10, color: ink(0.4) }}>{label}</span>
    </div>
  );
}

/** The card's heading: the mark, the agent with a line under it, and the news in the accent. */
function Heading({
  event,
  name,
  under,
  news,
  accentFill,
  accentText,
  light,
  botLogos,
}: {
  event: IslandEvent;
  name: string;
  under: string | null;
  news: string;
  accentFill: string;
  accentText: string;
  light: boolean;
  botLogos: boolean;
}) {
  const colors = useAlertPalette(light);
  const ink = colors.ink;
  return (
    <header style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <ReminderMark event={event} size={22} light={light} botLogos={botLogos} />
      <div style={{ ...cardColumn(3), minWidth: 0 }}>
        <strong style={{ fontSize: 13, fontWeight: 600, color: ink(0.94) }}>
          {name}
        </strong>
        {under && (
          <MiddleTruncated
            text={under}
            style={{ fontSize: 10, color: ink(0.42) }}
          />
        )}
      </div>
      <span style={{ flex: 1, minWidth: 8 }} />
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: accentFill,
          flex: "0 0 5px",
        }}
      />
      <span
        style={{
          fontSize: 10,
          fontWeight: 500,
          color: accentText,
          whiteSpace: "nowrap",
        }}
      >
        {news}
      </span>
    </header>
  );
}

/** "View usage statistics", filled with the accent (Open's card button). */
function StatsButton({
  fill,
  light,
  zh,
  onClick,
}: {
  fill: string;
  light: boolean;
  zh: boolean;
  onClick: () => void;
}) {
  const colors = useAlertPalette(light);
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 30,
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        borderRadius: colors.paper ? 2 : 7,
        border: 0,
        background: fill,
        color: colors.onFill,
        opacity: 0.9,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      <span>{zh ? "查看用量统计" : "View usage statistics"}</span>
      <ArrowUpRight size={9} strokeWidth={2.6} />
    </button>
  );
}

/** Usage resets added to an account (Open's ResetCreditAlertDetailView): the
 * client and the account, what was added, how many the account holds and its
 * first expiry as a date. */
export function ResetCreditAlertView({
  event,
  snapshot,
  dismiss,
  onStats,
  light = false,
  botLogos = true,
  zh = false,
}: {
  event: IslandEvent;
  snapshot?: Snapshot;
  dismiss: () => void;
  onStats?: () => void;
  light?: boolean;
  botLogos?: boolean;
  zh?: boolean;
}) {
  const colors = useAlertPalette(light);
  const ink = colors.ink;
  const account = snapshot?.accounts?.find(
    (candidate) => candidate.id === event.accountId,
  );
  const added = event.added ?? 1;
  const available =
    account?.resetCredits?.availableCount ?? event.availableCount ?? added;
  // Every reset the account holds, as the usage panel lists them; else the new ones.
  const expiries =
    account?.resetCredits?.credits?.map((credit) => credit.expiresAt) ??
    (Array.isArray(event.newCredits)
      ? event.newCredits.map((credit) => credit?.expiresAt)
      : []);
  const copy = resetCreditCopy(added, expiries, zh ? "zh" : "en");
  return (
    <article style={{ ...cardColumn(20), fontSize: 12, color: "inherit" }}>
      <Heading
        event={event}
        name={agentVendorName(event.source)}
        under={account?.name ?? event.title ?? null}
        news={zh ? "新增重置" : "new reset"}
        accentFill={colors.fill("calm")}
        accentText={colors.text("calm")}
        light={light}
        botLogos={botLogos}
      />
      <div style={{ fontSize: 12, color: ink(0.58) }}>{copy.title}</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        <Metric
          value={`+${added}`}
          label={zh ? "新增" : "added"}
          light={light}
        />
        <Metric
          value={`${available}`}
          label={zh ? "可用次数" : "available"}
          light={light}
        />
        <Metric
          value={copy.expiry}
          label={zh ? "最早到期" : "first expires"}
          light={light}
        />
      </div>
      <StatsButton
        fill={colors.fill("calm")}
        light={light}
        zh={zh}
        onClick={() => {
          dismiss();
          onStats?.();
        }}
      />
    </article>
  );
}

/** An agent that signed out: its name, what its account reading says (how
 * to sign in again), and that its last quota stays on screen until then.
 * Told on the island only, at most once a day. */
export function SignInAlertView({
  event,
  dismiss,
  light = false,
  botLogos = true,
  zh = false,
}: {
  event: IslandEvent;
  dismiss: () => void;
  light?: boolean;
  botLogos?: boolean;
  zh?: boolean;
}) {
  const colors = useAlertPalette(light);
  const ink = colors.ink;
  const name = event.title ?? agentVendorName(event.source);
  return (
    <article style={{ ...cardColumn(14), fontSize: 12, color: "inherit" }}>
      <Heading
        event={event}
        name={name}
        under={null}
        news={zh ? "需要重新登录" : "sign in again"}
        accentFill={colors.fill("warning")}
        accentText={colors.text("warning")}
        light={light}
        botLogos={botLogos}
      />
      {event.message && (
        <div style={{ fontSize: 12, lineHeight: 1.45, color: ink(0.78) }}>
          {event.message}
        </div>
      )}
      <div style={{ fontSize: 10, color: ink(0.42) }}>
        {zh
          ? "重新登录前，额度显示上次读到的数字。"
          : "Until then, its quota shows the last reading."}
      </div>
      <button
        type="button"
        onClick={dismiss}
        style={{
          height: 30,
          width: "100%",
          borderRadius: colors.paper ? 2 : 7,
          border: 0,
          background: colors.fill("warning"),
          color: colors.onFill,
          opacity: 0.9,
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {zh ? "知道了" : "OK"}
      </button>
    </article>
  );
}

/** One quota notice as a strip: the agent's mark, the agent with the window
 * and what happened, the share in the strip's colour and a close, then a thin
 * bar (none after a reset) and a line of times. Opening it shows the usage
 * statistics and puts it away; the close only puts it away. */
function QuotaStrip({
  event,
  first,
  drop,
  onStats,
  light,
  botLogos,
  zh,
}: {
  event: IslandEvent;
  first: boolean;
  drop: (ids: readonly string[]) => void;
  onStats?: () => void;
  light: boolean;
  botLogos: boolean;
  zh: boolean;
}) {
  const colors = useAlertPalette(light);
  const ink = colors.ink;
  const ground = useGround(light);
  const track = usePanelPalette(light).track;
  const settings = useFormat();
  const copy = quotaAlertCopy(event, {
    ...settings,
    language: zh ? "zh" : "en",
  });
  const accent = quotaAccent(copy.tone, ground, colors.paper);
  const red = quotaAccent("critical", ground, colors.paper);
  const line = colors.paper ? colors.paper.line : ink(0.16);
  const bar = copy.tone !== "reset" && copy.displayPct != null;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        drop([event.id]);
        onStats?.();
      }}
      style={{
        display: "grid",
        gridTemplateColumns: "18px minmax(0, 1fr) auto 16px",
        columnGap: 10,
        alignItems: "center",
        padding: first ? "0 0 10px" : "10px 0",
        borderTop: first ? undefined : `1px dotted ${line}`,
        cursor: "pointer",
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
      <button
        type="button"
        aria-label={zh ? "关闭" : "Dismiss"}
        onClick={(click) => {
          click.stopPropagation();
          drop([event.id]);
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
      {bar && (
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
              width: `${copy.displayPct ?? 0}%`,
              height: "100%",
              borderRadius: 3,
              background: accent,
              ...(colors.paper && receiptMeterFill(accent)),
            }}
          />
        </div>
      )}
      {(copy.when || copy.stillEmpty) && (
        <div
          style={{
            gridColumn: "2 / 4",
            marginTop: bar ? 6 : 4,
            fontSize: 12,
            color: ink(0.5),
            fontVariantNumeric: "tabular-nums",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {copy.when}
          {copy.when && copy.stillEmpty && " · "}
          {copy.stillEmpty && (
            <span style={{ color: red }}>{copy.stillEmpty}</span>
          )}
        </div>
      )}
    </div>
  );
}

/** The quota news waiting (Open's QuotaAlertDetailView, drawn as strips):
 * one strip per notice, newest first, dotted rules between them. */
export function QuotaAlertView({
  events,
  drop,
  onStats,
  light = false,
  botLogos = true,
  zh = false,
}: {
  /** Newest first. */
  events: IslandEvent[];
  drop: (ids: readonly string[]) => void;
  onStats?: () => void;
  light?: boolean;
  botLogos?: boolean;
  zh?: boolean;
}) {
  return (
    <article style={{ ...cardColumn(0), fontSize: 12, color: "inherit" }}>
      {events.map((event, index) => (
        <QuotaStrip
          key={event.id}
          event={event}
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
