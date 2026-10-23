import type { ManagementApiTransport } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import {
  putConfigPath,
  readConfig,
  type ConfigDocument,
  type MutationResult,
} from "@/features/config/api";
import {
  KNOWN_PROVIDER_GROUPS,
  providerGroupNameSchema,
  providerGroupSchema,
  providerGroupValueSchema,
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
    blankKeyCount: keys.filter((key) => (key["api-key"] ?? "").trim() === "").length,
  };
}

/** The `api-keys` mapping; an absent or null section means no groups. */
function readGroupsSection(document: ConfigDocument): Record<string, unknown> {
  const groups = document["api-keys"];
  if (groups === undefined || groups === null) return {};
  if (typeof groups !== "object" || Array.isArray(groups)) {
    throw invalidResponse("The server returned provider groups in an unexpected shape.");
  }
  return groups as Record<string, unknown>;
}

/** Reads `api-keys/<provider>` groups from GET /config for the management list. */
export async function listProviderGroups(
  client: ManagementApiTransport,
): Promise<ProviderGroupView[]> {
  const groups = readGroupsSection(await readConfig(client));
  return Object.entries(groups).map(([provider, value]) => {
    if (!providerGroupNameSchema.safeParse(provider).success) {
      throw invalidResponse("The server returned a provider group with an invalid name.");
    }
    const parsed = providerGroupValueSchema.safeParse(value);
    if (!parsed.success) {
      throw invalidResponse(`The server returned an invalid provider group: ${provider}.`);
    }
    const entries = parsed.data ?? [];
    return {
      provider,
      known: (KNOWN_PROVIDER_GROUPS as readonly string[]).includes(provider),
      entryCount: entries.length,
      entries: entries.map(toEntryView),
    };
  });
}

/**
 * Reads one group as raw entries, keeping every backend field and null value, so the caller can
 * write the list back with `replaceProviderGroup` without dropping data. An absent group reads as [].
 */
export async function readProviderGroupEntries(
  client: ManagementApiTransport,
  provider: string,
): Promise<ProviderEntry[]> {
  if (!providerGroupNameSchema.safeParse(provider).success) {
    throw new TypeError("A provider group name must be a single non-blank path segment.");
  }
  const value = readGroupsSection(await readConfig(client))[provider];
  const parsed = providerGroupValueSchema.safeParse(value);
  if (!parsed.success) {
    throw invalidResponse(`The server returned an invalid provider group: ${provider}.`);
  }
  return parsed.data ?? [];
}

/**
 * Replaces one provider group with the caller's entries. Entries are validated loosely and sent
 * with their unknown backend fields intact; PUT replaces the whole list, as the API requires.
 */
export async function replaceProviderGroup(
  client: ManagementApiTransport,
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
