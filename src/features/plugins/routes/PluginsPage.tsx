import { ActionGroup } from "@/components/workspace/ActionGroup";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
import { WorkspaceState } from "@/components/workspace/WorkspaceState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { translate } from "@/lib/i18n";
import { usePreferencesStore } from "@/stores/preferences";
import { usePluginConfigMutations, usePluginsQuery } from "../queries";
import { pluginIdSchema } from "../schemas";
import { useUiStore } from "@/stores/ui";

export function PluginsPage() {
  const language = usePreferencesStore((state) => state.language);
  const t = (key: string) => translate(language, key);
  const plugins = usePluginsQuery();
  const mutations = usePluginConfigMutations();
  const header = (
    <WorkspaceHeader title={t("nav.plugins")} description={t("plugins.description")} />
  );
  if (plugins.isPending && plugins.fetchStatus === "fetching")
    return (
      <section className="mx-auto grid max-w-5xl gap-6">
        {header}
        <WorkspaceState kind="loading" title={t("plugins.loading")} />
      </section>
    );
  if (plugins.isError)
    return (
      <section className="mx-auto grid max-w-5xl gap-6">
        {header}
        <WorkspaceState kind="error" title={t("plugins.loadError")} />
      </section>
    );
  if (!plugins.data && plugins.fetchStatus === "idle")
    return (
      <section className="mx-auto grid max-w-5xl gap-6">
        {header}
        <WorkspaceState kind="unavailable" title={t("plugins.unavailable")} />
      </section>
    );
  if (!plugins.data)
    return (
      <section className="mx-auto grid max-w-5xl gap-6">
        {header}
        <WorkspaceState kind="unavailable" title={t("plugins.unavailable")} />
      </section>
    );
  return (
    <section className="mx-auto grid max-w-5xl gap-6">
      {header}
      <section aria-labelledby="plugins-list" className="grid gap-3">
        <h2 id="plugins-list" className="text-base font-medium">
          {t("plugins.list")}
        </h2>
        {plugins.data.plugins.length === 0 && (
          <WorkspaceState kind="empty" title={t("plugins.empty")} />
        )}
        {plugins.data.plugins.map((plugin, index) => {
          const id = pluginIdSchema.safeParse(plugin.id).success ? plugin.id : `invalid-${index}`;
          return (
            <Card key={id}>
              <CardHeader>
                <CardTitle>{id}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                <span>
                  {plugin.enabled === true
                    ? t("plugins.enabled")
                    : plugin.enabled === false
                      ? t("plugins.disabled")
                      : t("plugins.unknown")}
                </span>
                {plugin.enabled !== undefined && pluginIdSchema.safeParse(plugin.id).success && (
                  <Button
                    variant="outline"
                    disabled={mutations.setEnabled.isPending}
                    onClick={() =>
                      mutations.setEnabled.mutate({ id: plugin.id, enabled: !plugin.enabled })
                    }
                  >
                    {plugin.enabled ? t("plugins.disable") : t("plugins.enable")}
                  </Button>
                )}
                <ActionGroup destructive>
                  <Button
                    variant="destructive"
                    disabled={
                      mutations.uninstall.isPending || !pluginIdSchema.safeParse(plugin.id).success
                    }
                    onClick={() => {
                      void useUiStore
                        .getState()
                        .requestConfirm({
                          title: `${t("plugins.uninstall")} ${id}?`,
                          description: t("plugins.uninstallDescription"),
                          confirmLabel: t("plugins.uninstall"),
                          destructive: true,
                        })
                        .then((confirmed) => {
                          if (confirmed) mutations.uninstall.mutate(plugin.id);
                        });
                    }}
                  >
                    {t("plugins.uninstall")}
                  </Button>
                </ActionGroup>
                {mutations.setEnabled.isError && <p role="alert">{t("plugins.enableError")}</p>}
                {mutations.uninstall.isError && (
                  <p role="alert">
                    {t("plugins.removeError")}
                    {mutations.uninstall.error instanceof Error &&
                    "status" in mutations.uninstall.error &&
                    (mutations.uninstall.error as { status?: number }).status === 409
                      ? ` ${t("plugins.restartRequired")}`
                      : "."}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
        {plugins.data.invalidPluginCount > 0 && <p role="alert">{t("plugins.invalidHidden")}</p>}
      </section>
    </section>
  );
}
