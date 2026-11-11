import { HUDArtwork } from "../HUDArtwork";

/** A session at work, as a state rather than a stamp (#312, owner chose 乙
 * on 2026-11-11): the agent's own mark inside a thin turning arc, where
 * 「等你」 keeps its stamp. The arc turns in `.hud-running-ring`. */
export function RunningMark({
  source,
  label,
  color,
  light,
}: {
  source: string;
  label: string;
  color: string;
  light: boolean;
}) {
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      style={{
        position: "relative",
        width: 18,
        height: 18,
        display: "inline-grid",
        placeItems: "center",
        flexShrink: 0,
      }}
    >
      <HUDArtwork source={source} size={11} light={light} />
      <span
        aria-hidden
        className="hud-running-ring"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: "1.5px solid transparent",
          borderTopColor: color,
          borderRightColor: color,
        }}
      />
    </span>
  );
}
