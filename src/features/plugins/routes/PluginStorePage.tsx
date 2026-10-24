import { ActionGroup } from "@/components/workspace/ActionGroup";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
import { WorkspaceState } from "@/components/workspace/WorkspaceState";
import { usePluginConfigMutations, usePluginStoreQuery } from "../queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pluginIdSchema } from "../schemas";
import { translate } from "@/lib/i18n";
import { usePreferencesStore } from "@/stores/preferences";

export function PluginStorePage() {
  const language = usePreferencesStore((state) => state.language);
  const t = (key: string) => translate(language, key);
  const store = usePluginStoreQuery();
  const mutations = usePluginConfigMutations();
  const header = (
    <WorkspaceHeader title={t("nav.pluginStore")} description={t("plugins.storeDescription")} />
  );
  if (store.isPending)
    return (
      <section className="mx-auto grid max-w-5xl gap-6">
        {header}
        <WorkspaceState kind="loading" title={t("plugins.storeLoading")} />
      </section>
    );
  if (store.isError)
    return (
      <section className="mx-auto grid max-w-5xl gap-6">
        {header}
        <WorkspaceState kind="error" title={t("plugins.storeError")} />
      </section>
    );
  return (
    <section className="mx-auto grid max-w-5xl gap-6">
      {header}
      <section aria-labelledby="plugin-store-list" className="grid gap-3">
        <h2 id="plugin-store-list" className="text-base font-medium">
          {t("plugins.storeList")}
        </h2>
        {store.data.plugins.length === 0 && (
          <WorkspaceState kind="empty" title={t("plugins.storeEmpty")} />
        )}
        {store.data.plugins.map((plugin, index) => {
          const parsedId = pluginIdSchema.safeParse(plugin.id);
          const safeId = parsedId.success;
          const id = safeId ? parsedId.data : `invalid-${index}`;
          return (
            <Card key={id}>
              <CardHeader>
                <CardTitle>{id}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                <span>{plugin.version ?? t("plugins.versionUnknown")}</span>
                <p>{t("plugins.executableWarning")}</p>
                {plugin.update_available && <span>{t("plugins.updateUnavailable")}</span>}
                <ActionGroup>
                  <Button
                    disabled={!safeId || mutations.install.isPending}
                    onClick={() => {
                      if (!safeId) return;
                      if (
                        window.confirm(
                          `${t("plugins.install")} ${id}? ${t("plugins.installWarning")}`,
                        )
                      ) {
                        mutations.install.mutate({
                          id,
                          source: plugin.source_id,
                          version: plugin.version,
                        });
                      }
                    }}
                  >
                    {t("plugins.install")}
                  </Button>
                </ActionGroup>
              </CardContent>
            </Card>
          );
        })}
        {Array.isArray(store.data.errors) && store.data.errors.length > 0 && (
          <p role="alert">{t("plugins.sourceErrors")}</p>
        )}
        {mutations.install.isError && <p role="alert">{t("plugins.installError")}</p>}
        {mutations.install.data?.restart_required && (
          <p role="status">{t("plugins.restartStatus")}</p>
        )}
      </section>
    </section>
  );
}
