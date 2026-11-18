// The peek's work line (ADR-0001 C3): 「等你 n · 在跑 n · 接力 n」 under the
// readings, from the same workspace as the card and the board; a zero is
// written out too, in the faint ink. Its room is `PEEK_WORK` in peek-size.
import { Fragment } from "react";
import type { PeekWork } from "../workspace";
import { PEEK_WORK } from "./peek-size";

export interface WorkInks {
  /** The labels' and dots' ink, and how faint where it is the text's own. */
  dim: string;
  dimOpacity?: number;
  /** A count's ink; a zero takes `dim`. */
  ink: string;
  /** The receipt's figures font, and its size before scale (12 off it). */
  figures?: string;
  size: number;
}

export function WorkLine({
  work,
  scale,
  zh,
  inks,
}: {
  work: PeekWork;
  scale: number;
  zh: boolean;
  inks: WorkInks;
}) {
  const items = [
    { key: "waiting", label: zh ? "等你" : "Waiting", count: work.waiting },
    { key: "running", label: zh ? "在跑" : "Running", count: work.running },
    { key: "relays", label: zh ? "接力" : "Relays", count: work.relays },
  ];
  const dim = { color: inks.dim, opacity: inks.dimOpacity };
  return (
    <div
      className="hud-peek-work"
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 5 * scale,
        height: PEEK_WORK * scale,
        lineHeight: `${PEEK_WORK * scale}px`,
        whiteSpace: "nowrap",
      }}
    >
      {items.map((item, index) => (
        <Fragment key={item.key}>
          {index > 0 && (
            <span aria-hidden="true" style={dim}>
              ·
            </span>
          )}
          <span style={dim}>{item.label}</span>
          <strong
            style={{
              fontFamily: inks.figures,
              fontVariantNumeric: "tabular-nums",
              fontSize: inks.size * scale,
              fontWeight: 700,
              ...(item.count ? { color: inks.ink } : dim),
            }}
          >
            {item.count}
          </strong>
        </Fragment>
      ))}
    </div>
  );
}
