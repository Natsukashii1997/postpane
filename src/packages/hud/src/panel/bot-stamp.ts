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

/** Seal ink, a lighter shade on dark paper. Vermilion, except 亚古兽's in
 * wisteria so the two bots tell apart (owner, 2026-11-10, #299). */
export function sealInk(bot: HermesBot, light: boolean): string {
  if (stampFigure(bot) === "agumon") return light ? "#6b4a9c" : "#b89ae8";
  return light ? "#a83a2c" : "#e7826f";
}
