import { z } from "zod";

/** Hyeria-namespaced; the only place a management key can be written to browser storage. */
export const REMEMBERED_SESSION_STORAGE_KEY = "hyeria:remembered-session:v1";

/** UI must show this next to the "remember" option; browser storage is not encryption. */
export const REMEMBER_SESSION_WARNING =
  "Remembering stores the management key in this browser's localStorage as plaintext-equivalent data. It is not encrypted, and any script running on this origin can read it. Only enable it on a device you trust.";

const rememberedSessionSchema = z.object({
  apiBase: z.string().min(1),
  managementKey: z.string().min(1),
});
export type RememberedSession = z.infer<typeof rememberedSessionSchema>;

export interface RememberedSessionStorage {
  load(): RememberedSession | null;
  save(session: RememberedSession): void;
  clear(): void;
}

export function createLocalRememberedSessionStorage(
  getStorage: () => Storage | undefined = () => globalThis.localStorage,
): RememberedSessionStorage {
  const safe = <T>(fn: (storage: Storage) => T, fallback: T): T => {
    try {
      const storage = getStorage();
      return storage ? fn(storage) : fallback;
    } catch {
      return fallback; // storage blocked or full
    }
  };
  const clear = () => safe((s) => s.removeItem(REMEMBERED_SESSION_STORAGE_KEY), undefined);
  return {
    load() {
      const raw = safe((s) => s.getItem(REMEMBERED_SESSION_STORAGE_KEY), null);
      if (raw === null) return null;
      try {
        // Re-pick the two fields so unexpected stored properties are never carried forward.
        const { apiBase, managementKey } = rememberedSessionSchema.parse(JSON.parse(raw));
        return { apiBase, managementKey };
      } catch {
        clear();
        return null;
      }
    },
    save: ({ apiBase, managementKey }) =>
      safe(
        (s) =>
          s.setItem(REMEMBERED_SESSION_STORAGE_KEY, JSON.stringify({ apiBase, managementKey })),
        undefined,
      ),
    clear,
  };
}
