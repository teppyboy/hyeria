import { describe, expect, it, vi } from "vite-plus/test";
import { ManagementApiClient } from "../../../src/lib/api/client";
import { listProviderGroups, replaceProviderGroup } from "../../../src/features/providers/api";
import writeOk from "../../fixtures/v8/config-write-ok.json";

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

function jsonResponse(body: unknown) {
  return () => new Response(JSON.stringify(body));
}

function sentRequest(fetchImpl: ReturnType<typeof vi.fn>, call = 0) {
  const [input, init] = fetchImpl.mock.calls[call] as unknown as [URL, RequestInit];
  return {
    path: new URL(input).pathname,
    method: init.method,
    body: init.body,
  };
}

const configWithGroups = {
  "api-keys": {
    codex: [
      {
        name: "codex-1",
        enabled: true,
        "base-url": "https://example.invalid",
        headers: { "X-Team": "ops" },
        keys: [{ "api-key": SECRET, weight: 2 }, { "api-key": "   " }],
      },
    ],
    "backend-only-provider": [{ keys: [] }],
  },
};

describe("listProviderGroups", () => {
  it("reads provider groups from GET /config and returns safe metadata only", async () => {
    const { client, fetchImpl } = recordingClient(jsonResponse(configWithGroups));
    const groups = await listProviderGroups(client);

    expect(sentRequest(fetchImpl)).toMatchObject({ method: "GET", path: "/v8/management/config" });
    expect(groups).toEqual([
      {
        provider: "codex",
        known: true,
        entryCount: 1,
        entries: [{ name: "codex-1", enabled: true, keyCount: 2, blankKeyCount: 1 }],
      },
      {
        provider: "backend-only-provider",
        known: false,
        entryCount: 1,
        entries: [{ name: null, enabled: null, keyCount: 0, blankKeyCount: 0 }],
      },
    ]);
    expect(JSON.stringify(groups)).not.toContain(SECRET);
    expect(JSON.stringify(groups)).not.toContain("base-url");
  });

  it("returns no groups when the api-keys section is absent", async () => {
    const { client } = recordingClient(jsonResponse({ "config-version": 8 }));
    await expect(listProviderGroups(client)).resolves.toEqual([]);
  });

  it.each([
    ["api-keys is an array", { "api-keys": ["sk"] }],
    ["api-keys is null", { "api-keys": null }],
    ["a group is an object instead of a list", { "api-keys": { codex: { name: "x" } } }],
    ["an entry is a string", { "api-keys": { codex: ["sk-bare"] } }],
    ["a key is missing api-key", { "api-keys": { codex: [{ keys: [{ weight: 1 }] }] } }],
    ["a key is not a string", { "api-keys": { codex: [{ keys: [{ "api-key": 42 }] }] } }],
    ["a provider name is blank", { "api-keys": { " ": [] } }],
  ])("rejects malformed groups when %s", async (_label, body) => {
    const { client } = recordingClient(jsonResponse(body));
    const error = await listProviderGroups(client).catch((caught: unknown) => caught);
    expect(error).toMatchObject({ code: "invalid_response" });
    expect(JSON.stringify(error)).not.toContain("sk-bare");
  });
});

describe("replaceProviderGroup", () => {
  it("PUTs the whole group to the encoded provider path with the raw list body", async () => {
    const { client, fetchImpl } = recordingClient(jsonResponse(writeOk));
    const entries = [
      { name: "claude-1", "base-url": "https://example.invalid", keys: [{ "api-key": SECRET }] },
    ];

    await expect(replaceProviderGroup(client, "openai compat", entries)).resolves.toEqual({
      status: "ok",
      configVersion: 8,
    });
    // Zod reorders known keys first, so the body is compared as parsed JSON, not as raw text.
    const sent = sentRequest(fetchImpl);
    expect({ method: sent.method, path: sent.path }).toEqual({
      method: "PUT",
      path: "/v8/management/config/api-keys/openai%20compat",
    });
    expect(JSON.parse(sent.body as string)).toEqual(entries);
  });

  it("preserves unknown backend fields on each entry", async () => {
    const { client, fetchImpl } = recordingClient(jsonResponse(writeOk));
    await replaceProviderGroup(client, "codex", [
      { name: "codex-1", priority: 5, headers: { "X-A": "1" }, keys: [] },
    ]);
    expect(JSON.parse(sentRequest(fetchImpl).body as string)).toEqual([
      { name: "codex-1", priority: 5, headers: { "X-A": "1" }, keys: [] },
    ]);
  });

  it("accepts an empty list to clear a group", async () => {
    const { client, fetchImpl } = recordingClient(jsonResponse(writeOk));
    await replaceProviderGroup(client, "gemini", []);
    expect(sentRequest(fetchImpl).body).toBe("[]");
  });

  it.each([".", "..", "a/b", "", " codex "])(
    "rejects the provider group name %j without sending",
    async (provider) => {
      const { client, fetchImpl } = recordingClient(jsonResponse(writeOk));
      await expect(replaceProviderGroup(client, provider, [])).rejects.toThrow(TypeError);
      expect(fetchImpl).not.toHaveBeenCalled();
    },
  );

  it("rejects a malformed entry without sending", async () => {
    const { client, fetchImpl } = recordingClient(jsonResponse(writeOk));
    const malformed = [{ keys: [{ weight: 1 }] }] as unknown as Parameters<
      typeof replaceProviderGroup
    >[2];
    await expect(replaceProviderGroup(client, "codex", malformed)).rejects.toThrow(TypeError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
