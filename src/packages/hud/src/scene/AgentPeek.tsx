import { labelWidth } from "../geometry";
import { useFormat } from "@agent-hud/ui/format-context";
import { quotaPercentLabel, type QuotaDisplay } from "@agent-hud/ui/format";
import { useMarkLevelText } from "../ground";
import { PAPER_FIGURES, paperLevel, usePaper, type Paper } from "../paper";
import { peekWindowName } from "../panel/window-labels";
import { statusColor, type HUDEdge, type HUDVendor } from "../model";
import { PEEK_TEAR, showsBots } from "./peek-size";
import { DeskLines } from "./DeskLines";
import { BotLines } from "./BotLines";
import { WorkLine } from "./WorkLine";

export interface PeekItem {
  id: string;
  label: string;
  value: string;
  color?: string;
}

/** What the Simple dock's one-line peek says: each window's share used, once
 * per short name, then the balance of an API-billed agent. */
export function peekItems(
  vendor: HUDVendor,
  zh: boolean,
  color: (level: HUDVendor["level"]) => string = statusColor,
  display?: QuotaDisplay,
): PeekItem[] {
  const seen = new Set<string>();
  const items: PeekItem[] = vendor.quotas
    .filter((q) => {
      const label = peekWindowName(q, zh ? "zh" : "en");
      if (seen.has(label)) return false;
      seen.add(label);
      return true;
    })
    .map((q) => ({
      id: q.id,
      label: peekWindowName(q, zh ? "zh" : "en"),
      value:
        q.usedPercent == null
          ? "--"
          : quotaPercentLabel(q.usedPercent, display),
      color: q.usedPercent == null ? undefined : color(q.status),
    }));
  if (vendor.balance)
    items.push({
      id: "balance",
      label: zh ? "余额" : "Balance",
      value: vendor.balance,
      color: color(vendor.level),
    });
  if (!items.length && vendor.desk) {
    items.push({
      id: "chats",
      label: zh ? "对话" : "Chats",
      value: String(vendor.desk.today),
    });
    if (vendor.desk.reviews.length)
      items.push({
        id: "reviews",
        label: zh ? "审核" : "Reviews",
        value: String(vendor.desk.reviews.length),
      });
  }
  if (!items.length)
    items.push({ id: "quota", label: zh ? "额度" : "Quota", value: "--" });
  return items;
}

/** The line is as long as what it says; its text is measured, since window names differ in length. */
export function peekLineWidth(
  vendor: HUDVendor,
  scale: number,
  zh: boolean,
  tuck: number,
  display?: QuotaDisplay,
): number {
  const font = Math.round(9 * scale),
    gap = Math.round(5 * scale),
    spacing = Math.round(12 * scale),
    items = peekItems(vendor, zh, statusColor, display);
  const cells = items.length
    ? items.reduce(
        (sum, item) =>
          sum +
          labelWidth(item.label, font) +
          gap +
          labelWidth(item.value, font) +
          2,
        0,
      ) +
      spacing * (items.length - 1)
    : labelWidth(vendor.name, font);
  return Math.max(
    100,
    Math.min(640 + tuck, Math.ceil(cells + spacing * 2 + 4 + tuck)),
  );
}

export function AgentPeek({
  vendor,
  simple,
  scale,
  light = false,
  zh,
  tuck = 0,
  edge = "top",
}: {
  vendor: HUDVendor;
  simple: boolean;
  scale: number;
  light?: boolean;
  zh: boolean;
  tuck?: number;
  edge?: HUDEdge;
}) {
  const color = useMarkLevelText(light);
  const { quotaDisplay } = useFormat();
  const paper = usePaper();
  if (simple) {
    const items = peekItems(vendor, zh, color, quotaDisplay);
    return (
      <div
        className="hud-agent-peek-line"
        style={{
          display: "flex",
          alignItems: "center",
          gap: Math.round(12 * scale),
          padding: `0 ${Math.round(12 * scale)}px`,
          ...(edge === "right"
            ? { paddingRight: Math.round(12 * scale) + tuck }
            : edge === "left"
              ? { paddingLeft: Math.round(12 * scale) + tuck }
              : {}),
          height: Math.round(26 * scale),
          fontSize: Math.round(9 * scale),
          whiteSpace: "nowrap",
        }}
      >
        {items.length ? (
          items.map((item) => (
            <span
              key={item.id}
              style={{ display: "inline-flex", gap: Math.round(5 * scale) }}
            >
              <span style={{ opacity: 0.55 }}>{item.label}</span>
              <strong style={{ fontWeight: 600, color: item.color }}>
                {item.value}
              </strong>
            </span>
          ))
        ) : (
          <span style={{ opacity: 0.7 }}>{vendor.name}</span>
        )}
      </div>
    );
  }
  if (paper)
    return <ReceiptPeek vendor={vendor} scale={scale} zh={zh} paper={paper} />;
  const work = vendor.work && (
    <WorkLine
      work={vendor.work}
      scale={scale}
      zh={zh}
      inks={{ dim: "inherit", dimOpacity: 0.55, ink: "inherit", size: 12 }}
    />
  );
  return (
    <div
      className="hud-agent-peek-bubble"
      style={{
        fontSize: 12 * scale,
        padding: `${10 * scale}px ${12 * scale}px`,
        width: 196 * scale,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          height: 18 * scale,
          fontWeight: 600,
          fontSize: 13 * scale,
        }}
      >
        {vendor.name}
      </div>
      {vendor.quotas.map((q) => (
        <div
          key={q.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            height: 18 * scale,
            alignItems: "center",
          }}
        >
          <span style={{ opacity: 0.55 }}>
            {peekWindowName(q, zh ? "zh" : "en")}
          </span>
          <strong
            style={{
              color: q.usedPercent == null ? undefined : color(q.status),
              fontSize: 12 * scale,
            }}
          >
            {q.usedPercent == null
              ? "--"
              : quotaPercentLabel(q.usedPercent, quotaDisplay)}
          </strong>
        </div>
      ))}
      {vendor.desk ? (
        <DeskLines
          desk={vendor.desk}
          scale={scale}
          zh={zh}
          bleed={{ left: 12 * scale, right: 12 * scale, bottom: 10 * scale }}
          inks={{
            ink: "inherit",
            dim: "inherit",
            line: "currentColor",
            dimOpacity: 0.55,
            answering: "#7fa8f0",
            replied: color("normal"),
          }}
        >
          {work}
        </DeskLines>
      ) : showsBots(vendor) ? (
        <BotLines
          vendor={vendor}
          scale={scale}
          zh={zh}
          light={light}
          inks={{
            ink: "inherit",
            dim: "inherit",
            line: "currentColor",
            dimOpacity: 0.55,
            online: color("normal"),
            replying: color("warning"),
            down: color("critical"),
          }}
        />
      ) : (
        !vendor.quotas.length &&
        !vendor.balance && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              height: 18 * scale,
            }}
          >
            <span style={{ opacity: 0.55 }}>{zh ? "额度" : "Quota"}</span>
            <strong>--</strong>
          </div>
        )
      )}
      {vendor.balance && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            height: 18 * scale,
          }}
        >
          <span style={{ opacity: 0.55 }}>{zh ? "余额" : "Balance"}</span>
          <strong
            style={{
              color: color(vendor.level),
              fontWeight: 600,
              fontSize: 12 * scale,
            }}
          >
            {vendor.balance}
          </strong>
        </div>
      )}
      {!vendor.desk && work}
    </div>
  );
}

/** The hovered agent's readings printed as a small receipt: its name over a
 * tear line, then each window's share used, dotted across to the figure,
 * and the balance of an API-billed agent (Stage 4, the receipt's peek). */
function ReceiptPeek({
  vendor,
  scale,
  zh,
  paper,
}: {
  vendor: HUDVendor;
  scale: number;
  zh: boolean;
  paper: Paper;
}) {
  const { quotaDisplay } = useFormat();
  const rows: { id: string; label: string; value: string; color?: string }[] =
    vendor.quotas.map((q) => ({
      id: q.id,
      label: peekWindowName(q, zh ? "zh" : "en"),
      value:
        q.usedPercent == null
          ? "--"
          : quotaPercentLabel(q.usedPercent, quotaDisplay),
      color: q.usedPercent == null ? paper.dim : paperLevel(q.status, paper),
    }));
  const bots = showsBots(vendor);
  const work = vendor.work && (
    <WorkLine
      work={vendor.work}
      scale={scale}
      zh={zh}
      inks={{
        dim: paper.dim,
        ink: paper.ink,
        figures: PAPER_FIGURES,
        size: 15,
      }}
    />
  );
  if (!bots && !vendor.desk && !vendor.quotas.length && !vendor.balance)
    rows.push({ id: "quota", label: zh ? "额度" : "Quota", value: "--" });
  if (vendor.balance)
    rows.push({
      id: "balance",
      label: zh ? "余额" : "Balance",
      value: vendor.balance,
      color: paperLevel(vendor.level, paper),
    });
  return (
    <div
      className="hud-agent-peek-bubble"
      style={{
        fontSize: 12 * scale,
        padding: `${10 * scale}px ${12 * scale}px ${10 * scale}px ${16 * scale}px`,
        width: 196 * scale,
        color: paper.ink,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: 18 * scale,
          fontWeight: 700,
          fontSize: 13 * scale,
          // The tear line runs across the whole slip.
          borderBottom: `1.2px dashed ${paper.line}`,
          margin: `0 ${-12 * scale}px ${PEEK_TEAR - 1.2}px ${-16 * scale}px`,
          padding: `0 ${12 * scale}px ${PEEK_TEAR}px ${16 * scale}px`,
          boxSizing: "content-box",
        }}
      >
        {vendor.name}
      </div>
      {vendor.desk && (
        <DeskLines
          desk={vendor.desk}
          scale={scale}
          zh={zh}
          bleed={{ left: 16 * scale, right: 12 * scale, bottom: 10 * scale }}
          inks={{
            ink: paper.ink,
            dim: paper.dim,
            line: paper.line,
            answering: paper.blue,
            replied: paper.green,
          }}
        >
          {work}
        </DeskLines>
      )}
      {bots && (
        <BotLines
          vendor={vendor}
          scale={scale}
          zh={zh}
          light={paper.light}
          inks={{
            ink: paper.ink,
            dim: paper.dim,
            line: paper.line,
            online: paper.green,
            replying: paper.blue,
            down: paper.red,
            word: paper.word,
            figures: PAPER_FIGURES,
          }}
        />
      )}
      {rows.map((row) => (
        <div
          key={row.id}
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 6,
            height: 18 * scale,
            lineHeight: `${18 * scale}px`,
            color: paper.dim,
          }}
        >
          <span style={{ whiteSpace: "nowrap" }}>{row.label}</span>
          <span
            aria-hidden="true"
            style={{
              flex: "1 1 auto",
              minWidth: 8,
              borderBottom: `1px dotted ${paper.line}`,
              transform: `translateY(${-3 * scale}px)`,
            }}
          />
          <strong
            style={{
              fontFamily: PAPER_FIGURES,
              fontVariantNumeric: "tabular-nums",
              fontSize: 15 * scale,
              fontWeight: 700,
              color: row.color ?? paper.ink,
              whiteSpace: "nowrap",
            }}
          >
            {row.value}
          </strong>
        </div>
      ))}
      {!vendor.desk && work}
    </div>
  );
}
