/* Back to defaults for the selected screen, one line of buttons: the HUD's
 * style, the panel's layout, or just the position. After a reset an Undo
 * appears beside its button and brings back what the reset replaced, until
 * the page closes or another screen is picked. */
import { useRef, useState } from "react";
import { defaultHUDConfig, type HUDConfig } from "@agent-hud/hud/model";
import { SmallButton } from "../SettingsPrimitives";
import type { DisplayProps } from "./controls";

/** Everything "HUD style" resets: mode, place, sizes, look and glow. */
const styleKeys = [
  "mode",
  "glowStyle",
  "glowEffect",
  "breathSeconds",
  "idleBreathSeconds",
  "breathAmplitude",
  "glowRange",
  "glowBlur",
  "glowBrightness",
  "glowOutwardOnly",
  "glowGridPitch",
  "glowGridCore",
  "glowGridFade",
  "glowGridDensity",
  "edge",
  "offset",
  "logoSize",
  "logoEdgeDistance",
  "gapScale",
  "showsLogos",
  "simpleSize",
  "simpleGapScale",
  "ringWidth",
  "simpleStyle",
  "showsNumbers",
  "separatesAgents",
  "appearance",
  "solidTransparency",
] as const;

/** What "Panel layout" resets to. */
const layoutDefault = {
  sessionList: true,
  quotaDetails: true,
  resetCountdown: true,
  tokenUsage: true,
  panelWidth: defaultHUDConfig.panelWidth,
  layoutDensity: defaultHUDConfig.layoutDensity,
  panelSections: defaultHUDConfig.panelSections,
  panelOrder: defaultHUDConfig.panelOrder,
};

export function ResetSection({
  config,
  update,
  t,
  screenName,
}: DisplayProps & {
  /** Named only when there are several screens to tell apart. */
  screenName?: string;
}) {
  const previousStyle = useRef<Partial<HUDConfig> | null>(null);
  const previousLayout = useRef<Partial<HUDConfig> | null>(null);
  // The refs don't render; this does, so Undo enables and disables.
  const [revision, setRevision] = useState(0);

  const resetStyle = () => {
    previousStyle.current = Object.fromEntries(
      styleKeys.map((key) => [key, config[key]]),
    );
    update({
      ...Object.fromEntries(
        styleKeys.map((key) => [key, defaultHUDConfig[key]]),
      ),
      mode: "logos",
    });
    setRevision(revision + 1);
  };
  const revertStyle = () => {
    if (previousStyle.current) {
      const previous = previousStyle.current;
      previousStyle.current = null;
      update(previous);
      setRevision(revision + 1);
    }
  };
  const resetLayout = () => {
    previousLayout.current = {
      sessionList: config.sessionList,
      quotaDetails: config.quotaDetails,
      resetCountdown: config.resetCountdown,
      tokenUsage: config.tokenUsage,
      panelWidth: config.panelWidth,
      layoutDensity: config.layoutDensity,
      panelSections: [...config.panelSections],
      panelOrder: [...config.panelOrder],
    };
    update(layoutDefault);
    setRevision(revision + 1);
  };
  const revertLayout = () => {
    if (previousLayout.current) {
      const previous = previousLayout.current;
      previousLayout.current = null;
      update(previous);
      setRevision(revision + 1);
    }
  };
  const resetPosition = () =>
    update({
      edge: "top",
      offset: config.hasNotch && config.mode !== "notch" ? 0 : 0.5,
    });

  // Whether this screen's panel already matches what "Panel layout" resets to.
  const layoutIsDefault = Object.entries(layoutDefault).every(
    ([key, value]) =>
      JSON.stringify(config[key as keyof typeof layoutDefault]) ===
      JSON.stringify(value),
  );

  const undo = t("Undo", "撤销");
  return (
    <div className="settings-resetline">
      <span className="settings-resetline-title">{t("Reset", "恢复默认")}</span>
      <SmallButton onClick={resetStyle}>
        {t("HUD style", "侧栏样式")}
      </SmallButton>
      {previousStyle.current && (
        <SmallButton onClick={revertStyle}>{undo}</SmallButton>
      )}
      <SmallButton disabled={layoutIsDefault} onClick={resetLayout}>
        {t("Panel layout", "面板布局")}
      </SmallButton>
      {previousLayout.current && (
        <SmallButton onClick={revertLayout}>{undo}</SmallButton>
      )}
      <SmallButton onClick={resetPosition}>{t("Position", "位置")}</SmallButton>
      <small>
        {screenName
          ? t(`These change ${screenName} only.`, `只影响「${screenName}」。`)
          : t(
              "Undo appears beside a button after it resets.",
              "重置后旁边出现「撤销」",
            )}
      </small>
    </div>
  );
}
