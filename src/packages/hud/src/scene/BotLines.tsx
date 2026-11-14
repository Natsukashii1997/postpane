// Hermes's bots on its peek (issue #108), moved out of AgentPeek.tsx for
// the 300-line ratchet (ADR-0001 C3).
import { useFormat } from "@agent-hud/ui/format-context";
import { dateFormat } from "@agent-hud/ui/format";
import type { HUDVendor } from "../model";
import { BotStamp } from "../panel/BotStamp";
import { peekBots, peekTones, replyTime } from "./hermes-peek";
import { PEEK_BOT_ROW, PEEK_RULE, PEEK_TEAR } from "./peek-size";

export interface BotInks {
  ink: string;
  dim: string;
  line: string;
  /** How faint the detail is where it shares the ink (off the receipt). */
  dimOpacity?: number;
  online: string;
  replying: string;
  down: string;
  word?: string;
  figures?: string;
}

/** A bot's seal in the peek, px before scale: as tall as its two lines. */
const SEAL = 27;

/** Hermes's bots, one a row: its seal, its name and state, and under them
 * when it last replied and its turns today, the question it is answering,
 * or why it is down; then the last day's tokens (issue #108). */
export function BotLines({
  vendor,
  scale,
  zh,
  light,
  inks,
}: {
  vendor: HUDVendor;
  scale: number;
  zh: boolean;
  light: boolean;
  inks: BotInks;
}) {
  const { calendar } = useFormat();
  const locale = zh ? "zh-CN" : "en-US";
  const now = Date.now();
  const format = {
    time: dateFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: calendar.timeZone,
    }),
    date: dateFormat(locale, {
      month: zh ? "long" : "short",
      day: "numeric",
      timeZone: calendar.timeZone,
    }),
  };
  const lines = peekBots(vendor.bots ?? [], vendor.sessions, zh, (at) =>
    replyTime(at, now, format),
  );
  const tone = peekTones(inks);
  return (
    <>
      {lines.map((line) => (
        <div
          key={line.bot.id}
          style={{
            display: "grid",
            gridTemplateColumns: `${SEAL * scale}px minmax(0, 1fr)`,
            columnGap: 7 * scale,
            alignItems: "center",
            height: PEEK_BOT_ROW * scale,
          }}
        >
          {/* The seal's frame spans the name's top to the detail's foot
              (owner, 2026-11-05): the two lines' ink sits a little above
              their boxes' middle. */}
          <span
            style={{
              display: "grid",
              transform: `translateY(${-0.75 * scale}px)`,
            }}
          >
            <BotStamp bot={line.bot} size={SEAL * scale} light={light} />
          </span>
          <div style={{ minWidth: 0, lineHeight: `${16 * scale}px` }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6 * scale,
                fontWeight: 700,
                color: inks.ink,
              }}
            >
              <span
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  minWidth: 0,
                }}
              >
                {line.bot.name}
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4 * scale,
                  fontSize: 11 * scale,
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  color: tone.word[line.state],
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 6 * scale,
                    height: 6 * scale,
                    borderRadius: "50%",
                    background: tone.dot[line.state],
                  }}
                />
                {line.label}
              </span>
            </div>
            <div
              style={{
                fontSize: 10.5 * scale,
                color: inks.dim,
                opacity: inks.dimOpacity,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {line.detail}
            </div>
          </div>
        </div>
      ))}
      {vendor.usage && (
        <>
          <div
            aria-hidden="true"
            style={{
              borderTop: `1.2px dashed ${inks.line}`,
              opacity: inks.dimOpacity,
              margin: `${PEEK_TEAR}px ${-12 * scale}px ${PEEK_RULE - PEEK_TEAR - 1.2}px ${-16 * scale}px`,
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 6,
              height: 18 * scale,
              lineHeight: `${18 * scale}px`,
              color: inks.dim,
            }}
          >
            <span style={{ whiteSpace: "nowrap", opacity: inks.dimOpacity }}>
              {zh ? "24 小时" : "24 h"}
            </span>
            <span
              aria-hidden="true"
              style={{
                flex: "1 1 auto",
                minWidth: 8,
                borderBottom: `1px dotted ${inks.line}`,
                opacity: inks.dimOpacity,
                transform: `translateY(${-3 * scale}px)`,
              }}
            />
            <strong
              style={{
                fontFamily: inks.figures,
                fontVariantNumeric: "tabular-nums",
                fontSize: (inks.figures ? 15 : 12) * scale,
                fontWeight: 700,
                color: inks.ink,
                whiteSpace: "nowrap",
              }}
            >
              {vendor.usage}
            </strong>
          </div>
        </>
      )}
    </>
  );
}
