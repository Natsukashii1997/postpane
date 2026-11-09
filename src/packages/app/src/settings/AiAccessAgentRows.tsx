// Settings → AI access → Open to other AI: the two ways other AI reach
// sessions through PostPane besides HUD tools — Claude Code handing work to
// ChatGPT, and agents messaging each other (#278, upstream b1217c3). Kept
// apart from AiAccessPane.tsx, which the 300-line ratchet holds.
import type { Snapshot } from "@agent-hud/protocol";
import { Pill, Row, type Text } from "./SettingsPrimitives";

export function AgentReachRows({
  snapshot,
  registered,
  t,
}: {
  snapshot: Snapshot;
  registered: boolean;
  t: Text;
}) {
  const messages = snapshot.settings.agentMessages === true;
  const asUser = snapshot.settings.agentMessagesAsUser === true;
  const limit = snapshot.settings.agentMessagesLimit;
  const passes =
    limit === null
      ? t("no limit", "不限")
      : t(`${limit ?? 10} in a row`, `连续 ${limit ?? 10} 次`);
  return (
    <>
      <Row
        title={t(
          "Start a relay (relay_to_chatgpt)",
          "发起接力（relay_to_chatgpt）",
        )}
        subtitle={t(
          "Claude Code and Codex sessions: start or continue one review. The switch above does not cover it; remove the ChatGPT extension's registration in Agent plugins to turn it off.",
          "接 Claude Code 和 Codex 会话，能新开或续接一次审核。不受上面开关管；要关就在「智能体插件」移除 ChatGPT 插件登记。",
        )}
      >
        <Pill tone={registered ? "green" : "gray"} dot>
          {registered
            ? t("On · registered", "开 · 插件已登记")
            : t("Off · not registered", "关 · 插件未登记")}
        </Pill>
      </Row>
      <Row
        title={t(
          "Agent messages (list_sessions, send_message, start_session, get_message)",
          "智能体互发消息（list_sessions、send_message、start_session、get_message）",
        )}
        subtitle={t(
          `Claude Code, Codex, Antigravity and DeepSeek Harness sessions on this computer: list them, send one a message (it waits until that session is idle), start one, read its answer. ${asUser ? "Sent as you, with no label" : "Labelled as coming from an agent"}; stops after ${passes} until you speak. Turn it off with “Let agents message each other” in Agent plugins.`,
          `本机 Claude Code、Codex、Antigravity、DeepSeek Harness 会话：列出会话、给某个会话发消息（等它空闲再送进去）、开新会话、取回回答。${asUser ? "以你的身份发、不带标签" : "标明来自智能体"}；${passes}后停下等你。在「智能体插件」关掉「允许智能体互发消息」即关。`,
        )}
      >
        <Pill tone={messages ? (asUser ? "orange" : "green") : "gray"} dot>
          {messages
            ? asUser
              ? t("On · as you", "开 · 以你的身份")
              : t("On", "开")
            : t("Off", "关")}
        </Pill>
      </Row>
    </>
  );
}
