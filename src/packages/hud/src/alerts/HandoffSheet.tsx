import { useEffect, useRef, useState, type CSSProperties } from "react";
import { usePanelServices, type HandoffRequest } from "../PanelContext";
import { cardColumn } from "../card-column";
import { PAPER_FIGURES, PAPER_SEAL, type Paper } from "../paper";
import type { Inks } from "../permissions/ListCard";
import { buttonFace } from "./button-face";
import { useCardHold } from "./card-hold";
import {
  PURPOSES,
  PURPOSE_LABELS,
  composeMessage,
  defaultPurpose,
  deliveryHint,
  sendLabel,
  sentNote,
  serial,
  switchPurpose,
  targetKey,
  type Purpose,
  type SheetTarget,
} from "./handoff-sheet";

/** Claude's mark colour, on its source pill. */
const CLAUDE_INK = "#c96442";

type Route = { reachable: boolean; reason?: string | null };

/**
 * The handoff sheet (转交单, design 乙): where a reply goes (从 / 到), what
 * for (用途), the message in full and editable, how it travels, and one
 * button that sends it. Printed on the reply card's paper below the reply;
 * the card stays open while it is.
 */
export function HandoffSheet({
  source,
  title,
  reply,
  eventId,
  targets,
  paper,
  inks,
  light,
  onClose,
}: {
  /** The reply's client: claude or chatgpt. */
  source: string;
  /** The reply's session, as the card titles it. */
  title: string;
  /** The reply in full. */
  reply: string;
  eventId: string;
  /** Where it can go, the default first. */
  targets: readonly SheetTarget[];
  paper: Paper | null;
  inks: Inks;
  light: boolean;
  onClose: () => void;
}) {
  const services = usePanelServices();
  const [picked, setPicked] = useState(() => targetKey(targets[0]));
  const target =
    targets.find((each) => targetKey(each) === picked) ?? targets[0];
  const [purpose, setPurpose] = useState<Purpose>(() =>
    defaultPurpose(targets[0]),
  );
  const [text, setText] = useState(() =>
    composeMessage(defaultPurpose(targets[0]), reply),
  );
  const [routes, setRoutes] = useState<Record<string, Route>>({});
  const [phase, setPhase] = useState<"editing" | "sending" | "sent">("editing");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  useCardHold(true);

  useEffect(() => {
    box.current?.focus({ preventScroll: true });
  }, []);

  // How the words would travel to the target picked, asked once per target.
  const key = targetKey(target);
  useEffect(() => {
    if (!services?.handoffRoute || routes[key]) return;
    let dead = false;
    const [to, id] = request(target);
    void services.handoffRoute(to, id).then(
      (route) => {
        if (!dead) setRoutes((previous) => ({ ...previous, [key]: route }));
      },
      () => {},
    );
    return () => {
      dead = true;
    };
  }, [key]);

  const pickTarget = (next: SheetTarget) => {
    setPicked(targetKey(next));
    const wanted = defaultPurpose(next);
    if (wanted !== purpose) {
      setText((current) => switchPurpose(current, purpose, wanted));
      setPurpose(wanted);
    }
    setNote(null);
  };
  const pickPurpose = (next: Purpose) => {
    setText((current) => switchPurpose(current, purpose, next));
    setPurpose(next);
  };
  const send = async () => {
    if (phase !== "editing" || !text.trim() || !services?.forwardReply) return;
    setPhase("sending");
    setNote(null);
    const [to, id] = request(target);
    try {
      await services.forwardReply({
        to,
        target: id,
        text,
        ...(target.kind === "new-review"
          ? { title: target.title, cwd: target.cwd }
          : {}),
      });
      setPhase("sent");
      setNote({ ok: true, text: sentNote(target) });
    } catch (error) {
      setPhase("editing");
      setNote({ ok: false, text: String(error) });
    }
  };

  const route = routes[key] ?? null;
  const strong = paper ? paper.paper : light ? "#ffffff" : "rgba(0,0,0,0.88)";
  const fill = paper ? paper.fill : inks.line;
  const pressed = paper ? paper.blue : inks.ink;
  const row: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "28px minmax(0, 1fr)",
    gap: 6,
    alignItems: "center",
    paddingBottom: 7,
    borderBottom: `1px dotted ${inks.line}`,
  };
  const label: CSSProperties = { color: inks.dim };

  return (
    <div
      role="group"
      aria-label="转交单"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        } else if (
          event.key === "Enter" &&
          (event.metaKey || event.ctrlKey) &&
          !event.nativeEvent.isComposing &&
          event.keyCode !== 229
        ) {
          event.preventDefault();
          void send();
        }
      }}
      style={{
        ...cardColumn(9),
        paddingTop: 12,
        borderTop: `1.5px dashed ${inks.line}`,
        fontSize: 12,
        color: inks.ink,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontFamily: PAPER_SEAL, fontWeight: 600, fontSize: 15 }}>
          转交单
        </span>
        <span
          style={{
            fontFamily: PAPER_FIGURES,
            fontSize: 11,
            letterSpacing: "0.05em",
            color: inks.dim,
          }}
        >
          {serial(
            target.kind === "new-review" ? undefined : target.handoffId,
            eventId,
          )}
        </span>
      </div>
      <div style={row}>
        <span style={label}>从</span>
        <span
          style={{ display: "flex", gap: 6, alignItems: "center", minWidth: 0 }}
        >
          <SourcePill source={source} ink={inks.ink} />
          <span style={ellipsis}>{title}</span>
        </span>
      </div>
      <div style={row}>
        <span style={label}>到</span>
        <div role="radiogroup" style={cardColumn(4)}>
          {targets.map((each) => (
            <label
              key={targetKey(each)}
              style={{
                display: "flex",
                gap: 6,
                alignItems: "center",
                cursor: phase === "editing" ? "pointer" : "default",
                minWidth: 0,
              }}
            >
              <input
                type="radio"
                name={`handoff-${eventId}`}
                checked={targetKey(each) === key}
                disabled={phase !== "editing"}
                onChange={() => pickTarget(each)}
                style={{ margin: 0, accentColor: pressed }}
              />
              <SourcePill
                source={each.kind === "claude" ? "claude" : "chatgpt"}
                ink={inks.ink}
              />
              <span style={ellipsis}>
                {each.kind === "new-review" ? "新建 ChatGPT 审核" : each.label}
              </span>
            </label>
          ))}
        </div>
      </div>
      <div style={row}>
        <span style={label}>用途</span>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {PURPOSES.map((each) => {
            const on = each === purpose;
            return (
              <button
                key={each}
                type="button"
                aria-pressed={on}
                disabled={phase !== "editing"}
                onClick={() => pickPurpose(each)}
                style={{
                  border: `1px solid ${on ? pressed : inks.line}`,
                  background: on ? pressed : "transparent",
                  color: on ? strong : inks.ink,
                  borderRadius: 999,
                  padding: "2px 9px",
                  fontSize: 11,
                  fontFamily: "inherit",
                  cursor: phase === "editing" ? "pointer" : "default",
                }}
              >
                {PURPOSE_LABELS[each]}
              </button>
            );
          })}
        </div>
      </div>
      <textarea
        ref={box}
        aria-label="要发出的消息"
        value={text}
        readOnly={phase !== "editing"}
        onChange={(event) => setText(event.target.value)}
        style={{
          width: "100%",
          height: 120,
          boxSizing: "border-box",
          resize: "none",
          border: `1px solid ${inks.line}`,
          borderRadius: 4,
          background: fill,
          color: inks.ink,
          fontSize: 12,
          lineHeight: 1.5,
          fontFamily: "inherit",
          padding: "6px 8px",
          outline: 0,
        }}
      />
      <div style={{ fontSize: 11, color: inks.dim }}>
        送达方式：{deliveryHint(target, route)}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {phase === "sent" ? (
          <button
            type="button"
            onClick={onClose}
            style={{
              ...buttonFace,
              border: `1.5px solid ${inks.faint}`,
              background: "transparent",
              color: inks.ink,
            }}
          >
            关闭
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={phase === "sending" || !text.trim()}
              onClick={() => void send()}
              style={{
                ...buttonFace,
                border: `1.5px solid ${inks.ink}`,
                background: inks.ink,
                color: strong,
                fontWeight: 600,
                opacity: phase === "sending" || !text.trim() ? 0.5 : 1,
              }}
            >
              {phase === "sending" ? "正在送出…" : sendLabel(target)}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                ...buttonFace,
                border: `1.5px solid ${inks.faint}`,
                background: "transparent",
                color: inks.ink,
              }}
            >
              取消
            </button>
            <span style={{ marginLeft: "auto", fontSize: 11, color: inks.dim }}>
              ⌘↩ 送出
            </span>
          </>
        )}
      </div>
      {note && (
        <p
          role={note.ok ? "status" : "alert"}
          style={{
            margin: 0,
            fontSize: 11.5,
            overflowWrap: "anywhere",
            color: note.ok
              ? paper
                ? paper.green
                : inks.ink
              : paper
                ? paper.red
                : inks.ink,
          }}
        >
          {note.text}
        </p>
      )}
    </div>
  );
}

const ellipsis: CSSProperties = {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

/** A client's name in a small outlined pill: CLAUDE in Claude's colour,
 * CHATGPT in ink. */
function SourcePill({ source, ink }: { source: string; ink: string }) {
  return (
    <span
      style={{
        flex: "none",
        fontFamily: PAPER_FIGURES,
        fontWeight: 600,
        fontSize: 10,
        letterSpacing: "0.06em",
        padding: "1px 6px",
        borderRadius: 3,
        border: "1px solid currentColor",
        color: source === "claude" ? CLAUDE_INK : ink,
      }}
    >
      {source === "claude" ? "CLAUDE" : "CHATGPT"}
    </span>
  );
}

/** Where a target's words go: the request's `to` and `target`. */
function request(target: SheetTarget): [HandoffRequest["to"], string] {
  return target.kind === "chatgpt"
    ? ["chatgpt", target.conversation]
    : [target.kind, target.session];
}
