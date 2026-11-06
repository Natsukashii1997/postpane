import { memo, useEffect, useMemo, useState } from "react";
import { DollarSign, Flame, Percent } from "lucide-react";
import type { PanelBlockLayout, Quota, Snapshot } from "@agent-hud/protocol";
import { quotaMetric } from "../quota-metrics";
import { useFormat } from "@agent-hud/ui/format-context";
import { dateFormat, localeDateTime, moneyAmount } from "@agent-hud/ui/format";
import { quotaAccountKey, quotaShortName, vendorKey } from "../model";
import { FittingName } from "./FittingName";
import { AccountHeader, BlockNotice } from "./AccountHeader";
import { missingReadingNotice, serviceNotice } from "./account-labels";
import { ResetCreditsRow } from "./ResetCreditsRow";
import { usePanelServices } from "../PanelContext";
import { agentVendorName } from "../agent-artwork";
import { visibleBalances } from "../balance-rows";
import {
  noButtonChrome,
  usePanelPalette,
  tabular,
  type Logo,
  type Measure,
} from "./theme";
import { PAPER_FIGURES, usePaper } from "../paper";
import { SourceTokenChart } from "./TokenChartSection";
import { QuotaRingCard } from "./QuotaRingCard";
import {
  BoardHeading,
  BoardKey,
  BoardRows,
  BoardSentence,
  useBoardVerdict,
} from "./AgentBoard";
import { showsAccountNames } from "./agent-board";

/** QuotaCell.swift: centered equal-width ring/number lines, fixed 40/46/60 pt rings. */
export function QuotaWidgets({
  rows,
  layout,
  measure,
  now,
  light,
  showReset,
  onStats,
}: {
  rows: Quota[];
  layout: PanelBlockLayout;
  measure: Measure;
  now: number;
  light: boolean;
  showReset: boolean;
  onStats?: () => void;
}) {
  const colors = usePanelPalette(light),
    services = usePanelServices(),
    format = useFormat(),
    clickable = Boolean(services?.selectProvider || onStats),
    // A layout saved before rings and segments says "ring": concentric rings.
    widget = layout.widget === "ring" ? "rings" : (layout.widget ?? "bar");
  if (widget === "rings" || widget === "segments")
    return (
      <QuotaRingCard
        style={widget}
        ringSize={layout.ringSize}
        {...{ rows, measure, now, light, showReset, onStats }}
      />
    );
  if (widget === "bar")
    return (
      <BoardRows
        rows={rows}
        now={now}
        light={light}
        countdown={showReset}
        onStats={onStats}
      />
    );
  const columns = layout.columns ?? 4;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 8,
        padding: "4px 6px",
      }}
    >
      {rows.map((row) => {
        const metric = quotaMetric(row, measure, now, format);
        const figure =
          row.status === "stale"
            ? colors.secondary
            : row.status === "critical"
              ? colors.criticalText
              : row.status === "warning"
                ? colors.warningText
                : colors.okText;
        return (
          <div
            key={row.id}
            title={metric.hint}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            onClick={
              clickable
                ? () => {
                    services?.selectProvider?.(row.vendor);
                    onStats?.();
                  }
                : undefined
            }
            style={{
              flex: `0 0 calc((100% - ${(Math.min(columns, rows.length) - 1) * 8}px) / ${Math.min(columns, rows.length)})`,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 5,
              fontSize: 12,
              cursor: clickable ? "pointer" : undefined,
              borderRadius: 6,
            }}
          >
            <FittingName
              name={row.name}
              short={quotaShortName(row)}
              wrap
              style={{
                alignSelf: "stretch",
                fontSize: 11,
                color: colors.secondary,
                textAlign: "center",
              }}
            />
            <strong style={{ color: figure, fontSize: 15 }}>
              {metric.value}
            </strong>
            <span
              style={{
                fontSize: 11,
                color: colors.secondary,
                textAlign: "center",
                minHeight: 13,
              }}
            >
              {showReset || measure !== "quota" ? metric.detail : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export const SourceProviderBlock = memo(function SourceProviderBlock({
  vendor,
  rows,
  now,
  light,
  Logo,
  showReset,
  accountInfo,
  layout = {},
  snapshot,
  active = true,
  onStats,
}: {
  vendor: string;
  rows: Quota[];
  now: number;
  light: boolean;
  Logo: Logo;
  showReset: boolean;
  accountInfo: Snapshot["accounts"];
  layout?: PanelBlockLayout;
  snapshot: Snapshot;
  active?: boolean;
  onStats?: () => void;
}) {
  // The board reads the quota itself (owner, 2026-11-05: the five measure
  // switches are gone); a layout that names measures shows its first one in
  // rings, segments or numbers.
  const measure: Measure = layout.measures?.[0] ?? "quota";
  const format = useFormat();
  // Open's ReportView.accountSections: the rows split by account in row
  // order. Only a section whose rows name an account the readers reported
  // gets a header; rows of no account stand without one.
  const sections = useMemo(() => {
    const order: string[] = [];
    const byKey = new Map<string, Quota[]>();
    for (const row of rows) {
      const key = quotaAccountKey(row);
      if (!byKey.has(key)) {
        order.push(key);
        byKey.set(key, []);
      }
      byKey.get(key)!.push(row);
    }
    return order.map((key) => {
      const sectionRows = byKey.get(key)!;
      const id = sectionRows[0].accountId;
      const account = id
        ? (accountInfo?.find((profile) => profile.id === id) ?? null)
        : null;
      return {
        key,
        rows: sectionRows,
        account,
        current: account?.current !== false,
      };
    });
  }, [rows, accountInfo]);
  // One account needs no name: its plan goes in the head (owner, 2026-11-05).
  const named = showsAccountNames(sections);
  const only = named
    ? null
    : (sections.find((s) => s.account)?.account ?? null);
  const missingReading = !snapshot.quotas.some((row) => row.vendor === vendor);
  // Without readings the block still says why, as a signed-out Claude Code
  // asks to be signed in again.
  const missingNotice = missingReading
    ? missingReadingNotice(snapshot.providers, vendor)
    : null;
  const vendorStatus = serviceNotice(
    snapshot.providers,
    vendor,
    format.language,
  );
  const countdown = layout.countdown ?? showReset;
  const { stamp } = useBoardVerdict(rows, now);
  return (
    <section
      className="hud-source-provider"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--hud-block-gap, 8px)",
      }}
    >
      <BoardHeading
        vendor={vendor}
        Logo={Logo}
        light={light}
        plan={only?.planLabel}
        stamp={missingReading ? (missingNotice ? "unknown" : null) : stamp}
      />
      {vendorStatus && (
        <BlockNotice text={vendorStatus} light={light} warning />
      )}
      {only?.warning && (
        <BlockNotice text={only.warning} light={light} warning />
      )}
      {only?.notice && only.notice !== only.warning && (
        <BlockNotice text={only.notice} light={light} />
      )}
      {layout.widget === "chart" ? (
        <SourceTokenChart
          snapshot={snapshot}
          focusVendor={vendor}
          light={light}
          Logo={Logo}
          layout={{ period: layout.period }}
          active={active}
        />
      ) : missingReading ? (
        missingNotice && <BlockNotice text={missingNotice} light={light} />
      ) : (
        <>
          <BoardSentence rows={rows} now={now} light={light} />
          {sections.map(({ key, rows: sectionRows, account, current }) => {
            // Earned resets belong to the signed-in Codex account.
            const resets =
              account &&
              current &&
              sectionRows.some((row) => vendorKey(row.vendor) === "codex")
                ? account.resetCredits
                : null;
            return (
              <div
                key={key}
                className="hud-source-account-section"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--hud-block-gap, 8px)",
                }}
              >
                {account && named && (
                  <AccountHeader account={account} now={now} light={light} />
                )}
                <div
                  style={{
                    display: "grid",
                    gap: "var(--hud-block-gap, 8px)",
                    opacity: current ? 1 : 0.55,
                  }}
                >
                  <QuotaWidgets
                    rows={sectionRows}
                    layout={layout}
                    measure={measure}
                    now={now}
                    light={light}
                    showReset={countdown}
                    onStats={onStats}
                  />
                </div>
                {resets && (
                  <ResetCreditsRow
                    resets={resets}
                    showExpiry={countdown}
                    light={light}
                  />
                )}
              </div>
            );
          })}
          {(layout.widget ?? "bar") === "bar" && (
            <BoardKey rows={rows} light={light} />
          )}
        </>
      )}
    </section>
  );
});

export function SourceBalances({
  billing,
  light,
  Logo,
  layout = {},
  onStats,
}: {
  billing: Snapshot["billing"];
  light: boolean;
  Logo: Logo;
  layout?: PanelBlockLayout;
  onStats?: () => void;
}) {
  const colors = usePanelPalette(light);
  const paper = usePaper();
  const services = usePanelServices();
  const clickable = Boolean(services?.selectProvider || onStats);
  const [period, setPeriod] = useState<"day" | "week" | "month">(
    layout.period ?? "day",
  );
  const [measure, setMeasure] = useState<"quota" | "burn" | "cost">("quota");
  useEffect(() => setPeriod(layout.period ?? "day"), [layout.period]);
  const { language } = useFormat();
  const money = (amount: number, currency: string) =>
    moneyAmount(amount, currency, language);
  return (
    <>
      {visibleBalances(billing, layout).map((account) => {
        const metrics = account.metrics?.periods[period],
          cost = metrics?.cost,
          burn = metrics?.burnRate;
        const selected =
          layout.measures?.find((value) =>
            ["quota", "burn", "cost"].includes(value),
          ) ?? measure;
        const points = metrics?.series ?? [],
          peak = Math.max(0.00001, ...points.map((point) => point.amount));
        const columns =
          selected === "burn"
            ? [
                {
                  name: language === "zh" ? "每日消耗" : "Consumption / day",
                  value: burn ? `${money(burn.perDay, burn.currency)}/d` : "—",
                },
                {
                  name: language === "zh" ? "预计用完" : "Estimated depletion",
                  value: metrics?.runsOutAt
                    ? dateFormat(language === "zh" ? "zh-CN" : "en-US").format(
                        new Date(metrics.runsOutAt),
                      )
                    : "—",
                },
              ]
            : selected === "cost"
              ? [
                  {
                    name: language === "zh" ? "估算花费" : "Estimated cost",
                    value: cost ? money(cost.amount, cost.currency) : "—",
                  },
                  {
                    name: language === "zh" ? "输出速度" : "Output speed",
                    value: metrics?.replyRate
                      ? `${metrics.replyRate.lowerBound ? "≥" : ""}${metrics.replyRate.tokensPerSecond.toFixed(1)} tok/s`
                      : "—",
                  },
                ]
              : [
                  {
                    name:
                      account.label || (language === "zh" ? "余额" : "Balance"),
                    value: money(account.amount, account.currency),
                  },
                  {
                    name: language === "zh" ? "估算花费" : "Estimated cost",
                    value: cost ? money(cost.amount, cost.currency) : "—",
                  },
                ];
        return (
          <section
            className="hud-source-balance"
            key={account.id}
            style={{ display: "grid", gap: 8 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 20,
                  display: "inline-flex",
                  justifyContent: "center",
                }}
              >
                <Logo source={account.vendor} size={14} light={light} />
              </span>
              <strong style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>
                {agentVendorName(account.vendor)}
              </strong>
              {!layout.measures?.length && (
                <div
                  role="group"
                  aria-label={language === "zh" ? "余额指标" : "Balance metric"}
                  style={{ display: "flex", gap: 2 }}
                >
                  {(
                    [
                      {
                        key: "quota",
                        Icon: Percent,
                        title: language === "zh" ? "余额" : "Balance",
                      },
                      {
                        key: "burn",
                        Icon: Flame,
                        title:
                          language === "zh"
                            ? "每日消耗"
                            : "Consumption per day",
                      },
                      {
                        key: "cost",
                        Icon: DollarSign,
                        title:
                          language === "zh" ? "估算花费" : "Estimated cost",
                      },
                    ] as const
                  ).map(({ key, Icon, title }) => (
                    <button
                      key={key}
                      aria-pressed={selected === key}
                      title={title}
                      onClick={() => setMeasure(key)}
                      style={{
                        ...noButtonChrome,
                        color: selected === key ? colors.text : colors.tertiary,
                        background:
                          selected === key ? colors.selected : "transparent",
                        borderRadius: 4,
                        padding: 3,
                      }}
                    >
                      <Icon size={12} />
                    </button>
                  ))}
                </div>
              )}
            </div>
            {account.notice && (
              <div
                style={{
                  fontSize: 11,
                  paddingLeft: 26,
                  color: colors.warning,
                }}
              >
                {account.notice}
              </div>
            )}
            <div
              role="group"
              aria-label={language === "zh" ? "消耗时段" : "Consumption period"}
              style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}
            >
              {(["day", "week", "month"] as const).map((value) => (
                <button
                  key={value}
                  aria-pressed={period === value}
                  onClick={() => setPeriod(value)}
                  style={{
                    ...noButtonChrome,
                    fontSize: 10,
                    padding: "2px 5px",
                    borderRadius: 4,
                    color: period === value ? colors.text : colors.tertiary,
                    background:
                      period === value ? colors.selected : "transparent",
                  }}
                >
                  {{ day: "24h", week: "7d", month: "30d" }[value]}
                </button>
              ))}
            </div>
            {layout.widget === "chart" ? (
              <div
                aria-label={
                  language === "zh"
                    ? "估算花费记录"
                    : "Estimated spending history"
                }
                title={metrics?.coverage.notice ?? undefined}
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 2,
                  height: 42,
                  paddingLeft: 26,
                }}
              >
                {points.length ? (
                  points.map((point, index) => (
                    <div
                      key={point.timestamp + index}
                      title={`${dateFormat(undefined, localeDateTime).format(new Date(point.timestamp))} · ${money(point.amount, point.currency)}`}
                      style={{
                        flex: 1,
                        minWidth: 1,
                        height: `${Math.max(2, (point.amount / peak) * 100)}%`,
                        background: colors.secondary,
                        borderRadius: "2px 2px 0 0",
                      }}
                    />
                  ))
                ) : (
                  <span style={{ fontSize: 11, color: colors.secondary }}>
                    —
                  </span>
                )}
              </div>
            ) : (
              <div
                role={clickable ? "button" : undefined}
                tabIndex={clickable ? 0 : undefined}
                onClick={
                  clickable
                    ? () => {
                        services?.selectProvider?.(account.vendor);
                        onStats?.();
                      }
                    : undefined
                }
                style={{
                  display: "flex",
                  gap: 24,
                  paddingLeft: 26,
                  paddingRight: 6,
                  cursor: clickable ? "pointer" : undefined,
                }}
              >
                {columns.map((column) => (
                  <div
                    key={column.name}
                    title={metrics?.coverage.notice ?? undefined}
                    style={{ flex: 1, display: "grid", gap: 3 }}
                  >
                    <span style={{ fontSize: 11, color: colors.secondary }}>
                      {column.name}
                    </span>
                    <span
                      style={{
                        ...tabular,
                        fontSize: 15,
                        fontWeight: 600,
                        color: colors.text,
                        ...(paper && {
                          fontFamily: PAPER_FIGURES,
                          fontSize: 20,
                          fontWeight: 700,
                        }),
                      }}
                    >
                      {column.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}
