// Settings → AI access (global rule P-13, design 甲 「四块收据」): the AI that
// writes for PostPane and whether it can be used now, the one feature that
// uses it, what other AI may do through PostPane's MCP server, and whose data
// PostPane only reads. AGENTS.md 「AI 接入」 says the same; change both.
import { useEffect, useState, type ReactNode } from "react";
import { HUDArtwork } from "@agent-hud/hud/HUDArtwork";
import { TooltipProvider } from "@agent-hud/ui/components/tooltip";
import { monthDayTime, snapshotLanguage } from "@agent-hud/ui/format";
import { useFormat } from "@agent-hud/ui/format-context";
import {
  Page,
  Pill,
  Row,
  Section,
  useText,
  type SettingsPaneProps,
} from "./SettingsPrimitives";
import { AgentReachRows } from "./AiAccessAgentRows";
import { ToolSwitchRow } from "./agent-plugins/rows";
import {
  nativeChatGpt,
  nativeClients,
  type ChatGptService,
  type MCPClientsService,
} from "./agent-plugins/services";
import {
  useChatGpt,
  useHudTools,
  useLightTheme,
  useMcpClients,
} from "./agent-plugins/use-status";
import { dataObjects, executorState, mcpReach } from "../lib/ai-access";
import "./ai-access.css";

function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="ai-access-facts">
      {items.map(([label, value]) => (
        <div key={label} style={{ display: "contents" }}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AiAccessPane({
  snapshot,
  action,
  active = true,
  chatgpt: chatgptService = nativeChatGpt,
  clients: clientsService = nativeClients,
}: Pick<SettingsPaneProps, "snapshot" | "action" | "active"> & {
  chatgpt?: ChatGptService;
  clients?: MCPClientsService;
}) {
  const t = useText(snapshot);
  const zh = snapshotLanguage(snapshot) === "zh";
  const light = useLightTheme();
  const { calendar } = useFormat();
  const chatgpt = useChatGpt(chatgptService, active, t);
  const mcp = useMcpClients(clientsService, active, t);
  const tools = useHudTools(snapshot, action);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  useEffect(() => {
    if (chatgpt.status) setCheckedAt(Date.now());
  }, [chatgpt.status]);

  const executor = executorState(chatgpt.status);
  const reach = mcpReach(mcp.status);
  const data = dataObjects(snapshot.providers);
  const registered = Boolean(chatgpt.status?.manifestInstalled);
  const list = (names: string[]) => names.join(zh ? "、" : ", ");
  const logo = (source: string) => (
    <HUDArtwork source={source} size={18} light={light} />
  );
  const path = (text: string) => <span className="ai-access-path">{text}</span>;

  return (
    <TooltipProvider>
      <Page>
        <Section
          title={t("Default executor", "默认执行方")}
          action={t("Only one · cannot switch", "只有一家 · 不可切换")}
          footer={
            checkedAt
              ? t(
                  `Checked ${monthDayTime(checkedAt, calendar, "en")}. With the extension off, a relay fails with an error; it never moves to another AI.`,
                  `检查于 ${monthDayTime(checkedAt, calendar, "zh")}。插件没连上时接力直接报错，不会换成别家。`,
                )
              : t(
                  "With the extension off, a relay fails with an error; it never moves to another AI.",
                  "插件没连上时接力直接报错，不会换成别家。",
                )
          }
        >
          <Row
            icon={logo("chatgpt")}
            title={t("ChatGPT on the web", "ChatGPT 网页")}
            subtitle={t(
              "Writes the reviews, in chatgpt.com signed in on your Chrome. The web page picks the model; PostPane cannot see it.",
              "用你在 Chrome 里登录的 chatgpt.com 写审核意见。模型由网页决定，驿窗拿不到。",
            )}
          >
            <Pill tone={executor.tone} dot>
              {t(...executor.words)}
            </Pill>
          </Row>
          <Row
            icon={logo("claude")}
            title="Claude"
            subtitle={t(
              "Can only start a relay, not review one.",
              "只能发起接力，不能当审核方。",
            )}
          >
            <Pill dot>{t("Not an executor", "不支持当执行方")}</Pill>
          </Row>
          <Row
            icon={logo("codex")}
            title="Codex"
            subtitle={t(
              'Can start a relay (#280), not review one; replies go back into its thread through Codex\'s queue. Codex asks you to approve each relay call unless ~/.codex/config.toml sets approval_mode = "approve" for relay_to_chatgpt (#286; new threads only).',
              '能发起接力（#280），不能当审核方；回信经 Codex 自己的队列送回原线程。Codex 每次调接力工具默认要你批准；在 ~/.codex/config.toml 给 relay_to_chatgpt 设 approval_mode = "approve" 就免批准（#286，新开的线程才生效）。',
            )}
          >
            <Pill dot>{t("Not an executor", "不支持当执行方")}</Pill>
          </Row>
        </Section>

        <Section
          title={t("Features", "功能清单")}
          action={t("1 feature uses AI", "1 项功能用 AI 产出")}
        >
          <Row
            title={t("ChatGPT review relay", "ChatGPT 接力审核")}
            tag={t("ChatGPT web only", "仅支持 ChatGPT 网页")}
            subtitle={t(
              "Claude hands a finished round to ChatGPT; the reply goes back to Claude by its verdict, two rounds at most.",
              "Claude 做完一轮交给 ChatGPT 审，回信按结论自动转回 Claude，最多 2 轮。",
            )}
          />
          <Facts
            items={[
              [
                t("Started by", "谁发起"),
                <>
                  {t(
                    "A Claude Code session or Codex thread: it calls ",
                    "Claude Code 或 Codex 会话：自己调 ",
                  )}
                  {path("relay_to_chatgpt")}
                  {t(
                    ", or you swipe Review or Discuss on its row in the HUD",
                    "，或你在侧栏它那一行左滑「审核」「讨论」",
                  )}
                </>,
              ],
              [
                t("Executor", "执行方"),
                t(
                  "ChatGPT on the web (the default)",
                  "ChatGPT 网页（跟随默认）",
                ),
              ],
              [
                t("How", "接入"),
                t(
                  "Web bridge: Chrome extension → Native Messaging → PostPane",
                  "网页桥：Chrome 插件 → Native Messaging → 驿窗",
                ),
              ],
              [
                t("Reads", "读"),
                t(
                  "What Claude or Codex hands over: its summary and the change. ChatGPT cannot read files on this computer. PostPane also reads the end of the Claude or Codex session's transcript, only to see who began its current turn (rounds count again once you spoke up) and how the words sent back stand (queued, taken, started).",
                  "Claude 或 Codex 交来的说明和改动摘要；ChatGPT 读不到本机文件。驿窗另读 Claude 或 Codex 会话记录末尾，只看当前这一轮是谁开的头（你插话就重算轮数），并读回信的送达状态（排队中 / 已领取 / 已开始）",
                ),
              ],
              [
                t("Writes", "写到"),
                <>
                  {path("app.postpane.mac/chatgpt/handoffs.json")}
                  {t(
                    "; replies go back to the Claude or Codex session that started it",
                    "；回信转回发起的那个 Claude 或 Codex 会话",
                  )}
                </>,
              ],
              [
                t("Trail", "留痕"),
                t(
                  "The relay card's timeline: each step's time, who did it, and whether PostPane did it on its own",
                  "接力卡时间线：每一步的时间、谁做的、是不是驿窗自动做的",
                ),
              ],
              [
                t("Why", "为什么"),
                <span className="ai-access-why">
                  {t(
                    "Reviews use the projects and memory in your ChatGPT account. Claude Code and Codex can start one, since the reply goes back by session id; Codex reviewing goes by agent messages instead (#278).",
                    "审核要用你 ChatGPT 账号里的项目和记忆。Claude Code 和 Codex 能发起，因为回信要按会话 id 送回去；Codex 审核改用智能体互发消息（#278）。",
                  )}
                </span>,
              ],
            ]}
          />
        </Section>

        <Section
          title={t("Open to other AI", "对外开放")}
          action={t(
            "This computer only · no network port",
            "只在本机 · 不开网络端口",
          )}
        >
          <ToolSwitchRow
            title={t(
              "HUD tools (MCP “agent-hud”)",
              "侧栏工具（MCP「agent-hud」）",
            )}
            description={
              reach === "reading"
                ? t(
                    "Reading which clients have it…",
                    "正在读取装到了哪些客户端…",
                  )
                : reach === "unknown"
                  ? t(
                      "Can't tell here which clients have it.",
                      "这里读不到装到了哪些客户端。",
                    )
                  : t(
                      `In ${list(reach.installed) || "no client"}${reach.missing.length ? `; not in ${list(reach.missing)}` : ""}.`,
                      `已装到 ${list(reach.installed) || "（无）"}${reach.missing.length ? `；${list(reach.missing)} 未装` : ""}。`,
                    )
            }
            checked={tools.on}
            pending={tools.pending}
            unavailable={
              tools.state.unavailable ? t(...tools.state.unavailable) : null
            }
            error={
              tools.error ??
              (tools.state.problem ? t(...tools.state.problem) : null)
            }
            onChange={(value) => void tools.set(value)}
          />
          <Facts
            items={[
              [
                t("Reads", "能读"),
                t(
                  "HUD layout, snapshot, sessions, usage statistics, HUD pictures (accounts masked)",
                  "侧栏布局、快照、会话、用量统计、侧栏截图（账户打码）",
                ),
              ],
              [
                t("Writes", "能写"),
                t(
                  "HUD drafts (only saved in the panel take effect), appearance and animations",
                  "侧栏草稿（你在面板按保存才生效）、外观和动画两项偏好",
                ),
              ],
              [
                t("Turn off", "在哪关"),
                t(
                  "This switch, the same as “Let agents arrange the HUD” in Agent plugins. It covers reading and writing.",
                  "就是这个开关，和「智能体插件」页「允许智能体调整侧栏」是同一个；它同时管读和写",
                ),
              ],
            ]}
          />
          <AgentReachRows snapshot={snapshot} registered={registered} t={t} />
        </Section>

        <Section
          title={t("Data objects", "数据对象")}
          action={t(
            "Read only · they write nothing for PostPane",
            "只读取 · 不替驿窗产出",
          )}
          footer={t(
            "API keys PostPane keeps (DeepSeek, Kimi, GLM, OpenCode) show only as saved, never in full.",
            "驿窗保存的 API Key（DeepSeek、Kimi、GLM、OpenCode）只显示「已保存」，不显示明文。",
          )}
        >
          <table className="ai-access-table">
            <thead>
              <tr>
                <th>{t("Agent", "智能体")}</th>
                <th>{t("Sessions from", "会话从哪读")}</th>
                <th>{t("Quota from", "额度从哪来")}</th>
              </tr>
            </thead>
            <tbody>
              {data.reading.map((row) => (
                <tr key={row.id}>
                  <td>
                    <span className="ai-access-name">
                      {logo(row.id)}
                      {row.name}
                    </span>
                  </td>
                  <td>
                    {row.sessions[1].startsWith("~")
                      ? path(t(...row.sessions))
                      : t(...row.sessions)}
                  </td>
                  <td>{t(...row.quota)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(data.off.length > 0 || data.absent.length > 0) && (
            <div className="ai-access-more">
              {[
                data.off.length
                  ? t(
                      `${data.off.length} switched off in Agents (${list(data.off)})`,
                      `另 ${data.off.length} 个已在「智能体」页关掉（${list(data.off)}）`,
                    )
                  : null,
                data.absent.length
                  ? t(
                      `${data.absent.length} not found on this computer, not read`,
                      `${data.absent.length} 个本机没检测到，不读取`,
                    )
                  : null,
              ]
                .filter(Boolean)
                .join(zh ? "；" : "; ")}
              {zh ? "。" : "."}
            </div>
          )}
        </Section>
      </Page>
    </TooltipProvider>
  );
}
