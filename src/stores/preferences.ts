import { createStore, useStore, type StoreApi } from "zustand";
import { detectLanguage, type Language } from "@/lib/i18n";

export type Theme = "system" | "light" | "white" | "dark";
const STORAGE_KEY = "hyeria:preferences:v1";
interface SavedPreferences {
  language?: Language;
  theme?: Theme;
}
export interface PreferencesState {
  language: Language;
  languageOverride: Language | null;
  theme: Theme;
  setLanguage(language: Language | null): void;
  setTheme(theme: Theme): void;
}

function loadPreferences(): SavedPreferences {
  try {
    const value = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "null",
    ) as SavedPreferences | null;
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

export function createPreferencesStore(
  languages: readonly string[] = navigator.languages,
): StoreApi<PreferencesState> {
  const saved = loadPreferences();
  const initialLanguage =
    saved.language && ["en", "zh-CN", "zh-TW", "ru"].includes(saved.language)
      ? saved.language
      : detectLanguage(languages);
  const initialTheme =
    saved.theme && ["system", "light", "white", "dark"].includes(saved.theme)
      ? saved.theme
      : "dark";
  return createStore<PreferencesState>()((set, get) => {
    const persist = () => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ language: get().languageOverride, theme: get().theme }),
        );
      } catch {
        /* Browser storage is optional; preferences still work for this session. */
      }
    };
    return {
      language: initialLanguage,
      languageOverride: saved.language ?? null,
      theme: initialTheme,
      setLanguage(language) {
        const resolved = language ?? detectLanguage(languages);
        set({ language: resolved, languageOverride: language });
        persist();
      },
      setTheme(theme) {
        set({ theme });
        persist();
      },
    };
  });
}

export const preferencesStore = createPreferencesStore();
export function usePreferencesStore<T>(selector: (state: PreferencesState) => T): T {
  return useStore(preferencesStore, selector);
}
