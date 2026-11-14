/** Each dot's place along the diagonal, top-left (0) to bottom-right (4). */
const WAVE = [0, 1, 2, 1, 2, 3, 2, 3, 4];

/** A session at work, as a state rather than a stamp: a 3×3 grid of small
 * square dots that a light sweeps across from top-left to bottom-right, the
 * same for every agent and without the agent's mark (#321, owner chose 乙
 * 「信号灯阵」 on 2026-11-14, replacing #312's arc around the mark). The sweep
 * runs in `.hud-running-grid`; 「等你」 keeps its stamp. */
export function RunningMark({
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
      className="hud-running-grid"
      style={{
        width: 18,
        height: 18,
        display: "inline-grid",
        gridTemplateColumns: "repeat(3, 3px)",
        gridAutoRows: 3,
        gap: 2.5,
        placeContent: "center",
        flexShrink: 0,
      }}
    >
      {WAVE.map((step, index) => (
        <span
          key={index}
          aria-hidden
          style={{
            background: color,
            borderRadius: 0.8,
            animationDelay: `${step * 0.13}s`,
          }}
        />
      ))}
    </span>
  );
}
