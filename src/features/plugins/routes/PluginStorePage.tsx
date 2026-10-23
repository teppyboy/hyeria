import { usePluginConfigMutations, usePluginStoreQuery } from "../queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pluginIdSchema } from "../schemas";

export function PluginStorePage() {
  const store = usePluginStoreQuery();
  const mutations = usePluginConfigMutations();
  if (store.isPending) return <p role="status">Loading plugin catalog…</p>;
  if (store.isError) return <p role="alert">Plugin catalog is unavailable.</p>;
  if (store.data.plugins.length === 0) {
    return (
      <section>
        <h1 className="text-2xl font-semibold">Plugin store</h1>
        <p>The plugin catalog is empty.</p>
      </section>
    );
  }

  return (
    <section className="grid gap-4">
      <h1 className="text-2xl font-semibold">Plugin store</h1>
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
              <span>{plugin.version ?? "Version unknown"}</span>
              <p>
                Installing a plugin can install executable code on the backend; confirm only trusted
                sources.
              </p>
              {plugin.update_available && (
                <span>Update available (no verified update operation)</span>
              )}
              <Button
                disabled={!safeId || mutations.install.isPending}
                onClick={() => {
                  if (!safeId) return;
                  if (
                    window.confirm(
                      `Install plugin ${id}? Plugins may install executable code on the backend.`,
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
                Install
              </Button>
            </CardContent>
          </Card>
        );
      })}
      {Array.isArray(store.data.errors) && store.data.errors.length > 0 && (
        <p role="alert">Some plugin sources reported errors.</p>
      )}
      {mutations.install.isError && <p role="alert">Plugin installation failed.</p>}
      {mutations.install.data?.restart_required && (
        <p role="status">Installation requires a backend restart.</p>
      )}
    </section>
  );
}
