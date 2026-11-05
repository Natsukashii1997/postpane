import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { HUDArtwork } from "../HUDArtwork";
import { PAPER_SEAL, type Paper } from "../paper";
import { dateFormat } from "@agent-hud/ui/format";
import { ApprovalTag } from "./ApprovalTag";
import {
  modelLine,
  tagCounts,
  tagTone,
  waitedText,
  type ApprovalEntry,
} from "./approval-list";

// The list card's parts, shared by the waiting card (ApprovalContent) and the
// reply card (CompletionAlertView): its inks, head, tear, section titles,
// lines and the fold.

/** The card's inks, from the paper where it is printed on one and the HUD's
 * ground in the notch: the title, the readable text, captions, the faintest
 * notes, and the rules. */
export function cardInks(paper: Paper | null, light: boolean) {
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
export type Inks = ReturnType<typeof cardInks>;

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

export function EntryRow({
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
  openTag = true,
  seal,
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
  /** Whether the open line prints its tag under the title (the reply card's
   * open line goes straight on to the reply). */
  openTag?: boolean;
  /** A stamp pressed at the row's end, across its two lines (a Hermes
   * bot's seal on its reply). */
  seal?: ReactNode;
}) {
  const [hover, setHover] = useState(false);
  const lineSpan = seal ? "2 / 4" : "2 / 5";
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
        gridTemplateColumns: seal
          ? "18px minmax(0, 1fr) auto auto 26px"
          : "18px minmax(0, 1fr) auto 26px",
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
      {seal && (
        <span style={{ gridRow: "1 / 3", gridColumn: "4 / 5" }}>{seal}</span>
      )}
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
            gridColumn: lineSpan,
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
      {(!open || openTag) && (
        <div
          style={{
            gridColumn: lineSpan,
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
      )}
    </div>
  );
}

export function entryClient(entry: ApprovalEntry) {
  return entry.kind === "request" ? entry.request.source : entry.event.source;
}

/** The card's head: its spaced label, the count tags, and on paper the
 * stamp in the paper's `stampInk` (red for the waiting, blue for replies). */
export function ListHead({
  label,
  entries,
  stamp,
  stampInk,
  paper,
  inks,
  light,
  zh,
}: {
  label: string;
  entries: readonly ApprovalEntry[];
  stamp: string;
  stampInk: "red" | "blue";
  paper: Paper | null;
  inks: Inks;
  light: boolean;
  zh: boolean;
}) {
  return (
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
        {label}
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
      {/* The receipt's stamp; in the notch the count tags say it. */}
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
            border: `2px solid ${paper[stampInk]}`,
            borderRadius: "50%",
            color: paper[stampInk],
            font: `900 ${zh ? 12 : 9}px/1 ${PAPER_SEAL}`,
            transform: "rotate(-14deg)",
            opacity: 0.85,
            pointerEvents: "none",
          }}
        >
          {stamp}
        </span>
      )}
    </div>
  );
}

/** The tear under the head, across the whole receipt on paper. */
export function ListTear({ paper, inks }: { paper: Paper | null; inks: Inks }) {
  return (
    <div
      aria-hidden="true"
      style={{
        margin: paper
          ? `0 -${paper.bleed.right}px 0 -${paper.bleed.left}px`
          : 0,
        borderTop: `1.5px dashed ${inks.line}`,
      }}
    />
  );
}

/** A sidebar section's title over its lines, with a rule to the edge. */
export function SectionTitle({
  children,
  inks,
}: {
  children: ReactNode;
  inks: Inks;
}) {
  return (
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
        {children}
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 16,
          borderTop: `1px solid ${inks.line}`,
        }}
      />
    </div>
  );
}

/** The fold: "还有 n 条", unfolding the rest. */
export function FoldButton({
  hidden,
  onUnfold,
  inks,
  zh,
}: {
  hidden: number;
  onUnfold: () => void;
  inks: Inks;
  zh: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onUnfold}
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
  );
}
