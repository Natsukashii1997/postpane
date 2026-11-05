import { useEffect, useId, useSyncExternalStore } from "react";

/** Parts of a card that hold it on screen while they are in use, as typing in
 * it does (HUDScene): the handoff sheet while it is open. One set per window. */
const holds = new Set<string>();
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const held = () => holds.size > 0;

/** Holds the card while `active`. */
export function useCardHold(active: boolean) {
  const key = useId();
  useEffect(() => {
    if (!active) return;
    holds.add(key);
    changed();
    return () => {
      holds.delete(key);
      changed();
    };
  }, [key, active]);
}

/** Whether a part of a card holds it now. */
export function useCardHeld(): boolean {
  return useSyncExternalStore(subscribe, held, held);
}
