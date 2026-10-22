import { describe, expect, it, vi } from "vite-plus/test";
import { ManagementApiClient } from "../../../src/lib/api/client";
import {
  deleteConfigPath,
  patchConfigPath,
  putConfigPath,
  readConfig,
  readConfigYaml,
  writeConfig,
  writeConfigYaml,
} from "../../../src/features/config/api";
import configFixture from "../../fixtures/v8/config.json";
import writeOk from "../../fixtures/v8/config-write-ok.json";

const configYaml = "port: 8317\nrequest-retry: 3\n";

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
    contentType: new Headers(init.headers).get("Content-Type"),
    body: init.body,
  };
}

describe("config API wrappers", () => {
  it("reads the raw config document from GET /config", async () => {
    const { client, fetchImpl } = recordingClient(jsonResponse(configFixture));
    await expect(readConfig(client)).resolves.toEqual(configFixture);
    expect(sentRequest(fetchImpl)).toMatchObject({ method: "GET", path: "/v8/management/config" });
  });

  it("reads the YAML document as text from GET /config.yaml", async () => {
    const { client, fetchImpl } = recordingClient(
      () => new Response(configYaml, { headers: { "Content-Type": "application/yaml" } }),
    );
    await expect(readConfigYaml(client)).resolves.toBe(configYaml);
    expect(sentRequest(fetchImpl)).toMatchObject({
      method: "GET",
      path: "/v8/management/config.yaml",
    });
  });

  it("PUTs the raw object to /config without an envelope and returns a safe result", async () => {
    const { client, fetchImpl } = recordingClient(jsonResponse({ ...writeOk, extra: "dropped" }));
    const document = { "request-retry": 3, "api-keys": ["k"] };
    await expect(writeConfig(client, document)).resolves.toEqual({
      status: "ok",
      configVersion: 8,
    });
    const sent = sentRequest(fetchImpl);
    expect(sent).toMatchObject({
      method: "PUT",
      path: "/v8/management/config",
      contentType: "application/json",
    });
    expect(JSON.parse(sent.body as string)).toEqual(document);
  });

  it.each([[null], [[]], ["text"], [3]])(
    "rejects a non-object config document %j before sending",
    async (value) => {
      const { client, fetchImpl } = recordingClient(jsonResponse(writeOk));
      await expect(writeConfig(client, value as never)).rejects.toThrow(TypeError);
      expect(fetchImpl).not.toHaveBeenCalled();
    },
  );

  it("PUTs YAML text to /config.yaml as application/yaml without JSON encoding", async () => {
    const { client, fetchImpl } = recordingClient(jsonResponse(writeOk));
    await expect(writeConfigYaml(client, "port: 8317\n")).resolves.toEqual({
      status: "ok",
      configVersion: 8,
    });
    expect(sentRequest(fetchImpl)).toMatchObject({
      method: "PUT",
      path: "/v8/management/config.yaml",
      contentType: "application/yaml",
      body: "port: 8317\n",
    });
  });

  it.each([[""], [" \n\t"]])("rejects empty YAML %j before sending", async (yaml) => {
    const { client, fetchImpl } = recordingClient(jsonResponse(writeOk));
    await expect(writeConfigYaml(client, yaml)).rejects.toThrow(TypeError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("PUTs a raw JSON value to an encoded node path", async () => {
    const { client, fetchImpl } = recordingClient(jsonResponse(writeOk));
    await putConfigPath(client, ["providers", "a b"], { enabled: true });
    const sent = sentRequest(fetchImpl);
    expect(sent).toMatchObject({
      method: "PUT",
      path: "/v8/management/config/providers/a%20b",
      contentType: "application/json",
    });
    expect(JSON.parse(sent.body as string)).toEqual({ enabled: true });
  });

  it("sends a raw scalar value for putConfigPath, not a { value } envelope", async () => {
    const { client, fetchImpl } = recordingClient(jsonResponse(writeOk));
    await putConfigPath(client, ["debug"], false);
    expect(JSON.parse(sentRequest(fetchImpl).body as string)).toBe(false);
  });

  it("PATCHes a raw JSON value to a node path", async () => {
    const { client, fetchImpl } = recordingClient(jsonResponse(writeOk));
    await expect(
      patchConfigPath(client, ["management"], { "allow-remote": true }),
    ).resolves.toEqual({
      status: "ok",
      configVersion: 8,
    });
    const sent = sentRequest(fetchImpl);
    expect(sent).toMatchObject({ method: "PATCH", path: "/v8/management/config/management" });
    expect(JSON.parse(sent.body as string)).toEqual({ "allow-remote": true });
  });

  it("PATCHes a null value because null is stored, not a delete", async () => {
    const { client, fetchImpl } = recordingClient(jsonResponse(writeOk));
    await patchConfigPath(client, ["debug"], null);
    expect(JSON.parse(sentRequest(fetchImpl).body as string)).toBeNull();
  });

  it("rejects an undefined patch value before sending", async () => {
    const { client, fetchImpl } = recordingClient(jsonResponse(writeOk));
    await expect(patchConfigPath(client, ["debug"], undefined)).rejects.toThrow(TypeError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects an undefined put value before sending", async () => {
    const { client, fetchImpl } = recordingClient(jsonResponse(writeOk));
    await expect(putConfigPath(client, ["debug"], undefined)).rejects.toThrow(TypeError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("DELETEs a node path without a body", async () => {
    const { client, fetchImpl } = recordingClient(jsonResponse(writeOk));
    await expect(deleteConfigPath(client, ["providers", "codex"])).resolves.toEqual({
      status: "ok",
      configVersion: 8,
    });
    const sent = sentRequest(fetchImpl);
    expect(sent).toMatchObject({ method: "DELETE", path: "/v8/management/config/providers/codex" });
    expect(sent.body).toBeUndefined();
  });

  it("rejects deleting the root before sending", async () => {
    const { client, fetchImpl } = recordingClient(jsonResponse(writeOk));
    await expect(deleteConfigPath(client, [])).rejects.toThrow(TypeError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("propagates API errors unchanged", async () => {
    const { client } = recordingClient(
      () =>
        new Response(JSON.stringify({ error: "invalid_config", message: "bad" }), { status: 422 }),
    );
    await expect(writeConfigYaml(client, "x: [")).rejects.toMatchObject({
      name: "ApiError",
      status: 422,
      apiCode: "invalid_config",
    });
  });

  it("rejects a success body that is not a mutation result", async () => {
    const { client } = recordingClient(jsonResponse({ ok: true }));
    await expect(deleteConfigPath(client, ["debug"])).rejects.toMatchObject({
      code: "invalid_response",
    });
  });

  it("accepts a status-only success body, with config-version optional", async () => {
    const { client } = recordingClient(jsonResponse({ status: "ok" }));
    await expect(deleteConfigPath(client, ["debug"])).resolves.toEqual({
      status: "ok",
      configVersion: 8,
    });
  });

  it("rejects a success body with a different config-version", async () => {
    const { client } = recordingClient(jsonResponse({ status: "ok", "config-version": 7 }));
    await expect(deleteConfigPath(client, ["debug"])).rejects.toMatchObject({
      code: "invalid_response",
    });
  });

  it.each([
    ["undefined", { management: { "allow-remote": undefined } }],
    ["function", { providers: [() => 1] }],
    ["symbol", { providers: { codex: { key: Symbol("k") } } }],
  ])("rejects a nested %s in a full config write before sending", async (_kind, document) => {
    const { client, fetchImpl } = recordingClient(jsonResponse(writeOk));
    await expect(writeConfig(client, document as never)).rejects.toThrow(TypeError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([[Number.NaN], [Number.POSITIVE_INFINITY], [Number.NEGATIVE_INFINITY]])(
    "rejects a non-finite number %s in every object write before sending",
    async (value) => {
      const { client, fetchImpl } = recordingClient(jsonResponse(writeOk));
      await expect(writeConfig(client, { limit: value })).rejects.toThrow(TypeError);
      await expect(putConfigPath(client, ["limit"], value)).rejects.toThrow(TypeError);
      await expect(patchConfigPath(client, ["limit"], { max: value })).rejects.toThrow(TypeError);
      expect(fetchImpl).not.toHaveBeenCalled();
    },
  );

  it("rejects a nested undefined in a node value before sending", async () => {
    const { client, fetchImpl } = recordingClient(jsonResponse(writeOk));
    await expect(putConfigPath(client, ["providers"], [1, undefined])).rejects.toThrow(TypeError);
    await expect(patchConfigPath(client, ["providers"], { a: { b: undefined } })).rejects.toThrow(
      TypeError,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
