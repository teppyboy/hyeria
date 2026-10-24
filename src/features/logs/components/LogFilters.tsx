import { Input } from "@/components/ui/input";
import { usePreferencesStore } from "@/stores/preferences";
import { translate } from "@/lib/i18n";

interface LogFiltersProps {
  search: string;
  showManagement: boolean;
  onSearchChange: (value: string) => void;
  onShowManagementChange: (value: boolean) => void;
}

export function LogFilters({
  search,
  showManagement,
  onSearchChange,
  onShowManagementChange,
}: LogFiltersProps) {
  const language = usePreferencesStore((state) => state.language);
  const t = (key: string) => translate(language, key);
  return (
    <div
      data-slot="log-filters"
      className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
    >
      <label className="grid gap-1 text-sm">
        {t("logs.search")}
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("logs.searchPlaceholder")}
          type="search"
        />
      </label>
      <label className="flex items-center gap-2 text-sm sm:mt-5">
        <input
          type="checkbox"
          checked={showManagement}
          onChange={(event) => onShowManagementChange(event.target.checked)}
        />
        {t("logs.showManagement")}
      </label>
    </div>
  );
}
