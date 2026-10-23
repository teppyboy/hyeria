import { describe, expect, it, vi } from "vite-plus/test";
import { ManagementApiClient } from "../../../src/lib/api/client";
import { fetchApiKeyBuckets } from "../../../src/features/analytics/api";
import { toAnalyticsViewModel } from "../../../src/features/analytics/view-models";

function client(response: unknown) {
  const fetchImpl = vi.fn(async () => new Response(JSON.stringify(response)));
  return {
    api: new ManagementApiClient({
      apiBase: "http://cpa.example.invalid",
      managementKey: "mk",
      revision: 1,
      getCurrentRevision: () => 1,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    }),
    fetchImpl,
  };
}

describe("live analytics", () => {
  it("reads only non-destructive usage API-key buckets and labels them live", async () => {
    const { api, fetchImpl } = client({ buckets: [{ day: "today", count: 2 }] });
    const snapshot = await fetchApiKeyBuckets(api);
    const [url] = fetchImpl.mock.calls[0] as unknown as [URL];
    expect(new URL(url).pathname).toBe("/v8/management/observability/usage/api-keys");
    expect(snapshot.scope).toBe("live");
    expect(snapshot.observedAt).toBeGreaterThan(0);
    expect(JSON.stringify(snapshot.data)).toContain("today");
  });

  it("shows empty live data without implying historical zero usage", () => {
    const view = toAnalyticsViewModel({
      source: "api-key-buckets",
      scope: "live",
      observedAt: 1,
      data: [],
      note: "Live bucket",
    });
    expect(view.empty).toBe(true);
    expect(view.scope).toBe("live");
    expect(view.coverageNote).toContain("Live");
  });
});
