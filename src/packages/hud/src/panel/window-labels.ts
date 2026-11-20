// A quota window's name as the hover panel writes it. Core names windows in
// the vendor's English words in every language, and other places (alerts,
// settings, saved layouts) match on those words, so the panel translates
// them only where it shows them: "Current session" → "5 小时",
// "Weekly limit · Opus" → "每周 · Opus", and Claude's Fable week as claude.ai
// names it, "Fable 额度". An English panel keeps Core's name.
import type { Language } from "@agent-hud/ui/format";

const PERIODS: [RegExp, string][] = [
  [/^(current session|5h|5h limit|5-hour (limit|quota)|5 hours?)$/i, "5 小时"],
  [/^(daily|daily (usage )?limit|daily quota)$/i, "每天"],
  [/^(weekly|weekly (usage )?limit|weekly quota)$/i, "每周"],
  [/^(monthly|monthly (usage )?limit|monthly quota)$/i, "每月"],
  [/^(annual|annual (usage )?limit|annual quota)$/i, "每年"],
  [/^(usage limit|quota)$/i, "额度"],
  [/^secondary usage limit$/i, "第二额度"],
];

const UNITS: [RegExp, string][] = [
  [/^(\d+)(?:h| ?-?hours?)(?: limit| quota)?$/i, "小时"],
  [/^(\d+)(?:d| ?-?days?)(?: limit| quota)?$/i, "天"],
  [/^(\d+)(?:m| ?-?minutes?)(?: limit| quota)?$/i, "分钟"],
];

function part(text: string): string | null {
  const trimmed = text.trim();
  if (/^all models$/i.test(trimmed)) return null;
  for (const [pattern, name] of PERIODS) if (pattern.test(trimmed)) return name;
  for (const [pattern, unit] of UNITS) {
    const match = pattern.exec(trimmed);
    if (match) return `${match[1]} ${unit}`;
  }
  return trimmed;
}

/** The window's name in the panel's language. */
export function quotaWindowLabel(
  row: { name: string },
  language: Language,
): string {
  if (language !== "zh") return row.name;
  if (/^weekly limit · fable$/i.test(row.name.trim())) return "Fable 额度";
  const parts = row.name
    .split(" · ")
    .map(part)
    .filter((value): value is string => Boolean(value));
  return parts.length ? parts.join(" · ") : row.name;
}

/** A window's short name in the agent's peek: Core's short name, as the peek
 * has always written it, in every language. */
export function peekWindowName(row: {
  name: string;
  shortLabel?: string;
}): string {
  return row.shortLabel || row.name;
}
