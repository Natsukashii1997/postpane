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
  Footnote,
  Page,
  Pill,
  Row,
  Section,
  useText,
  type SettingsPaneProps,
} from "./SettingsPrimitives";
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
              "Not part of relays yet: it can neither start nor review one.",
              "还没接进接力，发起和审核都不行。",
            )}
          >
            <Pill dot>{t("Not supported", "不支持")}</Pill>
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
                    "A Claude Code session: it calls ",
                    "Claude Code 会话：自己调 ",
                  )}
                  {path("relay_to_chatgpt")}
                  {t(
                    ", or you swipe Review or Discuss in the HUD",
                    "，或你在侧栏左滑「审核」「讨论」",
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
                  "What Claude hands over: its summary and the change. ChatGPT cannot read files on this computer.",
                  "Claude 交来的说明和改动摘要；ChatGPT 读不到本机文件",
                ),
              ],
              [
                t("Writes", "写到"),
                <>
                  {path("app.postpane.mac/chatgpt/handoffs.json")}
                  {t(
                    "; replies go back to the Claude session",
                    "；回信转回原 Claude 会话",
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
                    "Reviews use the projects and memory in your ChatGPT account; only Claude Code starts one because the reply goes back by session id. Codex starting or reviewing is separate work.",
                    "审核要用你 ChatGPT 账号里的项目和记忆；发起方只认 Claude Code，是因为回信要按会话 id 送回去。Codex 发起或审核要另开一单。",
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
          <Row
            title={t(
              "Start a relay (relay_to_chatgpt)",
              "发起接力（relay_to_chatgpt）",
            )}
            subtitle={t(
              "Claude Code sessions only: start or continue one review. The switch above does not cover it; remove the ChatGPT extension's registration in Agent plugins to turn it off.",
              "只接 Claude Code 会话，能新开或续接一次审核。不受上面开关管；要关就在「智能体插件」移除 ChatGPT 插件登记。",
            )}
          >
            <Pill tone={registered ? "green" : "gray"} dot>
              {registered
                ? t("On · registered", "开 · 插件已登记")
                : t("Off · not registered", "关 · 插件未登记")}
            </Pill>
          </Row>
        </Section>

        <Section
          title={t("Data objects", "数据对象")}
          action={t(
            "Read only · they write nothing for PostPane",
            "只读取 · 不替驿窗产出",
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
        <Footnote>
          {t(
            "API keys PostPane keeps (DeepSeek, Kimi, GLM, OpenCode) show only as saved, never in full.",
            "驿窗保存的 API Key（DeepSeek、Kimi、GLM、OpenCode）只显示「已保存」，不显示明文。",
          )}
        </Footnote>
      </Page>
    </TooltipProvider>
  );
}
