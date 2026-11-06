// The hover panel's Hermes block (issue #136, the owner's 丙 · 各管一摊):
// a desk per Feishu bot. A bot with scheduled tasks lists them, how often
// they run, how the last run went and when the next is, then the latest
// thing it was asked; a bot without lists the latest three asks and whether
// each was answered.
import type { CSSProperties } from "react";
import type { HermesAsk, HermesBotStatus, Snapshot } from "@agent-hud/protocol";
import { useFormat } from "@agent-hud/ui/format-context";
import { usePaper } from "../paper";
import { tabular } from "./theme";
import { useBoardInks } from "./AgentBoard";
import { BotStamp } from "./BotStamp";
import {
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
  return { ...inks, blue, rule };
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
}: {
  ask: HermesAsk;
  now: number;
  light: boolean;
  last: boolean;
}) {
  const inks = useDeskInks(light);
  const { language, calendar } = useFormat();
  const zh = language === "zh";
  const at = ask.at ? Date.parse(ask.at) : NaN;
  const when = Number.isFinite(at)
    ? askWhen(at, now, calendar.timeZone, language)
    : "";
  const waiting = ask.answer === "waiting";
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto minmax(0, 1fr) auto",
        gap: 8,
        alignItems: "center",
        padding: "5px 0",
        borderBottom: last ? undefined : `1px dotted ${inks.rule}`,
        fontSize: 12.5,
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
          <span style={{ color: inks.blue }}>
            {zh ? "回复中 · " : "Replying · "}
          </span>
        )}
        {when}
      </span>
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
            color: stateColor,
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
            gridTemplateColumns: "minmax(0, 1fr) 74px 66px 56px",
            columnGap: 10,
            fontSize: 12.5,
          }}
        >
          <span style={head}>{zh ? "定时任务" : "Task"}</span>
          <span style={head}>{zh ? "多久一次" : "Runs"}</span>
          <span style={head}>{zh ? "上次" : "Last"}</span>
          <span style={head}>{zh ? "下次" : "Next"}</span>
          {jobs.map((job) => (
            <div key={job.id} style={{ display: "contents" }}>
              <span
                title={job.title}
                style={{ ...cell, ...ellipsis, color: inks.text }}
              >
                {job.name}
              </span>
              <span
                style={{
                  ...cell,
                  ...tabular,
                  ...ellipsis,
                  color: inks.secondary,
                }}
              >
                {job.cadence}
              </span>
              <span
                style={{
                  ...cell,
                  ...tabular,
                  whiteSpace: "nowrap",
                  color:
                    job.last.tone === "fail"
                      ? inks.red
                      : job.last.tone === "ok"
                        ? inks.green
                        : inks.tertiary,
                }}
              >
                {job.last.text}
              </span>
              <span
                style={{
                  ...cell,
                  ...tabular,
                  whiteSpace: "nowrap",
                  color: inks.secondary,
                }}
              >
                {job.next}
              </span>
            </div>
          ))}
        </div>
      )}
      {!jobs.length && asks.length > 0 && (
        <span style={head}>{zh ? "最近被问" : "Latest asks"}</span>
      )}
      {asks.length > 0 ? (
        <div style={{ display: "grid", marginTop: jobs.length ? -4 : -6 }}>
          {asks.map((ask, index) => (
            <AskRow
              key={`${ask.at}-${index}`}
              ask={ask}
              now={now}
              light={light}
              last={index === asks.length - 1}
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
    <div style={{ display: "grid", gap: 12, padding: "4px 6px 2px" }}>
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
