// An agent's work on its card, in two sections of one form (owner,
// 2026-11-14): 「等待处理 · n」, what waits on you, then 「正在进行 · n」, what
// is at work. Where the card holds the agent's requests and replies, they are
// what waits on you, in place of the sessions waiting.
import type { ReactNode } from "react";
import type { Snapshot } from "@agent-hud/protocol";
import { useFormat } from "@agent-hud/ui/format-context";
import type { LiveSession } from "./agent-board";
import { useBoardInks } from "./AgentBoard";
import { PlaceRows, SessionsHeading } from "./PlaceRows";
import { splitWork } from "./place-sessions";

export function WorkSections({
  snapshot,
  entries,
  light,
  now,
  onStats,
  fold,
  news,
}: {
  snapshot: Snapshot;
  entries: readonly LiveSession[];
  light: boolean;
  now: number;
  onStats?: () => void;
  /** The agent whose running rows fold past three. */
  fold?: string;
  /** The agent's requests and replies, and how many: they wait on you. */
  news?: { count: number; content: ReactNode };
}) {
  const zh = useFormat().language === "zh";
  const { waiting, running } = splitWork(entries);
  const waitingCount = news ? news.count : waiting.length;
  return (
    <>
      {waitingCount > 0 && (
        <SessionsHeading light={light} count={waitingCount}>
          {zh ? "等待处理" : "WAITING"}
        </SessionsHeading>
      )}
      {news
        ? news.content
        : waiting.length > 0 && (
            <PlaceRows
              snapshot={snapshot}
              entries={waiting}
              light={light}
              now={now}
              onStats={onStats}
            />
          )}
      {running.length > 0 && (
        <div style={{ paddingTop: waitingCount > 0 ? 8 : 0 }}>
          <SessionsHeading light={light} count={running.length}>
            {zh ? "正在进行" : "IN PROGRESS"}
          </SessionsHeading>
          <PlaceRows
            snapshot={snapshot}
            entries={running}
            light={light}
            now={now}
            onStats={onStats}
            fold={fold}
          />
        </div>
      )}
    </>
  );
}

/** A card with nothing waiting and nothing at work; ChatGPT's counts chats. */
export function NothingYet({
  light,
  chats,
}: {
  light: boolean;
  chats: boolean;
}) {
  const zh = useFormat().language === "zh";
  const inks = useBoardInks(light);
  return (
    <span
      style={{ padding: "6px 6px 8px", fontSize: 12.5, color: inks.tertiary }}
    >
      {chats
        ? zh
          ? "今天还没有对话"
          : "No chats today"
        : zh
          ? "没有会话在跑，也没有在等你的"
          : "Nothing running, and nothing waiting on you"}
    </span>
  );
}
