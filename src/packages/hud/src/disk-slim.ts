// 磁盘瘦身's pendant (#155): what the host reads from the app's status file,
// and the figure its badge prints. Kept free of the UI so the tests can run it.

/** What 磁盘瘦身 last wrote (host disk_slim): free space and its band while
 * fresh, and whether its panel shows. */
export interface DiskSlimState {
  installed: boolean;
  availableBytes?: number | null;
  level?: string | null;
  panelOpen: boolean;
}

const GIB = 1024 ** 3;

/** The badge's figure, whole GiB left as 磁盘瘦身's menu bar prints it; none
 * while space is fine or the status is unknown (low under 60 GB is orange, critical under 30 GB red). */
export function diskBadge(state: DiskSlimState): string | null {
  if (state.level !== "low" && state.level !== "critical") return null;
  if (typeof state.availableBytes !== "number" || state.availableBytes < 0)
    return null;
  return `${Math.floor(state.availableBytes / GIB)}G`;
}
