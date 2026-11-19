// Which lists are open past their few, kept outside the component: the
// sidebar draws every panel twice, the one in view and a hidden copy that
// measures how tall the panel must be (HUDScene). A list opened in one copy
// only leaves the panel at its folded height, the rest scrolling inside a
// short card (#430). Both copies read the same store, so the card grows.
import { useSyncExternalStore } from "react";

export interface FoldStore {
  /** Whether `key`'s list is open, and a way to open or fold it. */
  use(key: string | undefined): [boolean, () => void];
  /** Folds every list back. */
  reset(): void;
}

export function foldStore(): FoldStore {
  const open = new Set<string>();
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
        changed();
      };
      return [isOpen, toggle];
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
