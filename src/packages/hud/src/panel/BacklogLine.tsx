// A backlog line's second line (owner, 2026-11-28): what it asks, whole,
// wrapping, in a running row's small grey under the title; its buttons after
// the last line on the right, on that line where it leaves room, else on a
// line of their own. The text ends in a gap as wide as the buttons, so the
// last line makes room for them or wraps.
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/** What a LiveRow prints for a backlog line: how long it has waited, its
 * buttons, and what shows under it in place of them (the confirmation). */
export interface BacklogSlot {
  since: string | null;
  actions?: ReactNode;
  below?: ReactNode;
}

const LINE = 20;

export function BacklogLine({
  text,
  slot,
  inks,
}: {
  /** The row's line: 「问你：…」. */
  text: string;
  slot: BacklogSlot;
  inks: { secondary: string };
}) {
  const buttons = useRef<HTMLSpanElement>(null);
  const [room, setRoom] = useState(96);
  useLayoutEffect(() => {
    const width = buttons.current?.offsetWidth;
    if (width && width + 10 !== room) setRoom(width + 10);
  });
  return (
    <div style={{ gridColumn: "2 / 3", marginTop: 2 }}>
      <div
        style={{
          position: "relative",
          fontSize: 12,
          lineHeight: `${LINE}px`,
          color: inks.secondary,
          overflowWrap: "anywhere",
        }}
      >
        {text}
        {slot.actions && (
          <>
            <span
              aria-hidden
              style={{
                display: "inline-block",
                width: room,
                height: LINE,
                verticalAlign: "bottom",
              }}
            />
            <span
              ref={buttons}
              // The row opens its session's details and swipes: the buttons
              // keep their clicks to themselves.
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
              style={{
                position: "absolute",
                right: 0,
                bottom: 0,
                height: LINE,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {slot.actions}
            </span>
          </>
        )}
      </div>
      {slot.below && (
        <div
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {slot.below}
        </div>
      )}
    </div>
  );
}
