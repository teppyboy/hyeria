import type { ManagementApiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { credentialsListSchema, pluginsListSchema } from "./schemas";

export interface CredentialsSummary {
  total: number;
  disabled: number;
  unavailable: number;
  runtimeOnly: number;
  /** Provider names only; no credential identifiers, names or auth indexes are kept. */
  providers: string[];
}

function invalidResponse(message: string): ApiError {
  return new ApiError({ status: null, code: "invalid_response", message });
}

/** Plugin support probe. The /plugins body is read for `plugins_enabled` only; items are not shown. */
export async function fetchPluginsProbe(
  client: ManagementApiClient,
  signal?: AbortSignal,
): Promise<{ pluginsEnabled: boolean | null }> {
  const parsed = pluginsListSchema.safeParse(await client.get("/plugins", { signal }));
  if (!parsed.success) throw invalidResponse("The server did not return a plugin list.");
  return { pluginsEnabled: parsed.data.plugins_enabled ?? null };
}

export async function fetchCredentialsSummary(
  client: ManagementApiClient,
  signal?: AbortSignal,
): Promise<CredentialsSummary> {
  const parsed = credentialsListSchema.safeParse(await client.get("/credentials", { signal }));
  if (!parsed.success) throw invalidResponse("The server did not return a credential list.");
  const files = parsed.data.files;
  return {
    total: files.length,
    disabled: files.filter((file) => file.disabled === true).length,
    unavailable: files.filter((file) => file.unavailable === true).length,
    runtimeOnly: files.filter((file) => file.runtime_only === true).length,
    providers: files.flatMap((file) => (file.provider ? [file.provider] : [])),
  };
}
