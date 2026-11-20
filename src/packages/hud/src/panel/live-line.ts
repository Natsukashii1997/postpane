import type { Language } from "@agent-hud/ui/format";
import { say } from "../say.ts";
import type { LiveSession } from "./agent-board.ts";

// The line under a session the panel lists (issue #52, 「待核对」 #354).

/** The line under a listed session: what it waits on, or what it does. */
export function liveSessionLine(
  entry: LiveSession,
  language: Language,
): string {
  const { approval, session } = entry;
  if (entry.status === "waiting") {
    if (entry.stale)
      return say(
        language,
        "待核对：很久没有新动静",
        "Unconfirmed: quiet for a while",
      );
    if (!approval) return say(language, "等你回复", "Waiting for you");
    const question = approval.questions?.[0]?.question?.trim();
    if (approval.kind === "question" || question)
      return `${say(language, "问你：", "Asks: ")}${question || approval.summary || approval.title}`;
    if (approval.kind === "plan")
      return say(language, "等你批准计划", "Plan waiting for approval");
    return `${say(language, "等你批准：", "Needs approval: ")}${approval.summary || approval.title}`;
  }
  const activity = session.liveFacts?.activity;
  const work = activity?.openCall?.work ?? activity?.work ?? null;
  const doing = activity?.compactingSince
    ? say(language, "正在压缩上下文", "Compacting context")
    : activity?.retrying
      ? say(language, "正在重试", "Retrying")
      : activity?.delegating || work === "agents"
        ? say(language, "子任务在跑", "Sub-agents at work")
        : work === "shell" || work === "command"
          ? say(language, "正在跑命令", "Running a command")
          : work === "edit"
            ? say(language, "正在改文件", "Editing files")
            : work === "read"
              ? say(language, "正在读文件", "Reading files")
              : work === "question"
                ? say(language, "正在提问", "Asking a question")
                : activity?.awaitsModel
                  ? say(language, "正在思考", "Thinking")
                  : say(language, "正在干活", "Working");
  // How long it has run sits beside the title (runningSince, #312).
  return doing;
}
