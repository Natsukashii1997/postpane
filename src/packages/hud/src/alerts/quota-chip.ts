// A quota notice's words on its folded tag beside the dock, moved out of
// CompactAlertView.tsx for the 300-line ratchet.
import type { IslandEvent } from "@agent-hud/protocol";
import { systemCalendar, type QuotaDisplay } from "@agent-hud/ui/format";
import {
  cronShortName,
  quotaAlertCopy,
  resetCreditCopy,
  hooksReviewCopy,
  signInCopy,
  type QuotaTone,
} from "./quota-alert-copy";

/** What a quota reminder says beside its agent (Open's QuotaAlertCopy.compactTitle). */
export function compactQuotaStatus(event: IslandEvent, zh = false): string {
  return quotaAlertCopy(event, {
    language: zh ? "zh" : "en",
    calendar: systemCalendar(navigator.language),
  }).compactTitle;
}

/** A quota notice's folded tag: what it is about in dim ink, then its
 * figure in the notice's colour. A window's name and the share shown (or that
 * it reset); "重置" and the resets added, in blue; a sign-out's words alone, in
 * red. */
export function quotaChipLabels(
  event: IslandEvent,
  zh: boolean,
  quotaDisplay?: QuotaDisplay,
): { who: string; status: string; tone: QuotaTone } {
  const settings = {
    language: zh ? ("zh" as const) : ("en" as const),
    quotaDisplay,
    calendar: systemCalendar(navigator.language),
  };
  if (event.kind === "reset-credits") {
    const copy = resetCreditCopy(event, undefined, settings);
    return { who: copy.chipLabel, status: copy.chipValue, tone: "reset" };
  }
  if (event.kind === "bot-offline")
    return {
      who: event.title ?? "",
      status: event.message ?? (zh ? "断线" : "Offline"),
      tone: "critical",
    };
  if (event.kind === "cron-failed")
    return {
      who: cronShortName(event.title ?? ""),
      status: zh ? "失败" : "Failed",
      tone: "critical",
    };
  if (event.kind === "sign-in-needed")
    return {
      who: "",
      status: signInCopy(event, [], settings).chip,
      tone: "critical",
    };
  if (event.kind === "hooks-review-needed")
    return {
      who: "",
      status: hooksReviewCopy(event, settings.language).chip,
      tone: "critical",
    };
  const copy = quotaAlertCopy(event, settings);
  return { who: copy.windowName, status: copy.chipStatus, tone: copy.tone };
}
