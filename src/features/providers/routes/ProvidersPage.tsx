import { Link } from "react-router";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
import { WorkspaceState } from "@/components/workspace/WorkspaceState";
import { ProviderTable } from "@/features/providers/components/ProviderTable";
import { useProviderGroupsQuery } from "@/features/providers/queries";
import { translate } from "@/lib/i18n";
import { usePreferencesStore } from "@/stores/preferences";

export function ProvidersPage() {
  const language = usePreferencesStore((state) => state.language);
  const t = (key: string) => translate(language, key);
  const groups = useProviderGroupsQuery();

  return (
    <section className="mx-auto grid max-w-5xl gap-6">
      <WorkspaceHeader title={t("nav.providers")} description={t("providers.description")} />

      <section aria-labelledby="providers-groups" className="grid gap-3">
        <h2 id="providers-groups" className="text-base font-medium">
          {t("providers.groups")}
        </h2>
        {groups.isPending && <WorkspaceState kind="loading" title={t("providers.loading")} />}
        {groups.isError && <WorkspaceState kind="error" title={t("providers.loadError")} />}
        {groups.isSuccess && groups.data.length === 0 && (
          <WorkspaceState kind="empty" title={t("providers.empty")} />
        )}
        {groups.isSuccess && groups.data.length > 0 && <ProviderTable groups={groups.data} />}
        {groups.isSuccess && (
          <div className="space-y-2 text-sm">
            <p>{t("providers.deferred")}</p>
            <Link className="underline" to="/config">
              {t("providers.rawLink")}
            </Link>
          </div>
        )}
      </section>
    </section>
  );
}
