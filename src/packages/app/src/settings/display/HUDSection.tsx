/* What the sidebar (the resting HUD) on the selected screen looks like: a
 * preview, its mode and that mode's own rows, bots, then its look. */
import type { Snapshot } from "@agent-hud/protocol";
import type { HUDConfig } from "@agent-hud/hud/model";
import { Row, Section, Segments } from "../SettingsPrimitives";
import { SmallHUDPreview } from "../SettingsSamples";
import { displayControls, type DisplayProps } from "./controls";

/** What a Simple mark draws, in a sentence. */
function usageSubtitle(
  style: HUDConfig["simpleStyle"],
  t: DisplayProps["t"],
): string {
  switch (style) {
    case "rings":
      return t(
        "One ring per window round the logo, the first outermost.",
        "每项一圈，套在标志外，第一项在最外圈。",
      );
    case "segments":
      return t(
        "One ring round the logo, split into a segment per window.",
        "标志外一圈，按项分段，第一段在最上面。",
      );
    case "bars":
      return t(
        "One bar per window beside the logo, the first on top.",
        "标志旁每项一条，第一项在最上面。",
      );
    case "numbers":
      return t(
        "The most used window's percentage beside the logo.",
        "标志旁只写用得最多那项的百分比。",
      );
  }
}

export function HUDSection({
  snapshot,
  active,
  config,
  update,
  t,
}: DisplayProps & { snapshot: Snapshot; active: boolean }) {
  const { slider, toggle, pt, percent } = displayControls({
    config,
    update,
    t,
  });

  const modeSubtitle =
    config.mode === "simple"
      ? t("A small floating panel, with no glow.", "悬浮的小面板，没有光晕。")
      : config.mode === "logos"
        ? t(
            "Docks on a screen edge and opens inward.",
            "停靠在屏幕边缘，向内展开。",
          )
        : config.hasNotch
          ? t("Uses this screen's notch.", "使用这块屏幕的刘海。")
          : t(
              "No notch here, so it draws a stand-in bar.",
              "这块屏幕没有刘海，画一条替代条。",
            );

  const dragHint =
    config.mode === "notch"
      ? t(
          "Drag the HUD on screen to move it. Dragging the notch switches to Dynamic.",
          "直接拖动屏幕上的侧栏来移动它；拖动刘海会切换为「动态」。",
        )
      : t(
          "Drag the HUD on screen to move it.",
          "直接拖动屏幕上的侧栏来移动它。",
        );

  const appearanceName = {
    system: t("System", "跟随系统"),
    light: t("Light", "浅色"),
    dark: t("Dark", "深色"),
  };
  // What the group is set to now, at its head: mode, size, appearance.
  const summary = [
    config.mode === "notch"
      ? t("Notch", "刘海")
      : config.mode === "logos"
        ? t("Dynamic", "动态")
        : t("Simple", "简约"),
    config.mode === "logos"
      ? pt(config.logoSize)
      : config.mode === "simple"
        ? pt(config.simpleSize)
        : null,
    appearanceName[config.appearance],
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Section
      title={t("What the sidebar looks like", "侧栏长什么样")}
      action={summary}
      footer={dragHint}
    >
      <SmallHUDPreview
        snapshot={snapshot}
        config={config}
        active={active}
        caption={{
          label: t("PREVIEW", "预览"),
          where:
            config.mode === "notch"
              ? t("Main screen · Notch", "主屏 · 刘海")
              : config.mode === "logos"
                ? t("Main screen · Dynamic", "主屏 · 动态")
                : t("Main screen", "主屏"),
          note: t("Actual look follows the screen", "实际效果以屏幕上为准"),
        }}
      />
      <Row title={t("Mode", "形态")} subtitle={modeSubtitle}>
        <Segments
          label={t("Mode", "形态")}
          value={config.mode}
          options={[
            ["notch", t("Notch", "刘海")],
            ["logos", t("Dynamic", "动态")],
          ]}
          change={(value) =>
            update({
              mode: value as HUDConfig["mode"],
              ...(config.mode === "notch" &&
              value !== "notch" &&
              config.hasNotch &&
              config.edge === "top" &&
              config.offset === 0.5
                ? { offset: 0 }
                : {}),
            })
          }
        />
      </Row>
      {config.mode === "simple" && (
        <>
          {slider("simpleSize", t("Size", "大小"), 20, 60, 1, pt)}
          {slider(
            "simpleGapScale",
            t("Logo spacing", "Logo 间距"),
            0.1,
            0.6,
            0.05,
            (value) => pt(value * config.simpleSize),
          )}
          <Row
            title={t("Usage", "用量画法")}
            subtitle={usageSubtitle(config.simpleStyle, t)}
          >
            <Segments
              label={t("Usage", "用量画法")}
              value={config.simpleStyle}
              options={[
                ["rings", t("Rings", "年轮")],
                ["segments", t("Segments", "分段环")],
                ["bars", t("Bars", "进度条")],
                ["numbers", t("Numbers", "数字")],
              ]}
              change={(value) =>
                update({ simpleStyle: value as HUDConfig["simpleStyle"] })
              }
            />
          </Row>
          {config.simpleStyle !== "numbers" &&
            slider(
              "ringWidth",
              config.simpleStyle === "bars"
                ? t("Bar thickness", "进度条粗细")
                : t("Ring thickness", "圆环粗细"),
              1,
              4,
              0.5,
              (value) =>
                `${(config.simpleStyle === "bars" ? value + 0.5 : value).toFixed(1)} pt`,
            )}
          {config.simpleStyle !== "numbers" &&
            toggle(
              "showsNumbers",
              t("Show numbers", "显示数字"),
              t(
                "The most used window's percentage beside each logo.",
                "标志旁写出用得最多那项的百分比。",
              ),
            )}
        </>
      )}
      {config.mode === "logos" && (
        <>
          {slider("logoSize", t("Logo size", "Logo 大小"), 20, 60, 1, pt)}
          {slider(
            "gapScale",
            t("Logo spacing", "Logo 间距"),
            0.1,
            0.6,
            0.05,
            (value) => pt(value * config.logoSize),
          )}
          {slider(
            "logoEdgeDistance",
            t("Edge distance", "边缘距离"),
            0,
            20,
            1,
            pt,
          )}
          {toggle(
            "showsLogos",
            t("Show logos", "显示 Logo"),
            t("Off keeps only the backdrop.", "关闭后只留背景。"),
          )}
        </>
      )}
      {toggle(
        "botLogos",
        t("Bot logos", "Bot 形象"),
        t(
          "Agents show as bots while they work.",
          "智能体工作时 Logo 变成会动的 Bot。",
        ),
      )}
      <Row
        title={t("Appearance", "外观")}
        subtitle={
          config.hasNotch && config.mode === "notch"
            ? t(
                "The notch stays black; its panel uses this.",
                "刘海保持纯黑，展开的面板用这个外观。",
              )
            : undefined
        }
      >
        <Segments
          label={t("HUD appearance", "侧栏外观")}
          value={config.appearance}
          options={[
            ["system", appearanceName.system],
            ["light", appearanceName.light],
            ["dark", appearanceName.dark],
          ]}
          change={(value) =>
            update({ appearance: value as HUDConfig["appearance"] })
          }
        />
      </Row>
      {slider(
        "solidTransparency",
        t("Transparency", "透明度"),
        0,
        1,
        0.05,
        percent,
      )}
    </Section>
  );
}
