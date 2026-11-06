import { useEffect, useState, type CSSProperties } from "react";
import type { PendantLayout, PendantRect } from "../app-pendant";
import { PendantShell } from "./PendantShell";
import { diskReading, type DiskSlimState } from "../disk-slim";

export type { DiskSlimState } from "../disk-slim";

// The ball in layers (#160): the ball without its broom, the broom alone in
// place, and the bristles' shape for tinting them.
const BASE = new URL("../assets/disk-slim-base.png", import.meta.url).href;
const BROOM = new URL("../assets/disk-slim-broom.png", import.meta.url).href;
const BRISTLES = new URL("../assets/disk-slim-bristles.png", import.meta.url)
  .href;
/** Where things sit on the broom ghost's ball, as shares of its side
 * (measured on the 192 px ball): each [x, y, size] of the centre. */
const LIDS = [
  ["l", 0.31, 0.279, 0.098],
  ["r", 0.56, 0.307, 0.108],
] as const;
const SPARKS = [
  ["a", 0.53, 0.123, 0.22],
  ["b", 0.51, 0.82, 0.15],
] as const;
const BUBBLE = [0.665, 0.64, 0.12] as const;
/** Dust the broom kicks up at its bristles' tips while it sweeps. */
const PUFFS = [
  ["a", 0.62, 0.8, 0.052],
  ["b", 0.69, 0.785, 0.04],
  ["c", 0.56, 0.815, 0.032],
] as const;

function spot(x: number, y: number, size: number): CSSProperties {
  return {
    left: `${(x - size / 2) * 100}%`,
    top: `${(y - size / 2) * 100}%`,
    width: `${size * 100}%`,
    height: `${size * 100}%`,
  };
}

/** 磁盘瘦身, hung under 随手记 the same way (#155). A click asks the app to
 * open its own panel beside the ring, or hide it. Under the pointer: the ball
 * lifts, light sweeps the glass, the ghost blinks twice, two stars twinkle, a
 * bubble rises off the broom and the pendant sways; a press squashes it; an
 * ice halo breathes while the panel shows. The broom tells the space left
 * (#160, owner's pick 丙 with a yellow broom): low turns its bristles yellow
 * and it sweeps twice every eight seconds, critical turns them red and it
 * sweeps on, kicking up dust either way, even untouched. All motions are in
 * global.css (`hud-disk-*`); `still` stops them, the colours stay. */
export function DiskPendant({
  layout,
  state,
  light,
  zh,
  still,
  carried = false,
  onToggle,
}: {
  layout: PendantLayout;
  state: DiskSlimState;
  light: boolean;
  zh: boolean;
  still: boolean;
  carried?: boolean;
  onToggle: (anchor: PendantRect) => Promise<void>;
}) {
  // The app says whether its panel shows; right after a click, guess the
  // flip until its next word arrives.
  const [guess, setGuess] = useState<boolean | null>(null);
  useEffect(() => setGuess(null), [state.panelOpen]);
  // The app may never say (it refused the link, or the panel opened and
  // closed between two reads): give the guess up after ten seconds.
  useEffect(() => {
    if (guess === null) return;
    const timer = setTimeout(() => setGuess(null), 10000);
    return () => clearTimeout(timer);
  }, [guess]);
  const open = guess ?? state.panelOpen;
  const reading = diskReading(state);
  const level = reading?.level ?? "ok";
  const name = zh
    ? reading
      ? `磁盘瘦身，可用 ${reading.gib} GB`
      : "磁盘瘦身"
    : reading
      ? `Disk Slim, ${reading.gib} GB free`
      : "Disk Slim";
  return (
    <PendantShell
      app="disk"
      layout={layout}
      name={name}
      light={light}
      still={still}
      carried={carried}
      open={open}
      data={{ level }}
      onPress={(anchor) => {
        setGuess(!open);
        void onToggle(anchor).catch(() => setGuess(null));
      }}
    >
      <img
        src={BASE}
        alt=""
        draggable={false}
        style={{
          display: "block",
          width: layout.ball,
          height: layout.ball,
          borderRadius: "50%",
        }}
      />
      <span className="hud-disk-sweep" aria-hidden="true">
        <span className="hud-disk-broom">
          <img src={BROOM} alt="" draggable={false} />
          <span
            className="hud-disk-bristles"
            style={
              {
                WebkitMaskImage: `url("${BRISTLES}")`,
                maskImage: `url("${BRISTLES}")`,
              } as CSSProperties
            }
          />
        </span>
        {PUFFS.map(([which, x, y, size]) => (
          <span
            key={which}
            className={`hud-disk-puff hud-disk-puff-${which}`}
            style={spot(x, y, size)}
          />
        ))}
      </span>
      {LIDS.map(([side, x, y, size]) => (
        <span
          key={side}
          className={`hud-disk-lid hud-disk-lid-${side}`}
          aria-hidden="true"
          style={spot(x, y, size)}
        />
      ))}
      {SPARKS.map(([which, x, y, size]) => (
        <span
          key={which}
          className={`hud-disk-spark hud-disk-spark-${which}`}
          aria-hidden="true"
          style={spot(x, y, size)}
        />
      ))}
      <span
        className="hud-disk-bubble"
        aria-hidden="true"
        style={spot(...BUBBLE)}
      />
      <span className="hud-disk-sheen" aria-hidden="true" />
    </PendantShell>
  );
}
