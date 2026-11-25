// Which lists are open past their few, kept outside the component: the
// sidebar draws every panel twice, the one in view and a hidden copy that
// measures how tall the panel must be (HUDScene). A list opened in one copy
// only leaves the panel at its folded height, the rest scrolling inside a
// short card (#430). Both copies read the same store, so the card grows.
import { useSyncExternalStore } from "react";

export interface FoldStore {
  /** Whether `key`'s list is open, a way to open or fold it, and whether it
   * was opened or folded just now: rows that fold brings or takes move, where
   * rows that come and go for any other reason (an answer, a removal, another
   * list's fold) just appear or go. */
  use(key: string | undefined): [boolean, () => void, boolean];
  /** Folds every list back. */
  reset(): void;
}

/** Long enough for a fold's rows to start moving on the renders it causes. */
const MOVING_MS = 600;

export function foldStore(): FoldStore {
  const open = new Set<string>();
  const toggledAt = new Map<string, number>();
  const listeners = new Set<() => void>();
  const changed = () => listeners.forEach((listener) => listener());
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  return {
    use(key) {
      const now = () => Boolean(key && open.has(key));
      const isOpen = useSyncExternalStore(subscribe, now, now);
      const toggle = () => {
        if (!key) return;
        if (!open.delete(key)) open.add(key);
        toggledAt.set(key, Date.now());
        changed();
      };
      const at = key ? toggledAt.get(key) : undefined;
      return [isOpen, toggle, at !== undefined && Date.now() - at < MOVING_MS];
    },
    reset() {
      if (!open.size) return;
      open.clear();
      changed();
    },
  };
}

/** The cards' 「展开其余 n 条」 lists: folded again once the sidebar closes,
 * so a card opens with its first few, as the owner set (#374, #382). */
export const cardFolds = foldStore();
