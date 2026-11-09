/** What opening a session, a chat or a window came to (#220): true once the
 * user is there, else the reason it could not be. */
export type Opened = true | string;

/** How long a failed open says why before it may be tried again. */
export const RETRY_AFTER_MS = 4000;

/** Why an open failed, or null when it got there. */
export function failureOf(result: unknown, zh: boolean): string | null {
  if (result === true) return null;
  if (typeof result === "string" && result.trim()) return result.trim();
  return zh ? "无法回到这个会话" : "Couldn't return to this session";
}

/** Failed opens, each with when it may be tried again. */
export type Failures = ReadonlyMap<string, { reason: string; until: number }>;

/** The reason `key` failed, while it is still too soon to try again. */
export function failureAt(
  failures: Failures,
  key: string,
  now: number,
): string | null {
  const failure = failures.get(key);
  return failure && now < failure.until ? failure.reason : null;
}

/** Opens something the panel hands over to, such as Settings, and puts the
 * panel away only once it opened; resolves null then, else the reason it
 * did not, which may be empty. */
export async function openThenPutAway(
  open: () => unknown,
  putAway: () => void,
): Promise<string | null> {
  try {
    await open();
  } catch (failure) {
    return failure instanceof Error ? failure.message : String(failure ?? "");
  }
  putAway();
  return null;
}
