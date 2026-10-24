import { translate } from "@/lib/i18n";
import { usePreferencesStore } from "@/stores/preferences";

export function DemoBanner() {
  const language = usePreferencesStore((state) => state.language);
  const t = (key: string) => translate(language, key);
  return (
    <aside
      role="status"
      className="border-b border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground"
    >
      <strong>{t("demo.bannerTitle")}</strong> {t("demo.bannerDescription")}
    </aside>
  );
}
