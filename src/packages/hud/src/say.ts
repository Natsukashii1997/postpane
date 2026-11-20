import type { Language } from "@agent-hud/ui/format";

/** The Chinese or the English wording, by the app's language. Chinese comes
 * first: `say(language, "等你", "Waiting")`. */
export const say = (language: Language, zh: string, en: string) =>
  language === "zh" ? zh : en;
