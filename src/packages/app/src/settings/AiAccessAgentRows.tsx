// Settings → AI access → Open to other AI: the ways other AI reach sessions
// through PostPane besides HUD tools — Claude Code handing work to ChatGPT,
// listing and ending those relays (#439), and agents messaging each other (#278, upstream b1217c3). Kept
// apart from AiAccessPane.tsx, which the 300-line ratchet holds.
import type { Snapshot } from "@agent-hud/protocol";
import { relayToolsState } from "../lib/ai-access";
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
  const channel = relayToolsState(snapshot.connection.localTools);
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
          "Claude Code and Codex sessions: list the relays still open and the session that began each; end them as the card's “End relay” does, without your hand. When you began that session's current turn (your own words, or words the plugin brought in with no agent's label) the end is at your word; otherwise it is the agent's own, and a review chain stopped at its cap stays unsettled. Each end goes on the card with who ended it and why. Reachable while the local tools channel listens, as above; no ChatGPT extension needed.",
          "接 Claude Code 和 Codex 会话：列出还没结束的接力和各自的发起会话；结束接力和卡片上点「结束接力」一样，不用你动手。调用的那一轮是你开的头（你在会话里打的字，或经插件送进来、不带智能体来源标签的话）就算你授权；不是就记成智能体自行结束，审到上限的审查链不算了结。卡上记谁、为什么结束。本机工具通道开着就够得着（同上），不需要 ChatGPT 插件。",
        )}
      >
        <Pill
          tone={
            channel === "on"
              ? "green"
              : channel === "failed"
                ? "orange"
                : "gray"
          }
          dot
        >
          {channel === "on"
            ? t("On · local tools channel on", "开 · 本机工具通道开着")
            : channel === "failed"
              ? t(
                  "Not reachable · local tools channel not running",
                  "够不着 · 本机工具通道未运行",
                )
              : t("Off · local tools channel off", "关 · 本机工具通道关着")}
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
