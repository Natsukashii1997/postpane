import { stampFigure, stampTilt, type HermesBot } from "./bot-stamp";
import { PAPER_SEAL } from "../paper";

/** Seal ink: vermilion on light paper, a lighter vermilion on dark. */
export const sealInk = (light: boolean) => (light ? "#a83a2c" : "#e7826f");

/** 猛鬼兽: a ghost under a sheet, mouth open on its fangs, hem torn. */
const OGRE = (
  <>
    <path d="M9.5 24.5V14C9.5 8.5 12.5 5 16 5s6.5 3.5 6.5 9v10.5l-1.5-1.9-1.4 3.6-1.4-3.2-1.6 3.6-1.4-3.6-1.6 3.2-1.4-3.4-1.4 2.8z" />
    <path d="M9.6 14.2 5.8 18.6l2-.3-.6 2.7 2.3-2" />
    <path d="m22.4 14.2 3.8 4.4-2-.3.6 2.7-2.3-2" />
    <ellipse
      cx="13.6"
      cy="10.4"
      rx="1"
      ry="1.35"
      fill="currentColor"
      stroke="none"
    />
    <ellipse
      cx="18.4"
      cy="10.4"
      rx="1"
      ry="1.35"
      fill="currentColor"
      stroke="none"
    />
    <path d="M12.2 13.8q3.8-1.4 7.6 0-.4 5.2-3.8 5.6-3.4-.4-3.8-5.6z" />
    <path
      d="m13.6 13.5.6 1.9.6-2.1m2.4 0 .6 2.1.6-1.9M14.3 19.2l.6-1.7.6 1.9m1 0 .6-1.9.6 1.7"
      strokeWidth={1}
    />
  </>
);

/** 亚古兽: a dinosaur's head in profile, big eye, a row of small teeth. */
const AGUMON = (
  <>
    <path d="M24.6 22C26.1 19.4 26.6 15.2 26.2 11.6C25.8 7.7 23.4 5.2 20.6 5.5C19.2 5.7 18.2 6.6 17.6 7.8C16.5 6.3 14.8 5.9 12.8 6.4C9 7.2 6.1 9.6 5.6 13C5.2 15.2 5.6 17 6.6 18.4C7.8 21 10.4 22.6 14 22.6C17.6 22.6 21.4 22.6 24.6 22Z" />
    <path d="m17.6 7.8-.2 2.1" />
    <path d="M6.6 18c3.6.6 7.8.7 12-.8 1-.4 1.8-1 2.3-1.8" />
    <path d="M9.4 18.3v1.1m4.6-.8v1.1m3.4-2v1.1" strokeWidth={1} />
    <path d="m9.4 11.6 1.2-.4" />
    <circle cx="21" cy="11.2" r="3.1" />
    <circle cx="20.7" cy="11.4" r="1.6" fill="currentColor" stroke="none" />
  </>
);

/** A Hermes bot's square seal, pressed slightly askew. */
export function BotStamp({
  bot,
  size,
  light,
}: {
  bot: HermesBot;
  size: number;
  light: boolean;
}) {
  const figure = stampFigure(bot);
  return (
    <svg
      className="hud-bot-stamp"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label={bot.name}
      style={{
        flex: "none",
        color: sealInk(light),
        opacity: 0.92,
        transform: `rotate(${stampTilt(bot)}deg)`,
      }}
    >
      <rect
        x="2"
        y="2"
        width="36"
        height="36"
        rx="3"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.6}
      />
      <rect
        x="5"
        y="5"
        width="30"
        height="30"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={0.7}
      />
      {figure ? (
        <g
          transform="translate(20 20) scale(1.14) translate(-16 -16)"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {figure === "ogre" ? OGRE : AGUMON}
        </g>
      ) : (
        <text
          x="20"
          y="27"
          textAnchor="middle"
          fontSize="19"
          fontFamily={PAPER_SEAL}
          fill="currentColor"
        >
          {[...bot.name][0] ?? ""}
        </text>
      )}
    </svg>
  );
}

/** The seal with the bot's name under it, at the end of a session's row. */
export function BotSeal({
  bot,
  light,
  color,
}: {
  bot: HermesBot;
  light: boolean;
  /** The name's ink. */
  color: string;
}) {
  return (
    <span
      title={bot.name}
      style={{ display: "grid", justifyItems: "center", gap: 1 }}
    >
      <BotStamp bot={bot} size={30} light={light} />
      <span
        style={{
          fontSize: 9.5,
          letterSpacing: "0.05em",
          color,
          whiteSpace: "nowrap",
        }}
      >
        {bot.name}
      </span>
    </span>
  );
}
