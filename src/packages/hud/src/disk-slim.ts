// 磁盘瘦身's pendant (#155): what the host reads from the app's status file,
// and the reading its broom shows (#160). Kept free of the UI so the tests can
// run it.

/** What 磁盘瘦身 last wrote (host disk_slim): free space and its band while
 * fresh, and whether its panel shows. */
export interface DiskSlimState {
  installed: boolean;
  availableBytes?: number | null;
  level?: string | null;
  panelOpen: boolean;
}

const GIB = 1024 ** 3;

/** The band the broom's colour shows (honey when low, coral when critical)
 * with whole GiB left, as 磁盘瘦身's menu bar
 * prints it; none while space is fine or the status is unknown (low is under
 * 60 GB, critical under 30 GB, as the app decides). */
export function diskReading(
  state: DiskSlimState,
): { level: "low" | "critical"; gib: number } | null {
  if (state.level !== "low" && state.level !== "critical") return null;
  if (typeof state.availableBytes !== "number" || state.availableBytes < 0)
    return null;
  return {
    level: state.level,
    gib: Math.floor(state.availableBytes / GIB),
  };
}
