import type {
  Approval,
  IslandEvent,
  RequestDecision,
  Session,
} from "@agent-hud/protocol";
import RequestActions from "../RequestActions";
import { cardColumn } from "../card-column";
import { GRID } from "../panel/theme";
import {
  clientDisplayName,
  newsTitle,
  permissionToolBadge,
  projectName,
} from "../IslandNews";
import { usePanelServices } from "../PanelContext";
import { OpenNotice, useOpenFailures } from "../OpenNotice";
import { failureOf } from "../open-result";
import { usePaper } from "../paper";
import {
  REPLY_BADGE,
  SHOWN_ENTRIES,
  START_BADGE,
  approvalGroups,
  entryTitle,
  findSession,
  goesToStart,
  openEntryId,
  sessionToOpen,
  type ApprovalEntry,
} from "./approval-list";
import { EntryRow, cardInks } from "./ListCard";
import { cardFolds, FoldButton } from "./FoldButton";
import { cardPicks } from "../panel/fold-store";
import type { NewsSeal } from "./PaperSeal";
import { plainText } from "./reply-closing";
import { ReplyDetail } from "./ReplyDetail";

export function ApprovalContent({
  requests,
  select,
  decide,
  openSettings,
  light,
  language,
  sessions = [],
  replies = [],
  drop,
}: {
  requests: Approval[];
  select: (id: string) => void;
  decide?: (id: string, decision: RequestDecision) => void | Promise<void>;
  /** Settings, on a page such as "agent-plugins", with the HUD put away. */
  openSettings?: (page: string) => void;
  light: boolean;
  language?: string;
  /** The snapshot's sessions: each line's title, model and section. */
  sessions?: Session[];
  /** Replies waiting in the queue, listed under the requests. */
  replies?: IslandEvent[];
  /** Puts these replies away: an open reply's 知道了. */
  drop?: (ids: readonly string[]) => void;
}) {
  const zh = language?.startsWith("zh") ?? false;
  // Beside the dock the card is a receipt (HUDExpandedSurface prints it).
  const paper = usePaper();
  const inks = cardInks(paper, light);
  const services = usePanelServices();
  const { failure, fail } = useOpenFailures();
  const [unfolded, toggleFold] = cardFolds.use("approvals");
  const entries: ApprovalEntry[] = [
    ...requests.map((request): ApprovalEntry => ({
      kind: "request",
      id: request.id,
      at: request.createdAt,
      badge: permissionToolBadge(request).badge,
      request,
      session: findSession(sessions, request.sessionId, request.source),
    })),
    ...replies.map((event): ApprovalEntry => ({
      kind: "reply",
      id: event.id,
      at: event.at,
      badge: REPLY_BADGE,
      event,
      session: findSession(sessions, event.sessionId, event.source),
    })),
  ];
  // The first line as listed opens, a reply too, one at a time; the one
  // picked stays open while it is listed (owner, 2026-11-28).
  const [picked, pick] = cardPicks.use();
  const openId = openEntryId(entries, picked);
  // One list, newest first, no sections (owner, 2026-11-14); only a line
  // picked is kept in view, so one asked only in Claude stays folded.
  const { groups, hidden } = approvalGroups(
    entries,
    picked,
    unfolded ? Number.POSITIVE_INFINITY : SHOWN_ENTRIES,
    undefined,
    () => null,
  );

  const goBack = async (entry: ApprovalEntry) => {
    const target = sessionToOpen(entry);
    if (!target) return;
    // Where it could not get there, the line says why a few seconds (#220).
    const reason = failureOf(await services?.openSession?.(target), zh);
    if (reason) fail(entry.id, reason);
    // Back in the session, the handoff card is the user's to start there:
    // its START tag has done its work (#245).
    else if (entry.kind === "request" && entry.request.badge === START_BADGE)
      void decide?.(entry.request.id, { kind: "leave" });
  };

  const fallbackTitle = (entry: ApprovalEntry) =>
    entry.kind === "request"
      ? (projectName(entry.request.cwd) ??
        entry.request.vendor ??
        clientDisplayName(entry.request.source))
      : clientDisplayName(entry.event.source);
  const summaryOf = (entry: ApprovalEntry) =>
    entry.kind === "request"
      ? (entry.request.summary ?? entry.request.title)
      : plainText(entry.event.message?.trim() || newsTitle(entry.event, zh));

  const openDetail = (request: Approval, goStart?: () => void) => {
    const isQuestion =
      request.kind === "question" || Boolean(request.questions?.length);
    const detail = request.detail ?? request.input;
    const summary = request.summary ?? request.title;
    const showsDetail = Boolean(
      request.removed || request.added || detail || request.kind === "plan",
    );
    // A permission's or plan's summary is its question; a question card
    // prints its own.
    const question =
      !isQuestion && summary && !(showsDetail && detail === summary)
        ? summary
        : null;
    return (
      <div style={{ ...cardColumn(14), padding: `14px 0 20px ${GRID.text}px` }}>
        {question && (
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              lineHeight: 1.45,
              color: inks.ink,
              overflowWrap: "anywhere",
            }}
          >
            {question}
          </div>
        )}
        <RequestActions
          key={request.id}
          request={request}
          light={light}
          language={language}
          onOpenSettings={openSettings}
          onGoStart={goStart}
          onDecision={
            decide ? (decision) => decide(request.id, decision) : undefined
          }
        />
      </div>
    );
  };

  return (
    <div
      className="hud-approval-content"
      style={{ ...cardColumn(0), position: "relative" }}
    >
      {groups.map((group) => (
        <div key={group.section ?? ""} style={cardColumn(0)}>
          {group.entries.map((entry, index) => {
            const open = entry.id === openId;
            const target = sessionToOpen(entry);
            return (
              <div
                key={entry.id}
                className={open ? "hud-open-request" : undefined}
                style={{
                  borderTop: index > 0 ? `1px dotted ${inks.line}` : undefined,
                }}
              >
                <EntryRow
                  entry={entry}
                  open={open}
                  title={entryTitle(entry, fallbackTitle(entry))}
                  summary={summaryOf(entry)}
                  canOpen={
                    Boolean(target && services?.openSession) &&
                    !failure(entry.id)
                  }
                  onSelect={() => {
                    pick(entry.id);
                    if (entry.kind === "request") select(entry.id);
                  }}
                  onOpen={() => void goBack(entry)}
                  inks={inks}
                  light={light}
                  zh={zh}
                />
                {failure(entry.id) && (
                  <OpenNotice
                    text={failure(entry.id)!}
                    light={light}
                    style={{
                      padding: `0 0 10px ${GRID.text}px`,
                      marginTop: -4,
                    }}
                  />
                )}
                {open && entry.kind === "reply" && (
                  <div style={{ padding: `14px 0 20px ${GRID.text}px` }}>
                    <ReplyDetail
                      message={entry.event.message?.trim() || ""}
                      light={light}
                      zh={zh}
                      dismiss={drop && (() => drop([entry.id]))}
                    />
                  </div>
                )}
                {open &&
                  entry.kind === "request" &&
                  openDetail(
                    entry.request,
                    goesToStart(
                      entry,
                      Boolean(services?.openSession) && !failure(entry.id),
                    )
                      ? () => void goBack(entry)
                      : undefined,
                  )}
              </div>
            );
          })}
        </div>
      ))}
      <FoldButton
        hidden={hidden}
        unfolded={unfolded}
        onToggle={toggleFold}
        inks={inks}
        zh={zh}
      />
      <div style={{ height: 6 }} />
    </div>
  );
}

/** The seal a waiting card presses beside its plane: 切换 for a handoff
 * card, 待答 for a question, 待批 for the rest. */
export function waitingSeal(selected: Approval, zh: boolean): NewsSeal {
  if (selected.badge === START_BADGE)
    return { words: zh ? "切换" : "START", ink: "green" };
  const asking =
    selected.kind === "question" || Boolean(selected.questions?.length);
  return {
    words: asking ? (zh ? "待答" : "ASK") : zh ? "待批" : "WAIT",
    ink: "red",
  };
}
