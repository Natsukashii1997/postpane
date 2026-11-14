// The card of the news in front, moved out of HUDScene.tsx for the
// 300-line ratchet. An agent's requests or replies come on its own card,
// the one its mark opens: its head with the paper plane and the news's seal,
// its quota, then what waits on you and what is at work (owner chose 甲,
// 2026-11-14). Any other news keeps its receipt.
import type { Approval, IslandEvent, Snapshot } from "@agent-hud/protocol";
import { snapshotLanguage } from "@agent-hud/ui/format";
import type { HUDConfig, HUDDecision, HUDVendor } from "../model";
import { HUDArtwork as HUDLogo } from "../HUDArtwork";
import { SourceHoverPanel } from "../HoverPanel";
import {
  NewsContent,
  PendingEventRows,
  type useIslandNews,
} from "../IslandNews";
import { PaperContext, type Paper } from "../paper";
import { CardRunning } from "../panel/CardRunning";
import { ApprovalContent, waitingSeal } from "../permissions/ApprovalContent";
import { NewsSealContext, type NewsSeal } from "../permissions/PaperSeal";
import { WeeklyMark } from "./WeeklyMark";
import type { CardWeekly } from "../card-weekly";

export function NewsCard({
  snapshot,
  config,
  news,
  request,
  event,
  vendor,
  paper,
  light,
  weekly,
  decide,
  openSettings,
  onStats,
  handoff,
}: {
  snapshot: Snapshot;
  config: HUDConfig;
  news: ReturnType<typeof useIslandNews>;
  request: Approval | undefined;
  event: IslandEvent | undefined;
  /** The agent whose news is in front; undefined for one with no mark. */
  vendor: HUDVendor | undefined;
  paper: Paper | null;
  light: boolean;
  weekly: CardWeekly | undefined;
  decide?: (id: string, decision: HUDDecision) => void | Promise<void>;
  openSettings?: (page: string) => void;
  onStats?: () => void;
  handoff: (callback?: () => void) => void;
}) {
  const language = snapshotLanguage(snapshot);
  const zh = language === "zh";
  const front = request ?? event;
  if (!front) return null;
  const waiting = request && (
    <ApprovalContent
      requests={news.requests}
      selected={request}
      select={news.select}
      decide={decide}
      openSettings={openSettings}
      light={light}
      language={language}
      sessions={snapshot.sessions}
      replies={news.replies}
    />
  );
  const notice = !request && event && (
    <NewsContent
      event={event}
      snapshot={snapshot}
      dismiss={news.dismiss}
      replies={news.replies}
      quotas={news.quotas}
      drop={news.drop}
      onStats={onStats}
      handoff={handoff}
      light={light}
      botLogos={config.botLogos}
    />
  );
  // A notice's queue is printed on its receipt; a request's card lists the
  // replies waiting with it.
  const queue = !request && event && (
    <PendingEventRows
      queue={news.laneQueue}
      currentID={event.id}
      requests={news.requests}
      select={news.select}
      includeRequests
      light={light}
      zh={zh}
    />
  );
  const list: { seal: NewsSeal; count: number } | null = !vendor
    ? null
    : request
      ? {
          seal: waitingSeal(request, zh),
          count: news.requests.length + news.replies.length,
        }
      : event?.kind === "completion"
        ? {
            seal: { words: zh ? "已回" : "DONE", ink: "blue" },
            count: news.replies.length,
          }
        : null;
  return (
    <PaperContext.Provider value={paper}>
      {list && vendor ? (
        <NewsSealContext.Provider value={list.seal}>
          <SourceHoverPanel
            config={config}
            snapshot={snapshot}
            focusVendor={vendor.name}
            light={light}
            Logo={HUDLogo}
            onStats={onStats}
            news={{ count: list.count, content: waiting || notice }}
          />
        </NewsSealContext.Provider>
      ) : (
        <>
          {waiting || notice}
          {queue}
          <CardRunning snapshot={snapshot} mark={front.source} light={light} />
        </>
      )}
      {list && queue}
      <WeeklyMark weekly={weekly} />
    </PaperContext.Provider>
  );
}
