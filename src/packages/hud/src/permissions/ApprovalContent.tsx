import { useEffect, useState, type KeyboardEvent } from "react";
import { ArrowUpRight } from "lucide-react";
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
import { HUDArtwork } from "../HUDArtwork";
import { usePanelServices } from "../PanelContext";
import { alertText } from "../tokens";
import { useGround } from "../ground";
import { PAPER_SEAL, usePaper, type Paper } from "../paper";
import { dateFormat } from "@agent-hud/ui/format";
import { ApprovalTag } from "./ApprovalTag";
import {
  REPLY_BADGE,
  SHOWN_ENTRIES,
  approvalGroups,
  entryTitle,
  findSession,
  modelLine,
  sessionToOpen,
  tagCounts,
  tagTone,
  waitedText,
  type ApprovalEntry,
} from "./approval-list";

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

/** The card's inks, from the paper where it is printed on one and the HUD's
 * ground in the notch: the title, the readable text, captions, the faintest
 * notes, and the rules. */
function cardInks(paper: Paper | null, light: boolean) {
  const alpha = (a: number) =>
    paper
      ? paper.text(Math.max(0, a - 0.08))
      : light
        ? `rgba(0,0,0,${a})`
        : `rgba(255,255,255,${a})`;
  return {
    ink: paper ? paper.ink : alpha(0.92),
    mid: alpha(0.84),
    dim: paper ? paper.dim : alpha(0.55),
    faint: alpha(0.34),
    line: paper ? paper.line : alpha(0.16),
  };
}
type Inks = ReturnType<typeof cardInks>;

/** How long a request has waited, ticking each second. */
function Waited({ createdAt, zh }: { createdAt: string; zh: boolean }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  const start = Date.parse(createdAt);
  const seconds = Number.isFinite(start) ? (Date.now() - start) / 1000 : 0;
  return <>{waitedText(seconds, zh)}</>;
}

function EntryRow({
  entry,
  open,
  title,
  summary,
  canOpen,
  onSelect,
  onOpen,
  inks,
  light,
  zh,
}: {
  entry: ApprovalEntry;
  open: boolean;
  title: string;
  summary: string;
  canOpen: boolean;
  onSelect: () => void;
  onOpen: () => void;
  inks: Inks;
  light: boolean;
  zh: boolean;
}) {
  const [hover, setHover] = useState(false);
  const tag = (
    <ApprovalTag
      label={entry.badge}
      tone={tagTone(entry.badge)}
      light={light}
    />
  );
  const model = open ? modelLine(entry) : null;
  const goTitle = canOpen
    ? zh
      ? "回到会话"
      : "Return to session"
    : zh
      ? "暂时无法回到原会话"
      : "Session return unavailable";
  const keyDown = (event: KeyboardEvent) => {
    if (open || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    onSelect();
  };
  return (
    <div
      className={open ? undefined : "hud-closed-request"}
      role={open ? undefined : "button"}
      tabIndex={open ? undefined : 0}
      onClick={open ? undefined : onSelect}
      onKeyDown={keyDown}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "18px minmax(0, 1fr) auto 26px",
        columnGap: 12,
        alignItems: "center",
        padding: open ? "16px 0 0" : "12px 0",
        cursor: open ? undefined : "pointer",
        opacity: !open && hover ? 0.78 : 1,
      }}
    >
      <span style={{ display: "inline-flex" }}>
        <HUDArtwork source={entryClient(entry)} size={18} light={light} />
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
        {title}
      </span>
      <span
        style={{
          fontSize: 12,
          color: inks.dim,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
          textAlign: "right",
        }}
      >
        {entry.kind === "request" ? (
          <Waited createdAt={entry.request.createdAt} zh={zh} />
        ) : (
          dateFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(
            new Date(entry.event.at),
          )
        )}
      </span>
      <button
        type="button"
        aria-label={goTitle}
        title={goTitle}
        aria-disabled={!canOpen}
        onClick={(event) => {
          event.stopPropagation();
          if (canOpen) onOpen();
        }}
        style={{
          display: "inline-grid",
          placeItems: "center",
          width: 26,
          height: 26,
          boxSizing: "border-box",
          padding: 0,
          border: `1.5px solid ${inks.line}`,
          borderRadius: 3,
          background: "transparent",
          color: canOpen ? inks.mid : inks.faint,
          opacity: canOpen ? 1 : 0.6,
          cursor: canOpen ? "pointer" : "default",
        }}
      >
        <ArrowUpRight size={13} strokeWidth={2} />
      </button>
      {model && (
        // The model and its reasoning effort, the same size and faint ink, on
        // one line; the model is cut first.
        <div
          style={{
            gridColumn: "2 / 5",
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            marginTop: 3,
            minWidth: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            fontSize: 11.5,
            color: inks.faint,
          }}
        >
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              minWidth: 0,
            }}
          >
            {model.model}
          </span>
          {model.effort && <span style={{ flex: "none" }}>{model.effort}</span>}
        </div>
      )}
      <div
        style={{
          gridColumn: "2 / 5",
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: open ? 14 : 5,
          minWidth: 0,
          fontSize: 12.5,
          color: inks.mid,
        }}
      >
        {tag}
        {!open && (
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
          >
            {summary}
          </span>
        )}
      </div>
    </div>
  );
}

function entryClient(entry: ApprovalEntry) {
  return entry.kind === "request" ? entry.request.source : entry.event.source;
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
  const [unreachable, setUnreachable] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
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
    const opened = await services?.openSession?.(target);
    if (opened === false)
      setUnreachable((previous) => new Set(previous).add(entry.id));
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          minHeight: 44,
          padding: "0 2px 8px 0",
        }}
      >
        <span
          style={{
            fontSize: 12.5,
            letterSpacing: zh ? "0.32em" : "0.12em",
            color: inks.dim,
            whiteSpace: "nowrap",
          }}
        >
          {zh ? "待审批" : "Waiting"}
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginLeft: "auto",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          {tagCounts(entries).map(({ badge, count }) => (
            <ApprovalTag
              key={badge}
              label={badge}
              tone={tagTone(badge)}
              light={light}
              count={count}
              ink={inks.ink}
            />
          ))}
        </span>
        {/* The receipt's stamp: waiting to be answered or approved; in the
            notch the count tags say it. */}
        {paper && (
          <span
            aria-hidden="true"
            style={{
              width: 42,
              height: 42,
              boxSizing: "border-box",
              display: "grid",
              placeItems: "center",
              flex: "none",
              border: `2px solid ${paper.red}`,
              borderRadius: "50%",
              color: paper.red,
              font: `900 ${zh ? 12 : 9}px/1 ${PAPER_SEAL}`,
              transform: "rotate(-14deg)",
              opacity: 0.85,
              pointerEvents: "none",
            }}
          >
            {asking ? (zh ? "待答" : "ASK") : zh ? "待批" : "WAIT"}
          </span>
        )}
      </div>
      <div
        aria-hidden="true"
        style={{
          margin: paper
            ? `0 -${paper.bleed.right}px 0 -${paper.bleed.left}px`
            : 0,
          borderTop: `1.5px dashed ${inks.line}`,
        }}
      />
      {groups.map((group) => (
        <div key={group.section ?? ""} style={cardColumn(0)}>
          {sectioned && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 0 6px",
                fontSize: 11.5,
                letterSpacing: "0.06em",
                color: inks.dim,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {group.section ?? (zh ? "未分区" : "No section")}
              </span>
              <span
                style={{
                  flex: 1,
                  minWidth: 16,
                  borderTop: `1px solid ${inks.line}`,
                }}
              />
            </div>
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
                    !unreachable.has(entry.id)
                  }
                  onSelect={() => select(entry.id)}
                  onOpen={() => void goBack(entry)}
                  inks={inks}
                  light={light}
                  zh={zh}
                />
                {open && entry.kind === "request" && openDetail(entry.request)}
              </div>
            );
          })}
        </div>
      ))}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setUnfolded(true)}
          style={{
            display: "block",
            width: "100%",
            padding: "12px 0 12px 30px",
            border: 0,
            borderTop: `1px dotted ${inks.line}`,
            background: "transparent",
            color: inks.dim,
            fontSize: 12.5,
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          {zh ? `还有 ${hidden} 条` : `${hidden} more`}
        </button>
      )}
      <div style={{ height: 6 }} />
    </div>
  );
}
