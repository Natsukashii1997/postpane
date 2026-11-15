// An agent's API balances on the board, moved out of QuotaSection.tsx for
// the 300-line ratchet (#380): what is left, what it burns, a bar per day.
import { useEffect, useState } from "react";
import type { PanelBlockLayout, Snapshot } from "@agent-hud/protocol";
import { useFormat } from "@agent-hud/ui/format-context";
import { dateFormat, localeDateTime, moneyAmount } from "@agent-hud/ui/format";
import { usePanelServices } from "../PanelContext";
import { agentVendorName } from "../agent-artwork";
import { visibleBalances } from "../balance-rows";
import { PAPER_FIGURES, usePaper } from "../paper";
import { BalanceMetricToggle } from "./BalanceMetrics";
import {
  GRID,
  noButtonChrome,
  tabular,
  usePanelPalette,
  type Logo,
} from "./theme";

export function SourceBalances({
  billing,
  light,
  Logo,
  layout = {},
  onStats,
  headed = false,
}: {
  billing: Snapshot["billing"];
  light: boolean;
  Logo: Logo;
  layout?: PanelBlockLayout;
  onStats?: () => void;
  /** The card's head above names the agent: the row keeps its switches. */
  headed?: boolean;
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
            <div
              style={{ display: "flex", alignItems: "center", gap: GRID.gap }}
            >
              {!headed && (
                <span
                  style={{
                    width: GRID.mark,
                    display: "inline-flex",
                    justifyContent: "center",
                  }}
                >
                  <Logo source={account.vendor} size={14} light={light} />
                </span>
              )}
              <strong style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>
                {!headed && agentVendorName(account.vendor)}
              </strong>
              {!layout.measures?.length && (
                <BalanceMetricToggle
                  selected={measure}
                  onSelect={setMeasure}
                  light={light}
                />
              )}
            </div>
            {account.notice && (
              <div
                style={{
                  fontSize: 11,
                  paddingLeft: headed ? 0 : GRID.text,
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
                  paddingLeft: headed ? 0 : GRID.text,
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
                  paddingLeft: headed ? 0 : GRID.text,
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
