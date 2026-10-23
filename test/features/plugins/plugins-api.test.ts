import { describe, expect, it, vi } from "vite-plus/test";
import { ManagementApiClient } from "../../../src/lib/api/client";
import {
  getPluginConfig,
  deletePluginQuota,
  getPluginQuota,
  installPlugin,
  listPluginStore,
  listPlugins,
  patchPluginConfig,
  patchPluginEnabled,
  postPluginQuota,
  setPluginConfig,
  setPluginEnabled,
  uninstallPlugin,
} from "../../../src/features/plugins/api";
import installFixture from "../../fixtures/v8/plugin-install.json";
import pluginFixture from "../../fixtures/v8/plugins-list.illustrative.json";
import storeFixture from "../../fixtures/v8/plugins-store.illustrative.json";

function recordingClient(body: unknown = { status: "ok", "config-version": 8 }) {
  const fetchImpl = vi.fn(async () => new Response(JSON.stringify(body)));
  const client = new ManagementApiClient({
    apiBase: "http://cpa.example.invalid",
    managementKey: "mk",
    revision: 1,
    getCurrentRevision: () => 1,
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });
  return { client, fetchImpl };
}

function request(fetchImpl: ReturnType<typeof vi.fn>, call = 0) {
  const [input, init] = fetchImpl.mock.calls[call] as unknown as [URL, RequestInit];
  return { url: new URL(input), init };
}

describe("plugin configuration endpoints", () => {
  it("reads global plugin config", async () => {
    const { client, fetchImpl } = recordingClient({ enabled: true, configs: {} });
    await expect(getPluginConfig(client)).resolves.toEqual({ enabled: true, configs: {} });
    expect(request(fetchImpl).url.pathname).toBe("/v8/management/config/plugins");
  });

  it("writes plugin config by safe ID using a raw object value", async () => {
    const { client, fetchImpl } = recordingClient({ status: "ok", "config-version": 8 });
    await setPluginConfig(client, "my-plugin", { theme: "dark" });
    expect(request(fetchImpl, 0).url.pathname).toBe(
      "/v8/management/config/plugins/configs/my-plugin",
    );
    expect(request(fetchImpl, 0).init.method).toBe("PUT");
    expect(request(fetchImpl, 0).init.body).toBe(JSON.stringify({ theme: "dark" }));
  });

  it("supports documented PATCH config and boolean enablement bodies", async () => {
    const { client, fetchImpl } = recordingClient();
    await patchPluginConfig(client, "my-plugin", { theme: "light" });
    await patchPluginEnabled(client, "my-plugin", false);
    expect(request(fetchImpl, 0).init.method).toBe("PATCH");
    expect(request(fetchImpl, 0).init.body).toBe(JSON.stringify({ theme: "light" }));
    expect(request(fetchImpl, 1).url.pathname.endsWith("/enabled")).toBe(true);
    expect(request(fetchImpl, 1).init.body).toBe("false");
  });

  it("rejects path-like IDs before sending", async () => {
    const { client, fetchImpl } = recordingClient();
    await expect(setPluginConfig(client, "../outside", {})).rejects.toThrow(TypeError);
    await expect(setPluginEnabled(client, "x/y", true)).rejects.toThrow(TypeError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("plugin discovery and store", () => {
  it("reads and normalizes installed plugin metadata", async () => {
    const { client } = recordingClient(pluginFixture);
    await expect(listPlugins(client)).resolves.toMatchObject({
      pluginsEnabled: true,
      plugins: [{ id: "example-plugin" }],
    });
  });

  it("reads store catalog without assuming the unknown errors payload is an array", async () => {
    const { client } = recordingClient(storeFixture);
    const result = await listPluginStore(client);
    expect(result.plugins[0]).toMatchObject({ id: "example-plugin" });
    expect(result.errors).toEqual([]);
  });

  it("installs with documented source/version query and validates the success response", async () => {
    const { client, fetchImpl } = recordingClient(installFixture);
    await installPlugin(client, "example-plugin", { source: "official", version: "1.2.3" });
    expect(request(fetchImpl).url.pathname).toBe(
      "/v8/management/plugins/store/example-plugin/install",
    );
    expect(request(fetchImpl).url.searchParams.get("source")).toBe("official");
    expect(request(fetchImpl).url.searchParams.get("version")).toBe("1.2.3");
    expect(request(fetchImpl).init.body).toBeUndefined();
  });

  it("uninstalls without assuming an undocumented success body", async () => {
    const { client, fetchImpl } = recordingClient({ any: "shape" });
    await expect(uninstallPlugin(client, "example-plugin")).resolves.toEqual({ any: "shape" });
    expect(request(fetchImpl).url.pathname).toBe("/v8/management/plugins/example-plugin");
    expect(request(fetchImpl).init.method).toBe("DELETE");
  });
});

describe("plugin quota endpoint variants", () => {
  it("supports documented GET, POST, and DELETE quota operations", async () => {
    const { client, fetchImpl } = recordingClient({ quota: "unknown provider payload" });
    await getPluginQuota(client, "quota-plugin", "opaque-index");
    await postPluginQuota(client, "quota-plugin", "opaque-index");
    await deletePluginQuota(client, "quota-plugin", "opaque-index");
    expect(request(fetchImpl, 0).init.method).toBe("GET");
    expect(request(fetchImpl, 0).url.searchParams.get("auth_index")).toBe("opaque-index");
    expect(request(fetchImpl, 1).init.method).toBe("POST");
    expect(request(fetchImpl, 1).init.body).toBe(JSON.stringify({ auth_index: "opaque-index" }));
    expect(request(fetchImpl, 2).init.method).toBe("DELETE");
    expect(request(fetchImpl, 2).url.searchParams.get("auth_index")).toBe("opaque-index");
  });
});
