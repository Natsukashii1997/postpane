/* When the panel opens and closes, shared by the HUD on every screen. */
import { Row, Section, Segments } from "../SettingsPrimitives";
import { displayControls, type DisplayProps } from "./controls";

export function AllScreensSection({ config, update, t }: DisplayProps) {
  const { slider, toggle, ms } = displayControls({ config, update, t });
  const how = config.requiresOptionToOpen
    ? t("Hold Option", "按住 Option")
    : t("Hover", "悬停");
  const summary = config.openImmediatelyAtTop
    ? `${how} · ${t("at once at the top", "触顶立即")}`
    : `${how} · ${t(`${ms(config.hoverDelayMs)} wait`, `等 ${ms(config.hoverDelayMs)}`)}`;
  return (
    <Section
      title={t("When the panel opens", "什么时候展开面板")}
      action={summary}
    >
      <Row title={t("Opens on", "展开方式")}>
        <Segments
          label={t("Opens on", "展开方式")}
          value={config.requiresOptionToOpen ? "option" : "hover"}
          options={[
            ["hover", t("Hover", "悬停")],
            ["option", t("Hold Option", "按住 Option")],
          ]}
          change={(value) =>
            update({ requiresOptionToOpen: value === "option" })
          }
        />
      </Row>
      {toggle(
        "openImmediatelyAtTop",
        t("Open immediately at the top edge", "触顶立即展开"),
        t(
          "Opens as soon as the pointer meets the top edge.",
          "鼠标碰到屏幕顶边就展开，不等。",
        ),
      )}
      {slider(
        "hoverDelayMs",
        t("Wait before opening", "展开前等待"),
        0,
        1500,
        50,
        ms,
      )}
      {slider(
        "collapseDelayMs",
        t("Wait before closing", "收起前等待"),
        0,
        1500,
        50,
        ms,
      )}
    </Section>
  );
}
