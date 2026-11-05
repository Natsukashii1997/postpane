/* What the panel that opens from the HUD on the selected screen holds: its
 * density; on the left its three sections (each row shows or hides one and
 * moves it up or down; the reset countdown hangs under the quota board) and
 * the order of the agent blocks; on the right the real panel, drawn small
 * from the current snapshot and these settings. */
import { Fragment } from "react";
import type { Snapshot } from "@agent-hud/protocol";
import { Switch } from "@agent-hud/ui/components/switch";
import {
  agentVendorName,
  defaultHUDConfig,
  type HUDConfig,
} from "@agent-hud/hud/model";
import {
  MoreRows,
  Row,
  Section,
  Segments,
  ToggleRow,
} from "../SettingsPrimitives";
import { PanelPreview } from "../SettingsSamples";
import type { DisplayProps } from "./controls";
import { ReorderButtons } from "./ReorderButtons";

type PanelSectionKey = HUDConfig["panelSections"][number];

const sectionSettings = {
  blocks: "quotaDetails",
  tokens: "tokenUsage",
  sessions: "sessionList",
} as const;

export function PanelSection({
  snapshot,
  active,
  config,
  update,
  t,
}: DisplayProps & { snapshot: Snapshot; active: boolean }) {
  const sectionNames: Record<PanelSectionKey, [string, string]> = {
    blocks: [
      t("Quota board", "额度看板"),
      t(
        "Each agent's quota bars and its “lasts” stamp.",
        "每个智能体的额度条和「够用」章",
      ),
    ],
    tokens: [
      t("Token usage", "Token 消耗"),
      t(
        "The last 24 hours of tokens for agents without a quota.",
        "没有额度的智能体显示近 24 小时 Token",
      ),
    ],
    sessions: [
      t("In progress", "正在进行"),
      t(
        "Running sessions and those waiting on you; scrolls past 5.",
        "在跑和等你的会话，超过 5 条可滚动",
      ),
    ],
  };
  const densityNames: Record<HUDConfig["layoutDensity"], string> = {
    comfortable: t("Comfortable", "宽松"),
    normal: t("Normal", "普通"),
    compact: t("Compact", "紧凑"),
  };
  // Saved order first; a section the saved order lacks keeps its default place.
  const sections = [
    ...new Set([...config.panelSections, ...defaultHUDConfig.panelSections]),
  ];
  const moveSection = (index: number, by: -1 | 1) => {
    const next = [...sections];
    [next[index], next[index + by]] = [next[index + by], next[index]];
    update({ panelSections: next });
  };
  const shown = sections.filter(
    (section) => config[sectionSettings[section]],
  ).length;

  const blocks = [
    ...new Map([
      ...snapshot.quotas.map(
        (row) =>
          [
            row.vendor,
            { id: row.vendor, title: agentVendorName(row.vendor) },
          ] as const,
      ),
      ...snapshot.billing.map(
        (account) =>
          [
            `api:${account.vendor}`,
            {
              id: `api:${account.vendor}`,
              title: `${agentVendorName(account.vendor)} · ${t("Balance", "余额")}`,
            },
          ] as const,
      ),
    ]).values(),
  ];
  const allBlockKeys = [
    ...new Set([...config.panelOrder, ...blocks.map((block) => block.id)]),
  ];
  const orderedBlocks = allBlockKeys.flatMap((key) => {
    const block = blocks.find((item) => item.id === key);
    return block ? [block] : [];
  });
  const moveBlock = (index: number, by: -1 | 1) => {
    const next = [...allBlockKeys],
      from = next.indexOf(orderedBlocks[index].id),
      to = next.indexOf(orderedBlocks[index + by].id);
    [next[from], next[to]] = [next[to], next[from]];
    update({ panelOrder: next });
  };

  return (
    <Section
      title={t("What the panel holds", "面板里放什么")}
      action={t(
        `${shown} of 3 · ${densityNames[config.layoutDensity]}`,
        `${shown} 块 · ${densityNames[config.layoutDensity]}密度`,
      )}
    >
      <Row title={t("Layout density", "布局密度")}>
        <Segments
          label={t("Layout density", "布局密度")}
          value={config.layoutDensity}
          options={[
            ["comfortable", densityNames.comfortable],
            ["normal", densityNames.normal],
            ["compact", densityNames.compact],
          ]}
          change={(value) =>
            update({ layoutDensity: value as HUDConfig["layoutDensity"] })
          }
        />
      </Row>
      <div className="settings-panel-split">
        <div className="settings-panel-parts">
          {sections.map((section, index) => {
            const setting = sectionSettings[section];
            const [name, subtitle] = sectionNames[section];
            return (
              <Fragment key={section}>
                <Row title={name} subtitle={subtitle}>
                  <ReorderButtons
                    name={name}
                    index={index}
                    count={sections.length}
                    move={(by) => moveSection(index, by)}
                    t={t}
                  />
                  <Switch
                    aria-label={name}
                    checked={config[setting]}
                    onCheckedChange={(value) => update({ [setting]: value })}
                  />
                </Row>
                {section === "blocks" && (
                  <div className="settings-panel-subpart">
                    <ToggleRow
                      title={t("Reset countdown", "重置倒计时")}
                      subtitle={t(
                        "The “Resets in 1h” beside each bar.",
                        "额度条右边的「1 小时后重置」",
                      )}
                      checked={config.resetCountdown}
                      change={(value) => update({ resetCountdown: value })}
                      disabled={!config.quotaDetails}
                      reason={t(
                        "Shown with the quota board. Turn it on first.",
                        "跟随额度看板显示，请先打开额度看板。",
                      )}
                    />
                  </div>
                )}
              </Fragment>
            );
          })}
          {orderedBlocks.length > 1 && (
            <MoreRows label={t("Agent order", "智能体顺序")}>
              {orderedBlocks.map((block, index) => (
                <Row key={block.id} title={block.title}>
                  <ReorderButtons
                    name={block.title}
                    index={index}
                    count={orderedBlocks.length}
                    move={(by) => moveBlock(index, by)}
                    t={t}
                  />
                </Row>
              ))}
            </MoreRows>
          )}
        </div>
        <PanelPreview
          snapshot={snapshot}
          config={config}
          active={active}
          label={t("PANEL", "面板")}
        />
      </div>
    </Section>
  );
}
