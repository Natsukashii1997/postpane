import { weeklyWindow } from "./quota-rows.ts";

/** A quota window, as far as a held reading needs it. */
interface HeldWindow {
  usedPercent: number | null;
  status: string;
  resetAt?: string | null;
  windowDurationSeconds?: number | null;
  allModels?: boolean;
}

/**
 * The window of an agent's last reading its mark leads with (its weekly
 * window, else its tightest, as `leadingWindow`) while every window waits on
 * a failed read ("stale"), so a Simple mark keeps drawing it in the stale
 * grey instead of an empty ring. A window whose reset has passed holds
 * nothing, since its share has started over. Null while any window reads
 * live, or when none has a number (vendors.rs `held`).
 */
export function heldUsed(
  quotas: readonly HeldWindow[],
  now: number,
): number | null {
  if (quotas.some((q) => q.usedPercent != null && q.status !== "stale"))
    return null;
  let held: number | null = null;
  let weekly = false;
  for (const q of quotas) {
    if (q.usedPercent == null || !Number.isFinite(q.usedPercent)) continue;
    const reset = q.resetAt ? Date.parse(q.resetAt) : NaN;
    if (reset <= now) continue;
    const leads = weeklyWindow(q);
    if (weekly && !leads) continue;
    if (held == null || (leads && !weekly) || q.usedPercent > held)
      held = q.usedPercent;
    weekly ||= leads;
  }
  return held;
}
