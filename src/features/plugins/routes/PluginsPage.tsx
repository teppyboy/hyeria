import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePluginConfigMutations, usePluginsQuery } from "../queries";
import { pluginIdSchema } from "../schemas";
import { useUiStore } from "@/stores/ui";

export function PluginsPage() {
  const plugins = usePluginsQuery();
  const mutations = usePluginConfigMutations();
  if (plugins.isPending && plugins.fetchStatus === "fetching")
    return <p role="status">Loading plugins…</p>;
  if (!plugins.data && plugins.fetchStatus === "idle")
    return <p>Plugin discovery is not available.</p>;
  if (plugins.isError) return <p role="alert">Plugin information is unavailable.</p>;
  if (!plugins.data) return <p>Plugin discovery is not available.</p>;
  if (plugins.data.plugins.length === 0) {
    return (
      <section>
        <h1 className="text-2xl font-semibold">Plugins</h1>
        <p>No plugins were reported by this server.</p>
        {plugins.data.invalidPluginCount > 0 && (
          <p role="alert">Some plugin metadata was malformed and has been hidden.</p>
        )}
      </section>
    );
  }

  return (
    <section className="grid gap-4">
      <h1 className="text-2xl font-semibold">Plugins</h1>
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
                  ? "Enabled"
                  : plugin.enabled === false
                    ? "Disabled"
                    : "Enablement unknown"}
              </span>
              {plugin.enabled !== undefined && pluginIdSchema.safeParse(plugin.id).success && (
                <Button
                  variant="outline"
                  disabled={mutations.setEnabled.isPending}
                  onClick={() =>
                    mutations.setEnabled.mutate({ id: plugin.id, enabled: !plugin.enabled })
                  }
                >
                  {plugin.enabled ? "Disable" : "Enable"}
                </Button>
              )}
              <Button
                variant="destructive"
                disabled={
                  mutations.uninstall.isPending || !pluginIdSchema.safeParse(plugin.id).success
                }
                onClick={() => {
                  void useUiStore
                    .getState()
                    .requestConfirm({
                      title: `Uninstall plugin ${id}?`,
                      description: "This removes the plugin from the backend.",
                      confirmLabel: "Uninstall",
                      destructive: true,
                    })
                    .then((confirmed) => {
                      if (confirmed) mutations.uninstall.mutate(plugin.id);
                    });
                }}
              >
                Uninstall
              </Button>
              {mutations.setEnabled.isError && (
                <p role="alert">Plugin enablement could not be updated.</p>
              )}
              {mutations.uninstall.isError && (
                <p role="alert">
                  Plugin removal failed
                  {mutations.uninstall.error instanceof Error &&
                  "status" in mutations.uninstall.error &&
                  (mutations.uninstall.error as { status?: number }).status === 409
                    ? "; the server reports that a restart may be required."
                    : "."}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
      {plugins.data.invalidPluginCount > 0 && (
        <p role="alert">Some plugin metadata was malformed and has been hidden.</p>
      )}
    </section>
  );
}
