// A backlog line's mark (owner chose 丙 on 2026-11-28): its own icon in the
// mark column, where a running row has its 3×3 dots and the waiting list its
// agent's mark; never a tag. A ring stopped three quarters round, in violet,
// that does not turn but breathes (`.hud-backlog-stall` in global.css): the
// work is stuck, the opposite of the running dots' sweep.
export function BacklogMark({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="hud-backlog-stall"
      style={{ width: 18, height: 18, display: "inline-block", color }}
    >
      <svg viewBox="0 0 18 18" width={18} height={18} fill="none" aria-hidden>
        <circle
          cx={9}
          cy={9}
          r={6}
          stroke="currentColor"
          strokeOpacity={0.22}
          strokeWidth={1.6}
        />
        <path
          className="hud-stall-arc"
          d="M9 3a6 6 0 1 1 -6 6"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
        />
        <circle
          className="hud-stall-dot"
          cx={3}
          cy={9}
          r={1.3}
          fill="currentColor"
        />
      </svg>
    </span>
  );
}
