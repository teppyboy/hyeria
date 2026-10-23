import type { PluginRecord } from "./schemas";

export interface PluginCapabilitySnapshot {
  supported: boolean | null;
  plugins: PluginRecord[];
  pluginIds: string[];
}

/** Unknown capability remains unknown; only safe identifier fields are used for navigation keys. */
export function pluginCapabilities(
  supportsPlugins: boolean | null,
  plugins: readonly PluginRecord[] | undefined,
): PluginCapabilitySnapshot {
  const valid = (plugins ?? []).filter(
    (plugin) => /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(plugin.id) && !plugin.id.includes(".."),
  );
  return {
    supported: supportsPlugins,
    plugins: valid,
    pluginIds: [...new Set(valid.map((plugin) => plugin.id))],
  };
}
