// A balance block's three switches (balance, burn per day, estimated cost),
// moved out of QuotaSection.tsx for the 300-line ratchet.
import { DollarSign, Flame, Percent } from "lucide-react";
import { useFormat } from "@agent-hud/ui/format-context";
import { noButtonChrome, usePanelPalette } from "./theme";

export type BalanceMetric = "quota" | "burn" | "cost";

export function BalanceMetricToggle({
  selected,
  onSelect,
  light,
}: {
  selected: BalanceMetric;
  onSelect: (metric: BalanceMetric) => void;
  light: boolean;
}) {
  const colors = usePanelPalette(light);
  const zh = useFormat().language === "zh";
  const metrics = [
    { key: "quota", Icon: Percent, title: zh ? "余额" : "Balance" },
    {
      key: "burn",
      Icon: Flame,
      title: zh ? "每日消耗" : "Consumption per day",
    },
    {
      key: "cost",
      Icon: DollarSign,
      title: zh ? "估算花费" : "Estimated cost",
    },
  ] as const;
  return (
    <div
      role="group"
      aria-label={zh ? "余额指标" : "Balance metric"}
      style={{ display: "flex", gap: 2 }}
    >
      {metrics.map(({ key, Icon, title }) => (
        <button
          key={key}
          aria-pressed={selected === key}
          title={title}
          onClick={() => onSelect(key)}
          style={{
            ...noButtonChrome,
            color: selected === key ? colors.text : colors.tertiary,
            background: selected === key ? colors.selected : "transparent",
            borderRadius: 4,
            padding: 3,
          }}
        >
          <Icon size={12} />
        </button>
      ))}
    </div>
  );
}
