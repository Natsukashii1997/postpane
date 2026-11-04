import type { CSSProperties, MutableRefObject } from "react";
import { BotMark } from "../BotMark";
import { botState, facingFromEdge, isAttention } from "../bots/bot-state";
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
import { stubBotTop, stubMarks, stubSize } from "../ticket-stub";

const clampedSize = (size: number) => Math.max(20, Math.min(60, size));

const horizontal = (edge: HUDEdge) => edge === "top" || edge === "bottom";

// A faint paper grain for the Dynamic stubs, tiled.
const PAPER_GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .2 0 0 0 0 .19 0 0 0 0 .17 0 0 0 .14 0"/></filter><rect width="100%" height="100%" filter="url(#g)"/></svg>',
)}")`;
const STUB_INK = "#2a2925",
  STUB_RED = "rgba(196,38,30,.92)";

/** A stub's perforated side: the one facing into the screen. */
const perforatedSide = (edge: HUDEdge) =>
  edge === "right"
    ? "left"
    : edge === "left"
      ? "right"
      : edge === "top"
        ? "bottom"
        : "top";

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
  const { quotaDisplay } = format;
  const zh = format.language === "zh";
  // A ring's figure is text: on a see-through ground, its level's see-through shade.
  const figureColor = useMarkLevelText(light);
  const stubbed = config.mode === "logos";
  const stub = stubSize(metrics.logo),
    unit = metrics.logo / 20,
    side = perforatedSide(edge),
    botTop = stubBotTop(metrics.logo);
  const perforation = horizontal(edge)
    ? `radial-gradient(circle at ${5 * unit}px ${side === "top" ? "0" : "100%"}, transparent ${2.1 * unit}px, #000 ${2.5 * unit}px) 0 0 / ${10 * unit}px 100% repeat-x`
    : `radial-gradient(circle at ${side === "left" ? "0" : "100%"} ${5 * unit}px, transparent ${2.1 * unit}px, #000 ${2.5 * unit}px) 0 0 / 100% ${10 * unit}px repeat-y`;
  // The bot sits on the stub like a sticker: the paper is its own layer
  // behind it, so the bot's moves and props are never clipped by the paper.
  const stubStyle: CSSProperties = {
    width: stub.width,
    height: stub.height,
    boxSizing: "border-box",
    flexDirection: "column",
    justifyContent: "flex-start",
    paddingTop: botTop + (side === "top" ? 3 * unit : 0),
    paddingLeft: side === "left" ? 3 * unit : 0,
    paddingRight: side === "right" ? 3 * unit : 0,
    paddingBottom: 7 * unit + (side === "bottom" ? 3 * unit : 0),
  };
  const paper = (
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
        }}
      />
    </span>
  );

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
              onClick={() => pin(vendor.key)}
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
                cursor: dragVisual
                  ? "grabbing"
                  : config.separatesAgents
                    ? "pointer"
                    : "default",
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
                  staysBot={false}
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
                  side={side}
                  vertical={!horizontal(edge)}
                  zh={zh}
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

/** What a stub prints under its bot: the reading, or a seal; and a punch hole. */
function StubFace({
  vendor,
  label,
  unit,
  side,
  vertical,
  zh,
}: {
  vendor: HUDVendor;
  label: string;
  unit: number;
  side: "left" | "right" | "top" | "bottom";
  vertical: boolean;
  zh: boolean;
}) {
  const marks = stubMarks({
    working: vendor.working,
    waiting: vendor.waiting,
    used: markUsed(vendor),
  });
  return (
    <>
      {marks.sealed ? (
        <span
          aria-hidden="true"
          style={{
            marginTop: "auto",
            display: "grid",
            placeItems: "center",
            width: 17 * unit,
            height: 17 * unit,
            boxSizing: "border-box",
            border: `${1.5 * unit}px solid ${STUB_RED}`,
            borderRadius: 3 * unit,
            color: STUB_RED,
            font: `900 ${11 * unit}px/1 "Songti SC", "STSong", serif`,
            transform: "rotate(-10deg)",
          }}
        >
          {zh ? "批" : "!"}
        </span>
      ) : (
        <span
          aria-hidden="true"
          style={{
            position: "relative",
            marginTop: "auto",
            maxWidth: "100%",
            overflow: "hidden",
            whiteSpace: "nowrap",
            font: `600 ${10.5 * unit}px/1 "Avenir Next Condensed", "DIN Condensed", "Arial Narrow", sans-serif`,
            letterSpacing: 0.2 * unit,
            fontVariantNumeric: "tabular-nums",
            color: marks.warn ? STUB_RED : STUB_INK,
          }}
        >
          {label}
        </span>
      )}
      {marks.punched && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            width: 7 * unit,
            height: 7 * unit,
            borderRadius: "50%",
            background: "rgba(18,22,30,.88)",
            boxShadow: `inset 0 ${1.2 * unit}px ${1.5 * unit}px rgba(0,0,0,.6)`,
            top: vertical ? 5 * unit : side === "top" ? 6 * unit : undefined,
            bottom: side === "bottom" ? 6 * unit : undefined,
            left: vertical
              ? side === "left"
                ? 6 * unit
                : undefined
              : 5 * unit,
            right: side === "right" ? 6 * unit : undefined,
          }}
        />
      )}
    </>
  );
}
