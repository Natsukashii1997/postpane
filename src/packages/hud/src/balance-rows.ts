import type { BillingAccount, PanelBlockLayout } from "@agent-hud/protocol";
import { listPrice, moneyAmount } from "@agent-hud/ui/format";
import type { Language } from "@agent-hud/ui/format";

/** A balance ID includes the account and currency, unlike accountId. */
export function visibleBalances(
  rows: readonly BillingAccount[],
  layout: PanelBlockLayout = {},
): BillingAccount[] {
  const order = layout.rows ?? [];
  const position = (id: string) => {
    const index = order.indexOf(id);
    return index < 0 ? Infinity : index;
  };
  return rows
    .filter(
      (row) =>
        !(layout.hiddenRows ?? []).includes(row.id) &&
        !(layout.hiddenAccounts ?? []).includes(row.accountId ?? row.id) &&
        (!layout.accounts?.length ||
          layout.accounts.includes(row.accountId ?? row.id)),
    )
    .sort((a, b) => position(a.id) - position(b.id));
}

/** What DeepSeek's stub prints for its shown balances: each rounded half up
 * to whole units ("¥811" for 810.77), or null with none (owner 2026-11-11). */
export function stubBalance(
  rows: readonly BillingAccount[],
  language: Language,
): string | null {
  return rows.length
    ? rows
        .map((b) =>
          listPrice(Math.round(Number(b.amount)), b.currency, language),
        )
        .join(" · ")
    : null;
}

/** An agent's shown balances, exactly, as its peek and panel print them;
 * null with none. */
export function balanceText(
  rows: readonly BillingAccount[],
  language: Language,
): string | null {
  return rows.length
    ? rows.map((b) => moneyAmount(b.amount, b.currency, language)).join(" · ")
    : null;
}

/** The level of an agent billed by balance alone: its worst balance's. */
export function balanceLevel(
  rows: readonly BillingAccount[],
): "normal" | "warning" | "critical" | "stale" | undefined {
  if (!rows.length) return undefined;
  if (rows.some((row) => row.level === "critical")) return "critical";
  if (rows.some((row) => row.level === "warning")) return "warning";
  if (rows.some((row) => row.level === "normal")) return "normal";
  return "stale";
}
