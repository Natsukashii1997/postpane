import { useState } from "react";
import type {
  Approval,
  IslandEvent,
  RequestDecision,
  RequestDelivery,
  Session,
} from "@agent-hud/protocol";
import RequestActions from "../RequestActions";
import { cardColumn } from "../card-column";
import {
  clientDisplayName,
  newsTitle,
  permissionToolBadge,
  projectName,
} from "../IslandNews";
import { usePanelServices } from "../PanelContext";
import { OpenNotice, useOpenFailures } from "../OpenNotice";
import { failureOf } from "../open-result";
import { alertText } from "../tokens";
import { useGround } from "../ground";
import { usePaper } from "../paper";
import {
  REPLY_BADGE,
  SHOWN_ENTRIES,
  START_BADGE,
  approvalGroups,
  entryTitle,
  findSession,
  sessionToOpen,
  type ApprovalEntry,
} from "./approval-list";
import {
  EntryRow,
  FoldButton,
  ListHead,
  ListTear,
  SectionTitle,
  cardInks,
} from "./ListCard";

export function RequestDeliveryNotice({
  delivery,
  language,
  light = false,
}: {
  delivery: RequestDelivery | undefined;
  language: string;
  light?: boolean;
}) {
  // The warning's peach on an opaque ground, as before; its see-through
  // shade where the desktop shows through.
  const ground = useGround(light);
  const color = ground.seeThrough ? alertText("warning", ground) : "#d99a69";
  if (!delivery) return null;
  const zh = language.startsWith("zh");
  return (
    <p
      role={delivery.state === "failed" ? "alert" : "status"}
      style={{
        margin: "12px 0 0",
        paddingTop: 10,
        borderTop: "1px solid currentColor",
        borderColor: "#a7794a30",
        color,
        fontSize: 11,
        lineHeight: 1.5,
        overflowWrap: "anywhere",
      }}
    >
      <strong style={{ fontWeight: 550 }}>{delivery.source} · </strong>
      {delivery.state === "failed"
        ? zh
          ? "回答未能送达客户端。"
          : "The response could not be delivered to the client."
        : zh
          ? "尚未确认客户端收到回答，请在客户端核对。"
          : "Delivery is unconfirmed. Check the client."}
      {delivery.reason && <span> {delivery.reason}</span>}
    </p>
  );
}

export function ApprovalContent({
  requests,
  selected,
  select,
  decide,
  openSettings,
  light,
  language,
  sessions = [],
  replies = [],
}: {
  requests: Approval[];
  selected: Approval;
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
}) {
  const zh = language?.startsWith("zh") ?? false;
  // Beside the dock the card is a receipt (HUDExpandedSurface prints it).
  const paper = usePaper();
  const inks = cardInks(paper, light);
  const services = usePanelServices();
  const { failure, fail } = useOpenFailures();
  const [unfolded, setUnfolded] = useState(false);
  const asking =
    selected.kind === "question" || Boolean(selected.questions?.length);

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
  const { groups, hidden, sectioned } = approvalGroups(
    entries,
    selected.id,
    unfolded ? Number.POSITIVE_INFINITY : SHOWN_ENTRIES,
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
      : entry.event.message?.trim() || newsTitle(entry.event, zh);

  const openDetail = (request: Approval) => {
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
      <div style={{ ...cardColumn(14), padding: "14px 0 20px 30px" }}>
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
      {/* The receipt's stamp: waiting to be answered or approved. */}
      <ListHead
        label={zh ? "待审批" : "Waiting"}
        entries={entries}
        stamp={
          selected.badge === START_BADGE
            ? zh
              ? "切换"
              : "START"
            : asking
              ? zh
                ? "待答"
                : "ASK"
              : zh
                ? "待批"
                : "WAIT"
        }
        stampInk={selected.badge === START_BADGE ? "green" : "red"}
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
            const open = entry.kind === "request" && entry.id === selected.id;
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
                  onSelect={() => select(entry.id)}
                  onOpen={() => void goBack(entry)}
                  inks={inks}
                  light={light}
                  zh={zh}
                />
                {failure(entry.id) && (
                  <OpenNotice
                    text={failure(entry.id)!}
                    light={light}
                    style={{ padding: "0 0 10px 30px", marginTop: -4 }}
                  />
                )}
                {open && entry.kind === "request" && openDetail(entry.request)}
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
