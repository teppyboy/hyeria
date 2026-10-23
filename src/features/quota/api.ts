import type { ManagementApiTransport } from "@/lib/api/client";
import { ApiError, redactDeep } from "@/lib/api/errors";
import { authIndexSchema, cooldownResetSchema, pluginIdSchema, pluginQuotaSchema } from "./schemas";

export interface CooldownResetResult {
  authIndex: string;
  models: string[];
}

/** Provider-specific quota detail, redacted and otherwise unread; the provider body is UNKNOWN. */
export interface PluginQuotaView {
  pluginId: string;
  authIndex: string;
  detail: Record<string, unknown>;
}

function invalidResponse(message: string): ApiError {
  return new ApiError({ status: null, code: "invalid_response", message });
}

function requirePluginId(id: string): string {
  if (!pluginIdSchema.safeParse(id).success) {
    throw new TypeError("A plugin ID must be a plain identifier without path separators.");
  }
  return id;
}

function requireAuthIndex(index: string): string {
  if (!authIndexSchema.safeParse(index).success) {
    throw new TypeError("An auth index must be a non-empty opaque string.");
  }
  return index;
}

/** Clears the routing cooldown for one credential; the caller must confirm before calling. */
export async function resetCooldown(
  client: ManagementApiTransport,
  authIndex: string,
): Promise<CooldownResetResult> {
  requireAuthIndex(authIndex);
  const parsed = cooldownResetSchema.safeParse(
    await client.post("/routing/cooldown/reset", { auth_index: authIndex }),
  );
  if (!parsed.success) throw invalidResponse("The server did not confirm the cooldown reset.");
  return { authIndex: parsed.data.auth_index, models: parsed.data.models };
}

/**
 * Reads quota from a plugin's quota provider. Only GET is wired: POST and DELETE on the same path
 * are UNKNOWN in the contract, so they stay out until confirmed on a real instance.
 */
export async function fetchPluginQuota(
  client: ManagementApiTransport,
  pluginId: string,
  authIndex: string,
  signal?: AbortSignal,
): Promise<PluginQuotaView> {
  requirePluginId(pluginId);
  requireAuthIndex(authIndex);
  const parsed = pluginQuotaSchema.safeParse(
    await client.get(`/plugins/${pluginId}/quota`, { query: { auth_index: authIndex }, signal }),
  );
  if (!parsed.success) throw invalidResponse("The server did not return a quota object.");
  return {
    pluginId,
    authIndex,
    detail: redactDeep(parsed.data) as Record<string, unknown>,
  };
}
