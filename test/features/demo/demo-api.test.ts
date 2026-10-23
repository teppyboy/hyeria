import { describe, expect, it, vi } from "vite-plus/test";
import { ApiError } from "../../../src/lib/api/errors";
import { createDemoApi } from "../../../src/features/demo/api";
import { fetchApiKeyBuckets } from "../../../src/features/analytics/api";
import { listAuthFiles, setAuthFileDisabled } from "../../../src/features/auth-files/api";
import { readConfig, writeConfig } from "../../../src/features/config/api";
import { fetchPluginsProbe, fetchCredentialsSummary } from "../../../src/features/dashboard/api";
import { listPlugins, setPluginEnabled } from "../../../src/features/plugins/api";
import { fetchPluginQuota, resetCooldown } from "../../../src/features/quota/api";
import { fetchLatestVersion } from "../../../src/features/system/api";

describe("demo API transport", () => {
  it("serves schema-valid dashboard, system, credential, plugin, quota, and analytics data", async () => {
    const api = createDemoApi();
    await expect(fetchPluginsProbe(api)).resolves.toEqual({ pluginsEnabled: true });
    await expect(fetchCredentialsSummary(api)).resolves.toMatchObject({ total: 2 });
    await expect(fetchLatestVersion(api)).resolves.toMatch(/^v\d/);
    await expect(listAuthFiles(api)).resolves.toHaveLength(2);
    await expect(listPlugins(api)).resolves.toMatchObject({ plugins: [{ id: "demo-plugin" }] });
    await expect(fetchPluginQuota(api, "demo-plugin", "demo-auth-index")).resolves.toEqual({
      pluginId: "demo-plugin",
      authIndex: "demo-auth-index",
      detail: { remaining: 42, limit: 100 },
    });
    await expect(resetCooldown(api, "demo-auth-index")).resolves.toMatchObject({
      authIndex: "demo-auth-index",
    });
    await expect(fetchApiKeyBuckets(api)).resolves.toMatchObject({ source: "api-key-buckets" });
  });

  it("simulates safe config, credential, and plugin mutations", async () => {
    const api = createDemoApi();
    await writeConfig(api, { ...((await readConfig(api)) as object), "demo-value": true });
    await expect(readConfig(api)).resolves.toHaveProperty("demo-value", true);
    await setAuthFileDisabled(api, "demo-user.json", true);
    await expect(listAuthFiles(api)).resolves.toContainEqual(
      expect.objectContaining({ disabled: true }),
    );
    await setPluginEnabled(api, "demo-plugin", false);
    await expect(listPlugins(api)).resolves.toMatchObject({ plugins: [{ enabled: false }] });
  });

  it("resets state for each factory and rejects unsupported routes with ApiError", async () => {
    const first = createDemoApi();
    await setPluginEnabled(first, "demo-plugin", false);
    await expect(listPlugins(createDemoApi())).resolves.toMatchObject({
      plugins: [{ enabled: true }],
    });
    await expect(first.get("/not-a-demo-route")).rejects.toBeInstanceOf(ApiError);
  });

  it("does not use fetch or browser storage", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    await createDemoApi().get("/config");
    expect(fetch).not.toHaveBeenCalled();
    expect(getItem).not.toHaveBeenCalled();
    fetch.mockRestore();
    getItem.mockRestore();
  });
});
