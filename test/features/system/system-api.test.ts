import { describe, expect, it, vi } from "vite-plus/test";
import { ManagementApiClient } from "../../../src/lib/api/client";
import { fetchLatestVersion } from "../../../src/features/system/api";
import { fetchModelCount } from "../../../src/features/models/api";
import latest from "../../fixtures/v8/server-latest-version.json";
import models from "../../fixtures/v8/model-definitions.illustrative.json";

function clientFor(fetchImpl: typeof fetch) {
  return new ManagementApiClient({
    apiBase: "http://cpa.example.invalid",
    managementKey: "mk",
    revision: 1,
    getCurrentRevision: () => 1,
    fetchImpl,
  });
}

describe("system and model probes", () => {
  it("reads the latest version and models count from the documented shapes", async () => {
    const fetchImpl = vi.fn(
      async (url: URL) =>
        new Response(JSON.stringify(url.pathname.endsWith("latest-version") ? latest : models)),
    );
    const client = clientFor(fetchImpl as unknown as typeof fetch);
    await expect(fetchLatestVersion(client)).resolves.toBe("v1.2.3");
    await expect(fetchModelCount(client, "codex")).resolves.toBe(2);
  });

  it("treats a model body without a models array as an invalid response", async () => {
    const client = clientFor((async () => new Response("{}")) as unknown as typeof fetch);
    await expect(fetchModelCount(client, "codex")).rejects.toMatchObject({
      code: "invalid_response",
    });
  });

  it("surfaces an unknown-channel 400 as a rejected request, not a crash", async () => {
    const client = clientFor(
      (async () =>
        new Response(JSON.stringify({ error: "unknown channel", channel: "x" }), {
          status: 400,
        })) as unknown as typeof fetch,
    );
    await expect(fetchModelCount(client, "x")).rejects.toMatchObject({ status: 400 });
  });

  it("never requests the destructive usage queue", async () => {
    const fetchImpl = vi.fn(async (_input: URL) => new Response("{}"));
    const client = clientFor(fetchImpl as unknown as typeof fetch);
    await fetchLatestVersion(client).catch(() => undefined);
    await fetchModelCount(client, "codex").catch(() => undefined);
    const paths = fetchImpl.mock.calls.map((call) => new URL(call[0]).pathname);
    expect(paths.some((path) => path.includes("usage/queue"))).toBe(false);
  });
});
