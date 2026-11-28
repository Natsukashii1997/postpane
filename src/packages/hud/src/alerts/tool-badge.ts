import {
  FileText,
  Globe,
  HelpCircle,
  ListTodo,
  MessageSquareText,
  Monitor,
  Pencil,
  Puzzle,
  Search,
  Sparkles,
  Terminal,
  Wrench,
  ArrowRightLeft,
} from "lucide-react";
import type { Approval } from "@agent-hud/protocol";

/** The tag a request's card and row print: what it waits on you for. */
export function permissionToolBadge(request: Approval): {
  badge: string;
  Icon: typeof Terminal;
} {
  // A handoff card (#245); a reply waiting on you (#562).
  if (request.badge === "START" || request.badge === "REPLY")
    return {
      badge: request.badge,
      Icon: request.badge === "START" ? ArrowRightLeft : MessageSquareText,
    };
  if (request.kind === "question" || request.toolName === "AskUserQuestion")
    return { badge: "ASK", Icon: HelpCircle };
  if (request.kind === "plan" || request.toolName === "ExitPlanMode")
    return { badge: "PLAN", Icon: ListTodo };
  // A native approval's kind comes from Core (Open's PermissionRequest.badge).
  if (request.badge === "APP") return { badge: "APP", Icon: Monitor };
  if (request.badge === "WEB") return { badge: "WEB", Icon: Globe };
  const name = request.toolName;
  if (
    [
      "Bash",
      "BashOutput",
      "KillShell",
      "exec",
      "shell",
      "shell_command",
      "exec_command",
      "run_command",
      "run_shell_command",
    ].includes(name)
  )
    return { badge: "BASH", Icon: Terminal };
  if (
    [
      "Edit",
      "MultiEdit",
      "Write",
      "NotebookEdit",
      "apply_patch",
      "edit",
      "replace",
      "write_file",
    ].includes(name)
  )
    return { badge: "EDIT", Icon: Pencil };
  if (["Read", "view_image", "read_file", "read"].includes(name))
    return { badge: "READ", Icon: FileText };
  if (["Glob", "Grep", "glob", "grep", "grep_search"].includes(name))
    return { badge: "FIND", Icon: Search };
  if (["WebFetch", "WebSearch", "web_fetch", "web_search"].includes(name))
    return { badge: "WEB", Icon: Globe };
  if (["Task", "Agent", "spawn_agent"].includes(name))
    return { badge: "AGENT", Icon: Sparkles };
  if (name.startsWith("mcp__")) return { badge: "MCP", Icon: Puzzle };
  return {
    badge: (name.slice(0, 8) || "TOOL").toUpperCase(),
    Icon: Wrench,
  };
}
