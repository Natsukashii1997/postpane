// Settings → AI access → Open to other AI: the ways other AI reach sessions
// through PostPane besides HUD tools — Claude Code handing work to ChatGPT,
// listing and ending those relays (#439), and agents messaging each other (#278, upstream b1217c3). Kept
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
          "Claude Code and Codex sessions: start or continue one review. The switch above does not cover it: it answers while the local tools channel listens, that is while the ChatGPT extension is registered, or the switch above or agent messages is on; off only when all three are.",
          "接 Claude Code 和 Codex 会话，能新开或续接一次审核。不单受上面开关管：本机工具通道开着就够得着，登记了 ChatGPT 插件、开着上面开关或「允许智能体互发消息」任一项通道就开，三项都关才关。",
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
          "List and end relays (relay_list, relay_end)",
          "列出与结束接力（relay_list、relay_end）",
        )}
        subtitle={t(
          "Claude Code and Codex sessions: list the relays still open and the session that began each; end them as the card's “End relay” does, only when you began that session's current turn (your own words, or words the plugin brought in with no agent's label). Each end goes on the card with who ended it and why. Same switch as starting a relay.",
          "接 Claude Code 和 Codex 会话：列出还没结束的接力和各自的发起会话；结束接力和卡片上点「结束接力」一样，但只在调用的那一轮是你开的头时才收（你在会话里打的字，或经插件送进来、不带智能体来源标签的话），卡上记谁、为什么结束。开关同「发起接力」。",
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
