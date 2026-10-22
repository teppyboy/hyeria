import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { createPreferencesStore } from "../../src/stores/preferences";

beforeEach(() => localStorage.clear());

describe("preferences store", () => {
  it("detects browser language and persists only explicit non-sensitive preferences", () => {
    const store = createPreferencesStore(["zh-Hant-HK"]);
    expect(store.getState().language).toBe("zh-TW");
    store.getState().setLanguage("ru");
    store.getState().setTheme("dark");
    const saved = localStorage.getItem("hyeria:preferences:v1");
    expect(saved).toBe(JSON.stringify({ language: "ru", theme: "dark" }));
    expect(saved).not.toContain("managementKey");
  });

  it("keeps working when browser storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const store = createPreferencesStore(["en"]);
    expect(() => store.getState().setTheme("white")).not.toThrow();
    expect(store.getState().theme).toBe("white");
    vi.restoreAllMocks();
  });
});
