import { describe, expect, it, vi } from "vite-plus/test";
import { ManagementApiClient } from "../../../src/lib/api/client";
import { fetchPluginQuota, resetCooldown } from "../../../src/features/quota/api";
import cooldownFixture from "../../fixtures/v8/cooldown-reset.json";
import quotaFixture from "../../fixtures/v8/plugin-quota.illustrative.json";

const SECRET = "sk-live-do-not-leak-123";

function recordingClient(response: () => Response) {
  const fetchImpl = vi.fn(async (_input: URL, _init?: RequestInit) => response());
  const client = new ManagementApiClient({
    apiBase: "http://cpa.example.invalid",
    managementKey: "mk",
    revision: 1,
    getCurrentRevision: () => 1,
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });
  return { client, fetchImpl };
}

function sentRequest(fetchImpl: ReturnType<typeof vi.fn>, call = 0) {
  const [input, init] = fetchImpl.mock.calls[call] as unknown as [URL, RequestInit];
  return {
    path: new URL(input).pathname,
    search: new URL(input).search,
    method: init.method,
    body: init.body,
  };
}

const json =
  (body: unknown, status = 200) =>
  () =>
    new Response(JSON.stringify(body), { status });

describe("cooldown reset", () => {
  it("posts the auth index and returns the reset models", async () => {
    const { client, fetchImpl } = recordingClient(json(cooldownFixture));
    await expect(resetCooldown(client, "a1b2c3d4e5f67890")).resolves.toEqual({
      authIndex: "a1b2c3d4e5f67890",
      models: ["example-model-1"],
    });
    expect(sentRequest(fetchImpl)).toMatchObject({
      method: "POST",
      path: "/v8/management/routing/cooldown/reset",
      body: JSON.stringify({ auth_index: "a1b2c3d4e5f67890" }),
    });
  });

  it("maps a 404 auth not found to a not_found error with its API code", async () => {
    const { client } = recordingClient(json({ error: "auth not found" }, 404));
    await expect(resetCooldown(client, "missing")).rejects.toMatchObject({
      status: 404,
      code: "not_found",
      apiCode: "auth not found",
    });
  });

  it("rejects a malformed reset response", async () => {
    const { client } = recordingClient(json({ status: "ok" }));
    await expect(resetCooldown(client, "a1")).rejects.toMatchObject({
      code: "invalid_response",
    });
  });

  it("rejects an empty auth index before any request", async () => {
    const { client, fetchImpl } = recordingClient(json(cooldownFixture));
    await expect(resetCooldown(client, "")).rejects.toThrow(TypeError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("plugin quota (GET only)", () => {
  it("reads the quota with the auth_index query and keeps provider detail", async () => {
    const { client, fetchImpl } = recordingClient(json(quotaFixture));
    await expect(fetchPluginQuota(client, "quota-plugin", "a1b2")).resolves.toEqual({
      pluginId: "quota-plugin",
      authIndex: "a1b2",
      detail: { "example-quota-field": "example-value" },
    });
    expect(sentRequest(fetchImpl)).toMatchObject({
      method: "GET",
      path: "/v8/management/plugins/quota-plugin/quota",
      search: "?auth_index=a1b2",
    });
  });

  it("redacts credential-shaped provider detail", async () => {
    const body = { access_token: SECRET, note: `Bearer ${SECRET}` };
    const { client } = recordingClient(json(body));
    const view = await fetchPluginQuota(client, "quota-plugin", "a1b2");
    expect(JSON.stringify(view)).not.toContain(SECRET);
    expect(view.detail.access_token).toBe("[redacted]");
  });

  it("surfaces a provider 404 as not_found, which does not prove plugin absence", async () => {
    const { client } = recordingClient(json({ error: "provider_not_found" }, 404));
    await expect(fetchPluginQuota(client, "quota-plugin", "a1")).rejects.toMatchObject({
      status: 404,
      code: "not_found",
    });
  });

  it("surfaces a provider 502 as an upstream failure", async () => {
    const { client } = recordingClient(json({ error: "upstream" }, 502));
    await expect(fetchPluginQuota(client, "quota-plugin", "a1")).rejects.toMatchObject({
      status: 502,
      code: "upstream",
    });
  });

  it("rejects a non-object quota body", async () => {
    const { client } = recordingClient(json(["not", "an", "object"]));
    await expect(fetchPluginQuota(client, "quota-plugin", "a1")).rejects.toMatchObject({
      code: "invalid_response",
    });
  });

  it("rejects path-like plugin IDs before any request", async () => {
    const { client, fetchImpl } = recordingClient(json(quotaFixture));
    await expect(fetchPluginQuota(client, "../x", "a1")).rejects.toThrow(TypeError);
    await expect(fetchPluginQuota(client, "a/b", "a1")).rejects.toThrow(TypeError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
