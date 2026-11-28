// The windows' shared moving parts: a fold that opens and closes, rows that
// slide to their new places, a label that changes in place, and a chart's
// hover card. All of them take their paces from lib/motion and skip the
// motion when the system asks for less.
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import {
  EASE_OUT,
  MOTION_MS,
  cssCurve,
  systemReducesMotion,
} from "@agent-hud/ui/lib/motion";
import { arrive, foldFrames, type Pace } from "./moves";

export { TOOLTIP_DELAY, dataProgress, moves, scaledFill } from "./moves";

const curve = cssCurve(EASE_OUT);

/**
 * Opens and closes an element in place: its height and its content's
 * opacity go together, `enter` to open and the quicker `exit` to close.
 * `shown` stays true until the close has played, so the caller keeps the
 * content (and any look it has while open) up until then. Turning back
 * half way starts from where it is, not from either end.
 */
export function useFold<T extends HTMLElement>(open: boolean) {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(open);
  const playing = useRef<Animation | null>(null);
  const was = useRef(open);
  if (open && !shown) setShown(true);
  useLayoutEffect(() => {
    if (was.current === open) return;
    was.current = open;
    const element = ref.current;
    const running = playing.current;
    playing.current = null;
    if (!element || systemReducesMotion() || !element.animate) {
      running?.cancel();
      // A move cut short leaves no clip behind (ENG-18).
      if (running && element) element.style.overflow = "";
      if (!open) setShown(false);
      return;
    }
    // Where it is now, mid-way through the last move if one is playing.
    const now = running && {
      height: element.getBoundingClientRect().height,
      opacity: Number(getComputedStyle(element).opacity),
    };
    running?.cancel();
    const full = element.getBoundingClientRect().height;
    element.style.overflow = "hidden";
    const animation = element.animate(foldFrames(open, full, now || null), {
      duration: open ? MOTION_MS.enter : MOTION_MS.exit,
      easing: curve,
    });
    playing.current = animation;
    animation.onfinish = () => {
      playing.current = null;
      element.style.overflow = "";
      if (!open) setShown(false);
    };
  }, [open]);
  return { ref, shown };
}

/** A block that folds away: hidden once closed, opening and closing as
 * `useFold` does. */
export function Fold({
  open,
  children,
  ...rest
}: { open: boolean; children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  const { ref, shown } = useFold<HTMLDivElement>(open);
  return (
    <div {...rest} ref={ref} hidden={!shown}>
      {children}
    </div>
  );
}

/** An element that plays its arrival (see `arrive`) each time `at` changes,
 * not when it is first drawn. */
export function useArrival<T extends Element>(
  at: unknown,
  from: string,
  pace: Pace = "enter",
) {
  const ref = useRef<T>(null);
  const was = useRef(at);
  useLayoutEffect(() => {
    if (Object.is(was.current, at)) return;
    was.current = at;
    arrive(ref.current, from, pace);
  }, [at, from, pace]);
  return ref;
}

/** A page that went one level in (a session out of its list) slides in from
 * the right; one that came back out, from the left and quicker. */
export const useDrillArrival = (deeper: boolean) =>
  useArrival<HTMLElement>(
    deeper,
    deeper ? "translateX(8px)" : "translateX(-8px)",
    deeper ? "enter" : "exit",
  );

/**
 * Rows that slide to their new places when their order changes (FLIP: where
 * each was, where it is now, a `translateY` between). Give each row
 * `ref={place(id)}`; `order` is the rows' ids in the order drawn.
 */
export function useFlip(order: readonly string[]) {
  const nodes = useRef(new Map<string, HTMLElement>());
  const sliding = useRef(new Map<string, Animation>());
  const key = order.join("\n");
  const drawn = useRef(key);
  const before = useRef<Map<string, number> | null>(null);
  // Read before the new order reaches the page, like getSnapshotBeforeUpdate:
  // where each row is on screen, part way through its last slide included,
  // so reordering again mid-slide carries on instead of jumping.
  if (drawn.current !== key) {
    drawn.current = key;
    before.current = new Map(
      [...nodes.current].map(([id, node]) => [
        id,
        node.getBoundingClientRect().top,
      ]),
    );
  }
  useLayoutEffect(() => {
    const tops = before.current;
    before.current = null;
    if (!tops || systemReducesMotion()) return;
    for (const [id, node] of nodes.current) {
      sliding.current.get(id)?.cancel();
      sliding.current.delete(id);
      const at = node.getBoundingClientRect().top;
      const by = (tops.get(id) ?? at) - at;
      if (!by || !node.animate) continue;
      const slide = node.animate(
        [{ transform: `translateY(${by}px)` }, { transform: "none" }],
        { duration: MOTION_MS.enter, easing: curve },
      );
      sliding.current.set(id, slide);
      slide.onfinish = () => {
        if (sliding.current.get(id) === slide) sliding.current.delete(id);
      };
    }
  }, [key]);
  return useCallback(
    (id: string) => (node: HTMLElement | null) => {
      if (node) nodes.current.set(id, node);
      else nodes.current.delete(id);
    },
    [],
  );
}

/** A label that changes in place ("Copy" to "Copied"): both are laid on one
 * spot, so whatever holds it keeps the wider one's width, and they cross
 * fade. */
export function Swap({
  flipped,
  idle,
  done,
}: {
  flipped: boolean;
  idle: ReactNode;
  done: ReactNode;
}) {
  return (
    <span className="app-swap">
      <span aria-hidden={flipped}>{idle}</span>
      <span aria-hidden={!flipped}>{done}</span>
    </span>
  );
}

/**
 * A chart's hover card. It arrives with a 2 px rise and leaves faster
 * (motion.css); moving from one mark to the next moves it at once, since its
 * place is never tweened. While it leaves it keeps what it last showed.
 */
export function HoverTip({
  show,
  style,
  children,
}: {
  show: boolean;
  style: CSSProperties;
  children?: ReactNode;
}) {
  const kept = useRef({ style, children });
  const [present, setPresent] = useState(show);
  if (show && !present) setPresent(true);
  if (show) kept.current = { style, children };
  if (!present) return null;
  return (
    <div
      role="tooltip"
      className={show ? "app-tip" : "app-tip is-leaving"}
      style={kept.current.style}
      onAnimationEnd={(event) => {
        if (!show && event.target === event.currentTarget) setPresent(false);
      }}
    >
      {kept.current.children}
    </div>
  );
}
