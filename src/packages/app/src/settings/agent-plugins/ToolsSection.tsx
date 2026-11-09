// Agent tools: the app-wide switches for what agents may do with Agent HUD's
// tools. Open's is arranging the HUD; a product build adds its own groups.
// `children` (Details) close the group.
import { Fragment, type ReactNode } from "react";
import type { Snapshot } from "@agent-hud/protocol";
import {
  Section,
  type SettingsPaneProps,
  type Text,
} from "../SettingsPrimitives";
import { AgentMessagesRow } from "./AgentMessagesRow";
import { ToolSwitchRow } from "./rows";
import type { AgentPluginContext, AgentPluginItem } from "./types";
import type { HudTools } from "./use-status";

export function ToolsSection({
  tools,
  groups,
  snapshot,
  action,
  request,
  active,
  t,
  children,
}: {
  tools: HudTools;
  groups: AgentPluginItem[];
  snapshot: Snapshot;
  action: SettingsPaneProps["action"];
  request: AgentPluginContext["request"];
  active: boolean;
  t: Text;
  children?: ReactNode;
}) {
  const { unavailable, problem } = tools.state;
  return (
    <Section
      title={t("Let agents arrange the HUD", "让智能体调整侧栏")}
      action={
        unavailable
          ? t("Unavailable here", "这个系统暂不可用")
          : tools.on
            ? t("On", "已打开")
            : t("Off", "已关闭")
      }
    >
      <ToolSwitchRow
        title={t("Let agents arrange the HUD", "允许智能体调整侧栏")}
        description={t(
          "Changes stay drafts until you save them in the panel.",
          "改动先是草稿，在面板里保存后才生效。",
        )}
        checked={tools.on}
        pending={tools.pending}
        unavailable={unavailable ? t(...unavailable) : null}
        error={tools.error ?? (problem ? t(...problem) : null)}
        onChange={(value) => void tools.set(value)}
      />
      {/* Agent messages (#278, upstream b1217c3). */}
      <AgentMessagesRow snapshot={snapshot} action={action} t={t} />
      {groups.map((item) => (
        <Fragment key={item.id}>
          {item.render({
            snapshot,
            request,
            active,
            clientFound: null,
            plugin: { installed: null },
          })}
        </Fragment>
      ))}
      {children}
    </Section>
  );
}
