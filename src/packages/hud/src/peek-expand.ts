/** How long a peek stays before it grows into the whole board, once shown
 * (owner, 2026-11-06: 「停久看全」). */
export const PEEK_EXPAND_AFTER_MS = 800;

/** What is left of the wait before the peek on a mark grows into the board.
 * `since` is when the pointer came to this mark: a peek shows after the
 * hover delay, and the board follows {@link PEEK_EXPAND_AFTER_MS} later. */
export function peekExpandWait(
  hoverDelayMs: number,
  since: number,
  now: number,
): number {
  return Math.max(0, since + hoverDelayMs + PEEK_EXPAND_AFTER_MS - now);
}

/** The agent the open sidebar is about; none means the whole board. An
 * alert's sender comes first; then the hovered mark's peek or panel, until
 * the peek has grown into the board. The notch only ever shows the board. */
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
