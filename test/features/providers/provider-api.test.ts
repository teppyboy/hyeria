import { describe, expect, it, vi } from "vite-plus/test";
import { ManagementApiClient } from "../../../src/lib/api/client";
import {
  listProviderGroups,
  readProviderGroupEntries,
  replaceProviderGroup,
} from "../../../src/features/providers/api";
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

  it("treats null group, name, enabled, keys and api-key values as absent or blank", async () => {
    const { client } = recordingClient(
      jsonResponse({
        "api-keys": {
          codex: null,
          claude: [{ name: null, enabled: null, keys: null }],
          gemini: [{ keys: [{ "api-key": null }, { "api-key": "sk" }] }],
        },
      }),
    );
    await expect(listProviderGroups(client)).resolves.toEqual([
      { provider: "codex", known: true, entryCount: 0, entries: [] },
      {
        provider: "claude",
        known: true,
        entryCount: 1,
        entries: [{ name: null, enabled: null, keyCount: 0, blankKeyCount: 0 }],
      },
      {
        provider: "gemini",
        known: true,
        entryCount: 1,
        entries: [{ name: null, enabled: null, keyCount: 2, blankKeyCount: 1 }],
      },
    ]);
  });

  it.each([
    ["absent", { "config-version": 8 }],
    ["null", { "api-keys": null }],
  ])("returns no groups when the api-keys section is %s", async (_label, body) => {
    const { client } = recordingClient(jsonResponse(body));
    await expect(listProviderGroups(client)).resolves.toEqual([]);
  });

  it.each([
    ["api-keys is an array", { "api-keys": ["sk"] }],
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

describe("readProviderGroupEntries", () => {
  it("returns the raw group entries with unknown fields and nulls intact", async () => {
    const { client, fetchImpl } = recordingClient(
      jsonResponse({
        "api-keys": {
          codex: [
            {
              name: null,
              priority: 5,
              "base-url": "https://example.invalid",
              headers: { "X-A": "1" },
              keys: [{ "api-key": SECRET, weight: 2 }, { "api-key": null }],
            },
          ],
        },
      }),
    );

    const entries = await readProviderGroupEntries(client, "codex");

    expect(sentRequest(fetchImpl)).toMatchObject({ method: "GET", path: "/v8/management/config" });
    expect(entries).toEqual([
      {
        name: null,
        priority: 5,
        "base-url": "https://example.invalid",
        headers: { "X-A": "1" },
        keys: [{ "api-key": SECRET, weight: 2 }, { "api-key": null }],
      },
    ]);
  });

  it("round-trips through replaceProviderGroup without dropping or altering fields", async () => {
    const config = {
      "api-keys": {
        codex: [{ name: null, enabled: null, "base-url": "https://example.invalid", keys: null }],
      },
    };
    const reader = recordingClient(jsonResponse(config));
    const entries = await readProviderGroupEntries(reader.client, "codex");

    const writer = recordingClient(jsonResponse(writeOk));
    await replaceProviderGroup(writer.client, "codex", entries);

    expect(JSON.parse(sentRequest(writer.fetchImpl).body as string)).toEqual(
      config["api-keys"].codex,
    );
  });

  it("reads an absent group as an empty list", async () => {
    const { client } = recordingClient(jsonResponse({ "api-keys": {} }));
    await expect(readProviderGroupEntries(client, "codex")).resolves.toEqual([]);
  });

  it("rejects an invalid group name before reading", async () => {
    const { client, fetchImpl } = recordingClient(jsonResponse({}));
    await expect(readProviderGroupEntries(client, "a/b")).rejects.toThrow(TypeError);
    expect(fetchImpl).not.toHaveBeenCalled();
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
