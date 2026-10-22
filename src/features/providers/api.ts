import type { ManagementApiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { putConfigPath, readConfig, type MutationResult } from "@/features/config/api";
import {
  KNOWN_PROVIDER_GROUPS,
  providerGroupNameSchema,
  providerGroupSchema,
  type ProviderEntry,
} from "./schemas";

export interface ProviderEntryView {
  name: string | null;
  enabled: boolean | null;
  keyCount: number;
  /** Keys that are present but blank; the key values themselves are never exposed. */
  blankKeyCount: number;
}

export interface ProviderGroupView {
  provider: string;
  known: boolean;
  entryCount: number;
  entries: ProviderEntryView[];
}

function invalidResponse(message: string): ApiError {
  return new ApiError({ status: null, code: "invalid_response", message });
}

/** Keeps safe metadata only; key values and backend-specific fields never leave this function. */
function toEntryView(entry: ProviderEntry): ProviderEntryView {
  const keys = entry.keys ?? [];
  return {
    name: entry.name ?? null,
    enabled: entry.enabled ?? null,
    keyCount: keys.length,
    blankKeyCount: keys.filter((key) => key["api-key"].trim() === "").length,
  };
}

/** Reads `api-keys/<provider>` groups from GET /config; an absent `api-keys` section means no groups. */
export async function listProviderGroups(
  client: ManagementApiClient,
): Promise<ProviderGroupView[]> {
  const document = await readConfig(client);
  const groups = document["api-keys"];
  if (groups === undefined) return [];
  if (typeof groups !== "object" || groups === null || Array.isArray(groups)) {
    throw invalidResponse("The server returned provider groups in an unexpected shape.");
  }

  return Object.entries(groups).map(([provider, value]) => {
    if (!providerGroupNameSchema.safeParse(provider).success) {
      throw invalidResponse("The server returned a provider group with an invalid name.");
    }
    const parsed = providerGroupSchema.safeParse(value);
    if (!parsed.success) {
      throw invalidResponse(`The server returned an invalid provider group: ${provider}.`);
    }
    return {
      provider,
      known: (KNOWN_PROVIDER_GROUPS as readonly string[]).includes(provider),
      entryCount: parsed.data.length,
      entries: parsed.data.map(toEntryView),
    };
  });
}

/**
 * Replaces one provider group with the caller's entries. Entries are validated loosely and sent
 * with their unknown backend fields intact; PUT replaces the whole list, as the API requires.
 */
export async function replaceProviderGroup(
  client: ManagementApiClient,
  provider: string,
  entries: readonly ProviderEntry[],
): Promise<MutationResult> {
  if (!providerGroupNameSchema.safeParse(provider).success) {
    throw new TypeError("A provider group name must be a single non-blank path segment.");
  }
  const parsed = providerGroupSchema.safeParse(entries);
  if (!parsed.success) {
    throw new TypeError(`The provider group ${provider} has an invalid entry.`);
  }
  return putConfigPath(client, ["api-keys", provider], parsed.data);
}
