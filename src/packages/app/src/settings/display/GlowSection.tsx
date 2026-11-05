/* The glow round the notch: always the soft glow (issue #74), its effect up
 * front, every slider behind Fine-tune. Simple mode has no glow. */
import type { HUDConfig } from "@agent-hud/hud/model";
import { Menu, MoreRows, Row, Section } from "../SettingsPrimitives";
import { displayControls, type DisplayProps } from "./controls";

export function GlowSection({ config, update, t }: DisplayProps) {
  if (config.mode === "simple") return null;
  const { slider, toggle, px, percent, seconds } = displayControls({
    config,
    update,
    t,
  });
  const effects: [HUDConfig["glowEffect"], string][] = [
    ["breathe", t("Breathe", "呼吸")],
    ["flow", t("Flow", "流光")],
    ["scan", t("Scan", "扫描")],
    ["ripple", t("Ripple", "涟漪")],
    ["shimmer", t("Shimmer", "闪烁")],
    ["boot", t("Boot", "启动")],
  ];
  return (
    <Section
      title={t("Glow", "光晕")}
      action={
        effects.find(([value]) => value === config.glowEffect)?.[1] ??
        config.glowEffect
      }
    >
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
        label={t(
          "Fine-tune brightness, range, feather and breathing",
          "微调亮度、范围、羽化和呼吸",
        )}
      >
        {slider(
          "glowBrightness",
          t("Brightness", "亮度"),
          0.2,
          1,
          0.05,
          percent,
        )}
        {slider("glowRange", t("Range", "范围"), 0, 36, 1, px)}
        {slider("glowBlur", t("Feather", "羽化"), 0, 36, 1, px)}
        {toggle("glowOutwardOnly", t("Outward only", "仅向外扩散"))}
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
