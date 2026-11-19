// Which handoff card the sidebar shows, and among which relays it was
// opened (#427): moved out of HandoffCard.tsx for the 300-line ratchet.
import { useEffect, useSyncExternalStore } from "react";

/** The handoff card opened in the sidebar (HUDScene shows it): from a reply,
 * or from 「正在进行」's 「接力 1/2」 tag. One per window, as card-hold's. */
let opened: string | null = null;
/** The relays it was opened among, which 上一单 / 下一单 step through. */
let among: readonly string[] | null = null;
let hosts = 0;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const openedNow = () => opened;
const hostedNow = () => hosts > 0;
const opener = {
  open: (id: string, list?: readonly string[]) => openHandoffCard(id, list),
};

/** Opens `id`'s card among `list` (#427), or closes it (null). */
export function openHandoffCard(id: string | null, list?: readonly string[]) {
  among = id ? (list ?? null) : null;
  if (opened === id) return;
  opened = id;
  changed();
}

/** The relays the open card was opened among, if a list was given. */
export const openedAmong = () => among;

/** A way to open a handoff's card, where a sidebar shows it (none in a
 * preview without one). */
export function useHandoffCard(): {
  open(id: string, among?: readonly string[]): void;
} | null {
  return useSyncExternalStore(subscribe, hostedNow, hostedNow) ? opener : null;
}

/** For the sidebar that shows the card: the one opened now. */
export function useOpenedHandoffCard(): string | null {
  useEffect(() => {
    hosts++;
    changed();
    return () => {
      hosts--;
      if (hosts === 0) opened = null;
      changed();
    };
  }, []);
  return useSyncExternalStore(subscribe, openedNow, openedNow);
}
