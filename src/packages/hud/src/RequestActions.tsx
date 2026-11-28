import { useEffect, useRef, useState } from "react";
import type { Approval, RequestDecision } from "@agent-hud/protocol";
import { PermissionPlanCard } from "./permissions/PermissionPlanCard";
import { PermissionQuestionCard } from "./permissions/PermissionQuestionCard";
import { PermissionToolCard } from "./permissions/PermissionToolCard";
import { HandoffStartCard } from "./permissions/HandoffStartCard";
import { ElsewhereCard } from "./permissions/ElsewhereCard";
import { ForwardedNote } from "./permissions/ForwardedNote";
import { startsHere } from "./permissions/approval-list";
import { useGround } from "./ground";
import { alertText } from "./tokens";
import { cardColumn } from "./card-column";
import { refusesClick } from "./permissions/answer-gate";

/** When the sidebar last sent an answer: the card that comes up in its place
 * refuses clicks for a moment (each card mounts afresh, so it is kept here). */
let answeredAt: number | null = null;

export interface RequestActionsProps {
  request: Approval;
  onDecision?: (decision: RequestDecision) => void | Promise<void>;
  /** Settings, on a page such as "agent-plugins". */
  onOpenSettings?: (page: string) => void;
  /** A handoff card's 去开始: back to its session, the card put away (#247). */
  onGoStart?: () => void;
  /** A card pointing to another session: opens it, the card put away. */
  onGoElsewhere?: () => void;
  /** A session's title as the sidebar lists it. */
  titleOf?: (sessionId: string) => string | undefined;
  light?: boolean;
  language?: string;
}

/**
 * Mirrors PermissionAlertViews.swift, PermissionPlanViews.swift, and PermissionQuestionViews.swift.
 * Preserves native capabilities and exact answer keys.
 */
export function RequestActions({
  request,
  onDecision,
  onOpenSettings,
  onGoStart,
  onGoElsewhere,
  titleOf,
  light = false,
  language,
}: RequestActionsProps) {
  const zh = language?.startsWith("zh") ?? false;
  const t = (en: string, cn: string) => (zh ? cn : en);
  const identity = `${request.id}:${JSON.stringify(request.questions ?? [])}`;
  const current = useRef(identity);
  current.current = identity;
  const pendingRef = useRef<string | null>(null);
  const shownAt = useRef(Date.now());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ground = useGround(light);
  const errorColor = ground.seeThrough
    ? alertText("warning", ground)
    : "#e9a16d";

  useEffect(() => {
    shownAt.current = Date.now();
    pendingRef.current = null;
    setPending(false);
    setError(null);
  }, [identity]);

  /** Whether the decision was sent; a card keeps its draft until it was. */
  const answer = async (decision: RequestDecision): Promise<boolean> => {
    const now = Date.now();
    if (
      !onDecision ||
      pendingRef.current === identity ||
      refusesClick({ answeredAt, shownAt: shownAt.current, now })
    )
      return false;
    answeredAt = now;
    const captured = identity;
    pendingRef.current = captured;
    setPending(true);
    setError(null);
    try {
      await onDecision(decision);
      return true;
    } catch (failure) {
      if (current.current === captured)
        setError(failure instanceof Error ? failure.message : String(failure));
      return false;
    } finally {
      if (current.current === captured) {
        pendingRef.current = null;
        setPending(false);
      }
    }
  };

  const disabled = !onDecision || pending;
  const isQuestion =
    request.kind === "question" || Boolean(request.questions?.length);
  const isPlan = request.kind === "plan";

  return (
    <div
      className="hud-request-actions"
      data-request-id={request.id}
      style={{ ...cardColumn(9), fontSize: 12 }}
    >
      {startsHere(request) ? (
        <HandoffStartCard
          key={identity}
          request={request}
          disabled={disabled}
          pending={pending}
          light={light}
          zh={zh}
          answer={answer}
        />
      ) : request.elsewhere ? (
        <ElsewhereCard
          key={identity}
          request={request}
          title={
            (request.elsewhere.sessionId &&
              titleOf?.(request.elsewhere.sessionId)) ||
            request.elsewhere.title
          }
          disabled={disabled}
          pending={pending}
          light={light}
          zh={zh}
          answer={answer}
          go={onGoElsewhere}
        />
      ) : isQuestion ? (
        <PermissionQuestionCard
          key={identity}
          request={request}
          disabled={disabled}
          pending={pending}
          light={light}
          zh={zh}
          answer={answer}
          openSettings={onOpenSettings}
          goStart={onGoStart}
          note={
            request.forwardedFrom?.length ? (
              <ForwardedNote
                from={request.forwardedFrom}
                titleOf={titleOf}
                light={light}
                zh={zh}
              />
            ) : undefined
          }
        />
      ) : isPlan ? (
        <PermissionPlanCard
          key={identity}
          request={request}
          disabled={disabled}
          light={light}
          zh={zh}
          answer={answer}
        />
      ) : (
        <PermissionToolCard
          key={identity}
          request={request}
          disabled={disabled}
          pending={pending}
          light={light}
          zh={zh}
          answer={answer}
        />
      )}
      {!onDecision && (
        <p style={{ margin: 0, fontSize: 11, opacity: 0.6 }}>
          {t("Approval delivery is not connected.", "尚未连接审批处理。")}
        </p>
      )}
      {error && (
        <p
          role="alert"
          style={{
            margin: 0,
            color: errorColor,
            fontSize: 11,
            lineHeight: 1.4,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
export default RequestActions;
