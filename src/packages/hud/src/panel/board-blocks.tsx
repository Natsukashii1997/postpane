// The hover panel's blocks, moved out of HoverPanel.tsx (ADR-0001 C1,
// owner chose 甲 on 2026-11-14): each agent's quota or balance block, and on
// the whole board each place's sessions under its own block, a block of
// their own for a place without one, and the 「等你」 line over them all.
import type { ReactNode } from "react";
import type { Quota, Snapshot } from "@agent-hud/protocol";
import { useFormat } from "@agent-hud/ui/format-context";
import { blockRows, quotaRowKey, type HUDConfig } from "../model";
import { ApprovalTag } from "../permissions/ApprovalTag";
import { agentVendorName } from "../agent-artwork";
import { liveSessions } from "./agent-board";
import { useBoardInks } from "./AgentBoard";
import { BoardHeading } from "./BoardHeading";
import { boardPlaces, boardWaiting, sessionScope } from "./place-sessions";
import { BlockSessions } from "./PlaceRows";
import { SourceBalances, SourceProviderBlock } from "./QuotaSection";
import { shownSessions, useRemovedSessions } from "./removed-sessions";
import { inPanelOrder, tabular, type Logo } from "./theme";

type Block = { key: string; content: ReactNode };

export function useBoardBlocks({
  config,
  snapshot,
  focusVendor,
  vendorNames,
  rowsByVendor,
  billing,
  active,
  light,
  Logo,
  onStats,
}: {
  config: HUDConfig;
  snapshot: Snapshot;
  focusVendor?: string;
  vendorNames: string[];
  rowsByVendor: Map<string, Quota[]>;
  billing: Snapshot["billing"];
  active: boolean;
  light: boolean;
  Logo: Logo;
  onStats?: () => void;
}): {
  blocks: Block[];
  /** The blocks list the sessions: the sessions section keeps its foot. */
  split: boolean;
  waiting: ReactNode;
} {
  const { removed } = useRemovedSessions();
  const layout = config.panelLayout;
  const blocks = inPanelOrder<Block>(
    [
      ...vendorNames.map((vendor) => ({
        key: vendor,
        content: (
          <SourceProviderBlock
            vendor={vendor}
            rows={blockRows(
              rowsByVendor.get(vendor) ?? [],
              layout.blocks?.[vendor],
            ).map((row) => ({ ...row, key: quotaRowKey(row) }))}
            layout={layout.blocks?.[vendor]}
            snapshot={snapshot}
            active={active}
            now={Date.parse(snapshot.generatedAt)}
            light={light}
            Logo={Logo}
            showReset={config.resetCountdown}
            accountInfo={snapshot.accounts}
            onStats={onStats}
          />
        ),
      })),
      ...[...new Set(billing.map((account) => account.vendor))]
        .filter((vendor) => !layout.blocks?.[`api:${vendor}`]?.hidden)
        .map((vendor) => ({
          key: `api:${vendor}`,
          content: (
            <SourceBalances
              billing={billing.filter((account) => account.vendor === vendor)}
              layout={layout.blocks?.[`api:${vendor}`]}
              light={light}
              Logo={Logo}
              onStats={onStats}
            />
          ),
        })),
    ],
    config.panelOrder ?? [],
  );
  // The one-agent panel lists its sessions in its own section, as does a
  // board with no blocks or no sessions shown.
  if (focusVendor || !config.quotaDetails || !config.sessionList)
    return { blocks, split: false, waiting: null };
  const scope = sessionScope(snapshot, layout.sessions);
  const live = shownSessions(
    liveSessions(snapshot.sessions.filter(scope.has), snapshot.approvals),
    removed,
  );
  const places = boardPlaces(
    snapshot,
    blocks.map((block) => block.key),
    live,
  );
  const sessions = ({ source, rows }: (typeof places)[number]) => (
    <BlockSessions
      snapshot={snapshot}
      source={source}
      rows={rows}
      light={light}
      onStats={onStats}
    />
  );
  const column = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--hud-block-gap, 8px)",
  } as const;
  const placeOf = (key: string) => places.find((place) => place.key === key);
  return {
    split: true,
    blocks: [
      ...blocks.map((block) => {
        const place = placeOf(block.key);
        return place?.rows.length
          ? {
              key: block.key,
              content: (
                <div style={column}>
                  {block.content}
                  {sessions(place)}
                </div>
              ),
            }
          : block;
      }),
      ...places
        .filter((place) => !blocks.some((block) => block.key === place.key))
        .map((place) => ({
          key: place.key,
          content: (
            <section className="hud-source-provider" style={column}>
              <BoardHeading
                vendor={place.source}
                Logo={Logo}
                light={light}
                handoffs={snapshot.handoffs}
              />
              {sessions(place)}
            </section>
          ),
        })),
    ],
    waiting: (
      <BoardWaiting places={boardWaiting(places)} light={light} Logo={Logo} />
    ),
  };
}

/** The whole board's first line: 「等你 n」, then each place waiting on you
 * with its mark and how many; none while nothing waits. */
function BoardWaiting({
  places,
  light,
  Logo,
}: {
  places: ReturnType<typeof boardWaiting>;
  light: boolean;
  Logo: Logo;
}) {
  const zh = useFormat().language === "zh";
  const inks = useBoardInks(light);
  if (!places.length) return null;
  return (
    <div
      className="hud-board-waiting"
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
        padding: "2px 6px",
      }}
    >
      <ApprovalTag
        label={zh ? "等你" : "WAITING"}
        tone="ask"
        light={light}
        color={inks.red}
        count={places.reduce((sum, place) => sum + place.count, 0)}
        ink={inks.red}
      />
      {places.map((place) => (
        <span
          key={place.key}
          title={agentVendorName(place.source)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            height: 18,
            padding: "0 6px 0 4px",
            boxSizing: "border-box",
            border: `1px solid ${inks.divider}`,
            borderRadius: 2,
            fontSize: 12,
            fontWeight: 600,
            color: inks.text,
            ...tabular,
          }}
        >
          <Logo source={place.source} size={12} light={light} />
          {place.count}
        </span>
      ))}
    </div>
  );
}
