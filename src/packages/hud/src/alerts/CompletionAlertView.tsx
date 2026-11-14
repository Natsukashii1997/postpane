import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Handoff, IslandEvent, Snapshot } from "@agent-hud/protocol";
import { usePanelServices } from "../PanelContext";
import { newsTitle } from "../IslandNews";
import { snapshotLanguage } from "@agent-hud/ui/format";
import { cardColumn } from "../card-column";
import {
  AIRMAIL_BLUE,
  AIRMAIL_RED,
  airmailStripes,
  relayPaperOf,
  usePaper,
  type Paper,
} from "../paper";
import {
  SHOWN_ENTRIES,
  entryTitle,
  sessionToOpen,
  type ApprovalEntry,
} from "../permissions/approval-list";
import {
  EntryRow,
  SEAL_COLUMN,
  cardInks,
  type Inks,
} from "../permissions/ListCard";
import { FoldButton } from "../permissions/FoldButton";
import { BotSeal } from "../panel/BotStamp";
import { buttonFace } from "./button-face";
import { DismissAll } from "./DismissAll";
import { useHandoffCard } from "./HandoffCard";
import { handoffFor, relayLegend, relayLegendInks } from "./handoff-card";
import { OpenNotice, useOpenFailures } from "../OpenNotice";
import { failureOf } from "../open-result";
import {
  openReplyId,
  replyEntries,
  replyFacts,
  replyGroups,
  replyMessage,
  isReviewReply,
  sessionReplies,
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
  const { failure, fail } = useOpenFailures();
  const [unfolded, setUnfolded] = useState(false);
  // The reply whose row was clicked: it opens in place of the newest.
  const [chosen, setChosen] = useState<string | null>(null);
  const card = useHandoffCard();

  const entries = replyEntries(replies, snapshot.sessions);
  const openId = openReplyId(entries, chosen);
  const { groups, hidden } = replyGroups(
    entries,
    unfolded ? Number.POSITIVE_INFINITY : SHOWN_ENTRIES,
  );

  // Only ↗ goes back, and only once the session is in front are its
  // replies put away; where it could not get there, the line says why a few
  // seconds and may be tried again (#220).
  const goBack = async (entry: ApprovalEntry) => {
    const target = sessionToOpen(entry);
    const reason = failureOf(
      target ? await services?.openSession?.(target) : false,
      zh,
    );
    if (reason) {
      fail(entry.id, reason);
      return;
    }
    drop(sessionReplies(entries, entry));
    handoff?.();
  };
  const canOpen = (entry: ApprovalEntry) =>
    Boolean(sessionToOpen(entry) && services?.openSession) &&
    !failure(entry.id);

  // The owner's own replies on the receipt; a review's on the lower slip of
  // the reviews' paper (#145).
  const handoffs = snapshot.handoffs ?? [];
  const review = (entry: ApprovalEntry) => isReviewReply(entry, handoffs);
  const reviews = groups.flatMap((group) => group.entries.filter(review));
  const reviewPaper = relayPaperOf(light, paper?.bleed);
  const reviewInks = cardInks(reviewPaper, light);
  // A reply in a handoff opens its card (查看接力).
  const relayOf = (entry: ApprovalEntry | undefined) =>
    entry?.kind === "reply"
      ? handoffFor(snapshot.handoffs, entry.event.source, entry.event.sessionId)
      : undefined;
  // A relay's reply on the receipt sits in the airmail frame; a review's is
  // on the reviews' paper already.
  const framed = (entry: ApprovalEntry | undefined) =>
    Boolean(entry && relayOf(entry) && !review(entry));
  const line = (
    entry: ApprovalEntry,
    index: number,
    inks: Inks,
    paper: Paper | null,
    previous?: ApprovalEntry,
  ) => {
    if (entry.kind !== "reply") return null;
    const open = entry.id === openId;
    const failed = failure(entry.id);
    const bot = entry.session?.bot;
    const handoff = relayOf(entry);
    const inFrame = framed(entry);
    // A handoff's reply is titled by the handoff: its question is the
    // whole brief.
    const title =
      handoff?.title ?? entryTitle(entry, newsTitle(entry.event, zh));

    // The body lines up under the title, past the seal or the mark.
    const indent = (bot ? SEAL_COLUMN : 18) + 12;
    return (
      <div
        key={entry.id}
        style={
          inFrame
            ? {
                position: "relative",
                margin: "12px -8px 10px",
                padding: "4px 8px 0",
                borderRadius: 6,
                background: `color-mix(in srgb, ${paper?.blue ?? inks.dim} 5%, transparent)`,
              }
            : {
                borderTop:
                  index > 0 && !framed(previous)
                    ? `1px dotted ${inks.line}`
                    : undefined,
              }
        }
      >
        {inFrame && handoff && (
          <RelayFrame
            handoff={handoff}
            paper={paper}
            inks={inks}
            light={Boolean(light)}
            zh={zh}
          />
        )}
        <EntryRow
          entry={entry}
          open={open}
          title={title}
          summary={
            replyMessage(entry.event, entry.session) ??
            newsTitle(entry.event, zh)
          }
          canOpen={canOpen(entry)}
          onSelect={() => setChosen(entry.id)}
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
            <ReplyBody entry={entry} inks={inks} zh={zh} />
            {failed && <OpenNotice text={failed} light={light} />}
            {/* Only what acts on this reply: going back is the ↗ in its
                title row, putting them all away the head's (owner,
                2026-11-07). */}
            {handoff && card && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  className="hud-press"
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
              </div>
            )}
          </div>
        ) : (
          failed && (
            <OpenNotice
              text={failed}
              light={light}
              style={{
                padding: `0 0 12px ${indent}px`,
                marginTop: -4,
              }}
            />
          )
        )}
      </div>
    );
  };

  return (
    <div
      className="hud-reply-content"
      style={{ ...cardColumn(0), position: "relative" }}
    >
      {groups
        .filter((group) => group.entries.some((entry) => !review(entry)))
        .map((group) => (
          <div key={group.section ?? ""} style={cardColumn(0)}>
            {group.entries
              .filter((entry) => !review(entry))
              .map((entry, index, list) =>
                line(entry, index, inks, paper, list[index - 1]),
              )}
          </div>
        ))}
      {reviews.length > 0 && (
        <ReviewSlip paper={paper} zh={zh}>
          {reviews.map((entry, index) =>
            line(entry, index, reviewInks, reviewPaper),
          )}
        </ReviewSlip>
      )}
      <FoldButton
        hidden={hidden}
        unfolded={unfolded}
        onToggle={() => setUnfolded((open) => !open)}
        inks={inks}
        zh={zh}
      />
      {/* 「知道了 / 全部知道了」, from the old head to the list's foot. */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          padding: "8px 0 2px",
        }}
      >
        <DismissAll
          count={entries.length}
          zh={zh}
          inks={inks}
          onClick={() => drop(entries.map((each) => each.id))}
        />
      </div>
      {/* A review slip runs to the foot. */}
      {!reviews.length && <div style={{ height: 6 }} />}
    </div>
  );
}

/** Where the frame's legend starts along its top edge. */
const LEGEND_LEFT = 14;

/** The airmail frame round a relay's reply on the receipt (owner,
 * 2026-11-07, 甲 · 航空虚线框): red and blue dashes in turn, as an airmail
 * envelope's edge, with 「接力」, the round and ChatGPT's verdict set into its
 * top edge. */
function RelayFrame({
  handoff,
  paper,
  inks,
  light,
  zh,
}: {
  handoff: Handoff;
  paper: Paper | null;
  inks: Inks;
  light: boolean;
  zh: boolean;
}) {
  const { trip, verdict, missing } = relayLegend(handoff, zh);
  const tone = relayLegendInks(paper, light, missing);
  // The legend breaks the top edge instead of covering it: in the notch there
  // is no paper to cover it with, and on paper a flat patch shows against the
  // grain (#190).
  const legend = useRef<HTMLSpanElement>(null);
  const [gap, setGap] = useState(0);
  useLayoutEffect(() => {
    const element = legend.current;
    if (!element) return;
    const measure = () => setGap(element.offsetWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const mask = `relay-gap-${useId().replace(/[^\w-]/g, "")}`;
  const dash = {
    x: 0.75,
    y: 0.75,
    width: "calc(100% - 1.5px)",
    height: "calc(100% - 1.5px)",
    rx: 6,
    fill: "none",
    strokeWidth: 1.5,
    strokeDasharray: "7 7",
  } as const;
  return (
    <>
      <svg
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          overflow: "visible",
          pointerEvents: "none",
          opacity: 0.9,
        }}
      >
        <mask
          id={mask}
          maskUnits="userSpaceOnUse"
          x="-5%"
          y="-5%"
          width="110%"
          height="110%"
        >
          <rect x="-5%" y="-5%" width="110%" height="110%" fill="white" />
          <rect x={LEGEND_LEFT} y={-4} width={gap} height={8} fill="black" />
        </mask>
        <g mask={`url(#${mask})`}>
          <rect style={{ ...dash, stroke: AIRMAIL_RED }} />
          <rect
            style={{ ...dash, stroke: AIRMAIL_BLUE, strokeDashoffset: 7 }}
          />
        </g>
      </svg>
      <span
        ref={legend}
        style={{
          position: "absolute",
          top: -8,
          left: LEGEND_LEFT,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 6px",
          maxWidth: "calc(100% - 28px)",
          fontSize: 11,
          lineHeight: "16px",
          fontWeight: 500,
          color: inks.dim,
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: tone.relay,
          }}
        >
          {zh ? "接力" : "RELAY"}
        </span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
          {trip}
          {verdict && (
            <>
              {" · "}
              <span style={{ color: tone.verdict, fontWeight: 600 }}>
                {verdict}
              </span>
            </>
          )}
        </span>
      </span>
    </>
  );
}

/** The reviews' replies (#145): a lower slip of the reviews' paper across the
 * card, under an airmail band, joined to the receipt with no perforation. */
function ReviewSlip({
  paper,
  zh,
  children,
}: {
  paper: Paper | null;
  zh: boolean;
  children: ReactNode;
}) {
  const sheet = relayPaperOf(true);
  const bleed = paper?.bleed ?? { left: 0, right: 0 };
  return (
    <div
      style={{
        ...cardColumn(0),
        position: "relative",
        margin: `10px ${-bleed.right}px 0 ${-bleed.left}px`,
        padding: `12px ${bleed.right}px 4px ${bleed.left}px`,
        background: sheet.paper,
        color: sheet.ink,
        borderRadius: paper ? 0 : 8,
        boxShadow: "inset 0 6px 6px -6px rgba(0,0,0,.35)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 5,
          background: airmailStripes(5),
        }}
      />
      <div
        style={{
          marginTop: 4,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.3em",
          color: sheet.word,
        }}
      >
        {zh ? "审核" : "REVIEWS"}
      </div>
      {children}
    </div>
  );
}

/** The open reply: what it said (about three lines), how long the turn took
 * and the session's tokens, each left out when unknown. */
function ReplyBody({
  entry,
  inks,
  zh,
}: {
  entry: Extract<ApprovalEntry, { kind: "reply" }>;
  inks: Inks;
  zh: boolean;
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
    </>
  );
}
