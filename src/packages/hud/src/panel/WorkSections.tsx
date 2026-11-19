// An agent's work on its card, in two sections of one form (owner,
// 2026-11-14): 「等待处理 · n」, what waits on you, then 「正在进行 · n」, what
// is at work. Where the card holds the agent's requests and replies, they are
// what waits on you, in place of the sessions waiting. On one agent's card
// both sections always stand, saying so when empty, and each lists its first
// few with the rest behind 「还有 n 条」 (owner, 2026-11-15). On ChatGPT's
// card its relays come first in each (#427, the owner chose 甲 on
// 2026-11-19): the person's in 「等待处理」, the rest in 「正在进行」.
import type { ReactNode } from "react";
import type { Snapshot } from "@agent-hud/protocol";
import { useFormat } from "@agent-hud/ui/format-context";
import { usePaper } from "../paper";
import { SHOWN_ENTRIES } from "../permissions/approval-list";
import { cardFolds, FoldButton } from "../permissions/FoldButton";
import { cardInks } from "../permissions/ListCard";
import type { GroupedRelay } from "../relay-groups";
import type { LiveSession } from "./agent-board";
import { RelayRows } from "./RelayRows";
import { useBoardInks } from "./AgentBoard";
import { PlaceRows, SessionsHeading } from "./PlaceRows";
import { RUNNING_SHOWN, splitWork } from "./place-sessions";
import { GRID } from "./theme";

export function WorkSections({
  snapshot,
  entries,
  light,
  now,
  onStats,
  fold,
  card = false,
  news,
  relays,
  place,
}: {
  snapshot: Snapshot;
  entries: readonly LiveSession[];
  light: boolean;
  now: number;
  onStats?: () => void;
  /** On the board, the agent whose running rows fold past three. */
  fold?: string;
  /** One agent's card: both sections stand, each folding past its few. */
  card?: boolean;
  /** The agent's requests and replies, and how many: they wait on you. */
  news?: { count: number; content: ReactNode };
  /** ChatGPT's relays by section, and all of them in the order its handoff
   * card steps through (#427). */
  /** The card's place: its sections' open lists are kept by it (#430). */
  place?: string;
  relays?: {
    waiting: readonly GroupedRelay[];
    running: readonly GroupedRelay[];
    among: readonly string[];
  };
}) {
  const zh = useFormat().language === "zh";
  const { waiting, running } = splitWork(entries);
  const relaysWaiting = relays?.waiting ?? [];
  const relaysRunning = relays?.running ?? [];
  const waitingCount =
    relaysWaiting.length + (news ? news.count : waiting.length);
  const runningCount = relaysRunning.length + running.length;
  const rows = (list: readonly LiveSession[], folds?: string) => (
    <PlaceRows
      snapshot={snapshot}
      entries={list}
      light={light}
      now={now}
      onStats={onStats}
      fold={folds}
    />
  );
  // A section's relays, then its own rows: folded together on a card.
  const section = <T,>(
    name: "waiting" | "running",
    before: readonly GroupedRelay[],
    after: readonly T[],
    shown: number,
    render: (list: readonly T[]) => ReactNode,
  ) => {
    const items: ({ relay: GroupedRelay } | { item: T })[] = [
      ...before.map((relay) => ({ relay })),
      ...after.map((item) => ({ item })),
    ];
    const draw = (list: readonly (typeof items)[number][]) => {
      const own = list.flatMap((entry) =>
        "item" in entry ? [entry.item] : [],
      );
      const shownRelays = list.flatMap((entry) =>
        "relay" in entry ? [entry.relay] : [],
      );
      return (
        <>
          {shownRelays.length > 0 && (
            <RelayRows
              relays={shownRelays}
              among={relays?.among ?? []}
              now={now}
              light={light}
              ruleAfter={own.length > 0}
            />
          )}
          {own.length > 0 && render(own)}
        </>
      );
    };
    return card ? (
      <Folded
        items={items}
        shown={shown}
        light={light}
        render={draw}
        foldKey={`${place ?? "card"}:${name}`}
      />
    ) : (
      draw(items)
    );
  };
  return (
    <>
      {(card || waitingCount > 0) && (
        <SessionsHeading light={light} count={waitingCount}>
          {zh ? "等待处理" : "WAITING"}
        </SessionsHeading>
      )}
      {news ? (
        // A list of its own folds itself; the replied chats fold here.
        Array.isArray(news.content) && card ? (
          section(
            "waiting",
            relaysWaiting,
            news.content as ReactNode[],
            SHOWN_ENTRIES,
            (items) => items,
          )
        ) : (
          <>
            {relaysWaiting.length > 0 &&
              section("waiting", relaysWaiting, [], Infinity, () => null)}
            {news.content}
          </>
        )
      ) : (
        section("waiting", relaysWaiting, waiting, SHOWN_ENTRIES, (list) =>
          rows(list),
        )
      )}
      {card && !waitingCount && (
        <Empty light={light}>
          {zh ? "暂无等待处理的事" : "Nothing waiting on you"}
        </Empty>
      )}
      {(card || runningCount > 0) && (
        <div style={{ paddingTop: card || waitingCount > 0 ? 8 : 0 }}>
          <SessionsHeading light={light} count={runningCount}>
            {zh ? "正在进行" : "IN PROGRESS"}
          </SessionsHeading>
          {card ? (
            section("running", relaysRunning, running, RUNNING_SHOWN, (list) =>
              rows(list),
            )
          ) : (
            <>
              {relaysRunning.length > 0 &&
                section("running", relaysRunning, [], Infinity, () => null)}
              {rows(running, fold)}
            </>
          )}
          {card && !runningCount && (
            <Empty light={light}>
              {zh ? "暂无在跑的会话" : "Nothing running"}
            </Empty>
          )}
        </div>
      )}
    </>
  );
}

/** The first `shown` of a section's rows, the rest behind 「还有 n 条」,
 * which once open folds back with 「收起」. */
function Folded<T>({
  items,
  shown,
  light,
  render,
  foldKey,
}: {
  items: readonly T[];
  shown: number;
  light: boolean;
  render: (items: readonly T[]) => ReactNode;
  /** Kept in the shared store, so the measuring copy opens too (#430). */
  foldKey?: string;
}) {
  const zh = useFormat().language === "zh";
  const [unfolded, toggle] = cardFolds.use(foldKey);
  const inks = cardInks(usePaper(), light);
  return (
    <>
      {render(unfolded ? items : items.slice(0, shown))}
      <FoldButton
        hidden={items.length - shown}
        unfolded={unfolded}
        onToggle={toggle}
        inks={inks}
        zh={zh}
      />
    </>
  );
}

function Empty({ light, children }: { light: boolean; children: ReactNode }) {
  const inks = useBoardInks(light);
  return (
    <span
      style={{
        padding: `6px 6px 8px ${GRID.text}px`,
        fontSize: 12.5,
        color: inks.tertiary,
      }}
    >
      {children}
    </span>
  );
}

/** A list of every agent with nothing waiting and nothing at work. */
export function NothingYet({ light }: { light: boolean }) {
  const zh = useFormat().language === "zh";
  return (
    <Empty light={light}>
      {zh
        ? "没有会话在跑，也没有在等你的"
        : "Nothing running, and nothing waiting on you"}
    </Empty>
  );
}
