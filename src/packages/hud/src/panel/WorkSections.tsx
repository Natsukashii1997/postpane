// An agent's work on its card, in two sections of one form (owner,
// 2026-11-14): 「等待处理 · n」, what waits on you, then 「正在进行 · n」, what
// is at work. Where the card holds the agent's requests and replies, they are
// what waits on you, in place of the sessions waiting. On one agent's card
// both sections always stand, saying so when empty, and each lists its first
// few with the rest behind 「还有 n 条」 (owner, 2026-11-15).
import { useState, type ReactNode } from "react";
import type { Snapshot } from "@agent-hud/protocol";
import { useFormat } from "@agent-hud/ui/format-context";
import { usePaper } from "../paper";
import { SHOWN_ENTRIES } from "../permissions/approval-list";
import { FoldButton } from "../permissions/FoldButton";
import { cardInks } from "../permissions/ListCard";
import type { LiveSession } from "./agent-board";
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
}) {
  const zh = useFormat().language === "zh";
  const { waiting, running } = splitWork(entries);
  const waitingCount = news ? news.count : waiting.length;
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
          <Folded
            items={news.content as ReactNode[]}
            shown={SHOWN_ENTRIES}
            light={light}
            render={(items) => items}
          />
        ) : (
          news.content
        )
      ) : card ? (
        <Folded
          items={waiting}
          shown={SHOWN_ENTRIES}
          light={light}
          render={(list) => list.length > 0 && rows(list)}
        />
      ) : (
        waiting.length > 0 && rows(waiting)
      )}
      {card && !waitingCount && (
        <Empty light={light}>
          {zh ? "暂无等待处理的事" : "Nothing waiting on you"}
        </Empty>
      )}
      {(card || running.length > 0) && (
        <div style={{ paddingTop: card || waitingCount > 0 ? 8 : 0 }}>
          <SessionsHeading light={light} count={running.length}>
            {zh ? "正在进行" : "IN PROGRESS"}
          </SessionsHeading>
          {card ? (
            <Folded
              items={running}
              shown={RUNNING_SHOWN}
              light={light}
              render={(list) => list.length > 0 && rows(list)}
            />
          ) : (
            rows(running, fold)
          )}
          {card && !running.length && (
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
}: {
  items: readonly T[];
  shown: number;
  light: boolean;
  render: (items: readonly T[]) => ReactNode;
}) {
  const zh = useFormat().language === "zh";
  const [unfolded, setUnfolded] = useState(false);
  const inks = cardInks(usePaper(), light);
  return (
    <>
      {render(unfolded ? items : items.slice(0, shown))}
      <FoldButton
        hidden={items.length - shown}
        unfolded={unfolded}
        onToggle={() => setUnfolded((open) => !open)}
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
