import type { ManagementApiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import {
  configMutationResponseSchema,
  pluginAuthIndexSchema,
  pluginConfigSchema,
  pluginIdSchema,
  pluginInstallResponseSchema,
  pluginRecordSchema,
  pluginStoreRecordSchema,
  pluginsResponseSchema,
  pluginSourceIdSchema,
  pluginStoreResponseSchema,
  pluginVersionSchema,
  type PluginRecord,
  type PluginStoreRecord,
} from "./schemas";

export type PluginInstallResult = import("./schemas").PluginInstallResult;

function invalidResponse(message: string): ApiError {
  return new ApiError({ status: null, code: "invalid_response", message });
}

function requireId(id: string): string {
  if (!pluginIdSchema.safeParse(id).success) {
    throw new TypeError("A plugin ID must be a plain identifier without path separators.");
  }
  return id;
}

function requireValue(
  schema: { safeParse(value: unknown): { success: boolean } },
  value: string,
  name: string,
): string {
  if (!schema.safeParse(value).success) throw new TypeError(`${name} is invalid.`);
  return value;
}

function configResult(value: unknown): { status: "ok"; configVersion?: number } {
  const parsed = configMutationResponseSchema.safeParse(value);
  if (!parsed.success)
    throw invalidResponse("The server did not confirm the plugin config change.");
  const version = parsed.data["config-version"];
  return version === undefined ? { status: "ok" } : { status: "ok", configVersion: version };
}

export async function getPluginConfig(
  client: ManagementApiClient,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const parsed = pluginConfigSchema.safeParse(await client.get("/config/plugins", { signal }));
  if (!parsed.success) throw invalidResponse("The server did not return plugin configuration.");
  return parsed.data;
}

export async function listPlugins(
  client: ManagementApiClient,
  signal?: AbortSignal,
): Promise<{
  pluginsEnabled?: boolean;
  pluginsDir?: string;
  plugins: PluginRecord[];
  invalidPluginCount: number;
}> {
  const parsed = pluginsResponseSchema.safeParse(await client.get("/plugins", { signal }));
  if (!parsed.success) throw invalidResponse("The server returned invalid plugin metadata.");
  const rawPlugins = parsed.data.plugins;
  const parsedPlugins = Array.isArray(rawPlugins)
    ? rawPlugins.map((plugin) => pluginRecordSchema.safeParse(plugin))
    : [];
  return {
    ...(parsed.data.plugins_enabled === undefined
      ? {}
      : { pluginsEnabled: parsed.data.plugins_enabled }),
    ...(parsed.data.plugins_dir === undefined ? {} : { pluginsDir: parsed.data.plugins_dir }),
    plugins: parsedPlugins.flatMap((plugin) => (plugin.success ? [plugin.data] : [])),
    invalidPluginCount: Array.isArray(rawPlugins)
      ? rawPlugins.length - parsedPlugins.filter((item) => item.success).length
      : 0,
  };
}

export async function setPluginConfig(
  client: ManagementApiClient,
  id: string,
  config: Record<string, unknown>,
): Promise<{ status: "ok"; configVersion?: number }> {
  requireId(id);
  if (!pluginConfigSchema.safeParse(config).success)
    throw new TypeError("Plugin config must be an object.");
  return configResult(await client.put(`/config/plugins/configs/${id}`, config));
}

export async function patchPluginConfig(
  client: ManagementApiClient,
  id: string,
  config: Record<string, unknown>,
): Promise<{ status: "ok"; configVersion?: number }> {
  requireId(id);
  if (!pluginConfigSchema.safeParse(config).success)
    throw new TypeError("Plugin config must be an object.");
  return configResult(await client.patch(`/config/plugins/configs/${id}`, config));
}

export async function setPluginEnabled(
  client: ManagementApiClient,
  id: string,
  enabled: boolean,
): Promise<{ status: "ok"; configVersion?: number }> {
  requireId(id);
  return configResult(await client.put(`/config/plugins/configs/${id}/enabled`, enabled));
}

export async function patchPluginEnabled(
  client: ManagementApiClient,
  id: string,
  enabled: boolean,
): Promise<{ status: "ok"; configVersion?: number }> {
  requireId(id);
  return configResult(await client.patch(`/config/plugins/configs/${id}/enabled`, enabled));
}

export async function listPluginStore(
  client: ManagementApiClient,
  signal?: AbortSignal,
): Promise<{ plugins: PluginStoreRecord[]; errors: unknown }> {
  const parsed = pluginStoreResponseSchema.safeParse(
    await client.get("/plugins/store", { signal }),
  );
  if (!parsed.success) throw invalidResponse("The server returned invalid plugin catalog data.");
  const records = Array.isArray(parsed.data.plugins)
    ? parsed.data.plugins.flatMap((plugin) => {
        const item = pluginStoreRecordSchema.safeParse(plugin);
        return item.success && item.data.id ? [item.data] : [];
      })
    : [];
  return { plugins: records, errors: parsed.data.errors ?? [] };
}

export async function installPlugin(
  client: ManagementApiClient,
  id: string,
  options: { source?: string; version?: string } = {},
): Promise<PluginInstallResult> {
  requireId(id);
  if (options.source !== undefined)
    requireValue(pluginSourceIdSchema, options.source, "Plugin source");
  if (options.version !== undefined)
    requireValue(pluginVersionSchema, options.version, "Plugin version");
  const parsed = pluginInstallResponseSchema.safeParse(
    await client.post(`/plugins/store/${id}/install`, undefined, {
      query: { source: options.source, version: options.version },
    }),
  );
  if (!parsed.success) throw invalidResponse("The server did not confirm plugin installation.");
  return parsed.data;
}

export async function uninstallPlugin(client: ManagementApiClient, id: string): Promise<unknown> {
  requireId(id);
  return client.delete(`/plugins/${id}`);
}

export async function postPluginQuota(
  client: ManagementApiClient,
  id: string,
  authIndex: string,
): Promise<unknown> {
  requireId(id);
  requireValue(pluginAuthIndexSchema, authIndex, "Auth index");
  return client.post(`/plugins/${id}/quota`, { auth_index: authIndex });
}

export async function deletePluginQuota(
  client: ManagementApiClient,
  id: string,
  authIndex: string,
): Promise<unknown> {
  requireId(id);
  requireValue(pluginAuthIndexSchema, authIndex, "Auth index");
  return client.delete(`/plugins/${id}/quota`, { query: { auth_index: authIndex } });
}

export async function getPluginQuota(
  client: ManagementApiClient,
  id: string,
  authIndex: string,
  signal?: AbortSignal,
): Promise<unknown> {
  requireId(id);
  requireValue(pluginAuthIndexSchema, authIndex, "Auth index");
  return client.get(`/plugins/${id}/quota`, { query: { auth_index: authIndex }, signal });
}
