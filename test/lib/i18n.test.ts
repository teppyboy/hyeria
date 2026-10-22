import { describe, expect, it } from "vite-plus/test";
import { detectLanguage, messages, translate } from "../../src/lib/i18n";

describe("language selection and catalogs", () => {
  it("maps browser language variants to the four supported locales", () => {
    expect(detectLanguage(["zh-HK"])).toBe("zh-TW");
    expect(detectLanguage(["zh-CN"])).toBe("zh-CN");
    expect(detectLanguage(["ru-RU"])).toBe("ru");
    expect(detectLanguage(["fr-FR", "en-GB"])).toBe("en");
  });

  it("keeps every locale key aligned and falls back to English", () => {
    const englishKeys = Object.keys(messages.en).sort();
    for (const locale of ["zh-CN", "zh-TW", "ru"] as const)
      expect(Object.keys(messages[locale]).sort()).toEqual(englishKeys);
    expect(translate("en", "app.name")).toBe("Hyeria");
    expect(translate("ru", "missing.key")).toBe("missing.key");
  });
});
