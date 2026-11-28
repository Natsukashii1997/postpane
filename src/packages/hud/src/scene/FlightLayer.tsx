// A host's flight between two agents' marks, told as a short story: an open
// envelope pops up beside the sender and a letter slides in from its mark; the
// flap closes and the envelope folds into a paper plane; it flies a looping
// route, a dashed trail fading behind it; beside the receiver it unfolds and
// opens, and the letter slides into the receiver's mark, which bounces.
// Around the notch, where agents have no marks, two robots peek out of small
// wings at its sides and play the marks' part. Every part is a Web Animation
// on elements that exist only while a flight is under way: idle, this draws
// nothing and runs nothing.
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { BotMark } from "../BotMark";
import { botKey } from "../bots/artwork";
import { botState, type BotCue } from "../bots/bot-state";
import { islandPath, type HUDRect } from "../geometry";
import type { HUDEdge, HUDMode } from "../model";
import {
  CATCH,
  catchFrames,
  dockRoute,
  FLIGHT_FRESHNESS_MS,
  FlightQueue,
  inward,
  notchRoute,
  notchStage,
  STORY,
  stillStory,
  story,
  THROW,
  throwFrames,
  type HUDFlightCommand,
  type Point,
  type Ride,
  type Story,
} from "./flight-plan";
import {
  Count,
  Envelope,
  Flap,
  Letter,
  Paper,
  PlaneDrawing,
  Pocket,
  Shadow,
  type Tone,
} from "./flight-craft";
import { lowFace } from "./flight-paper";

export type { HUDFlight, HUDFlightCommand } from "./flight-plan";

interface LayerProps {
  /** The host's recent flights, oldest first; each is taken once, by its sequence. */
  flights?: readonly HUDFlightCommand[];
  mode: HUDMode;
  edge: HUDEdge;
  /** The notch around the notch; the dock's strip otherwise. */
  strip: HUDRect;
  scene: RefObject<HTMLElement | null>;
  botLogos: boolean;
  reduceMotion: boolean;
  light: boolean;
}

export function FlightLayer({ flights, ...stage }: LayerProps) {
  const queue = useRef(new FlightQueue());
  const seen = useRef(0);
  const [ride, setRide] = useState<Ride | null>(null);
  useEffect(() => {
    let changed = false;
    for (const command of flights ?? []) {
      if (command.sequence <= seen.current) continue;
      seen.current = command.sequence;
      if (performance.now() - command.at < FLIGHT_FRESHNESS_MS)
        changed = queue.current.add(command.flight) || changed;
    }
    if (changed) setRide(queue.current.current);
  }, [flights]);
  if (!ride) return null;
  return (
    <FlightRun
      key={ride.id}
      ride={ride}
      {...stage}
      onDone={() => {
        if (queue.current.finish(ride.id)) setRide(queue.current.current);
      }}
    />
  );
}

const keep = { fill: "both", easing: "linear" } as const;
/** The craft's width and its envelope's height, from the marks' size. */
const craftSize = (mark: number) => {
  const width = Math.round(Math.min(32, Math.max(18, mark * 0.6)));
  return { width, height: Math.round(width * 0.72) };
};

/** Where a flight happens: the route's ends beside the two marks, the marks
 * (or robots) themselves, and the elements that play the marks' part. */
interface Ends {
  start: Point;
  end: Point;
  from: Point;
  to: Point;
  route: ReturnType<typeof dockRoute>;
  sender: Element | null;
  receiver: Element | null;
}

function FlightRun({
  ride,
  mode,
  edge,
  strip,
  scene,
  botLogos,
  reduceMotion,
  light,
  onDone,
}: Omit<LayerProps, "flights"> & { ride: Ride; onDone: () => void }) {
  const { flight, count } = ride;
  const notch = mode === "notch";
  const stage = notch ? notchStage(strip) : null;
  // Around the notch the sender stands left or right for its whole chain.
  const leftSource = flight.fromLeft ? flight.from : flight.to;
  const rightSource = flight.fromLeft ? flight.to : flight.from;
  const [size, setSize] = useState(() => craftSize(notch ? 34 : 44));
  const [puffs, setPuffs] = useState<Story["puffs"]>([]);
  const craft = useRef<HTMLDivElement>(null);
  const turn = useRef<HTMLDivElement>(null);
  const mirror = useRef<HTMLDivElement>(null);
  const roll = useRef<HTMLDivElement>(null);
  const paper = {
    edge: useRef<HTMLDivElement>(null),
    body: useRef<HTMLDivElement>(null),
    low: useRef<HTMLDivElement>(null),
  };
  const shadow = useRef<HTMLDivElement>(null);
  const flap = useRef<SVGSVGElement>(null);
  const pocket = useRef<SVGSVGElement>(null);
  const folds = useRef<SVGSVGElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const letter = useRef<HTMLDivElement>(null);
  const second = useRef<HTMLDivElement>(null);
  const trail = useRef<HTMLDivElement>(null);
  const wings = {
    left: useRef<SVGSVGElement>(null),
    right: useRef<SVGSVGElement>(null),
  };
  const bots = {
    left: useRef<HTMLDivElement>(null),
    right: useRef<HTMLDivElement>(null),
  };
  const [puzzled, setPuzzled] = useState<BotCue | null>(null);
  const [plan, setPlan] = useState<{ ends: Ends; story: Story | null } | null>(
    null,
  );
  const done = useRef(onDone);
  done.current = onDone;

  // First: measure where it happens and plan the story (the trail's dashes
  // and the craft's size are drawn from it).
  useLayoutEffect(() => {
    const measured = notch ? notchEnds() : dockEnds();
    if (!measured) {
      done.current();
      return;
    }
    setSize(measured.size);
    const delay = notch ? STORY.enter : 0;
    const planned = reduceMotion
      ? null
      : story({
          route: measured.ends.route,
          from: measured.ends.from,
          to: measured.ends.to,
          falls: flight.falls,
          delay,
          craft: measured.size.width,
        });
    setPuffs(planned?.puffs ?? []);
    setPlan({ ends: measured.ends, story: planned });

    /** Around the notch: from beside the sender's robot, under the notch, to beside the receiver's. */
    function notchEnds() {
      if (!stage) return null;
      const size = craftSize(34);
      const below = (robot: Point) => ({
        x: robot.x,
        y: stage.top + stage.height + size.height / 2 + 6,
      });
      const [from, to] = flight.fromLeft
        ? [stage.left, stage.right]
        : [stage.right, stage.left];
      const start = below(from);
      const end = below(to);
      return {
        size,
        ends: {
          start,
          end,
          from,
          to,
          route: notchRoute(start, end, stage.dip),
          sender: null,
          receiver: null,
        },
      };
    }
    /** On a dock: beside the sender's mark and the receiver's, both found where the strip drew them. */
    function dockEnds() {
      const root = scene.current;
      if (!root) return null;
      const bounds = root.getBoundingClientRect();
      const logo = (source: string) =>
        [
          ...root.querySelectorAll<HTMLElement>(
            `.hud-resting-strip [data-bot-source="${botKey(source)}"]`,
          ),
        ].find((element) => !element.closest("[data-hud-measurement]")) ?? null;
      // The route runs beside the whole mark (its stub included), not the logo inside it.
      const mark = (source: string) => {
        const found = logo(source);
        return found?.closest<HTMLElement>(".hud-agent-mark") ?? found;
      };
      // The robot alone throws and catches; the stub stays put (#171).
      const robot = (source: string) => logo(source)?.parentElement ?? null;
      const sender = mark(flight.from);
      const receiver = mark(flight.to);
      const shelf = (sender ?? receiver)
        ?.closest(".hud-resting-strip")
        ?.getBoundingClientRect();
      const box = (element: HTMLElement | null) => {
        if (!element)
          return {
            center: {
              x: strip.x + strip.width / 2,
              y: strip.y + strip.height / 2,
            },
            side: Math.min(strip.width, strip.height),
          };
        const rect = element.getBoundingClientRect();
        return {
          center: {
            x: rect.left + rect.width / 2 - bounds.left,
            y: rect.top + rect.height / 2 - bounds.top,
          },
          side: Math.max(rect.width, rect.height),
        };
      };
      const from = box(sender);
      const to = box(receiver);
      const size = craftSize(from.side);
      const n = inward[edge];
      // Just outside the dock's inner edge, level with the mark.
      const inner = (center: Point) => {
        if (!shelf) return 0;
        const left = shelf.left - bounds.left;
        const top = shelf.top - bounds.top;
        if (n.x < 0) return center.x - left;
        if (n.x > 0) return left + shelf.width - center.x;
        if (n.y < 0) return center.y - top;
        return top + shelf.height - center.y;
      };
      const beside = (mark: { center: Point; side: number }) => {
        const reach =
          Math.max(mark.side / 2, inner(mark.center)) + size.width * 0.5 + 6;
        return {
          x: mark.center.x + n.x * reach,
          y: mark.center.y + n.y * reach,
        };
      };
      const start = beside(from);
      const end = beside(to);
      return {
        size,
        ends: {
          start,
          end,
          from: from.center,
          to: to.center,
          route: dockRoute(
            start,
            end,
            edge,
            { width: bounds.width, height: bounds.height },
            size.width,
          ),
          sender: robot(flight.from),
          receiver: robot(flight.to),
        },
      };
    }
  }, []);

  // Then: hand every part its keyframes.
  useLayoutEffect(() => {
    if (!plan) return;
    const animations: Animation[] = [];
    const run = (
      element: Element | null | undefined,
      frames: Keyframe[],
      options: KeyframeAnimationOptions,
    ) => {
      if (element)
        animations.push(element.animate(frames, { ...keep, ...options }));
    };
    const { ends } = plan;
    const sender = notch
      ? (flight.fromLeft ? bots.left : bots.right).current
      : ends.sender;
    const receiver = notch
      ? (flight.fromLeft ? bots.right : bots.left).current
      : ends.receiver;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let length: number = STORY.still;
    if (!plan.story) {
      const still = stillStory(flight.falls);
      run(craft.current, still.first, { duration: STORY.still });
      run(second.current, still.second, { duration: STORY.still });
    } else {
      const s = plan.story;
      const delay = notch ? STORY.enter : 0;
      length = notch ? s.length + STORY.leave : s.length;
      run(craft.current, s.move, { duration: s.length });
      run(turn.current, s.turn, { duration: s.length });
      run(mirror.current, s.mirror, { duration: s.length });
      run(roll.current, s.roll, { duration: s.length });
      run(paper.edge.current, s.shape, { duration: s.length });
      run(paper.body.current, s.shape, { duration: s.length });
      run(paper.low.current, lowFace(s.shape), { duration: s.length });
      run(shadow.current, s.shadow, { duration: s.length });
      run(craft.current?.firstElementChild, s.pop, { duration: s.length });
      run(flap.current, s.flap, { duration: s.length });
      run(folds.current, s.folds, { duration: s.length });
      run(pocket.current, s.pocket, { duration: s.length });
      run(
        sheet.current,
        s.folds.map((frame) => ({
          offset: frame.offset,
          opacity: 1 - Number(frame.opacity),
        })),
        { duration: s.length },
      );
      run(letter.current, s.letter, { duration: s.length });
      trail.current?.querySelectorAll("[data-puff]").forEach((puff, index) => {
        const frames = s.puffs[index]?.frames;
        if (frames) run(puff, frames, { duration: s.length });
      });
      if (notch && stage) {
        for (const side of ["left", "right"] as const) {
          const receiving = (side === "left") !== flight.fromLeft;
          const appears =
            receiving && flight.arrives ? s.takeoff + STORY.fly * 0.4 : 0;
          const outward = side === "left" ? 1 : -1;
          run(wings[side].current, [{ scale: "0 1" }, { scale: "1 1" }], {
            duration: STORY.enter,
            delay: appears,
            easing: "cubic-bezier(0.2, 0.9, 0.3, 1)",
          });
          run(
            bots[side].current,
            appears
              ? [
                  { opacity: 0, scale: "0.3", translate: "0 0" },
                  { opacity: 1, scale: "1.18", translate: "0 0", offset: 0.6 },
                  { opacity: 1, scale: "1", translate: "0 0" },
                ]
              : [
                  {
                    opacity: 0,
                    scale: "1",
                    translate: `${outward * stage.bot}px 0`,
                  },
                  { opacity: 1, scale: "1", translate: "0 0" },
                ],
            {
              duration: STORY.enter,
              delay: appears,
              easing: "cubic-bezier(0.2, 0.9, 0.3, 1.2)",
            },
          );
          const out = s.length + (side === "left" ? 0 : 40);
          run(wings[side].current, [{ scale: "1 1" }, { scale: "0 1" }], {
            duration: STORY.leave,
            delay: out,
            easing: "ease-in",
            fill: "forwards",
          });
          run(
            bots[side].current,
            [
              { opacity: 1, scale: "1", translate: "0 0" },
              {
                opacity: 0,
                scale: "1",
                translate: `${outward * stage.bot}px 0`,
              },
            ],
            {
              duration: STORY.leave,
              delay: out,
              easing: "ease-in",
              fill: "forwards",
            },
          );
        }
      }
      // Along the dock, from the sender towards the receiver.
      const along = (() => {
        const dx = ends.to.x - ends.from.x;
        const dy = ends.to.y - ends.from.y;
        const d = Math.hypot(dx, dy);
        return d > 1e-6
          ? { x: dx / d, y: dy / d }
          : { x: -inward[edge].y, y: inward[edge].x };
      })();
      if (notch)
        // The sender hands the letter over with a little push.
        run(
          sender,
          [
            { scale: "1", rotate: "0deg" },
            { scale: "0.9", rotate: "0deg", offset: 0.4 },
            { scale: "1.06", rotate: "0deg", offset: 0.75 },
            { scale: "1", rotate: "0deg" },
          ],
          {
            duration: 380,
            delay: delay + 40,
            easing: "ease-out",
            fill: "none",
          },
        );
      // On a dock the sender throws it: it leaves the robot's hand as it takes off.
      else
        run(sender, throwFrames(inward[edge], along), {
          duration: THROW.duration,
          delay: Math.max(0, s.takeoff - THROW.duration * THROW.release),
          easing: "ease-in-out",
          fill: "none",
        });
      if (flight.arrives && !notch)
        run(
          receiver,
          [
            { scale: "1" },
            { scale: "0.55", offset: 0.35 },
            { scale: "1.22", offset: 0.75 },
            { scale: "1" },
          ],
          {
            duration: 420,
            delay: s.takeoff + STORY.fly * 0.3,
            easing: "ease-out",
            fill: "none",
          },
        );
      if (flight.falls) {
        // The sender is left puzzled: a scratch of the head as it falls.
        run(
          sender,
          [
            { rotate: "0deg", scale: "1" },
            { rotate: "-9deg", scale: "1", offset: 0.2 },
            { rotate: "7deg", scale: "1", offset: 0.4 },
            { rotate: "-7deg", scale: "1", offset: 0.6 },
            { rotate: "5deg", scale: "1", offset: 0.8 },
            { rotate: "0deg", scale: "1" },
          ],
          {
            duration: 650,
            delay: s.landing,
            easing: "ease-in-out",
            fill: "none",
          },
        );
        if (notch)
          timer = setTimeout(
            () => setPuzzled({ event: "failed", at: performance.now() / 1000 }),
            s.landing,
          );
      } else if (notch) {
        // The receiver takes the letter in with a bounce.
        run(
          receiver,
          [
            { scale: "1", translate: "0 0" },
            { scale: "1.18", translate: "0 -2px", offset: 0.4 },
            { scale: "1", translate: "0 0" },
          ],
          {
            duration: 300,
            delay: s.delivered,
            easing: "ease-out",
            fill: "none",
          },
        );
      } else {
        // On a dock the receiver catches it as the letter slides in.
        run(receiver, catchFrames(inward[edge], along), {
          duration: CATCH.duration,
          delay: Math.max(0, s.delivered - CATCH.duration * CATCH.impact),
          easing: "ease-out",
          fill: "none",
        });
      }
    }
    // Landed when every part finished or was cancelled from outside, or at
    // the latest a moment after its planned length: a window whose page is
    // hidden stops its animations' clock, and a ride that never ends would
    // hold its lane for good.
    let ended = false;
    const land = () => {
      if (ended) return;
      ended = true;
      done.current();
    };
    void Promise.allSettled(
      animations.map((animation) => animation.finished),
    ).then(land);
    const fallback = setTimeout(land, length + 600);
    return () => {
      ended = true;
      clearTimeout(fallback);
      if (timer) clearTimeout(timer);
      for (const animation of animations) animation.cancel();
    };
  }, [plan]);

  // At work, so each is drawn as its robot from the first frame (a calm mark
  // would first show its logo and turn into the robot after a second).
  const facing = (side: "left" | "right") =>
    botState({ look: "plain", facing: side === "left" ? "right" : "left" });
  const ink = light ? "rgba(28,28,36,0.85)" : "rgba(0,0,0,0.6)";
  // The paper's edge and shadow are copies of its outline drawn under it, not
  // CSS filters: the app's compositor drops a filter over animated layers.
  const tone: Tone = {
    ink,
    edge: light ? "rgba(28,28,36,0.8)" : "rgba(0,0,0,0.5)",
  };
  // The plane's line, as bold as the reference icon's at this size.
  const line = Math.max(1.3, size.width / 18);
  const puffColor = light ? "rgba(140,144,156,0.9)" : "rgba(255,255,255,0.7)";
  const ends = plan?.ends;
  return (
    <div
      className="hud-flight"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 6,
        pointerEvents: "none",
      }}
    >
      {stage &&
        !reduceMotion &&
        (["left", "right"] as const).map((side) => {
          const wing = stage.wings[side];
          const source = side === "left" ? leftSource : rightSource;
          const sending = (side === "left") === flight.fromLeft;
          return (
            <div key={side}>
              <svg
                ref={wings[side]}
                width={wing.width}
                height={stage.height}
                style={{
                  position: "absolute",
                  left: wing.x,
                  top: stage.top,
                  overflow: "visible",
                  transformOrigin:
                    side === "left" ? "right center" : "left center",
                  scale: "0 1",
                }}
              >
                <path
                  d={islandPath(
                    wing.width,
                    stage.height,
                    stage.flare,
                    stage.radius,
                  )}
                  fill="#000"
                />
              </svg>
              <div
                ref={bots[side]}
                style={{
                  position: "absolute",
                  left:
                    (side === "left" ? stage.left.x : stage.right.x) -
                    stage.bot / 2,
                  top: stage.top + (stage.height - stage.bot) / 2,
                  width: stage.bot,
                  height: stage.bot,
                  opacity: 0,
                }}
              >
                <BotMark
                  source={source}
                  size={stage.bot}
                  state={facing(side)}
                  cue={sending ? puzzled : null}
                  enabled={botLogos}
                  light={false}
                  awake
                />
              </div>
            </div>
          );
        })}
      <div ref={trail}>
        {puffs.map((puff, index) => (
          <span
            key={index}
            data-puff
            style={{
              position: "absolute",
              left: -1.6,
              top: -1.6,
              width: 3.2,
              height: 3.2,
              borderRadius: "50%",
              background: puffColor,
              translate: puff.translate,
              opacity: 0,
            }}
          />
        ))}
      </div>
      {!reduceMotion && (
        <div style={{ position: "absolute", left: 0, top: 0 }}>
          <Shadow width={size.width} refTo={shadow} />
        </div>
      )}
      {reduceMotion && ends ? (
        <>
          <Placed at={ends.start} refTo={craft} size={size}>
            <Envelope open={false} tone={tone} count={count} />
          </Placed>
          <Placed at={ends.end} refTo={second} size={size}>
            <Envelope open tone={tone} count={1} />
          </Placed>
        </>
      ) : (
        <div ref={craft} style={{ position: "absolute", left: 0, top: 0 }}>
          <div style={{ opacity: 0 }}>
            <div
              ref={turn}
              style={{
                position: "absolute",
                left: -size.width / 2,
                top: -size.height / 2,
                width: size.width,
                height: size.height,
              }}
            >
              <div ref={mirror} style={{ position: "absolute", inset: 0 }}>
                <div ref={roll} style={{ position: "absolute", inset: 0 }}>
                  <div ref={sheet} style={{ position: "absolute", inset: 0 }}>
                    <Paper tone={tone} refs={paper}>
                      <Pocket ink={ink} refTo={pocket} />
                    </Paper>
                  </div>
                  <Flap ink={ink} refTo={flap} open />
                  <PlaneDrawing tone={tone} line={line} refTo={folds} />
                </div>
              </div>
            </div>
            {count > 1 && <Count value={count} size={size.width} />}
          </div>
        </div>
      )}
      <div style={{ position: "absolute", left: 0, top: 0 }}>
        <Letter width={size.width} height={size.height} refTo={letter} />
      </div>
    </div>
  );
}

/** A still element centred on a point (reduced motion's envelopes). */
function Placed({
  at,
  refTo,
  size,
  children,
}: {
  at: Point;
  refTo: RefObject<HTMLDivElement | null>;
  size: { width: number; height: number };
  children: React.ReactNode;
}) {
  return (
    <div
      ref={refTo}
      style={{
        position: "absolute",
        left: at.x - size.width / 2,
        top: at.y - size.height / 2,
        width: size.width,
        height: size.height,
        opacity: 0,
      }}
    >
      {children}
    </div>
  );
}
