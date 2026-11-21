// The failure receipt (#359, ADR-0001 C6; the owner chose 甲 on 2026-11-14):
// an agent's failed or limited turns on its own card, apart from the
// replies. Each line: the agent's mark (a Hermes bot's seal), the session,
// a red 失败 / 限流 tag (×n once it failed so again), the time and ↗ back to
// the session; under it what happened. 「知道了」 puts away the passing
// failures; a limit hangs until it lifts (owner, 2026-11-21).
import type { IslandEvent, Snapshot } from "@agent-hud/protocol";
import { dateFormat, snapshotLanguage } from "@agent-hud/ui/format";
import { GoButton } from "../GoButton";
import { HUDArtwork } from "../HUDArtwork";
import { usePanelServices } from "../PanelContext";
import { OpenNotice, useOpenFailures } from "../OpenNotice";
import { cardColumn } from "../card-column";
import { failureOf } from "../open-result";
import { usePaper } from "../paper";
import { BotSeal } from "../panel/BotStamp";
import { ApprovalTag } from "../permissions/ApprovalTag";
import { SEAL_COLUMN, cardInks } from "../permissions/ListCard";
import {
  entryTitle,
  sessionToOpen,
  tagColor,
  type ApprovalEntry,
} from "../permissions/approval-list";
import { DismissAll } from "./DismissAll";
import { dismissable, failureBody, failureTag } from "./failure-list";
import { newestFirst, replyEntries } from "./reply-list";

export function FailureAlertView({
  failures,
  snapshot,
  drop,
  light = false,
}: {
  /** The agent's failures in the queue. */
  failures: IslandEvent[];
  snapshot: Snapshot;
  /** Puts these failures away. */
  drop: (ids: readonly string[]) => void;
  light?: boolean;
}) {
  const zh = snapshotLanguage(snapshot) === "zh";
  const paper = usePaper();
  const inks = cardInks(paper, light);
  const services = usePanelServices();
  const { failure, fail } = useOpenFailures();
  const entries = newestFirst(replyEntries(failures, snapshot.sessions));
  const now = Date.now();
  const red = paper?.red ?? tagColor("ask", light);
  const passing = entries.flatMap((entry) =>
    entry.kind === "reply" && dismissable(entry.event) ? [entry.id] : [],
  );

  // ↗ goes back; the line stays until 「知道了」 or the session's next turn.
  const goBack = async (entry: ApprovalEntry) => {
    const target = sessionToOpen(entry);
    const reason = failureOf(
      target ? await services?.openSession?.(target) : false,
      zh,
    );
    if (reason) fail(entry.id, reason);
  };

  return (
    <div className="hud-failure-content" style={cardColumn(0)}>
      {entries.map((entry, index) => {
        if (entry.kind !== "reply") return null;
        const { event } = entry;
        const bot = entry.session?.bot;
        const canOpen =
          Boolean(sessionToOpen(entry) && services?.openSession) &&
          !failure(entry.id);
        const failed = failure(entry.id);
        return (
          <div
            key={entry.id}
            style={{
              display: "grid",
              gridTemplateColumns: `${bot ? SEAL_COLUMN : 18}px minmax(0, 1fr) auto auto 26px`,
              columnGap: 12,
              rowGap: 8,
              alignItems: "center",
              padding: "14px 0",
              borderTop: index > 0 ? `1px dotted ${inks.line}` : undefined,
            }}
          >
            <span style={{ display: "inline-flex", justifyContent: "center" }}>
              {bot ? (
                <BotSeal bot={bot} light={light} color={inks.dim} />
              ) : (
                <HUDArtwork source={event.source} size={18} light={light} />
              )}
            </span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: inks.ink,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
              }}
            >
              {entryTitle(entry, zh ? "出错" : "Error")}
            </span>
            <ApprovalTag
              label={failureTag(event, zh)}
              tone="ask"
              light={light}
              color={red}
            />
            <span
              style={{
                fontSize: 12,
                color: inks.dim,
                fontVariantNumeric: "tabular-nums",
                whiteSpace: "nowrap",
              }}
            >
              {dateFormat(undefined, {
                hour: "numeric",
                minute: "2-digit",
              }).format(new Date(event.at))}
            </span>
            <GoButton
              label={
                canOpen
                  ? zh
                    ? "回到会话"
                    : "Return to session"
                  : zh
                    ? "暂时无法回到原会话"
                    : "Session return unavailable"
              }
              enabled={canOpen}
              inks={{
                line: inks.line,
                ink: inks.mid,
                faint: inks.faint,
                strong: inks.ink,
              }}
              onClick={(click) => {
                click.stopPropagation();
                if (canOpen) void goBack(entry);
              }}
            />
            <div style={{ gridColumn: "2 / 6", minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: inks.mid,
                }}
              >
                {failureBody(event, now, zh)}
              </p>
              {failed && <OpenNotice text={failed} light={light} />}
            </div>
          </div>
        );
      })}
      {passing.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: "8px 0 8px",
          }}
        >
          <DismissAll
            count={passing.length}
            zh={zh}
            inks={inks}
            onClick={() => drop(passing)}
          />
        </div>
      )}
    </div>
  );
}
