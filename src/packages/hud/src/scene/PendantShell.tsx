import type { CSSProperties, ReactNode } from "react";
import type { PendantLayout, PendantRect } from "../app-pendant";
import { PAPER_GRAIN } from "../paper";

const SHADOW =
  "drop-shadow(0 1px 1px rgba(0,0,0,.22)) drop-shadow(0 8px 14px rgba(0,0,0,.24))";

/** The part every self-built app's pendant shares (串挂同款, #155): the dashed
 * cord, the paper ring holding the app's ball, the sway from where the cord
 * is tied. The app brings its ball's face (`children`), anything pinned on
 * the ring (`badge`) and its own motions, keyed in global.css on `app`. */
export function PendantShell({
  app,
  layout,
  name,
  light,
  still,
  carried = false,
  open,
  data,
  badge,
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
  /** The app's panel shows: the ring's halo. */
  open: boolean;
  /** More data-* attributes for the app's styles (its state). */
  data?: Record<string, string | undefined>;
  badge?: ReactNode;
  /** A click on the ball, with the ring's box in the page's points. */
  onPress: (anchor: PendantRect) => void;
  children: ReactNode;
}) {
  const { frame, horizontal, reversed, cord, ring, ball } = layout;
  const paper = light ? "#f3f1eb" : "#e9e6de";
  const cordColor = light ? "rgba(42,41,37,.5)" : "rgba(236,231,220,.5)";
  // Along the top or bottom the cord meets the ring at its middle.
  const cordStyle: CSSProperties = horizontal
    ? {
        width: cord,
        height: 0,
        marginTop: ring / 2,
        borderTop: `1.5px dashed ${cordColor}`,
      }
    : { width: 0, height: cord, borderLeft: `1.5px dashed ${cordColor}` };
  const ringButton = (
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
        width: ring,
        height: ring,
        flex: "none",
        padding: (ring - ball) / 2,
        border: 0,
        borderRadius: "50%",
        background: `${PAPER_GRAIN} 0 0 / 160px 160px, ${paper}`,
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
      {badge}
    </button>
  );
  const parts = [
    <span
      key="cord"
      aria-hidden="true"
      style={{ flex: "none", ...cordStyle }}
    />,
    <span key="ring" style={{ display: "flex" }}>
      {ringButton}
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
      className="hud-app-pendant"
      data-app={app}
      data-motion={still ? "still" : "on"}
      data-open={open}
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
