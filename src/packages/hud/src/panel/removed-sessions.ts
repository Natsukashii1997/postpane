import { useCallback, useSyncExternalStore } from "react";
import type { LiveSession } from "./agent-board";

/** Sessions taken off the panel's list (owner, 2026-11-05): ones the person
 * won't or can't answer any more. Each is kept with what it looked like when
 * it was removed, and comes back once that changes: its status, the request
 * it waits on, or, while it waits, its latest message. */
export type RemovedSessions = Record<string, string>;

const storageKey = "postpane.removedSessions";
const kept = 100;

export const removedKey = ({ session }: LiveSession) =>
  `${session.source}:${session.id}`;

/** What a listed session shows now; removing it remembers this. */
export function removalMark({ session, status, approval }: LiveSession) {
  return [
    status,
    approval?.id ?? "",
    status === "waiting" ? (session.lastMessageAt ?? session.updatedAt) : "",
  ].join("|");
}

export function shownSessions(
  live: readonly LiveSession[],
  removed: RemovedSessions,
): LiveSession[] {
  return live.filter(
    (entry) => removed[removedKey(entry)] !== removalMark(entry),
  );
}

/** The removals still in force: one whose session is listed with something
 * new, or is known and listed no more (it stopped), is dropped, so the next
 * run shows again; one whose session the snapshot doesn't hold is kept. */
export function prunedRemovals(
  removed: RemovedSessions,
  live: readonly LiveSession[],
  known: ReadonlySet<string>,
): RemovedSessions {
  const listed = new Map(live.map((entry) => [removedKey(entry), entry]));
  return Object.fromEntries(
    Object.entries(removed).filter(([key, mark]) => {
      const entry = listed.get(key);
      return entry ? removalMark(entry) === mark : !known.has(key);
    }),
  );
}

export function withRemoval(
  removed: RemovedSessions,
  entry: LiveSession,
): RemovedSessions {
  const key = removedKey(entry);
  const rest = Object.entries(removed).filter(([other]) => other !== key);
  return Object.fromEntries([
    ...rest.slice(-(kept - 1)),
    [key, removalMark(entry)],
  ]);
}

// Kept in the webview's storage, shared by every HUD window and kept across
// restarts; a storage event tells the other windows.
let cached: { raw: string | null; value: RemovedSessions } | null = null;
const listeners = new Set<() => void>();
const none: RemovedSessions = {};

function read(): RemovedSessions {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(storageKey);
  } catch {
    return none;
  }
  if (cached?.raw === raw) return cached.value;
  let value: RemovedSessions = {};
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
      value = Object.fromEntries(
        Object.entries(parsed).filter(
          (pair): pair is [string, string] => typeof pair[1] === "string",
        ),
      );
  } catch {
    value = {};
  }
  cached = { raw, value };
  return value;
}

function write(next: RemovedSessions) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    return;
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useRemovedSessions() {
  const removed = useSyncExternalStore(subscribe, read, () => none);
  const remove = useCallback(
    (entry: LiveSession) => write(withRemoval(read(), entry)),
    [],
  );
  const prune = useCallback(
    (live: readonly LiveSession[], known: ReadonlySet<string>) => {
      const current = read();
      const next = prunedRemovals(current, live, known);
      if (Object.keys(next).length !== Object.keys(current).length) write(next);
    },
    [],
  );
  return { removed, remove, prune };
}
