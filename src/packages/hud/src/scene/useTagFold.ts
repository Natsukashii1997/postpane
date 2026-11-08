import { useEffect, useRef, useState } from "react";
import { agedTags, TAG_NARROW_MS } from "./tag-fold";

/** Which waiting tags have hung whole for TAG_NARROW_MS (`aged`), and which
 * of them are drawn as their narrow slip now (`narrow`): all of them but
 * the agents in `awake` (the one under the pointer, the one a reply is being
 * typed to), whose tag opens out whole and folds back once the pointer
 * leaves it (#243). `tags` carry tagFoldKey's keys, one per waiting tag. */
export function useTagFold(
  tags: readonly { key: string; vendor: string }[],
  awake: ReadonlySet<string>,
): { aged: ReadonlySet<string>; narrow: ReadonlySet<string> } {
  const keys = tags.map((tag) => tag.key);
  const since = useRef(new Map<string, number>());
  const [, setTick] = useState(0);
  // Each key's age counts from the first frame it was drawn in.
  const now = Date.now();
  const listed = new Set(keys);
  for (const key of [...since.current.keys()])
    if (!listed.has(key)) since.current.delete(key);
  for (const key of keys)
    if (!since.current.has(key)) since.current.set(key, now);
  const aged = agedTags(since.current, now);
  // Draw again when the next tag comes of age.
  const due = Math.min(
    ...[...since.current.values()]
      .map((at) => at + TAG_NARROW_MS)
      .filter((at) => at > now),
  );
  useEffect(() => {
    if (!Number.isFinite(due)) return;
    const timer = setTimeout(
      () => setTick((tick) => tick + 1),
      due - Date.now() + 20,
    );
    return () => clearTimeout(timer);
  }, [due]);
  const narrow = new Set(
    tags
      .filter((tag) => aged.has(tag.key) && !awake.has(tag.vendor))
      .map((tag) => tag.key),
  );
  return { aged, narrow };
}
