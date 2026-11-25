import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { EASE_OUT, GEOMETRY, MOTION } from "@agent-hud/ui/lib/motion";
import type {
  Approval,
  IslandEvent,
  RequestDelivery,
  Snapshot,
} from "@agent-hud/protocol";
import { HUDArtwork as HUDLogo } from "../HUDArtwork";
import { CompactAlertView } from "../IslandNews";
import type { ReplyChip } from "../alerts/reply-list";
import { FoldScope } from "../permissions/FoldButton";
import { RequestDeliveryNotice } from "../permissions/RequestDeliveryNotice";
import { SourceHoverPanel } from "../HoverPanel";
import type { HUDRect } from "../geometry";
import { frontTagSwapped } from "./side-tag-stack";
import {
  HUD_METRICS,
  statusColor,
  type HUDConfig,
  type HUDEdge,
  type HUDVendor,
} from "../model";
import { AgentPeek } from "./AgentPeek";
import { AirmailEdges } from "./AirmailEdges";
import { Silhouette, type useNotchGeometry } from "./NotchSurface";
import { outsideSimplePanel } from "./simple-panel";
import { snapshotLanguage } from "@agent-hud/ui/format";
import {
  PaperContext,
  paperFace,
  perforatedSide,
  airmailSides,
  perforation,
  type Paper,
} from "../paper";
import type { Insets } from "./receipt-sheet";

const horizontal = (edge: HUDEdge) => edge === "top" || edge === "bottom";

export function HUDExpandedSurface({
  config,
  edge,
  cardVisible,
  detached,
  peek,
  simplePeek,
  open,
  reduceMotion,
  dragging,
  frame,
  strip,
  flared,
  surfaceFlare,
  metricsRadius,
  targetSize,
  notchGeometry,
  light,
  fill,
  outline,
  shadow,
  nativePointer,
  entered,
  domExited,
  focusedVendor,
  scale,
  peekTuck,
  expandMeter,
  spotlight,
  pin,
  request,
  event,
  reply,
  narrowTag = false,
  requests,
  snapshot,
  forceOpen,
  dismissNews,
  showPanelStats,
  configurePanel,
  panelFailure,
  surfacePadding,
  eventContent,
  inlineAlert,
  inUsagePanel,
  delivery,
  paper = null,
  paperInset,
}: {
  config: HUDConfig;
  edge: HUDEdge;
  cardVisible: boolean;
  detached: boolean;
  peek: boolean;
  simplePeek: boolean;
  open: boolean;
  reduceMotion: boolean;
  dragging: boolean;
  frame: HUDRect;
  strip: HUDRect;
  flared: boolean;
  surfaceFlare: number;
  metricsRadius: number;
  targetSize: { width: number; height: number };
  notchGeometry: ReturnType<typeof useNotchGeometry>;
  light: boolean;
  fill: string;
  outline: string;
  /** The ground's shadow, fading with its transparency. */
  shadow: string;
  nativePointer?: unknown;
  entered: (optionDown?: boolean) => void;
  domExited: (event?: { relatedTarget?: EventTarget | null }) => void;
  focusedVendor?: HUDVendor;
  scale: number;
  peekTuck: number;
  /** The wait before the peek grows into the whole board, drawn as a line
   * growing from the middle of its foot to both ends. */
  expandMeter?: { key: string; ms: number } | null;
  /** The agent the whole board scrolls to (see SourceHoverPanel). */
  spotlight?: string;
  pin: (key?: string) => void;
  request?: Approval;
  event?: IslandEvent;
  /** The replies waiting, for a reply's folded tag. */
  reply?: ReplyChip;
  /** The folded tag stands as its narrow slip (#243). */
  narrowTag?: boolean;
  requests: Approval[];
  snapshot: Snapshot;
  forceOpen: () => void;
  dismissNews: () => void;
  showPanelStats?: () => void;
  configurePanel?: () => void;
  /** Why Settings or Statistics did not open just now (#220). */
  panelFailure?: string | null;
  surfacePadding: { top: number; right: number; bottom: number; left: number };
  eventContent: ReactNode;
  /** Quota news atop the open usage panel. */
  inlineAlert?: ReactNode;
  inUsagePanel?: boolean;
  delivery?: RequestDelivery;
  /** The paper a request's tag and card, or the usage panel's receipt, are
   * printed on, beside the dock. */
  paper?: Paper | null;
  /** Where the receipt's sheet sits in the frame, clear of the dock. */
  paperInset?: Insets;
}) {
  // A hardware notch's row stays dark whatever the appearance, at rest and
  // while a reminder shows its wings, so it stays one with the camera
  // housing: black. What opens out of the row takes the look itself (Open
  // HUDLook.inNotchRow). A closing panel keeps its own look while it shrinks and the row's takes over once it is
  // back in the row; at once, a light panel would turn into a black block.
  const atNotchRow =
    config.mode === "notch" && config.hasNotch && !open && !peek;
  const settle = reduceMotion ? 0 : HUD_METRICS.duration;
  const [rowSettled, setRowSettled] = useState(atNotchRow);
  useEffect(() => {
    if (!atNotchRow) {
      setRowSettled(false);
      return;
    }
    if (settle === 0) {
      setRowSettled(true);
      return;
    }
    const timer = setTimeout(() => setRowSettled(true), settle * 1000);
    return () => clearTimeout(timer);
  }, [atNotchRow, settle]);
  const inNotchRow = atNotchRow && rowSettled;
  const rowLight = inNotchRow ? false : light;
  // The tag in front handed to another agent stands where that agent's tag
  // hung; sliding there, it crossed the other tags and the pointer (#238).
  const tagAgent = !open && (request || event) ? focusedVendor?.key : undefined;
  const lastTagAgent = useRef(tagAgent);
  const swapped = frontTagSwapped(lastTagAgent.current, tagAgent);
  useEffect(() => {
    lastTagAgent.current = tagAgent;
  });
  // A spring keeps the card's speed when it is turned back halfway, so
  // opening and closing again mid-way joins up instead of jolting.
  const transition =
    reduceMotion || dragging || swapped ? { duration: 0 } : GEOMETRY;
  const from = {
    left: flared && horizontal(edge) ? strip.x - 8 : strip.x,
    top: strip.y,
    width: flared && horizontal(edge) ? strip.width + 16 : strip.width,
    height: strip.height,
    opacity: 0,
  };

  // A card beside the Simple panel is cut where the panel is: the line grows from behind it, and over a see-through
  // look the two would darken each other (Open IslandRootView.outsidePanel). A full card never reaches the panel.
  const cut =
    config.mode === "simple" && detached
      ? outsideSimplePanel(strip, edge, metricsRadius)
      : undefined;
  // The tag's and card's side facing the screen is perforated, as stubs are.
  const punched = paper
    ? open
      ? perforation(perforatedSide(edge), 14, 3)
      : perforation(perforatedSide(edge), 10 * scale, 2.1 * scale)
    : undefined;

  // What the card shows. When it changes, the old view fades out where it
  // was while the new one comes in, so the paper is never blank between.
  const view =
    peek && focusedVendor
      ? "peek"
      : !open && (request || event)
        ? "tag"
        : "panel";
  const lastView = useRef(view);
  const grown = lastView.current === "panel";
  useEffect(() => {
    lastView.current = view;
  });
  const swap = (fadeIn: boolean) => ({
    initial: fadeIn && !reduceMotion ? { opacity: 0 } : (false as const),
    animate: {
      opacity: 1,
      transition: { duration: MOTION.enter, ease: EASE_OUT },
    },
    // The leaving view no longer takes a click meant for the new one.
    exit: {
      opacity: 0,
      pointerEvents: "none" as const,
      transition: { duration: reduceMotion ? 0 : MOTION.exit, ease: EASE_OUT },
    },
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 2,
        pointerEvents: "none",
        clipPath: cut,
      }}
    >
      <AnimatePresence initial={false} custom={dragging}>
        {(config.mode === "notch" || cardVisible) && (
          <motion.div
            key={config.mode === "notch" ? "notch-shell" : "hud-card"}
            className={`hud-expanded-surface ${detached ? "hud-detached-card" : ""} ${peek ? "hud-peek" : ""}`}
            initial={
              config.mode === "notch"
                ? false
                : reduceMotion
                  ? false
                  : detached
                    ? {
                        left: frame.x,
                        top: frame.y,
                        width: frame.width,
                        height: frame.height,
                        scaleX: simplePeek && !horizontal(edge) ? 0.2 : 0.86,
                        scaleY: simplePeek && !horizontal(edge) ? 1 : 0.86,
                        opacity: 0,
                      }
                    : from
            }
            animate={
              config.mode === "notch"
                ? { opacity: 1 }
                : {
                    left: frame.x,
                    top: frame.y,
                    width: frame.width,
                    height: frame.height,
                    scaleX: 1,
                    scaleY: 1,
                    opacity: 1,
                  }
            }
            variants={{
              gone: (moving: boolean) =>
                moving
                  ? { opacity: 0, transition: { duration: 0 } }
                  : reduceMotion || detached
                    ? { opacity: 0, scaleX: 0.86, scaleY: 0.86 }
                    : from,
            }}
            exit="gone"
            transition={transition}
            onPointerEnter={(e) => {
              if (!nativePointer) entered(e.altKey);
            }}
            onPointerLeave={domExited}
            style={{
              position: "absolute",
              ...(config.mode === "notch"
                ? {
                    left: notchGeometry.x,
                    top: notchGeometry.y,
                    width: notchGeometry.width,
                    height: notchGeometry.height,
                  }
                : {}),
              zIndex: 2,
              pointerEvents: "auto",
              transformOrigin:
                edge === "top"
                  ? "top center"
                  : edge === "bottom"
                    ? "bottom center"
                    : edge === "left"
                      ? "left center"
                      : "right center",
              overflow: config.mode === "notch" ? "visible" : "hidden",
              borderRadius: paper
                ? 3
                : detached
                  ? Math.min(
                      peek ? (simplePeek ? targetSize.height / 2 : 14) : 22,
                      targetSize.height / 2,
                    )
                  : config.mode === "simple"
                    ? 26
                    : 0,
              background:
                !paper && (detached || config.mode === "simple")
                  ? fill
                  : "transparent",
              // The Simple line is the panel growing: no outline of its own.
              border:
                !paper && (detached || config.mode === "simple") && !simplePeek
                  ? `1px solid ${outline}`
                  : "none",
              boxShadow: config.mode === "notch" || paper ? undefined : shadow,
              // The paper's holes cut its shadow too.
              filter: paper
                ? open
                  ? "drop-shadow(0 12px 22px rgba(0,0,0,.32))"
                  : "drop-shadow(0 5px 10px rgba(0,0,0,.28))"
                : undefined,
              color: paper?.ink,
            }}
          >
            {paper && (
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  ...paperInset,
                  borderRadius: 3,
                  ...paperFace(paper),
                  WebkitMask: punched,
                  mask: punched,
                }}
              />
            )}
            {paper?.airmail && (
              <AirmailEdges
                holes={perforatedSide(edge)}
                sides={airmailSides(edge, open)}
                width={6}
                inset={paperInset}
              />
            )}
            {config.mode === "notch" && (
              <svg
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  overflow: "visible",
                  pointerEvents: "none",
                  // A layer of its own. Painted into the window's layer, WebKit does not clear the shadow below the
                  // shape when it shrinks, and grey bands stay on screen after the panel closes.
                  willChange: "transform",
                  filter:
                    cardVisible || !config.hasNotch
                      ? "drop-shadow(0 9px 15px #00000022)"
                      : undefined,
                }}
              >
                <motion.path
                  d={notchGeometry.path}
                  // Back in the row, a light panel darkens into the camera
                  // housing's black instead of snapping to it.
                  initial={false}
                  animate={{ fill: inNotchRow ? "#000" : fill }}
                  transition={{
                    duration: reduceMotion ? 0 : MOTION.enter,
                    ease: EASE_OUT,
                  }}
                  stroke={outline}
                  strokeWidth={0.7}
                />
              </svg>
            )}
            {!detached && config.mode === "logos" && !paper && (
              <Silhouette
                width={frame.width}
                height={frame.height}
                edge={edge}
                flare={surfaceFlare}
                radius={open ? 26 : 14}
                fill={fill}
                outline={outline}
                duration={reduceMotion || dragging ? 0 : HUD_METRICS.duration}
                initialShape={{
                  width: from.width,
                  height: from.height,
                  flare: 8,
                  radius: metricsRadius,
                }}
              />
            )}
            <AnimatePresence initial={false}>
              {cardVisible && (
                <motion.div
                  key="surface-content"
                  initial={false}
                  animate={{ opacity: 1 }}
                  exit={{
                    opacity: 0,
                    transition: { duration: reduceMotion ? 0 : MOTION.exit },
                  }}
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    clipPath:
                      config.mode === "notch" ? notchGeometry.clip : undefined,
                  }}
                >
                  <FoldScope
                    moves={!reduceMotion}
                    style={
                      config.mode === "notch"
                        ? {
                            position: "absolute",
                            top: 0,
                            left: "50%",
                            transform: "translateX(-50%)",
                            width: frame.width,
                            height: frame.height,
                          }
                        : { height: "100%" }
                    }
                  >
                    <AnimatePresence initial={false} mode="popLayout">
                      {view === "peek" && focusedVendor ? (
                        <motion.button
                          // Keyed by agent: one receipt fades into the next.
                          key={`peek-${focusedVendor.key}`}
                          {...swap(true)}
                          className="hud-peek-hit"
                          onClick={() => pin(focusedVendor.key)}
                          aria-label={`Open ${focusedVendor.name} panel`}
                          style={{
                            position: "relative",
                            border: 0,
                            padding: 0,
                            margin: 0,
                            width: "100%",
                            height: "100%",
                            color: "inherit",
                            background: "transparent",
                            textAlign: "left",
                          }}
                        >
                          <PaperContext.Provider value={paper}>
                            <AgentPeek
                              vendor={focusedVendor}
                              simple={config.mode === "simple"}
                              scale={scale}
                              light={light}
                              zh={snapshotLanguage(snapshot) === "zh"}
                              tuck={peekTuck}
                              edge={edge}
                            />
                          </PaperContext.Provider>
                          {expandMeter && !reduceMotion && (
                            <span
                              key={expandMeter.key}
                              className="hud-peek-expand-meter"
                              aria-hidden
                              style={
                                {
                                  "--hud-peek-expand-ms": `${expandMeter.ms}ms`,
                                  position: "absolute",
                                  left: edge === "left" ? 8 + peekTuck : 8,
                                  right: edge === "right" ? 8 + peekTuck : 8,
                                  bottom: 3,
                                  height: 2,
                                  borderRadius: 1,
                                  background: statusColor("warning"),
                                } as CSSProperties
                              }
                            />
                          )}
                        </motion.button>
                      ) : view === "tag" ? (
                        <motion.div key="tag" {...swap(true)}>
                          <CompactAlertView
                            request={request}
                            event={event}
                            requestCount={requests.length}
                            onDock={config.mode !== "notch"}
                            notchWidth={config.notchWidth}
                            surfaceFlare={surfaceFlare}
                            scale={scale}
                            light={rowLight}
                            botLogos={config.botLogos}
                            zh={snapshotLanguage(snapshot) === "zh"}
                            paper={paper}
                            reply={reply}
                            sessions={snapshot.sessions}
                            narrow={narrowTag}
                            across={edge === "top" || edge === "bottom"}
                            onOpen={() => forceOpen()}
                            onDismissAndStats={() => {
                              dismissNews();
                              showPanelStats?.();
                            }}
                          />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="panel"
                          {...swap(false)}
                          style={{
                            position: "relative",
                            maxHeight: "100%",
                            overflowY: "auto",
                          }}
                        >
                          <AnimatePresence mode="popLayout">
                            <motion.div
                              key={
                                request || (event && !inUsagePanel)
                                  ? "alert-stack"
                                  : (focusedVendor?.key ?? "all")
                              }
                              // Slides in from the edge the HUD sits on.
                              initial={
                                reduceMotion
                                  ? false
                                  : {
                                      [horizontal(edge) ? "y" : "x"]:
                                        (edge === "top" || edge === "left"
                                          ? -1
                                          : 1) * HUD_METRICS.entryDistance,
                                      opacity: 0,
                                    }
                              }
                              animate={{ x: 0, y: 0, opacity: 1 }}
                              exit={swap(false).exit}
                              // Out of a tag or a peek it waits for the card to
                              // grow; between two agents' panels the card is
                              // already there, so the new one comes at once.
                              transition={{
                                duration: MOTION.enter,
                                delay: grown ? 0 : MOTION.quick,
                                ease: EASE_OUT,
                              }}
                            >
                              <div
                                className="hud-panel-content"
                                style={{
                                  paddingTop: surfacePadding.top,
                                  paddingRight: surfacePadding.right,
                                  paddingBottom: surfacePadding.bottom,
                                  paddingLeft: surfacePadding.left,
                                }}
                              >
                                {eventContent &&
                                (!inUsagePanel || Boolean(request)) ? (
                                  eventContent
                                ) : (
                                  <PaperContext.Provider value={paper}>
                                    <SourceHoverPanel
                                      active={open}
                                      config={config}
                                      snapshot={snapshot}
                                      focusVendor={focusedVendor?.name}
                                      spotlight={spotlight}
                                      light={light}
                                      Logo={HUDLogo}
                                      onConfigure={configurePanel}
                                      onStats={showPanelStats}
                                      openFailure={panelFailure}
                                      inlineAlert={inlineAlert}
                                      maxHeight={Math.max(
                                        40,
                                        frame.height -
                                          surfacePadding.top -
                                          surfacePadding.bottom,
                                      )}
                                    />
                                  </PaperContext.Provider>
                                )}
                                <RequestDeliveryNotice
                                  delivery={delivery}
                                  light={light}
                                  language={snapshotLanguage(snapshot)}
                                />
                              </div>
                            </motion.div>
                          </AnimatePresence>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </FoldScope>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
