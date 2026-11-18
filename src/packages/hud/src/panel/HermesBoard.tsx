// The hover panel's Hermes block (issue #136, the owner's 丙 · 各管一摊):
// a desk per Feishu bot. A bot with scheduled tasks lists them in a ruled
// box (#384), how often they run and how the last run went, then the latest
// thing it was asked under the box; a bot without lists the latest three asks and whether
// each was answered.
import { type CSSProperties } from "react";
import { GoButton } from "../GoButton";
import { OpenNotice, useOpenFailures } from "../OpenNotice";
import { failureOf } from "../open-result";
import type { HermesAsk, HermesBotStatus, Snapshot } from "@agent-hud/protocol";
import { useFormat } from "@agent-hud/ui/format-context";
import { usePaper } from "../paper";
import { usePanelServices } from "../PanelContext";
import { tabular } from "./theme";
import { useBoardInks } from "./AgentBoard";
import { BotStamp } from "./BotStamp";
import {
  askChat,
  askGoTitle,
  askLimit,
  askWhen,
  chatLabel,
  deskRole,
  deskState,
  jobRows,
} from "./hermes-board";

const ellipsis: CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  minWidth: 0,
};

/** Reduced motion keeps the replying dot still. */
const still = () =>
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

function useDeskInks(light: boolean) {
  const inks = useBoardInks(light);
  const paper = usePaper();
  const blue = paper?.blue ?? (light ? "#2f5fb3" : "#8fb0ec");
  // Rows part with a fainter dotted line than the blocks do.
  const rule = paper ? paper.text(0.04) : inks.divider;
  return { ...inks, blue, rule, word: paper?.word };
}

function Dot({ color, pulse }: { color: string; pulse?: boolean }) {
  return (
    <i
      aria-hidden
      style={{
        display: "inline-block",
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: color,
        marginRight: 5,
        verticalAlign: 1,
        animation:
          pulse && !still()
            ? "session-pulse 1.4s ease-in-out infinite"
            : undefined,
      }}
    />
  );
}

function AskRow({
  ask,
  now,
  light,
  last,
  slot,
}: {
  ask: HermesAsk;
  now: number;
  light: boolean;
  last: boolean;
  /** Another ask of the desk opens: this one keeps the arrow's place, so
   * the times line up. */
  slot: boolean;
}) {
  const inks = useDeskInks(light);
  const { language, calendar } = useFormat();
  const zh = language === "zh";
  const at = ask.at ? Date.parse(ask.at) : NaN;
  const when = Number.isFinite(at)
    ? askWhen(at, now, calendar.timeZone, language)
    : "";
  const waiting = ask.answer === "waiting";
  const services = usePanelServices();
  const { failure, fail } = useOpenFailures();
  const chatId = askChat(ask);
  const failed = chatId ? failure(chatId) : null;
  // Like a session's row: the ask goes back to its chat, here in Feishu;
  // where it could not, the row says why a few seconds (#220).
  const jumps = Boolean(chatId && services?.openFeishuChat);
  const canOpen = jumps && !failed;
  const goTitle = askGoTitle(Boolean(failed), language);
  const go = async () => {
    if (!canOpen || !chatId) return;
    const reason = failureOf(await services?.openFeishuChat?.(chatId), zh);
    if (reason) fail(chatId, reason);
  };
  return (
    <div
      className={jumps ? "hud-hermes-ask" : undefined}
      role={canOpen ? "button" : undefined}
      tabIndex={canOpen ? 0 : undefined}
      onClick={canOpen ? () => void go() : undefined}
      onKeyDown={
        canOpen
          ? (event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              void go();
            }
          : undefined
      }
      style={{
        display: "grid",
        gridTemplateColumns:
          jumps || slot
            ? "auto minmax(0, 1fr) auto 20px"
            : "auto minmax(0, 1fr) auto",
        gap: 8,
        alignItems: "center",
        padding: "5px 0",
        borderBottom: last ? undefined : `1px dotted ${inks.rule}`,
        fontSize: 12.5,
        cursor: canOpen ? "pointer" : undefined,
      }}
    >
      <span
        style={{
          flex: "none",
          fontSize: 10.5,
          lineHeight: "16px",
          padding: "0 4px",
          borderRadius: 3,
          border: `1px solid ${waiting ? inks.red : inks.divider}`,
          color: waiting ? inks.red : inks.secondary,
        }}
      >
        {chatLabel(ask.chat, language)}
      </span>
      <span title={ask.title} style={{ ...ellipsis, color: inks.text }}>
        {ask.title}
      </span>
      <span
        style={{
          ...tabular,
          fontSize: 11.5,
          color: inks.secondary,
          whiteSpace: "nowrap",
        }}
      >
        {waiting && (
          <span style={{ color: inks.red }}>
            {zh ? "没回 · " : "Unanswered · "}
          </span>
        )}
        {ask.answer === "replying" && (
          <span style={{ color: inks.word ?? inks.blue }}>
            {zh ? "回复中 · " : "Replying · "}
          </span>
        )}
        {when}
      </span>
      {jumps && (
        <GoButton
          label={goTitle}
          enabled={canOpen}
          size={20}
          inks={{
            line: inks.divider,
            ink: inks.secondary,
            faint: inks.tertiary,
            strong: inks.text,
          }}
          onClick={(event) => {
            event.stopPropagation();
            void go();
          }}
        />
      )}
      {!jumps && slot && <span aria-hidden />}
      {failed && (
        <OpenNotice
          text={failed}
          light={light}
          style={{ gridColumn: "2 / -1", marginTop: -2 }}
        />
      )}
    </div>
  );
}

function Desk({
  bot,
  replying,
  now,
  light,
  first,
}: {
  bot: HermesBotStatus;
  replying: boolean;
  now: number;
  light: boolean;
  first: boolean;
}) {
  const inks = useDeskInks(light);
  const { language, calendar } = useFormat();
  const zh = language === "zh";
  const role = deskRole(bot.id, language);
  const state = deskState(bot, replying, now, language);
  const jobs = jobRows(bot.jobs ?? [], now, calendar.timeZone, language);
  const asks = (bot.asks ?? []).slice(0, askLimit(jobs));
  const services = usePanelServices();
  const stateColor =
    state.tone === "down"
      ? inks.red
      : state.tone === "busy"
        ? inks.blue
        : inks.green;
  const head: CSSProperties = {
    fontSize: 10.5,
    color: inks.tertiary,
    letterSpacing: "0.06em",
    padding: "2px 0 4px",
  };
  const statusInk = {
    fail: inks.red,
    ok: inks.word ?? inks.green,
    none: inks.word ?? inks.tertiary,
    paused: inks.tertiary,
  };
  const cell: CSSProperties = {
    padding: "5px 0",
    borderBottom: `1px dotted ${inks.rule}`,
    alignSelf: "center",
  };
  return (
    <div
      className="hud-hermes-desk"
      style={{
        display: "grid",
        gap: 8,
        ...(first
          ? {}
          : { borderTop: `1px dotted ${inks.divider}`, paddingTop: 12 }),
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <BotStamp bot={bot} size={26} light={light} />
        <b style={{ fontSize: 14, fontWeight: 600, color: inks.text }}>
          {bot.name}
        </b>
        {role && (
          <span style={{ fontSize: 11.5, color: inks.secondary }}>{role}</span>
        )}
        <span
          style={{
            marginLeft: "auto",
            fontSize: 12,
            color: (state.tone !== "down" && inks.word) || stateColor,
            whiteSpace: "nowrap",
          }}
        >
          <Dot color={stateColor} pulse={state.tone === "busy"} />
          {state.text}
        </span>
      </div>
      {jobs.length > 0 && (
        <div
          aria-label={zh ? "定时任务" : "Scheduled tasks"}
          style={{
            display: "grid",
            // Fixed columns, so both desks' tables line up.
            gridTemplateColumns: "minmax(0, 1fr) 134px 58px",
            columnGap: 12,
            fontSize: 12.5,
            // The tasks sit in a ruled box, apart from the asks under it
            // (owner's 丙, 2026-11-18).
            border: `1px solid ${inks.divider}`,
            borderRadius: 7,
            padding: "4px 10px 0",
          }}
        >
          <span style={head}>{zh ? "定时任务" : "Task"}</span>
          <span style={head}>{zh ? "多久一次" : "Runs"}</span>
          <span style={head}>{zh ? "执行情况" : "Status"}</span>
          {jobs.map((job, index) => {
            const row: CSSProperties =
              index === jobs.length - 1
                ? { ...cell, borderBottom: "none" }
                : cell;
            const figure: CSSProperties = {
              ...row,
              ...tabular,
              whiteSpace: "nowrap",
            };
            return (
              <div key={job.id} style={{ display: "contents" }}>
                <span
                  title={job.title}
                  style={{ ...row, ...ellipsis, color: inks.text }}
                >
                  {job.name}
                </span>
                <span
                  title={job.cadence}
                  style={{ ...figure, ...ellipsis, color: inks.secondary }}
                >
                  {job.cadence}
                </span>
                <span style={{ ...figure, color: statusInk[job.last.tone] }}>
                  {job.last.text}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {!jobs.length && asks.length > 0 && (
        <span style={head}>{zh ? "最近被问" : "Latest asks"}</span>
      )}
      {asks.length > 0 ? (
        <div style={{ display: "grid", marginTop: jobs.length ? -2 : -6 }}>
          {asks.map((ask, index) => (
            <AskRow
              key={`${ask.at}-${index}`}
              ask={ask}
              now={now}
              light={light}
              last={index === asks.length - 1}
              slot={Boolean(services?.openFeishuChat) && asks.some(askChat)}
            />
          ))}
        </div>
      ) : (
        !jobs.length && (
          <span style={{ fontSize: 12, color: inks.tertiary }}>
            {zh ? "还没人在飞书问过它" : "Nobody has asked it in Feishu yet"}
          </span>
        )
      )}
    </div>
  );
}

/** The Hermes block's body: a desk per bot, in Core's order. */
export function HermesBoard({
  snapshot,
  light,
}: {
  snapshot: Snapshot;
  light: boolean;
}) {
  const bots = snapshot.hermesBots ?? [];
  const now = Date.parse(snapshot.generatedAt);
  if (!bots.length) return null;
  return (
    <div style={{ display: "grid", gap: 12, padding: "4px 6px 2px 0" }}>
      {bots.map((bot, index) => (
        <Desk
          key={bot.id}
          bot={bot}
          replying={snapshot.sessions.some(
            (session) =>
              session.bot?.id === bot.id && session.state === "running",
          )}
          now={now}
          light={light}
          first={index === 0}
        />
      ))}
    </div>
  );
}
