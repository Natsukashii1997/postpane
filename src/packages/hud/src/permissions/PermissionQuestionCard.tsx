import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronLeft,
  LoaderCircle,
  Plug,
  X,
} from "lucide-react";
import type {
  Approval,
  RequestAnswer,
  RequestDecision,
} from "@agent-hud/protocol";
import { clientDisplayName } from "../IslandNews";
import { alertFill, onAlertFill } from "../tokens";
import { useGround } from "../ground";
import { cardColumn } from "../card-column";
import { usePaper } from "../paper";
import { ApprovalTag } from "./ApprovalTag";
import { START_BADGE } from "./approval-list";
import { sendThenForget } from "./answer-gate";
import { CardButton } from "./CardButton";

/** A question's draft: the offered answers picked, the words typed, and
 * whether those words are the answer (`own`). Skipping or picking a single
 * option sets the words aside without erasing them, as Open's
 * QuestionDraft does. */
type Draft = RequestAnswer & { own?: boolean };

/** Settings' page for what Agent HUD installs into each client. */
const AGENT_PLUGINS_PAGE = "agent-plugins";
/** What loads a newly installed plugin in a running Claude Code session. */
const RELOAD_COMMAND = "/reload-plugins";

/** `text` with each `command` in it drawn by `code`. */
function withCommand(
  text: string,
  command: string,
  code: (command: string, key: number) => ReactNode,
) {
  const parts = text.split(command);
  return parts.flatMap((part, index) =>
    index === 0 ? [part] : [code(command, index), part],
  );
}

const drafts = new Map<
  string,
  { answers: Record<string, Draft>; page: number }
>();

export function PermissionQuestionCard({
  request,
  disabled,
  pending,
  light = false,
  zh = false,
  answer,
  openSettings,
  goStart,
  note,
}: {
  request: Approval;
  disabled: boolean;
  pending: boolean;
  light?: boolean;
  zh?: boolean;
  answer: (decision: RequestDecision) => Promise<boolean>;
  /** Settings, on a page such as "agent-plugins"; without it the card only says where to go. */
  openSettings?: (page: string) => void;
  /** A handoff card's 去开始 in place of 知道了: back to its session, where
   * the person starts the new one, the card put away (#247). */
  goStart?: () => void;
  /** Under the question: what another session sent the owner here to do. */
  note?: ReactNode;
}) {
  const t = (en: string, cn: string) => (zh ? cn : en);
  const [answers, setAnswers] = useState<Record<string, Draft>>(
    () => drafts.get(request.id)?.answers ?? {},
  );
  const [page, setPageState] = useState(
    () => drafts.get(request.id)?.page ?? 0,
  );
  const [editingCustomKey, setEditingCustomKey] = useState<string | null>(null);
  const customInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const saved = drafts.get(request.id);
    setAnswers(saved?.answers ?? {});
    setPageState(saved?.page ?? 0);
    setEditingCustomKey(null);
  }, [request.id]);

  const setPage = (nextPage: number) => {
    setPageState(nextPage);
    const current = drafts.get(request.id);
    drafts.set(request.id, {
      answers: current?.answers ?? answers,
      page: nextPage,
    });
  };

  const questions = request.questions ?? [];
  const canAnswerQuestion =
    request.answersQuestion !== false && questions.length > 0;
  const vendor = request.vendor ?? clientDisplayName(request.source);
  const detailText = request.detail?.trim() || null;

  // On paper (HUDExpandedSurface prints it beside the dock) the answers are
  // printed rows with dotted rules, the buttons boxes, Submit filled with ink.
  const paper = usePaper();
  const text = (alpha: number) =>
    paper
      ? paper.text(alpha)
      : light
        ? `rgba(0,0,0,${alpha})`
        : `rgba(255,255,255,${alpha})`;
  const stroke = (alpha: number) =>
    paper
      ? paper.text(Math.min(1, alpha * 3))
      : light
        ? `rgba(0,0,0,${alpha})`
        : `rgba(255,255,255,${alpha})`;
  const primary = paper ? paper.ink : text(0.92);
  const secondary = paper ? paper.dim : text(0.55);
  const tertiary = paper ? paper.dim : text(0.38);
  const inset = paper
    ? paper.fill
    : light
      ? "rgba(0,0,0,0.045)"
      : "rgba(255,255,255,0.055)";
  const highlight = paper
    ? paper.fill
    : light
      ? "rgba(0,0,0,0.08)"
      : "rgba(255,255,255,0.1)";
  const round = (radius: number) => (paper ? 2 : radius);
  const ground = useGround(light);
  const signal = paper ? paper.ink : alertFill("warning", ground);
  const onSignal = paper ? paper.paper : onAlertFill(ground);
  const accentEdge = paper ? paper.ink : "rgba(233,161,109,0.45)";
  // What led to the question, in readable ink; the question itself large.
  const context = {
    fontSize: 13,
    lineHeight: 1.7,
    marginBottom: 6,
    color: paper ? paper.text(0.76) : text(0.84),
    overflowWrap: "anywhere" as const,
  };
  const questionText = {
    fontSize: 15,
    fontWeight: 600,
    color: primary,
    lineHeight: 1.45,
  };
  // A question's heading (such as 下一步): the card's tag, dashed, in the
  // asking red.
  const heading = (header: string) => (
    <ApprovalTag label={header} tone="ask" light={light} dashed />
  );
  // An answer's row: a tinted box, or on paper a printed line over a dotted
  // rule, washed when picked.
  const answerRow = (chosen: boolean, edge = chosen) =>
    paper
      ? {
          borderRadius: 0,
          borderStyle: "dotted",
          borderWidth: "0 0 1.2px",
          borderColor: paper.line,
          background: chosen ? paper.fill : "transparent",
        }
      : {
          borderRadius: 6,
          borderStyle: "solid",
          borderWidth: 1,
          borderColor: edge ? accentEdge : "transparent",
          background: chosen ? highlight : inset,
        };
  const code = (command: string, key: number) => (
    <code
      key={key}
      style={{
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 10,
        padding: "0 4px",
        borderRadius: round(4),
        background: highlight,
        color: primary,
      }}
    >
      {command}
    </code>
  );

  const changeAnswer = (key: string, patch: Partial<Draft>) =>
    setAnswers((previous) => {
      const next = {
        ...previous,
        [key]: {
          ...previous[key],
          ...patch,
          selected: patch.selected ?? previous[key]?.selected ?? [],
        },
      };
      drafts.set(request.id, {
        answers: next,
        page: drafts.get(request.id)?.page ?? page,
      });
      return next;
    });

  const submitAllAnswers = (omitKey?: string) => {
    // Several picks are filed in the order they were offered; the typed
    // words only when they are the chosen answer.
    const written = Object.fromEntries(
      Object.entries(answers)
        .map(([key, value]) => {
          const offered =
            questions
              .find((q) => q.answerKey === key)
              ?.options.map((o) => o.label) ?? value.selected;
          const selected = offered.filter((label) =>
            value.selected.includes(label),
          );
          const custom = value.own ? value.custom?.trim() : undefined;
          return [key, { selected, ...(custom ? { custom } : {}) }] as const;
        })
        .filter(
          ([key, value]) =>
            key !== omitKey && (value.selected.length > 0 || "custom" in value),
        ),
    );
    void sendThenForget(answer, { kind: "answer", answers: written }, () =>
      drafts.delete(request.id),
    );
  };

  // Every hook comes before the returns below: a card whose client stops or
  // starts taking answers renders the other way, and React needs the same
  // hooks each time (#259).
  const safePage = Math.min(page, Math.max(0, questions.length - 1));
  // None when the card cannot answer and was sent no questions.
  const q = questions[safePage];
  const editingCustom =
    editingCustomKey === q?.answerKey || q?.options.length === 0;
  useEffect(() => {
    if (!editingCustom) return;
    const input = customInputRef.current;
    if (!input || input.closest("[inert], [aria-hidden=true]")) return;
    input.focus({ preventScroll: true });
  }, [editingCustom, q?.answerKey]);

  if (!canAnswerQuestion) {
    // Only the question and why it waits for the client: offered answers
    // that could not be sent would look like buttons that do nothing.
    const fix = request.answerFix ?? null;
    const opensPlugins =
      Boolean(openSettings) &&
      (fix === "installPlugin" || fix === "turnOnAnswers");
    return (
      <div style={cardColumn(8)}>
        {detailText && <div style={context}>{detailText}</div>}
        {questions.map((q) => (
          <div
            key={q.answerKey}
            style={{ ...cardColumn(6), justifyItems: "start" }}
          >
            {q.header && heading(q.header)}
            <div style={questionText}>{q.question}</div>
          </div>
        ))}
        {/* Core says why this one can be answered only in the client and
            which step would let Agent HUD answer it: a plugin to install or
            answering to turn back on opens Settings → Agent plugins; a
            session that has not loaded the plugin is told the command. */}
        <div
          style={{
            ...cardColumn(3),
            padding: "7px 8px",
            borderRadius: round(6),
            background: inset,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 600, color: primary }}>
            {request.badge === START_BADGE
              ? t(`Start it in ${vendor}`, `请到 ${vendor} 里开始`)
              : t(`Answer in ${vendor}`, `请到 ${vendor} 里回答`)}
          </span>
          {request.answerNote && (
            <span
              style={{
                fontSize: 10,
                lineHeight: 1.4,
                color: secondary,
                overflowWrap: "anywhere",
              }}
            >
              {fix === "reloadPlugins"
                ? withCommand(request.answerNote, RELOAD_COMMAND, code)
                : request.answerNote}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {opensPlugins && (
            <CardButton
              tone="primary"
              light={light}
              icon={<Plug size={9} strokeWidth={2.6} />}
              onClick={() => openSettings?.(AGENT_PLUGINS_PAGE)}
            >
              {t("Open Agent plugins", "打开智能体插件")}
            </CardButton>
          )}
          <span style={{ flex: 1, minWidth: 8 }} />
          <CardButton
            tone="secondary"
            light={light}
            disabled={disabled}
            icon={
              goStart ? (
                <ArrowUpRight size={9} strokeWidth={2.6} />
              ) : (
                <X size={9} strokeWidth={2.6} />
              )
            }
            onClick={() => {
              if (goStart) return goStart();
              void sendThenForget(answer, { kind: "leave" }, () =>
                drafts.delete(request.id),
              );
            }}
          >
            {goStart ? t("Go start", "去开始") : t("Dismiss", "知道了")}
          </CardButton>
        </div>
      </div>
    );
  }

  if (!q) return null;
  const key = q.answerKey;
  const value = answers[key] ?? { selected: [] };
  const hasCustom = Boolean(value.own && value.custom?.trim());
  const isAnswered = value.selected.length > 0 || hasCustom;
  const advanceOrSubmit = () => {
    if (!isAnswered || disabled) return;
    setEditingCustomKey(null);
    if (safePage + 1 < questions.length) {
      setPage(safePage + 1);
    } else {
      submitAllAnswers();
    }
  };

  const renderMarker = (chosen: boolean, multi: boolean) => (
    <span
      aria-hidden="true"
      style={{
        width: 12,
        height: 12,
        borderRadius: multi ? round(3) : "50%",
        border: `1.2px solid ${chosen ? signal : stroke(0.28)}`,
        background: chosen ? signal : "transparent",
        display: "inline-grid",
        placeItems: "center",
        flexShrink: 0,
        marginTop: 1,
      }}
    >
      {chosen && <Check size={7} strokeWidth={3} color={onSignal} />}
    </span>
  );

  return (
    <div style={cardColumn(8)}>
      {detailText && <div style={context}>{detailText}</div>}
      <div style={cardColumn(6)}>
        {(q.header || questions.length > 1) && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {q.header && heading(q.header)}
            <span style={{ flex: 1 }} />
            {questions.length > 1 && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  fontVariantNumeric: "tabular-nums",
                  color: tertiary,
                }}
              >
                {safePage + 1} / {questions.length}
              </span>
            )}
          </div>
        )}
        <div style={cardColumn(2)}>
          <div style={questionText}>{q.question}</div>
          {q.multiSelect && (
            <div style={{ fontSize: 10, color: tertiary }}>
              {t("Choose any", "可多选")}
            </div>
          )}
        </div>
      </div>
      {note}
      <div style={cardColumn(4)}>
        {q.options.map((option) => {
          const chosen = value.selected.includes(option.label);
          return (
            <button
              key={option.label}
              type="button"
              disabled={disabled}
              onClick={() => {
                setEditingCustomKey(null);
                if (q.multiSelect) {
                  const nextSelected = q.options
                    .map((o) => o.label)
                    .filter((label) =>
                      label === option.label
                        ? !chosen
                        : value.selected.includes(label),
                    );
                  changeAnswer(key, { selected: nextSelected });
                } else {
                  changeAnswer(key, { selected: [option.label], own: false });
                }
              }}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 7,
                width: "100%",
                padding: "6px 8px",
                ...answerRow(chosen),
                color: "inherit",
                textAlign: "left",
                cursor: disabled ? "default" : "pointer",
              }}
            >
              {renderMarker(chosen, q.multiSelect)}
              <span
                style={{
                  ...cardColumn(2),
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: primary,
                  }}
                >
                  {option.label}
                </span>
                {/* Decided 2026-10-21: shown whole, not cut at two lines (Open's lineLimit(2)). It says what picking
                    this answer does, and the end of a long one is often the part that decides. */}
                {option.description && (
                  <span
                    style={{
                      fontSize: 10,
                      lineHeight: 1.35,
                      color: secondary,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {option.description}
                  </span>
                )}
              </span>
            </button>
          );
        })}
        {editingCustom ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "6px 8px",
              ...answerRow(hasCustom, true),
            }}
          >
            {renderMarker(hasCustom, q.multiSelect)}
            <input
              ref={customInputRef}
              type="text"
              aria-label={t("Your own answer", "补充回答")}
              placeholder={
                q.options.length === 0
                  ? t("Type an answer", "输入回答")
                  : t("Other", "其他回答")
              }
              value={value.custom ?? ""}
              disabled={disabled}
              onChange={(e) => {
                const textVal = e.target.value;
                changeAnswer(key, {
                  custom: textVal,
                  own: true,
                  ...(q.multiSelect ? {} : { selected: [] }),
                });
              }}
              onKeyDown={(e) => {
                // Return while an input method is composing belongs to it.
                if (
                  e.key === "Enter" &&
                  !e.nativeEvent.isComposing &&
                  e.keyCode !== 229
                ) {
                  e.preventDefault();
                  advanceOrSubmit();
                }
              }}
              style={{
                flex: 1,
                border: 0,
                outline: 0,
                background: "transparent",
                color: primary,
                fontSize: 11,
                fontFamily: "inherit",
              }}
            />
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              // Going into the field is choosing to answer in one's own words.
              changeAnswer(key, {
                own: true,
                ...(q.multiSelect ? {} : { selected: [] }),
              });
              setEditingCustomKey(key);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              width: "100%",
              padding: "6px 8px",
              ...answerRow(hasCustom),
              color: "inherit",
              textAlign: "left",
              cursor: disabled ? "default" : "pointer",
            }}
          >
            {renderMarker(hasCustom, q.multiSelect)}
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: hasCustom ? primary : secondary,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {value.custom?.trim() ? value.custom : t("Other", "其他")}
            </span>
          </button>
        )}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <CardButton
          tone="secondary"
          light={light}
          disabled={disabled}
          icon={<ArrowRight size={9} strokeWidth={2.6} />}
          onClick={() => {
            setEditingCustomKey(null);
            changeAnswer(key, { selected: [], own: false });
            if (safePage + 1 < questions.length) {
              setPage(safePage + 1);
            } else {
              submitAllAnswers(key);
            }
          }}
        >
          {t("Skip", "跳过")}
        </CardButton>
        <span style={{ flex: 1, minWidth: 8 }} />
        {safePage > 0 && (
          <CardButton
            tone="secondary"
            light={light}
            disabled={disabled}
            icon={<ChevronLeft size={9} strokeWidth={2.6} />}
            onClick={() => {
              setEditingCustomKey(null);
              setPage(safePage - 1);
            }}
          >
            {t("Back", "返回")}
          </CardButton>
        )}
        <CardButton
          tone="primary"
          light={light}
          disabled={disabled || !isAnswered}
          faded={!isAnswered}
          onClick={advanceOrSubmit}
          icon={
            pending ? (
              <LoaderCircle size={9} className="animate-spin" />
            ) : safePage + 1 < questions.length ? (
              <ArrowRight size={9} strokeWidth={2.6} />
            ) : (
              <Check size={9} strokeWidth={2.6} />
            )
          }
        >
          {safePage + 1 < questions.length
            ? t("Next", "继续")
            : t("Submit", "提交")}
        </CardButton>
      </div>
    </div>
  );
}
