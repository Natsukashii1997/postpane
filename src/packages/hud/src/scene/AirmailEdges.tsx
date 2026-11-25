import { airmailStripes } from "../paper";
import type { Insets } from "./receipt-sheet";

type Side = "left" | "right" | "top" | "bottom";

/** A handoff's airmail edge (owner, 2026-11-06): red and blue stripes along
 * `sides` of the paper, never its hole side. */
export function AirmailEdges({
  holes,
  sides,
  width,
  inset,
}: {
  holes: Side;
  sides: Side[];
  width: number;
  inset?: Insets;
}) {
  // A band along the hole side's neighbour stops short of the holes.
  const clear = 7;
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        ...inset,
        borderRadius: 3,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {sides
        .filter((side) => side !== holes)
        .map((side) => {
          const across = side === "top" || side === "bottom";
          return (
            <span
              key={side}
              style={{
                position: "absolute",
                [side]: 0,
                ...(across
                  ? {
                      height: width,
                      left: holes === "left" ? clear : 0,
                      right: holes === "right" ? clear : 0,
                    }
                  : {
                      width,
                      top: holes === "top" ? clear : 0,
                      bottom: holes === "bottom" ? clear : 0,
                    }),
                background: airmailStripes(width),
              }}
            />
          );
        })}
    </span>
  );
}
