/** Which figure a Hermes bot's stamp carries (owner, 2026-11-05: square
 * seal in vermilion, line drawings of the two bots). Each Hermes home is
 * one Feishu bot: the default home is 猛鬼兽, the `agumon` profile 亚古兽;
 * any other profile gets the first character of its name. */
export type StampFigure = "ogre" | "agumon";

export interface HermesBot {
  id: string;
  name: string;
}

export function stampFigure(bot: HermesBot): StampFigure | null {
  if (bot.id === "default") return "ogre";
  if (bot.id === "agumon") return "agumon";
  return null;
}

/** How far each stamp leans, so two in a row do not look printed. */
export function stampTilt(bot: HermesBot): number {
  const figure = stampFigure(bot);
  return figure === "ogre" ? -5 : figure === "agumon" ? 4 : -2;
}
