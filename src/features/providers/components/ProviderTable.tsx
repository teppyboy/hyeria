import { Badge } from "@/components/ui/badge";
import { translate } from "@/lib/i18n";
import { usePreferencesStore } from "@/stores/preferences";
import type { ProviderGroupView } from "../api";

interface ProviderTableProps {
  groups: readonly ProviderGroupView[];
}

/** Read-only metadata table; it renders group names and counts only, never key or endpoint values. */
export function ProviderTable({ groups }: ProviderTableProps) {
  const language = usePreferencesStore((state) => state.language);
  const t = (key: string) => translate(language, key);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="px-2 py-1.5 font-medium">{t("providers.group")}</th>
            <th className="px-2 py-1.5 font-medium">{t("providers.status")}</th>
            <th className="px-2 py-1.5 text-right font-medium">{t("providers.entries")}</th>
            <th className="px-2 py-1.5 text-right font-medium">{t("providers.keys")}</th>
            <th className="px-2 py-1.5 text-right font-medium">{t("providers.blankKeys")}</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const keyCount = group.entries.reduce((sum, entry) => sum + entry.keyCount, 0);
            const blankKeyCount = group.entries.reduce(
              (sum, entry) => sum + entry.blankKeyCount,
              0,
            );
            return (
              <tr key={group.provider} className="border-b last:border-0">
                <td className="px-2 py-1.5 font-mono">{group.provider}</td>
                <td className="px-2 py-1.5">
                  <Badge variant={group.known ? "secondary" : "outline"}>
                    {group.known ? t("providers.known") : t("providers.unknown")}
                  </Badge>
                </td>
                <td className="px-2 py-1.5 text-right">{group.entryCount}</td>
                <td className="px-2 py-1.5 text-right">{keyCount}</td>
                <td className="px-2 py-1.5 text-right">{blankKeyCount}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
