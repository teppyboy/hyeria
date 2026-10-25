import { translate } from "@/lib/i18n";
import { usePreferencesStore } from "@/stores/preferences";

/** Keeps sensitive and unsupported configuration available only through Advanced YAML. */
export function SecretBoundary() {
  const language = usePreferencesStore((state) => state.language);
  return (
    <aside className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
      {translate(language, "config.visualSecretBoundary")}
    </aside>
  );
}
