// The ChatGPT relay's review cap in Settings (#409): how many reviews one
// leave of the owner's gives, 1 to 9, five unless set (owner 2026-11-19).

/** The cap's choices, 1 to `max` rounds, `fallback` marked as the default. */
export function reviewLimitOptions(
  max: number,
  fallback: number,
  zh: boolean,
): [string, string][] {
  return Array.from({ length: max }, (_, index) => {
    const n = index + 1;
    const word = zh ? `${n} 轮` : String(n);
    const marked = zh ? `${word}（默认）` : `${n} (default)`;
    return [String(n), n === fallback ? marked : word];
  });
}
