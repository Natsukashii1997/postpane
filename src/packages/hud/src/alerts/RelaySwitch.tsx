// 上一单 / 下一单 under the handoff card's head (#427, the owner chose 甲 on
// 2026-11-19): through the relays it was opened among, in the order every
// list shows them (要你管, 在动, 静着). One relay alone: nothing to step to.
import type { Snapshot, Handoff } from "@agent-hud/protocol";
import type { Inks } from "../permissions/ListCard";
import { relaySiblings, type RelayGroup } from "../relay-groups";
import { noButtonChrome } from "../panel/theme";
import { openedAmong, openHandoffCard } from "./handoff-store";

const WORD: Record<RelayGroup, [string, string]> = {
  need: ["要你管", "Yours"],
  move: ["在动", "Under way"],
  quiet: ["静着", "Quiet"],
};

export function RelaySwitch({
  handoff,
  snapshot,
  now,
  inks,
  zh,
}: {
  handoff: Handoff;
  snapshot: Pick<Snapshot, "handoffs" | "sessions">;
  now: number;
  inks: Inks;
  zh: boolean;
}) {
  const among = openedAmong();
  const list = relaySiblings(
    snapshot.handoffs,
    snapshot.sessions,
    now,
    handoff,
    among,
  );
  const index = list.findIndex((entry) => entry.handoff.id === handoff.id);
  if (index < 0 || list.length < 2) return null;
  const go = (to: number) =>
    openHandoffCard(list[to].handoff.id, among ?? undefined);
  const step = (to: number, label: string) => {
    const enabled = to >= 0 && to < list.length;
    return (
      <button
        type="button"
        disabled={!enabled}
        title={enabled ? list[to].handoff.title : undefined}
        onClick={() => enabled && go(to)}
        style={{
          ...noButtonChrome,
          flex: "none",
          height: 22,
          padding: "0 8px",
          border: `1.2px solid ${enabled ? inks.ink : inks.faint}`,
          borderRadius: 3,
          color: enabled ? inks.ink : inks.faint,
          fontSize: 11.5,
          fontWeight: 700,
          cursor: enabled ? "pointer" : "default",
          opacity: enabled ? 1 : 0.6,
        }}
      >
        {label}
      </button>
    );
  };
  const [word, wordEn] = WORD[list[index].group];
  return (
    <div
      className="hud-relay-switch"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        margin: "0 0 8px",
        fontSize: 12,
        color: inks.dim,
        whiteSpace: "nowrap",
      }}
    >
      {step(index - 1, zh ? "‹ 上一单" : "‹ Previous")}
      <span style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
        <b style={{ color: inks.ink }}>{zh ? word : wordEn}</b>
        {zh
          ? ` · 第 ${index + 1} 单，共 ${list.length} 单`
          : ` · ${index + 1} of ${list.length}`}
      </span>
      {step(index + 1, zh ? "下一单 ›" : "Next ›")}
    </div>
  );
}
