import { useEffect, useRef, useState } from "react";
import type {
  Approval,
  IslandEvent,
  PanelLayout,
  Snapshot,
} from "@agent-hud/protocol";
import { usePanelServices } from "./PanelContext";
import { agentVendorName, sourceID, vendorKey } from "./model";
import { CompletionAlertView } from "./alerts/CompletionAlertView";
import { QuotaAlertView } from "./alerts/QuotaAlertViews";
import { queuedQuotas, shownNews } from "./alerts/quota-list";
import { seenFirst, staysUntilSeen } from "./alerts/reply-stays";
import {
  blocksNotice,
  laneEvents,
  newsLanes,
  sideLanes,
  type LaneCard,
  type NewsLane,
} from "./alerts/news-lanes";
import { snapshotLanguage } from "@agent-hud/ui/format";

export { ReminderMark } from "./alerts/ReminderMark";
export {
  CompactAlertView,
  compactAlertDockWidth,
  compactAlertLabels,
  compactQuotaStatus,
} from "./alerts/CompactAlertView";
export {
  CompletionClosedRow,
  PendingEventRows,
  WaitedLabel,
  permissionToolBadge,
} from "./alerts/PendingEventRows";

/** Presentation only: Core is the sole producer/deduplicator of event facts. */
export type IslandCard = LaneCard;

function promoteOldestWaiting(pending: IslandCard[]): IslandCard[] {
  if (pending.length < 2) return pending;
  // Matches IslandAlertQueue.dismiss(): permission requests have waitingSince = request.at
  // and come before non-persistent events (.distantFuture), which keep arrival order.
  const best = pending.reduce((at, card, index) => {
    const waiting = card.type === "request";
    const prior = pending[at],
      priorWaiting = prior.type === "request";
    return waiting &&
      (!priorWaiting || Date.parse(card.at) < Date.parse(prior.at))
      ? index
      : at;
  }, 0);
  return [pending[best], ...pending.filter((_, index) => index !== best)];
}

export function reconcileIslandCards(
  previous: IslandCard[],
  requests: Approval[],
  visible: IslandEvent[],
  newRequests: Approval[] = requests,
  inUsagePanel = false,
): IslandCard[] {
  const frontRemoved =
    previous.length > 0 &&
    previous[0].type === "request" &&
    !requests.some((request) => request.id === previous[0].id);
  const kept = previous.filter(
    (card) =>
      card.type !== "request" ||
      requests.some((request) => request.id === card.id),
  );
  const next = frontRemoved ? promoteOldestWaiting(kept) : kept;
  for (const request of newRequests) {
    if (!next.some((card) => card.id === request.id)) {
      next.push({
        type: "request",
        id: request.id,
        at: request.createdAt,
      });
    }
  }
  for (const event of visible) {
    if (blocksNotice(next, requests, event)) continue;
    next.push({
      type: "news",
      id: event.id,
      at: event.at,
      event,
      inUsagePanel: event.kind !== "completion" && inUsagePanel,
    });
  }
  // Persistent requests are never evicted by a burst of informational events.
  let news = 0;
  return next.filter((card) => card.type === "request" || ++news <= 32);
}

export function dismissIslandCard(previous: IslandCard[]): IslandCard[] {
  return promoteOldestWaiting(previous.slice(1));
}

/** The queue without the cards `ids` (replies put away from the reply
 * card, quota notices from the quota card); a request left in front waits
 * longest. */
export function dropIslandCards(
  previous: IslandCard[],
  ids: readonly string[],
): IslandCard[] {
  const next = previous.filter((card) => !ids.includes(card.id));
  return next[0]?.id === previous[0]?.id ? next : promoteOldestWaiting(next);
}

/** The waiting requests of one agent's lane, oldest first. */
function laneRequests(
  lane: NewsLane | undefined,
  requests: Approval[],
): Approval[] {
  return lane
    ? requests.filter((request) => vendorKey(request.source) === lane.vendor)
    : [];
}

export type SideNews = ReturnType<typeof useIslandNews>["sides"][number];

export function useIslandNews(
  snapshot: Snapshot,
  held: boolean,
  requests: Approval[],
  shown: string[],
  silenced = false,
  underPointer = true,
  inUsagePanel = false,
  /** The hover panel's layout: news about a row it hides is not told. */
  layout?: PanelLayout,
) {
  const services = usePanelServices(),
    seen = useRef<Set<string> | null>(null),
    seenRequests = useRef<Set<string> | null>(null);
  const [queue, setQueue] = useState<IslandCard[]>([]);
  const items = snapshot.islandEvents?.items ?? [];
  const requestIDs = requests.map((request) => request.id).join("\0");
  useEffect(() => {
    const fresh =
      seen.current === null
        ? []
        : items.filter((event) => !seen.current!.has(event.id));
    if (seen.current === null) seen.current = new Set();
    for (const event of items) seen.current.add(event.id);
    if (seen.current.size > 128)
      seen.current = new Set(items.map((event) => event.id));
    const freshRequests =
      seenRequests.current === null
        ? requests
        : requests.filter((request) => !seenRequests.current!.has(request.id));
    if (seenRequests.current === null) seenRequests.current = new Set();
    const activeRequestIds = new Set(requests.map((request) => request.id));
    for (const id of [...seenRequests.current]) {
      if (!activeRequestIds.has(id)) seenRequests.current.delete(id);
    }
    for (const request of requests) seenRequests.current.add(request.id);
    const visible =
      silenced || !underPointer
        ? []
        : shownNews(fresh, snapshot.quotas, layout).filter(
            (event) =>
              event.islandAlert !== false &&
              shown.includes(vendorKey(event.source)) &&
              (event.kind !== "completion" ||
                (services?.sources?.[sourceID(snapshot, event.source)]?.live !==
                  false &&
                  services?.sources?.[sourceID(snapshot, event.source)]
                    ?.reminders !== false)),
          );
    setQueue((previous) =>
      seenFirst(
        reconcileIslandCards(
          silenced
            ? previous.filter((card) => card.type === "request")
            : previous,
          requests,
          visible,
          underPointer ? freshRequests : [],
          inUsagePanel,
        ),
        visible,
      ),
    );
  }, [snapshot.islandEvents?.revision, requestIDs, silenced, underPointer]);
  const current = queue[0];
  const dismiss = () => setQueue(dismissIslandCard);
  const drop = (ids: readonly string[]) =>
    setQueue((previous) => dropIslandCards(previous, ids));
  // Cards the pointer has rested on: a Hermes reply folds away only then.
  const looked = useRef(new Set<string>());
  useEffect(() => {
    if (current && held) looked.current.add(current.id);
    if (!current || held || current.type === "request") return;
    if (staysUntilSeen(current.event) && !looked.current.has(current.id))
      return;
    const timer = setTimeout(dismiss, 4000);
    return () => clearTimeout(timer);
  }, [current?.id, held]);
  // Each other agent's tag hangs by its own mark (#162): a notice there folds
  // away on its own clock, as the first one does; one waiting to be looked at
  // stays until the pointer brings it to the front.
  const lanes = newsLanes(queue, requests);
  const sides = sideLanes(lanes, shown);
  const sideNews = sides.flatMap(({ lane }) =>
    lane.front.type === "news" &&
    (!staysUntilSeen(lane.front.event) || looked.current.has(lane.front.id))
      ? [lane.front.id]
      : [],
  );
  const sideTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const timers = sideTimers.current;
    for (const [id, timer] of timers) {
      if (sideNews.includes(id)) continue;
      clearTimeout(timer);
      timers.delete(id);
    }
    for (const id of sideNews) {
      if (timers.has(id)) continue;
      timers.set(
        id,
        setTimeout(() => {
          timers.delete(id);
          drop([id]);
        }, 4000),
      );
    }
  }, [sideNews.join("\0")]);
  useEffect(() => {
    const timers = sideTimers.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);
  const select = (id: string) =>
    setQueue((previous) => {
      const at = previous.findIndex((card) => card.id === id);
      if (at <= 0) return previous;
      const next = [...previous];
      [next[0], next[at]] = [next[at], next[0]];
      return next;
    });
  return {
    event: current?.type === "news" ? current.event : undefined,
    inUsagePanel:
      current?.type === "news" ? Boolean(current.inUsagePanel) : false,
    request:
      current?.type === "request"
        ? requests.find((request) => request.id === current.id)
        : undefined,
    queue,
    // The card shows the first agent's things only (#162).
    laneQueue: lanes[0]?.cards ?? [],
    requests: laneRequests(lanes[0], requests),
    replies: laneEvents(lanes[0], "completion"),
    quotas: queuedQuotas(lanes[0]?.cards ?? []),
    // The other agents' tags, each by its own mark.
    sides: sides.map(({ lane, mark }) => ({
      vendor: lane.vendor,
      mark,
      id: lane.front.id,
      event: lane.front.type === "news" ? lane.front.event : undefined,
      request:
        lane.front.type === "request"
          ? requests.find((request) => request.id === lane.front.id)
          : undefined,
      requests: laneRequests(lane, requests),
      replies: laneEvents(lane, "completion"),
    })),
    select,
    dismiss,
    drop,
  };
}

export const newsTitle = (event: IslandEvent, zh = false) =>
  event.kind === "completion"
    ? zh
      ? "有新回复"
      : "New reply"
    : event.kind === "quota-reset"
      ? zh
        ? "额度已重置"
        : "Quota reset"
      : event.kind === "reset-credits"
        ? zh
          ? "获得使用重置"
          : "Usage resets added"
        : event.kind === "bot-offline"
          ? `${event.title ?? "Hermes"} · ${event.message ?? (zh ? "断线" : "Offline")}`
          : event.kind === "cron-failed"
            ? `${event.title ?? "Hermes"} · ${event.message ?? (zh ? "没跑成" : "Did not run")}`
            : event.kind === "sign-in-needed"
              ? zh
                ? "需要重新登录"
                : "Sign in again"
              : zh
                ? "额度预警"
                : "Running low";

export const compactDuration = (seconds: number) => {
  const total = Math.max(0, Math.round(seconds)),
    h = Math.floor(total / 3600),
    m = Math.floor((total % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}m` : `${m}m`;
};

export function clientDisplayName(source: string): string {
  const normalized = source.trim().toLowerCase();
  if (normalized === "codex" || normalized === "codex-cli") return "Codex";
  // ChatGPT is the OpenAI mark but answers as itself.
  if (normalized === "chatgpt") return "ChatGPT";
  return agentVendorName(source);
}

export function projectName(cwd?: string | null): string | null {
  if (!cwd) return null;
  const trimmed = cwd.replace(/[\\/]+$/, "");
  const name = trimmed.split(/[\\/]/).pop();
  return name && name.length > 0 ? name : null;
}

export function NewsContent({
  event,
  snapshot,
  dismiss,
  replies = [event],
  quotas = [event],
  drop = () => dismiss(),
  onStats,
  handoff,
  light = false,
  botLogos = true,
}: {
  event: IslandEvent;
  snapshot: Snapshot;
  dismiss: () => void;
  /** Every reply in the queue: a reply's card lists them all. */
  replies?: IslandEvent[];
  /** Every quota notice in the queue (windows, resets added, sign-outs),
   * newest first: a quota card lists them all. */
  quotas?: IslandEvent[];
  /** Puts these replies or quota notices away. */
  drop?: (ids: readonly string[]) => void;
  onStats?: () => void;
  handoff?: (callback?: () => void) => void;
  light?: boolean;
  botLogos?: boolean;
}) {
  const zh = snapshotLanguage(snapshot) === "zh";
  if (event.kind === "completion") {
    return (
      <CompletionAlertView
        replies={replies}
        snapshot={snapshot}
        drop={drop}
        handoff={handoff}
        light={light}
      />
    );
  }
  return (
    <QuotaAlertView
      events={quotas.some((each) => each.id === event.id) ? quotas : [event]}
      snapshot={snapshot}
      drop={drop}
      onStats={onStats}
      light={light}
      botLogos={botLogos}
      zh={zh}
    />
  );
}
