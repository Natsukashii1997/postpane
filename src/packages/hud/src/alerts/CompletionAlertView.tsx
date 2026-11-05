import { useState, type CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import type { IslandEvent, Snapshot } from "@agent-hud/protocol";
import { usePanelServices } from "../PanelContext";
import { newsTitle } from "../IslandNews";
import { snapshotLanguage } from "@agent-hud/ui/format";
import { cardColumn } from "../card-column";
import { usePaper } from "../paper";
import {
  SHOWN_ENTRIES,
  entryTitle,
  sessionToOpen,
  type ApprovalEntry,
} from "../permissions/approval-list";
import {
  EntryRow,
  FoldButton,
  SEAL_COLUMN,
  ListHead,
  ListTear,
  SectionTitle,
  cardInks,
  type Inks,
} from "../permissions/ListCard";
import { BotSeal } from "../panel/BotStamp";
import { buttonFace } from "./button-face";
import { useHandoffCard } from "./HandoffCard";
import { handoffFor } from "./handoff-card";
import {
  newestReply,
  replyEntries,
  replyFacts,
  replyGroups,
  replyMessage,
} from "./reply-list";

/**
 * The replies waiting, as a list card like the waiting card's: newest first
 * and open, grouped by sidebar section; each line goes back to its session.
 */
export function CompletionAlertView({
  replies,
  snapshot,
  drop,
  handoff,
  light = false,
}: {
  /** Every reply in the queue. */
  replies: IslandEvent[];
  snapshot: Snapshot;
  /** Puts these replies away. */
  drop: (ids: readonly string[]) => void;
  handoff?: (callback?: () => void) => void;
  light?: boolean;
}) {
  const zh = snapshotLanguage(snapshot) === "zh";
  // Beside the dock the card is a receipt (HUDExpandedSurface prints it).
  const paper = usePaper();
  const inks = cardInks(paper, light);
  const services = usePanelServices();
  const [unreachable, setUnreachable] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [unfolded, setUnfolded] = useState(false);
  const card = useHandoffCard();

  const entries = replyEntries(replies, snapshot.sessions);
  const openId = newestReply(entries)?.id;
  const { groups, hidden, sectioned } = replyGroups(
    entries,
    unfolded ? Number.POSITIVE_INFINITY : SHOWN_ENTRIES,
  );

  // Going back puts the reply away; where there is no way back, the line
  // says so.
  const goBack = async (entry: ApprovalEntry) => {
    const target = sessionToOpen(entry);
    const opened = target ? await services?.openSession?.(target) : false;
    if (opened === false) {
      setUnreachable((previous) => new Set(previous).add(entry.id));
      return;
    }
    drop([entry.id]);
    handoff?.();
  };
  const canOpen = (entry: ApprovalEntry) =>
    Boolean(sessionToOpen(entry) && services?.openSession) &&
    !unreachable.has(entry.id);

  return (
    <div
      className="hud-reply-content"
      style={{ ...cardColumn(0), position: "relative" }}
    >
      <ListHead
        label={zh ? "新回复" : "Replies"}
        entries={entries}
        stamp={zh ? "已回" : "DONE"}
        stampInk="blue"
        paper={paper}
        inks={inks}
        light={light}
        zh={zh}
      />
      <ListTear paper={paper} inks={inks} />
      {groups.map((group) => (
        <div key={group.section ?? ""} style={cardColumn(0)}>
          {sectioned && (
            <SectionTitle inks={inks}>
              {group.section ?? (zh ? "未分区" : "No section")}
            </SectionTitle>
          )}
          {group.entries.map((entry, index) => {
            if (entry.kind !== "reply") return null;
            const open = entry.id === openId;
            const failed = unreachable.has(entry.id);
            const bot = entry.session?.bot;
            // A reply in a handoff opens its card (查看接力).
            const handoff = handoffFor(
              snapshot.handoffs,
              entry.event.source,
              entry.event.sessionId,
            );
            // A handoff's reply is titled by the handoff: its question is the
            // whole brief.
            const title =
              handoff?.title ?? entryTitle(entry, newsTitle(entry.event, zh));

            // The body lines up under the title, past the seal or the mark.
            const indent = (bot ? SEAL_COLUMN : 18) + 12;
            return (
              <div
                key={entry.id}
                style={{
                  borderTop: index > 0 ? `1px dotted ${inks.line}` : undefined,
                }}
              >
                <EntryRow
                  entry={entry}
                  open={open}
                  title={title}
                  summary={
                    replyMessage(entry.event, entry.session) ??
                    newsTitle(entry.event, zh)
                  }
                  canOpen={canOpen(entry)}
                  onSelect={() => void goBack(entry)}
                  onOpen={() => void goBack(entry)}
                  inks={inks}
                  light={light}
                  zh={zh}
                  openTag={false}
                  seal={
                    bot ? (
                      <BotSeal bot={bot} light={light} color={inks.dim} />
                    ) : undefined
                  }
                />
                {open ? (
                  <div
                    style={{
                      ...cardColumn(12),
                      padding: `14px 0 18px ${indent}px`,
                    }}
                  >
                    <ReplyBody
                      entry={entry}
                      inks={inks}
                      zh={zh}
                      failed={failed}
                    />
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <button
                        type="button"
                        onClick={() => drop(entries.map((each) => each.id))}
                        style={{
                          ...buttonFace,
                          border: `1.5px solid ${inks.faint}`,
                          background: "transparent",
                          color: inks.ink,
                        }}
                      >
                        {entries.length > 1
                          ? zh
                            ? "全部知道了"
                            : "Dismiss all"
                          : zh
                            ? "知道了"
                            : "Got it"}
                      </button>
                      <span style={{ flex: 1 }} />
                      {handoff && card && (
                        <button
                          type="button"
                          onClick={() => card.open(handoff.id)}
                          style={{
                            ...buttonFace,
                            border: `1.5px solid ${inks.faint}`,
                            background: "transparent",
                            color: inks.ink,
                          }}
                        >
                          {zh ? "查看接力" : "Handoff"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void goBack(entry)}
                        style={{
                          ...buttonFace,
                          border: `1.5px solid ${inks.ink}`,
                          background: inks.ink,
                          color: paper
                            ? paper.paper
                            : light
                              ? "#ffffff"
                              : "rgba(0,0,0,0.88)",
                          fontWeight: 600,
                          opacity: canOpen(entry) ? 1 : 0.5,
                        }}
                      >
                        <ArrowUpRight size={12} strokeWidth={2.4} />
                        {zh ? "回到会话" : "Return to session"}
                      </button>
                    </div>
                  </div>
                ) : (
                  failed && (
                    <Unreachable
                      inks={inks}
                      zh={zh}
                      style={{
                        padding: `0 0 12px ${indent}px`,
                        marginTop: -4,
                      }}
                    />
                  )
                )}
              </div>
            );
          })}
        </div>
      ))}
      {hidden > 0 && (
        <FoldButton
          hidden={hidden}
          onUnfold={() => setUnfolded(true)}
          inks={inks}
          zh={zh}
        />
      )}
      <div style={{ height: 6 }} />
    </div>
  );
}

/** The open reply: what it said (about three lines), how long the turn took
 * and the session's tokens, each left out when unknown. */
function ReplyBody({
  entry,
  inks,
  zh,
  failed,
}: {
  entry: Extract<ApprovalEntry, { kind: "reply" }>;
  inks: Inks;
  zh: boolean;
  failed: boolean;
}) {
  const message = replyMessage(entry.event, entry.session);
  const { took, tokens } = replyFacts(entry.event, entry.session, zh);
  const figure = (text: string) => (
    <b style={{ color: inks.ink, fontWeight: 600 }}>{text}</b>
  );
  return (
    <>
      {message && (
        <p
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.7,
            color: inks.mid,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            overflowWrap: "anywhere",
          }}
        >
          {message}
        </p>
      )}
      {(took || tokens) && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "4px 14px",
            fontSize: 12,
            color: inks.dim,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {took && (
            <span>
              {zh ? "用时 " : "Took "}
              {figure(took)}
            </span>
          )}
          {tokens && (
            <span>
              {zh ? (
                <>本会话 {figure(tokens)} Token</>
              ) : (
                <>{figure(tokens)} tokens this session</>
              )}
            </span>
          )}
        </div>
      )}
      {failed && <Unreachable inks={inks} zh={zh} />}
    </>
  );
}

function Unreachable({
  inks,
  zh,
  style,
}: {
  inks: Inks;
  zh: boolean;
  style?: CSSProperties;
}) {
  return (
    <p
      role="status"
      style={{
        margin: 0,
        fontSize: 11.5,
        color: inks.dim,
        ...style,
      }}
    >
      {zh ? "无法回到这个会话" : "Couldn't return to this session"}
    </p>
  );
}
