import { useEffect, useMemo, useRef, useState } from "react";
import settingsWallpaper from "@agent-hud/ui/assets/settings-wallpaper.png";
import type { Snapshot } from "@agent-hud/protocol";
import { HUDArtwork as HUDLogo } from "@agent-hud/hud/HUDArtwork";
import { BotMark } from "@agent-hud/hud/BotMark";
import { botKey } from "@agent-hud/hud/bots/artwork";
import { staysAsBot } from "@agent-hud/hud/bots/bot-spec";
import { StubPaper } from "@agent-hud/hud/scene/StubPaper";
import { stubBotTop, stubSize } from "@agent-hud/hud/ticket-stub";
import { HUDGlow } from "@agent-hud/hud/HUDGlow";
import { SourceHoverPanel } from "@agent-hud/hud/HoverPanel";
import { HUDGroundProvider } from "@agent-hud/hud/ground";
import {
  defaultHUDConfig,
  meterLabel,
  statusColor,
  vendorsFromSnapshot,
  type HUDConfig,
} from "@agent-hud/hud/model";
import { islandPath, stripMetrics } from "@agent-hud/hud/geometry";
import { PaperContext, paperFace, paperOf } from "@agent-hud/hud/paper";
import { isRingStyle } from "@agent-hud/hud/usage-meter/arcs";
import {
  MarkBars,
  MarkRing,
  markItems,
} from "@agent-hud/hud/usage-meter/mark-usage";

const originalWallpaper = settingsWallpaper;

/** The resting HUD on a strip of wallpaper, drawn from the screen's settings
 * and the agents in the snapshot. Every mode sits at the top edge of the same
 * box, shrunk to fit when it is wider than the preview; it never opens a
 * panel, and draws nothing while the Settings window is inactive. */
export function SmallHUDPreview({
  snapshot,
  config,
  active,
  caption,
}: {
  snapshot: Snapshot;
  config: HUDConfig;
  active: boolean;
  /** The frame's words: its label, and the line under the picture. */
  caption?: { label: string; where: string; note: string };
}) {
  const sample = { ...defaultHUDConfig, ...config, edge: "top" as const };
  const vendors = vendorsFromSnapshot(snapshot, sample.mode);
  const hasActiveVendor = vendors.some(
    (vendor) => vendor.working > 0 || vendor.waiting > 0,
  );
  const metrics = stripMetrics(sample, vendors, snapshot.settings.quotaDisplay);
  const simple = sample.mode === "simple";
  const stubbed = sample.mode === "logos";
  // Dynamic's preview joins the agents into one four-part ticket with no
  // readings: each part a stub wide, perforated top and bottom.
  const unit = metrics.logo / 20;
  const ticket = stubbed
    ? {
        width: vendors.length * stubSize(metrics.logo).width,
        height: stubBotTop(metrics.logo) + 3 * unit + metrics.logo + 9 * unit,
      }
    : null;
  const box = ticket ?? metrics;
  const light =
    sample.appearance === "light" ||
    (sample.appearance === "system" &&
      !matchMedia("(prefers-color-scheme: dark)").matches);
  const alpha = 1 - sample.solidTransparency;
  const surface = light ? `rgba(245,245,247,${alpha})` : `rgba(0,0,0,${alpha})`;
  const stage = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(0);
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setStageWidth(entry.contentRect.width),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  // A floating strip keeps a little wallpaper round it; an attached one
  // reaches the edge like the real notch.
  const margin = simple ? 24 : 0;
  const scale =
    stageWidth > 0
      ? Math.min(1, (stageWidth - margin * 2) / Math.max(box.width, 1))
      : 1;
  return (
    <div style={{ padding: "12px 0 10px" }}>
      <div className="settings-hud-frame">
        {caption && (
          <span className="settings-hud-frame-label">{caption.label}</span>
        )}
        <div
          ref={stage}
          aria-hidden="true"
          className="settings-hud-preview"
          style={{
            position: "relative",
            height: 112,
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          {/* The wallpaper is toned down on its own layer; the HUD keeps its colours. */}
          <div
            className="settings-hud-wallpaper"
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url("${originalWallpaper}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          {active && (
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: simple ? 10 : 0,
                transform: `translateX(-50%) scale(${scale})`,
                transformOrigin: "top center",
                width: box.width,
                height: box.height,
              }}
            >
              {/* Only the notch glows on screen; Dynamic's stubs have none. */}
              {sample.mode === "notch" && (
                <HUDGlow
                  outwardOnly={sample.glowOutwardOnly}
                  width={metrics.width}
                  height={metrics.height}
                  radius={metrics.radius}
                  attached={sample.mode === "notch"}
                  style="blur"
                  effect={sample.glowEffect}
                  colors={vendors
                    .filter((vendor) => vendor.used !== null)
                    .map((vendor) => statusColor(vendor.level))}
                  active={hasActiveVendor}
                  period={sample.breathSeconds}
                  amplitude={sample.breathAmplitude}
                  brightness={sample.glowBrightness}
                  range={sample.glowRange}
                  blur={sample.glowBlur}
                  pitch={sample.glowGridPitch}
                  core={sample.glowGridCore}
                  fade={sample.glowGridFade}
                  density={sample.glowGridDensity}
                  reduceMotion={!sample.animations}
                />
              )}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  // Dynamic's ticket hangs from the screen's top edge.
                  alignItems: stubbed ? "stretch" : "center",
                  // The marks sit in the middle of the strip, not against its left end.
                  justifyContent: simple ? undefined : "center",
                  gap: stubbed ? 0 : metrics.gap,
                  padding: simple
                    ? `${metrics.padding.top}px ${metrics.padding.right}px ${metrics.padding.bottom}px ${metrics.padding.left}px`
                    : 0,
                  borderRadius: simple ? metrics.radius : "0 0 10px 10px",
                  background: simple ? surface : "transparent",
                  color: light ? "#161618" : "#f2f2f5",
                  boxShadow: simple
                    ? `0 1px 3px rgba(0,0,0,${0.133 * alpha})`
                    : undefined,
                }}
              >
                {sample.mode === "notch" && (
                  <svg
                    width={metrics.width + 16}
                    height={metrics.height}
                    style={{
                      position: "absolute",
                      left: -8,
                      top: 0,
                      overflow: "visible",
                    }}
                  >
                    <path
                      d={islandPath(
                        metrics.width + 16,
                        metrics.height,
                        8,
                        metrics.radius,
                      )}
                      fill={sample.hasNotch ? "#000" : surface}
                    />
                  </svg>
                )}
                {stubbed && sample.showsLogos && (
                  <StubPaper unit={unit} side="top" light={light} bothEdges />
                )}
                {sample.mode !== "notch" &&
                  (sample.mode !== "logos" || sample.showsLogos) &&
                  vendors.map((vendor, index) => (
                    <div
                      key={vendor.key}
                      style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        gap: metrics.labelGap,
                        flexShrink: 0,
                        // Dynamic gives each agent one part of the joined ticket.
                        ...(stubbed
                          ? {
                              width: stubSize(metrics.logo).width,
                              flexDirection: "column" as const,
                              justifyContent: "flex-start",
                              paddingTop: stubBotTop(metrics.logo) + 3 * unit,
                              boxSizing: "border-box" as const,
                            }
                          : null),
                      }}
                    >
                      {stubbed && index > 0 && (
                        <span
                          aria-hidden="true"
                          style={{
                            position: "absolute",
                            left: 0,
                            top: 5 * unit,
                            bottom: 5 * unit,
                            borderLeft: `${unit}px dashed rgba(42,41,37,.34)`,
                          }}
                        />
                      )}
                      <span
                        style={{
                          position: "relative",
                          width: metrics.mark,
                          height: metrics.mark,
                          display: "inline-grid",
                          placeItems: "center",
                        }}
                      >
                        {simple && isRingStyle(sample.simpleStyle) && (
                          <MarkRing
                            style={sample.simpleStyle}
                            items={markItems(
                              vendor,
                              snapshot.settings.quotaDisplay,
                              sample.panelLayout,
                            )}
                            size={metrics.mark}
                            ringWidth={sample.ringWidth}
                            light={light}
                            reduceMotion={!sample.animations}
                          />
                        )}
                        <BotMark
                          source={vendor.name}
                          size={metrics.logo}
                          // On a stub the bot stands on light paper, whatever the theme.
                          light={stubbed || light}
                          enabled={sample.botLogos}
                          // The same standing bots as the sidebar (Codex's petals, Hermes's portrait).
                          staysBot={staysAsBot(botKey(vendor.name))}
                          state={
                            vendor.waiting > 0
                              ? "asking"
                              : vendor.working > 0 ||
                                  (!hasActiveVendor && index === 0)
                                ? "working"
                                : "idle"
                          }
                        />
                      </span>
                      {simple && metrics.bar > 0 && (
                        <MarkBars
                          items={markItems(
                            vendor,
                            snapshot.settings.quotaDisplay,
                            sample.panelLayout,
                          )}
                          length={metrics.bar}
                          height={metrics.mark}
                          size={Math.max(20, Math.min(60, sample.simpleSize))}
                          ringWidth={sample.ringWidth}
                          light={light}
                          reduceMotion={!sample.animations}
                        />
                      )}
                      {simple &&
                        (sample.showsNumbers ||
                          sample.simpleStyle === "numbers") && (
                          <span
                            style={{
                              fontSize: metrics.font,
                              color: statusColor(vendor.level),
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {meterLabel(vendor, snapshot.settings.quotaDisplay)}
                          </span>
                        )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
        {caption && (
          <div className="settings-hud-frame-meta">
            <span>{caption.where}</span>
            <span>{caption.note}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** The panel itself, as the HUD would open it on this screen: the real
 * panel drawn from the snapshot with these settings (its sections, their
 * order, the density), shrunk into a dashed frame. It cannot be clicked. */
export function PanelPreview({
  snapshot,
  config,
  active,
  label,
  width = 190,
}: {
  snapshot: Snapshot;
  config: HUDConfig;
  active: boolean;
  label: string;
  /** The preview's width; the panel is drawn at its own width and shrunk. */
  width?: number;
}) {
  const light =
    config.appearance === "light" ||
    (config.appearance === "system" &&
      !matchMedia("(prefers-color-scheme: dark)").matches);
  // Beside the dock the panel is printed on the receipt's paper; in the notch
  // it keeps the HUD's own ground.
  const paper = useMemo(
    () => (config.mode === "notch" ? null : paperOf(light)),
    [config.mode, light],
  );
  const inset = 16;
  const full = config.panelWidth + inset * 2;
  const scale = width / full;
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const element = inner.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setHeight(entry.borderBoxSize[0]?.blockSize ?? element.offsetHeight),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div className="settings-hud-frame settings-panel-frame">
      <span className="settings-hud-frame-label">{label}</span>
      <div
        aria-hidden="true"
        inert
        style={{
          width,
          height: Math.ceil(height * scale),
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <div
          ref={inner}
          style={{
            width: full,
            padding: inset,
            boxSizing: "border-box",
            transform: `scale(${scale})`,
            transformOrigin: "0 0",
            colorScheme: light ? "light" : "dark",
            ...(paper
              ? { ...paperFace(paper), color: paper.ink }
              : { background: light ? "#f5f5f7" : "#161618" }),
          }}
        >
          <HUDGroundProvider look={config}>
            <PaperContext.Provider value={paper}>
              <SourceHoverPanel
                config={config}
                snapshot={snapshot}
                light={light}
                Logo={HUDLogo}
                active={active}
                // As tall as the HUD lets it be on a screen like this one;
                // past that it scrolls, as on screen.
                maxHeight={Math.round(screen.availHeight * 0.8)}
              />
            </PaperContext.Provider>
          </HUDGroundProvider>
        </div>
      </div>
    </div>
  );
}
