import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { EASE_OUT, cssCurve } from "@agent-hud/ui/lib/motion";
import type { PendantLayout, PendantRect } from "../app-pendant";

/** What swings under the pointer: the cord and ball, and 磁盘瘦身's broom. */
const SWINGS = ".hud-pendant-sway, .hud-disk-broom";
/** The pointer leaves mid-swing: it eases back upright over this long
 * instead of snapping from up to 13° (2026-11-25, owner chose 改). */
const SETTLE_MS = 400;

/** Before the swing stops, take each swinging part from where it is now back
 * to rest, so the leave reads as the pendant coming to a stop. */
function settle(root: HTMLElement | null) {
  for (const part of root?.querySelectorAll<HTMLElement>(SWINGS) ?? []) {
    const from = getComputedStyle(part).transform;
    if (from === "none" || from === "") continue;
    part.animate([{ transform: from }, { transform: "none" }], {
      duration: SETTLE_MS,
      easing: cssCurve(EASE_OUT),
    });
  }
}

const SHADOW =
  "drop-shadow(0 1px 1px rgba(0,0,0,.22)) drop-shadow(0 8px 14px rgba(0,0,0,.24))";

/** The part every self-built app's pendant shares (串挂同款, #155): the dashed
 * cord, the app's ball hung bare from it (no paper ring since 2026-11-11), the
 * sway from where the cord is tied. The app brings its ball's face (`children`) and its own motions,
 * keyed in global.css on `app`. */
export function PendantShell({
  app,
  layout,
  name,
  light,
  still,
  carried = false,
  open,
  data,
  onPress,
  children,
}: {
  /** Which app: global.css keys each app's motions on it. */
  app: string;
  layout: PendantLayout;
  /** The ball's accessible name. */
  name: string;
  light: boolean;
  /** Reduced motion, or animations turned off. */
  still: boolean;
  /** The strip is being dragged: the pendant rides along with it and takes
   * no pointer. */
  carried?: boolean;
  /** The app's panel shows: the ball's halo. */
  open: boolean;
  /** More data-* attributes for the app's styles (its state). */
  data?: Record<string, string | undefined>;
  /** A click on the ball, with its box in the page's points. */
  onPress: (anchor: PendantRect) => void;
  children: ReactNode;
}) {
  const { frame, horizontal, reversed, cord, ball } = layout;
  // Under the pointer, kept by hand rather than :hover so a leave can read
  // the swing's angle before it stops.
  const [hover, setHover] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const cordColor = light ? "rgba(42,41,37,.5)" : "rgba(236,231,220,.5)";
  // Along the top or bottom the cord meets the ball at its middle.
  const cordStyle: CSSProperties = horizontal
    ? {
        width: cord,
        height: 0,
        marginTop: ball / 2,
        borderTop: `1.5px dashed ${cordColor}`,
      }
    : { width: 0, height: cord, borderLeft: `1.5px dashed ${cordColor}` };
  const ballButton = (
    <button
      type="button"
      className="hud-app-pendant-ball"
      aria-label={name}
      aria-pressed={open}
      onClick={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        onPress({ x: box.x, y: box.y, width: box.width, height: box.height });
      }}
      style={{
        position: "relative",
        width: ball,
        height: ball,
        flex: "none",
        padding: 0,
        border: 0,
        borderRadius: "50%",
        background: "none",
        filter: SHADOW,
        cursor: "pointer",
      }}
    >
      <span
        className="hud-pendant-face"
        style={{
          position: "relative",
          display: "block",
          width: ball,
          height: ball,
        }}
      >
        {children}
      </span>
    </button>
  );
  const parts = [
    <span
      key="cord"
      aria-hidden="true"
      style={{ flex: "none", ...cordStyle }}
    />,
    <span key="ball" style={{ display: "flex" }}>
      {ballButton}
    </span>,
  ];
  // The pendant swings from where its cord is tied.
  const pivot = horizontal
    ? reversed
      ? "100% 50%"
      : "0 50%"
    : reversed
      ? "50% 100%"
      : "50% 0";
  const dataAttributes = Object.fromEntries(
    Object.entries(data ?? {}).map(([key, value]) => [`data-${key}`, value]),
  );
  return (
    <div
      ref={root}
      className="hud-app-pendant"
      data-app={app}
      data-motion={still ? "still" : "on"}
      data-hover={hover}
      data-open={open}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => {
        if (!still) settle(root.current);
        setHover(false);
      }}
      {...dataAttributes}
      style={{
        position: "absolute",
        left: frame.x,
        top: frame.y,
        width: frame.width,
        height: frame.height,
        zIndex: 3,
        userSelect: "none",
        pointerEvents: carried ? "none" : undefined,
      }}
    >
      <div
        className="hud-pendant-sway"
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: horizontal ? "row" : "column",
          alignItems: horizontal ? "flex-start" : "center",
          transformOrigin: pivot,
        }}
      >
        {reversed ? parts.reverse() : parts}
      </div>
    </div>
  );
}
