/* The glow round the notch or behind the Dynamic logos: a style and an effect
 * up front, every slider behind Fine-tune. Simple mode has no glow. */
import type { HUDConfig } from "@agent-hud/hud/model";
import { Menu, MoreRows, Row, Section } from "../SettingsPrimitives";
import { displayControls, type DisplayProps } from "./controls";

export function GlowSection({ config, update, t }: DisplayProps) {
  if (config.mode === "simple") return null;
  const { slider, toggle, pt, px, percent, seconds, rows } = displayControls({
    config,
    update,
    t,
  });
  // Every style but Soft draws a grid of marks, with its own sliders.
  const grid = config.glowStyle !== "blur";
  const styles: [HUDConfig["glowStyle"], string][] = [
    ["blur", t("Soft", "柔光")],
    ["dots", t("Dots", "点阵")],
    ["ascii", t("ASCII  .:-=+*#%@", "字符  .:-=+*#%@")],
    ["blocks", t("Blocks  ░▒▓█", "色块  ░▒▓█")],
    ["braille", t("Braille  ⠁⠃⠇⡇⣿", "盲文  ⠁⠃⠇⡇⣿")],
    ["binary", t("Binary  0 1", "二进制  0 1")],
  ];
  const effects: [HUDConfig["glowEffect"], string][] = [
    ["breathe", t("Breathe", "呼吸")],
    ["flow", t("Flow", "流光")],
    ["scan", t("Scan", "扫描")],
    ["ripple", t("Ripple", "涟漪")],
    ["shimmer", t("Shimmer", "闪烁")],
    ["boot", t("Boot", "启动")],
  ];
  // The head names the style and effect alone, without the sample marks.
  const named = (list: [string, string][], key: string) =>
    (list.find(([value]) => value === key)?.[1] ?? key).split("  ")[0];
  return (
    <Section
      title={t("Glow", "光晕")}
      action={`${named(styles, config.glowStyle)} · ${named(effects, config.glowEffect)}`}
    >
      <Row title={t("Style", "样式")}>
        <Menu
          label={t("Glow style", "光晕样式")}
          value={config.glowStyle}
          options={styles}
          change={(value) =>
            update({ glowStyle: value as HUDConfig["glowStyle"] })
          }
          width={160}
        />
      </Row>
      <Row title={t("Effect", "动效")}>
        <Menu
          label={t("Glow effect", "光晕动效")}
          value={config.glowEffect}
          options={effects}
          change={(value) =>
            update({ glowEffect: value as HUDConfig["glowEffect"] })
          }
          width={160}
        />
      </Row>
      <MoreRows
        label={
          grid
            ? t(
                "Fine-tune the marks, brightness and breathing",
                "微调点阵、亮度和呼吸",
              )
            : t(
                "Fine-tune brightness, range, feather and breathing",
                "微调亮度、范围、羽化和呼吸",
              )
        }
      >
        {grid && (
          <>
            {slider("glowGridPitch", t("Grid pitch", "点距"), 4, 12, 1, pt)}
            {slider(
              "glowGridDensity",
              t("Density", "密度"),
              0.5,
              1.5,
              0.05,
              percent,
            )}
            {slider("glowGridCore", t("Solid", "实心"), 0, 8, 1, rows)}
            {slider("glowGridFade", t("Fade", "渐隐"), 0, 8, 1, rows)}
          </>
        )}
        {slider(
          "glowBrightness",
          t("Brightness", "亮度"),
          0.2,
          1,
          0.05,
          percent,
        )}
        {!grid && (
          <>
            {slider("glowRange", t("Range", "范围"), 0, 36, 1, px)}
            {slider("glowBlur", t("Feather", "羽化"), 0, 36, 1, px)}
            {toggle("glowOutwardOnly", t("Outward only", "仅向外扩散"))}
          </>
        )}
        {slider(
          "breathSeconds",
          t("Working period", "工作时周期"),
          1,
          12,
          0.5,
          seconds,
        )}
        {slider(
          "idleBreathSeconds",
          t("Idle period", "空闲时周期"),
          1,
          24,
          0.5,
          seconds,
        )}
        {config.glowEffect === "breathe" &&
          slider(
            "breathAmplitude",
            t("Breath depth", "呼吸幅度"),
            0,
            1,
            0.05,
            percent,
          )}
      </MoreRows>
    </Section>
  );
}
