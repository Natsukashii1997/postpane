import type { CSSProperties, MutableRefObject } from "react";
import type { Session } from "@agent-hud/protocol";
import { usePanelServices } from "../PanelContext";
import { BotMark } from "../BotMark";
import { botKey } from "../bots/artwork";
import { botState, facingFromEdge, isAttention } from "../bots/bot-state";
import { staysAsBot } from "../bots/bot-spec";
import { DockMemory, type Direction } from "../bots/mark-director";
import { labelWidth, type HUDRect, type stripMetrics } from "../geometry";
import {
  markUsed,
  meterLabel,
  vendorKey,
  type HUDConfig,
  type HUDEdge,
  type HUDVendor,
} from "../model";
import { Silhouette } from "./NotchSurface";
import type { HUDNativePointer } from "../HUDScene";
import { useFormat } from "@agent-hud/ui/format-context";
import { quotaDisplayLabel } from "@agent-hud/ui/format";
import { useMarkLevelText } from "../ground";
import { isRingStyle } from "../usage-meter/arcs";
import { MarkBars, MarkRing, markItems } from "../usage-meter/mark-usage";
import { ReplySeal, ReviewStamp } from "./RelayStamps";
import {
  stubBotTop,
  stubFootHeight,
  stubMarks,
  stubSize,
} from "../ticket-stub";
import {
  PAPER_GRAIN,
  airmailStripes,
  perforatedSide,
  relayPaperOf,
} from "../paper";

const clampedSize = (size: number) => Math.max(20, Math.min(60, size));

const horizontal = (edge: HUDEdge) => edge === "top" || edge === "bottom";

const STUB_INK = "#2a2925",
  // Tokens on a stub with no window: what was used, not what is left.
  STUB_DIM = "rgba(42,41,37,.5)",
  STUB_RED = "rgba(196,38,30,.92)";
/** ChatGPT's stub (#145): a review waiting for you, answering, today's chats. */
const DESK_TONE = {
  amber: "#97600f",
  blue: "#2f5fb3",
  ink: STUB_INK,
  dim: STUB_DIM,
} as const;
const REVIEW_PAPER = relayPaperOf(false).paper;
const PAPER_UI = `"PingFang SC", "Hiragino Sans GB", sans-serif`;

export function HUDMarkStrip({
  id,
  config,
  edge,
  strip,
  metrics,
  vendors,
  cardVisible,
  detached,
  light,
  fill,
  outline,
  marginStyle,
  dragVisual,
  hovered,
  pinned: _pinned,
  pointerInside,
  open,
  sender,
  focusedVendor,
  botDirections,
  dockMemory,
  nativePointer,
  reduceMotion,
  hasAlert,
  suppressHover,
  setHovered,
  setPinned: _setPinned,
  forceOpen,
  pin,
}: {
  id: string;
  config: HUDConfig;
  edge: HUDEdge;
  strip: HUDRect;
  metrics: ReturnType<typeof stripMetrics>;
  vendors: HUDVendor[];
  cardVisible: boolean;
  detached: boolean;
  light: boolean;
  fill: string;
  outline: string;
  marginStyle: CSSProperties;
  dragVisual: boolean;
  hovered: string | null;
  pinned: boolean;
  pointerInside: boolean;
  open: boolean;
  sender?: { source: string };
  focusedVendor?: HUDVendor;
  botDirections?: Record<string, Direction>;
  dockMemory: MutableRefObject<DockMemory>;
  nativePointer?: HUDNativePointer;
  reduceMotion: boolean;
  hasAlert: boolean;
  suppressHover: MutableRefObject<boolean>;
  setHovered: (key: string | null) => void;
  setPinned: (pinned: boolean) => void;
  forceOpen: () => void;
  pin: (key?: string) => void;
}) {
  const format = useFormat();
  const services = usePanelServices();
  const { quotaDisplay } = format;
  const zh = format.language === "zh";
  // A ring's figure is text: on a see-through ground, its level's see-through shade.
  const figureColor = useMarkLevelText(light);
  const stubbed = config.mode === "logos";
  const stub = stubSize(metrics.logo),
    unit = metrics.logo / 20,
    side = perforatedSide(edge),
    botTop = stubBotTop(metrics.logo);
  const stubStyle = stubBoxStyle(metrics.logo, side);
  const paper = <StubPaper unit={unit} side={side} light={light} />;

  return (
    <>
      {config.mode === "notch" ? (
        <div
          className="hud-classic-silhouette"
          aria-label={zh ? "悬停展开驿窗" : "Hover to expand PostPane"}
          tabIndex={0}
          role="button"
          aria-describedby={`hud-instructions-${id}`}
          onFocus={() => {
            if (!hasAlert && !suppressHover.current) forceOpen();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") forceOpen();
          }}
          style={{
            position: "absolute",
            left: -8,
            top: 0,
            width: strip.width + 16,
            height: strip.height,
            cursor: dragVisual ? "grabbing" : "default",
          }}
        >
          {config.hasNotch && cardVisible && light && (
            <Silhouette
              width={strip.width + 16}
              height={strip.height}
              edge="top"
              flare={8}
              radius={metrics.radius}
              fill={config.hasNotch ? "#000" : fill}
              outline={outline}
            />
          )}
        </div>
      ) : (
        <div
          className="hud-mark-strip"
          style={{
            position: "relative",
            display: "flex",
            flexDirection: horizontal(edge) ? "row" : "column",
            alignItems: horizontal(edge) ? "center" : "flex-start",
            justifyContent: "flex-start",
            gap: metrics.gap,
            ...(config.mode === "simple"
              ? {
                  ...marginStyle,
                  width: metrics.width - (horizontal(edge) ? 0 : 3),
                  height: metrics.height - (horizontal(edge) ? 3 : 0),
                  paddingTop: metrics.padding.top,
                  paddingRight: metrics.padding.right,
                  paddingBottom: metrics.padding.bottom,
                  paddingLeft: metrics.padding.left,
                  borderRadius: metrics.radius,
                  background: !cardVisible || detached ? fill : "transparent",
                  border: 0,
                  boxShadow:
                    !cardVisible || detached
                      ? `inset 0 0 0 1px ${outline}`
                      : undefined,
                  backdropFilter: undefined,
                }
              : {
                  width: strip.width,
                  height: strip.height,
                  alignItems: "center",
                  justifyContent: "center",
                }),
          }}
        >
          {vendors.map((vendor, index) => (
            <button
              key={vendor.key}
              type="button"
              className="hud-agent-mark"
              aria-label={`${vendor.name}, ${meterLabel(vendor, quotaDisplay)} ${markUsed(vendor) == null ? "" : quotaDisplayLabel(quotaDisplay, format.language)}`}
              onPointerEnter={() => {
                if (hovered !== vendor.key) {
                  setHovered(vendor.key);
                }
              }}
              onFocus={() => {
                setHovered(vendor.key);
                if (!hasAlert && !suppressHover.current) forceOpen();
              }}
              onClick={() => {
                // 「未审」: the mark goes to that ChatGPT conversation, so the
                // review can be picked up there (owner, 2026-11-07).
                const conversation =
                  vendor.relay?.overdue && vendor.relay.conversation;
                if (conversation && services?.openSession) {
                  void services.openSession(chatgptConversation(conversation));
                  return;
                }
                pin(vendor.key);
              }}
              style={{
                position: "relative",
                zIndex: 1,
                border: 0,
                padding: 0,
                color: "inherit",
                background: "transparent",
                display: "flex",
                alignItems: "center",
                gap: metrics.labelGap,
                flexShrink: 0,
                cursor: dragVisual ? "grabbing" : "pointer",
                visibility:
                  config.mode === "logos" && !config.showsLogos
                    ? "hidden"
                    : "visible",
                ...(stubbed ? stubStyle : null),
              }}
            >
              {stubbed && paper}
              <span
                style={{
                  width: metrics.mark,
                  height: metrics.mark,
                  display: "inline-grid",
                  placeItems: "center",
                  position: "relative",
                }}
              >
                {config.mode === "simple" &&
                  isRingStyle(config.simpleStyle) && (
                    <MarkRing
                      style={config.simpleStyle}
                      items={markItems(
                        vendor,
                        quotaDisplay,
                        config.panelLayout,
                      )}
                      size={metrics.mark}
                      ringWidth={config.ringWidth}
                      light={light}
                      reduceMotion={reduceMotion}
                    />
                  )}
                <BotMark
                  source={vendor.name}
                  size={metrics.logo}
                  // On a stub the bot stands on light paper, whatever the theme.
                  light={stubbed || light}
                  enabled={config.botLogos}
                  hovered={
                    ((hovered === vendor.key && pointerInside) ||
                      (open &&
                        !sender &&
                        (!focusedVendor ||
                          focusedVendor.key === vendor.key))) &&
                    !dragVisual
                  }
                  state={(() => {
                    const state =
                      botDirections?.[vendor.key]?.state ??
                      botState({
                        look:
                          vendor.waiting > 0
                            ? "permission"
                            : vendor.working > 0
                              ? "plain"
                              : "idle",
                      });
                    const facesCard = sender
                      ? vendorKey(sender.source) === vendor.key
                      : open &&
                        (!focusedVendor || focusedVendor.key === vendor.key);
                    return {
                      ...state,
                      facing:
                        isAttention(state.look) && facesCard
                          ? facingFromEdge(edge)
                          : null,
                    };
                  })()}
                  cue={(() => {
                    const direction = botDirections?.[vendor.key];
                    return direction
                      ? dockMemory.current.cue(
                          vendor.key,
                          direction.cue,
                          direction.state.badge,
                          performance.now() / 1000,
                        )
                      : null;
                  })()}
                  staysBot={staysAsBot(botKey(vendor.name))}
                  aim={
                    nativePointer?.point
                      ? (() => {
                          // A stub's bot sits near its top, not at its centre.
                          const across = stubbed
                              ? botTop + metrics.mark / 2
                              : metrics.padding.top + metrics.mark / 2,
                            along = stubbed
                              ? metrics.centers[index] -
                                stub.height / 2 +
                                botTop +
                                metrics.mark / 2
                              : metrics.centers[index];
                          const centerX =
                            strip.x +
                            (horizontal(edge)
                              ? metrics.centers[index]
                              : stubbed
                                ? strip.width / 2
                                : metrics.padding.left + metrics.mark / 2);
                          const centerY =
                            strip.y + (horizontal(edge) ? across : along);
                          const dx = nativePointer.point!.x - centerX,
                            dy = nativePointer.point!.y - centerY,
                            distance = Math.hypot(dx, dy);
                          return distance < 1
                            ? ([0, 0] as const)
                            : ([
                                dx / (distance + 120),
                                dy / (distance + 120),
                              ] as const);
                        })()
                      : undefined
                  }
                />
                {!stubbed && vendor.waiting > 0 && (
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      right: -2,
                      bottom: -2,
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#e9a16d",
                      boxShadow: `0 0 0 2px ${light ? "#f8f8fa" : "#000"}`,
                    }}
                  />
                )}
              </span>
              {stubbed && (
                <StubFace
                  vendor={vendor}
                  label={meterLabel(vendor, quotaDisplay)}
                  unit={unit}
                  foot={stubFootHeight(metrics.logo)}
                  side={side}
                  zh={zh}
                  reduceMotion={reduceMotion}
                />
              )}
              {stubbed && vendor.relay?.replied && (
                // An answer is back with Claude: the 「回」 seal in its corner (#171).
                <ReplySeal
                  unit={unit}
                  side={side}
                  zh={zh}
                  since={vendor.relay.since}
                  reduceMotion={reduceMotion}
                />
              )}
              {config.mode === "simple" && metrics.bar > 0 && (
                <MarkBars
                  items={markItems(vendor, quotaDisplay, config.panelLayout)}
                  length={metrics.bar}
                  height={metrics.mark}
                  size={clampedSize(config.simpleSize)}
                  ringWidth={config.ringWidth}
                  light={light}
                  reduceMotion={reduceMotion}
                />
              )}
              {config.mode === "simple" &&
                (config.showsNumbers || config.simpleStyle === "numbers") && (
                  <span
                    style={{
                      color: figureColor(vendor.level),
                      fontSize: metrics.font,
                      fontWeight: 400,
                      fontVariantNumeric: "tabular-nums",
                      whiteSpace: "nowrap",
                      textAlign: "right",
                      minWidth: horizontal(edge)
                        ? undefined
                        : Math.max(
                            ...vendors.map((v) =>
                              labelWidth(
                                meterLabel(v, quotaDisplay),
                                metrics.font,
                              ),
                            ),
                          ),
                    }}
                  >
                    {meterLabel(vendor, quotaDisplay)}
                  </span>
                )}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

type StubSide = "left" | "right" | "top" | "bottom";

/** A stub's own box: its size, with the bot's room at its top. The bot sits
 * on the stub like a sticker; the paper is its own layer behind it, so the
 * bot's moves and props are never clipped by the paper. */
/** A ChatGPT conversation to open, as the handoff card names one. */
function chatgptConversation(id: string): Session {
  return {
    id: `chatgpt:${id}`,
    source: "chatgpt",
    navigationTarget: { kind: "chatgpt-conversation", id },
  } as unknown as Session;
}

export function stubBoxStyle(logo: number, side: StubSide): CSSProperties {
  const stub = stubSize(logo),
    unit = logo / 20;
  return {
    width: stub.width,
    height: stub.height,
    boxSizing: "border-box",
    flexDirection: "column",
    justifyContent: "flex-start",
    paddingTop: stubBotTop(logo) + (side === "top" ? 3 * unit : 0),
    paddingLeft: side === "left" ? 3 * unit : 0,
    paddingRight: side === "right" ? 3 * unit : 0,
    paddingBottom: side === "bottom" ? 3 * unit : 0,
  };
}

/** The stub's paper, perforated along the side that meets the screen edge;
 * `bothEdges` perforates the opposite side too (the joined preview ticket). */
export function StubPaper({
  unit,
  side,
  light,
  bothEdges = false,
}: {
  unit: number;
  side: StubSide;
  light: boolean;
  bothEdges?: boolean;
}) {
  const holes = (edge: StubSide) =>
    edge === "top" || edge === "bottom"
      ? `radial-gradient(circle at ${5 * unit}px ${edge === "top" ? "0" : "100%"}, transparent ${2.1 * unit}px, #000 ${2.5 * unit}px) 0 0 / ${10 * unit}px 100% repeat-x`
      : `radial-gradient(circle at ${edge === "left" ? "0" : "100%"} ${5 * unit}px, transparent ${2.1 * unit}px, #000 ${2.5 * unit}px) 0 0 / 100% ${10 * unit}px repeat-y`;
  const opposite = {
    top: "bottom",
    bottom: "top",
    left: "right",
    right: "left",
  } as const;
  const perforation = bothEdges
    ? `${holes(side)}, ${holes(opposite[side])}`
    : holes(side);
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        filter:
          "drop-shadow(0 1px 1px rgba(0,0,0,.22)) drop-shadow(0 8px 14px rgba(0,0,0,.24))",
      }}
    >
      <span
        style={{
          position: "absolute",
          inset: 0,
          background: `${PAPER_GRAIN} 0 0 / 160px 160px, ${light ? "#f3f1eb" : "#e9e6de"}`,
          WebkitMask: perforation,
          mask: perforation,
          // Two rows of holes: the paper is what both masks keep.
          ...(bothEdges
            ? { WebkitMaskComposite: "source-in", maskComposite: "intersect" }
            : null),
        }}
      />
    </span>
  );
}

/**
 * What a stub prints on its tear-off foot, under a dashed tear line: the
 * reading, or a seal.
 */
export function StubFace({
  vendor,
  label,
  unit,
  foot,
  side,
  zh,
  reduceMotion = false,
}: {
  vendor: HUDVendor;
  label: string;
  unit: number;
  foot: number;
  side: "left" | "right" | "top" | "bottom";
  zh: boolean;
  reduceMotion?: boolean;
}) {
  const marks = stubMarks({
    waiting: vendor.waiting,
    questions: vendor.questions,
    used: markUsed(vendor),
  });
  return (
    <>
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          left: side === "left" ? 3 * unit : 0,
          right: side === "right" ? 3 * unit : 0,
          bottom: side === "bottom" ? 3 * unit : 0,
          height: foot,
          boxSizing: "border-box",
          borderTop: `${unit}px dashed rgba(42,41,37,.34)`,
          display: "grid",
          placeItems: "center",
          // A review on ChatGPT's desk: its foot is on the reviews' paper,
          // under an airmail band (#145).
          ...(vendor.desk?.stub.review && !marks.sealed
            ? {
                borderTop: "none",
                background: `${airmailStripes(2 * unit)} 0 0 / 100% ${2.5 * unit}px no-repeat, ${REVIEW_PAPER}`,
              }
            : null),
        }}
      >
        {marks.sealed ? (
          <span
            style={{
              display: "grid",
              placeItems: "center",
              width: 12 * unit,
              height: 12 * unit,
              boxSizing: "border-box",
              border: `${1.2 * unit}px solid ${STUB_RED}`,
              borderRadius: 2.5 * unit,
              color: STUB_RED,
              font: `900 ${8 * unit}px/1 "Songti SC", "STSong", serif`,
              transform: "rotate(-10deg)",
            }}
          >
            {zh ? (marks.answer ? "答" : "批") : marks.answer ? "?" : "!"}
          </span>
        ) : vendor.relay?.review ? (
          // ChatGPT has a relay's words: the 「审」 stamp lands over the reading (#171).
          <ReviewStamp
            unit={unit}
            zh={zh}
            answering={vendor.relay.answering}
            overdue={vendor.relay.overdue}
            lingering={vendor.relay.lingering}
            since={vendor.relay.since}
            reduceMotion={reduceMotion}
          >
            <span
              style={{
                maxWidth: "100%",
                overflow: "hidden",
                whiteSpace: "nowrap",
                font: `600 ${9.5 * unit}px/1 "Avenir Next Condensed", "DIN Condensed", "Arial Narrow", sans-serif`,
                letterSpacing: 0.15 * unit,
                fontVariantNumeric: "tabular-nums",
                color: vendor.desk
                  ? DESK_TONE[vendor.desk.stub.tone]
                  : markUsed(vendor) == null
                    ? STUB_DIM
                    : marks.warn
                      ? STUB_RED
                      : STUB_INK,
                ...(vendor.desk && /\p{Script=Han}/u.test(label)
                  ? { font: `600 ${8.5 * unit}px/1 ${PAPER_UI}` }
                  : null),
              }}
            >
              {label}
            </span>
          </ReviewStamp>
        ) : (
          <span
            style={{
              maxWidth: "100%",
              overflow: "hidden",
              whiteSpace: "nowrap",
              font: `600 ${9.5 * unit}px/1 "Avenir Next Condensed", "DIN Condensed", "Arial Narrow", sans-serif`,
              letterSpacing: 0.15 * unit,
              fontVariantNumeric: "tabular-nums",
              color: vendor.desk
                ? DESK_TONE[vendor.desk.stub.tone]
                : markUsed(vendor) == null
                  ? STUB_DIM
                  : marks.warn
                    ? STUB_RED
                    : STUB_INK,
              ...(vendor.desk && /\p{Script=Han}/u.test(label)
                ? { font: `600 ${8.5 * unit}px/1 ${PAPER_UI}` }
                : null),
            }}
          >
            {label}
          </span>
        )}
      </span>
    </>
  );
}
