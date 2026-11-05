import { useEffect, useMemo, useRef, useState } from "react";
import { useFormat } from "@agent-hud/ui/format-context";
import { quotaPercent, quotaPercentLabel } from "@agent-hud/ui/format";
import settingsWallpaper from "@agent-hud/ui/assets/settings-wallpaper.png";
import {
  DollarSign,
  Flame,
  Gauge,
  MessageCircleQuestion,
  Percent,
  Sigma,
} from "lucide-react";
import type { Snapshot } from "@agent-hud/protocol";
import { HUDArtwork as HUDLogo } from "@agent-hud/hud/HUDArtwork";
import { BotMark } from "@agent-hud/hud/BotMark";
import { botKey } from "@agent-hud/hud/bots/artwork";
import { staysAsBot } from "@agent-hud/hud/bots/bot-spec";
import { StubPaper } from "@agent-hud/hud/scene/HUDMarkStrip";
import { stubBotTop, stubSize } from "@agent-hud/hud/ticket-stub";
import { HUDGlow } from "@agent-hud/hud/HUDGlow";
import {
  defaultHUDConfig,
  meterLabel,
  statusColor,
  vendorsFromSnapshot,
  type HUDConfig,
} from "@agent-hud/hud/model";
import { islandPath, stripMetrics } from "@agent-hud/hud/geometry";
import { PAPER_FIGURES, paperFace, paperOf } from "@agent-hud/hud/paper";
import { isRingStyle } from "@agent-hud/hud/usage-meter/arcs";
import {
  MarkBars,
  MarkRing,
  markItems,
} from "@agent-hud/hud/usage-meter/mark-usage";
import type { Text } from "./SettingsPrimitives";

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
  // The preview always shows DeepSeek beside the agents the sidebar shows
  // (owner, 2026-11-05), as though its provider were turned on.
  const shown = useMemo(
    () => ({
      ...snapshot,
      providers: snapshot.providers.map((provider) =>
        provider.id === "deepseek"
          ? { ...provider, detected: true, enabled: true }
          : provider,
      ),
    }),
    [snapshot],
  );
  const vendors = vendorsFromSnapshot(shown, sample.mode);
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
    <div style={{ padding: "12px 14px" }}>
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
                  style={sample.glowStyle}
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

/** A made-up slice of one panel section, in the HUD's own light or dark
 * look; faded while that section is switched off. */
export function PartSample({
  kind,
  enabled,
  config,
  t,
}: {
  kind: "sessions" | "quota" | "tokens";
  enabled: boolean;
  config: HUDConfig;
  t: Text;
}) {
  const light =
    config.appearance === "light" ||
    (config.appearance === "system" &&
      !matchMedia("(prefers-color-scheme: dark)").matches);
  const { quotaDisplay } = useFormat();
  const amounts = [4, 8, 5, 11, 16, 9, 6, 13, 20, 14, 10, 7];
  // Printed on the panel's own paper, in the HUD's appearance.
  const paper = paperOf(light);
  const warning = light ? "#b7791f" : "#e0a948";
  return (
    <div
      aria-hidden="true"
      style={{
        padding: "0 14px",
        height: kind === "sessions" ? 56 : 64,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: kind === "sessions" ? 8 : 10,
        ...paperFace(paper),
        border: `1px solid ${paper.line}`,
        color: paper.ink,
        opacity: enabled ? 1 : 0.25,
        pointerEvents: "none",
        fontSize: 11,
      }}
    >
      {kind === "sessions" ? (
        <>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong style={{ fontWeight: 600 }}>{t("Sessions", "会话")}</strong>
            <span style={{ opacity: 0.55 }}>
              {t("1 running", "1 个运行中")}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              opacity: 0.65,
            }}
          >
            <span style={{ position: "relative", width: 14, height: 14 }}>
              <HUDLogo source="Claude" size={14} light={light} />
              <i
                style={{
                  position: "absolute",
                  width: 6,
                  height: 6,
                  background: paper.ink,
                  borderRadius: "50%",
                  bottom: -2,
                  right: -2,
                  boxShadow: `0 0 0 1.5px ${paper.paper}`,
                }}
              />
            </span>
            <span>{t("Fix sign-in issue", "修复登录问题")}</span>
            <span style={{ flex: 1 }} />
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                color: warning,
                padding: "2px 5px",
                border: `1px solid ${warning}`,
                fontSize: 9,
              }}
            >
              <MessageCircleQuestion size={9} />1
            </span>
            <span style={{ fontFamily: PAPER_FIGURES }}>60k tok</span>
          </div>
        </>
      ) : kind === "quota" ? (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              opacity: 0.7,
            }}
          >
            <HUDLogo source="Claude" size={12} light={light} />
            <strong style={{ fontWeight: 600 }}>Claude</strong>
            <span style={{ flex: 1 }} />
            {[Percent, Flame, Sigma, Gauge, DollarSign].map((Icon, index) => (
              <span
                key={index}
                style={{
                  display: "inline-grid",
                  placeItems: "center",
                  width: 20,
                  height: 18,
                  background: index === 0 ? paper.fill : "transparent",
                  opacity: index === 0 ? 1 : 0.5,
                }}
              >
                <Icon size={10} />
              </span>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 12,
            }}
          >
            <i
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: paper.text(0.35),
                boxShadow: "inset 0 1px 1.2px rgba(0,0,0,.5)",
              }}
            />
            <strong style={{ fontWeight: 600 }}>{t("Session", "会话")}</strong>
            <span
              style={{
                flex: 1,
                height: 7,
                border: `1px solid ${paper.ink}`,
                boxSizing: "border-box",
              }}
            >
              <i
                style={{
                  display: "block",
                  width: `${quotaPercent(28, quotaDisplay)}%`,
                  height: "100%",
                  background: `repeating-linear-gradient(-45deg, ${paper.ink} 0 1.5px, transparent 1.5px 3.5px)`,
                }}
              />
            </span>
            <strong
              style={{
                fontFamily: PAPER_FIGURES,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {quotaPercentLabel(28, quotaDisplay)}
            </strong>
            {config.resetCountdown && (
              <span
                style={{
                  width: 78,
                  textAlign: "right",
                  opacity: 0.55,
                  fontSize: 11,
                }}
              >
                {t("2h 14m", "2 小时 14 分")}
              </span>
            )}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong style={{ fontWeight: 600 }}>
              {t("Tokens", "Token 消耗")}
            </strong>
            <span style={{ opacity: 0.55 }}>
              {t("1hr · 46M tok", "1 小时 · 46M tok")}
            </span>
          </div>
          <div
            style={{ display: "flex", alignItems: "end", gap: 4, height: 30 }}
          >
            {Array.from({ length: 24 }, (_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "end",
                  height: `${((amounts[i % 12] + amounts[(i + 4) % 12]) / 38) * 100}%`,
                  minHeight: 2,
                }}
              >
                <i
                  style={{
                    background: paper.text(0.82),
                    height: `${(amounts[(i + 4) % 12] / (amounts[i % 12] + amounts[(i + 4) % 12])) * 100}%`,
                  }}
                />
                <i style={{ background: paper.text(0.32), flex: 1 }} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
