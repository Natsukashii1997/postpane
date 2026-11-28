// A reply opened on the waiting card (owner, 2026-11-28): its closing lines
// (主线, 本次完成, 当前状态) in small print, then 下一步 large, as the ASK card
// lays its question out. The core keeps a reply's closing block whole
// (closing.rs, #562); this reads it back.

/** `text` without Markdown's bold stars: 「**本次完成**：x」 reads 「本次完成：x」. */
export const plainText = (text: string) => text.replace(/\*\*/g, "");

const SMALL = ["主线", "本次完成", "当前状态"] as const;
const NEXT = "下一步";

export interface ReplyClosing {
  /** The closing lines in small print, each with its label; or, for a reply
   * with none, its text under no label. */
  lines: { label: string | null; text: string }[];
  /** What 下一步 says; null when the reply names none. */
  next: string | null;
}

/** A reply's closing: each 「**主线**：…」, 「**本次完成**：…」, 「**当前状态**：…」
 * line and its 「**下一步**：…」. A reply without them is its text, whole. */
export function replyClosing(message: string): ReplyClosing {
  const lines: ReplyClosing["lines"] = [];
  let next: string | null = null;
  for (const raw of plainText(message).split("\n")) {
    const line = raw.trim();
    const label = [...SMALL, NEXT].find((mark) =>
      new RegExp(`^${mark}\\s*[:：]`).test(line),
    );
    if (!label) {
      // A line of its own carries on the one before it.
      const last = lines.at(-1);
      if (!line) continue;
      if (next !== null) next = `${next}\n${line}`;
      else if (last) last.text = `${last.text}\n${line}`;
      else lines.push({ label: null, text: line });
      continue;
    }
    const text = line.replace(/^[^:：]*[:：]\s*/, "");
    if (label === NEXT) next = text;
    else lines.push({ label, text });
  }
  return { lines, next: next?.trim() || null };
}
