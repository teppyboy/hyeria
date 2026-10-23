import type { ManagementApiClient } from "@/lib/api/client";
import type { AnalyticsSnapshot } from "./schemas";

/** Reads in-memory usage buckets only; the contract labels their detailed payload as UNKNOWN. */
export async function fetchApiKeyBuckets(
  client: ManagementApiClient,
  signal?: AbortSignal,
): Promise<AnalyticsSnapshot> {
  const data = await client.get<unknown>("/observability/usage/api-keys", { signal });
  return {
    source: "api-key-buckets",
    scope: "live",
    observedAt: Date.now(),
    data,
    note: "Live in-memory buckets; not historical data.",
  };
}
