/** How long a peek stays before it grows into its agent's panel, once shown
 * (owner, 2026-11-06: 「停久看全」; 0.8 s left too little time to read the
 * peek, the owner settled on 1.5 s). */
export const PEEK_EXPAND_AFTER_MS = 1500;

/** What a peek left on its mark grows into: that agent's own panel, as a
 * click on the mark opens it (owner, 2026-11-07, #202: the whole board, every
 * agent at once, was more than wanted). The board stays for the notch, the
 * menu's 「打开面板」 and an edit hold, which have no one agent to show. */
export const PEEK_GROWS_INTO = { pinned: true, expanded: false } as const;

/** What is left of the wait before the peek on a mark grows into its panel.
 * `since` is when the pointer came to this mark: a peek shows after the
 * hover delay, and the panel follows {@link PEEK_EXPAND_AFTER_MS} later. */
export function peekExpandWait(
  hoverDelayMs: number,
  since: number,
  now: number,
): number {
  return Math.max(0, since + hoverDelayMs + PEEK_EXPAND_AFTER_MS - now);
}

/** The mark whose peek grows into its agent's panel now, if any: the peek
 * shown on its own mark, nothing pinned or out yet, and the pointer still on
 * the sidebar. A pointer gone to a pendant or out of the window leaves the
 * peek closing, not growing (#480). */
export function peekGrowing({
  peek,
  pinned,
  expanded,
  hovered,
  focused,
  pointerInside,
}: {
  peek: boolean;
  pinned: boolean;
  expanded: boolean;
  hovered: string | null;
  focused: string | undefined;
  pointerInside: boolean;
}): string | null {
  return peek && !pinned && !expanded && focused === hovered && pointerInside
    ? hovered
    : null;
}

/** The agent the open sidebar is about; none means the whole board. An
 * alert's sender comes first; then the hovered mark's peek or panel, unless
 * the board is out (menu, edit hold). The notch only ever shows the board. */
export function cardAgent({
  notch,
  sender,
  inUsagePanel,
  expanded,
  hovered,
}: {
  notch: boolean;
  sender?: string;
  inUsagePanel: boolean;
  expanded: boolean;
  hovered: string | null;
}): string | undefined {
  if (notch) return undefined;
  if (sender && !inUsagePanel) return sender;
  if (expanded) return undefined;
  return hovered ?? undefined;
}

/** A quota or reset event may sit inside a panel only where one is out (the
 * board, a pinned agent's panel, the notch's): a peek has no room for it. */
export function inlineAlertAllowed({
  notch,
  expanded,
  pinned,
}: {
  notch: boolean;
  expanded: boolean;
  pinned: boolean;
}): boolean {
  return notch || expanded || pinned;
}
