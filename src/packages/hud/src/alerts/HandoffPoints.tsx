// ChatGPT's review points on the handoff card, numbered. Moved out of
// HandoffCard.tsx for the 300-line ratchet when the numbers got room for a
// second digit (#336).
import { cardColumn } from "../card-column";
import type { Inks } from "../permissions/ListCard";
import { pointMarkColumn } from "./handoff-card";

export function HandoffPoints({
  points,
  inks,
}: {
  points: string[];
  inks: Inks;
}) {
  const marks = pointMarkColumn(points.length);
  return (
    <ol
      style={{
        margin: 0,
        padding: 0,
        listStyle: "none",
        ...cardColumn(4),
      }}
    >
      {points.map((point, index) => (
        <li
          key={index}
          style={{
            display: "grid",
            gridTemplateColumns: `${marks} 1fr`,
            fontSize: 12.5,
            lineHeight: 1.55,
            color: inks.mid,
          }}
        >
          <span style={{ color: inks.dim, fontVariantNumeric: "tabular-nums" }}>
            {index + 1}.
          </span>
          <span
            title={point}
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              overflowWrap: "anywhere",
            }}
          >
            {point}
          </span>
        </li>
      ))}
    </ol>
  );
}
