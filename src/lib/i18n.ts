import en from "../locales/en.json";
import zhCN from "../locales/zh-CN.json";
import zhTW from "../locales/zh-TW.json";
import ru from "../locales/ru.json";

export const messages = { en, "zh-CN": zhCN, "zh-TW": zhTW, ru } as const;
export type Language = keyof typeof messages;
export type MessageKey = keyof typeof en;

export function detectLanguage(languages: readonly string[] = []): Language {
  for (const language of languages) {
    const tag = language.toLowerCase();
    if (tag.startsWith("zh")) return /(?:tw|hk|mo|hant)/i.test(language) ? "zh-TW" : "zh-CN";
    if (tag.startsWith("ru")) return "ru";
    if (tag.startsWith("en")) return "en";
  }
  return "en";
}

export function translate(language: Language, key: string): string {
  const selected = messages[language] as Record<string, string>;
  return selected[key] ?? (en as Record<string, string>)[key] ?? key;
}
