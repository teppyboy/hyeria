import { describe, expect, it, vi } from "vite-plus/test";
import { ManagementApiClient } from "../../../src/lib/api/client";
import {
  cancelOAuthSession,
  getOAuthCallback,
  importVertexCredential,
  parseHttpsUrl,
  pollOAuthStatus,
  postOAuthCallback,
  startOAuth,
} from "../../../src/features/oauth/api";
import authUrlFixture from "../../fixtures/v8/oauth-auth-url.json";
import authUrlDeviceFixture from "../../fixtures/v8/oauth-auth-url-device.json";
import callbackFixture from "../../fixtures/v8/oauth-callback-ok.json";
import cancelFixture from "../../fixtures/v8/oauth-cancel.json";
import vertexFixture from "../../fixtures/v8/oauth-import-vertex.json";
import statusErrorFixture from "../../fixtures/v8/oauth-status-error.json";
import statusOkFixture from "../../fixtures/v8/oauth-status-ok.json";
import statusWaitFixture from "../../fixtures/v8/oauth-status-wait.json";

const MANAGEMENT_KEY = "mk-do-not-leak";

function recordingClient(response: () => Response) {
  const fetchImpl = vi.fn(async (_input: URL, _init?: RequestInit) => response());
  const client = new ManagementApiClient({
    apiBase: "http://cpa.example.invalid",
    managementKey: MANAGEMENT_KEY,
    revision: 1,
    getCurrentRevision: () => 1,
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });
  return { client, fetchImpl };
}

function sentRequest(fetchImpl: ReturnType<typeof vi.fn>, call = 0) {
  const [input, init] = fetchImpl.mock.calls[call] as unknown as [URL, RequestInit];
  const url = new URL(input);
  return {
    path: url.pathname,
    search: url.search,
    method: init.method,
    body: init.body,
    headers: new Headers(init.headers),
  };
}

const json = (body: unknown) => () => new Response(JSON.stringify(body));

describe("parseHttpsUrl", () => {
  it("accepts absolute https URLs", () => {
    expect(parseHttpsUrl("https://auth.example.invalid/authorize?x=1")).toBe(
      "https://auth.example.invalid/authorize?x=1",
    );
  });

  it.each([
    "http://auth.example.invalid/authorize",
    "javascript:alert(1)",
    "data:text/html,hi",
    "/relative/path",
    "not a url",
    "",
  ])("rejects %s", (value) => {
    expect(parseHttpsUrl(value)).toBeNull();
  });
});

describe("startOAuth", () => {
  it("parses a browser auth URL and sends provider with the management key", async () => {
    const { client, fetchImpl } = recordingClient(json(authUrlFixture));
    const result = await startOAuth(client, "claude");
    const sent = sentRequest(fetchImpl);
    expect(sent).toMatchObject({
      method: "GET",
      path: "/v8/management/oauth/auth-url",
      search: "?provider=claude",
    });
    expect(sent.headers.get("Authorization")).toBe(`Bearer ${MANAGEMENT_KEY}`);
    expect(result).toEqual({
      url: "https://auth.example.invalid/authorize",
      state: "example-state-1",
      flow: "wait",
      userCode: null,
      expiresIn: null,
    });
  });

  it("parses device-code fields", async () => {
    const { client } = recordingClient(json(authUrlDeviceFixture));
    await expect(startOAuth(client, "meta")).resolves.toEqual({
      url: "https://auth.example.invalid/device",
      state: "example-state-2",
      flow: "device",
      userCode: "EXAMPLE-CODE",
      expiresIn: 600,
    });
  });

  it("sends is_webui only when requested", async () => {
    const { client, fetchImpl } = recordingClient(json(authUrlFixture));
    await startOAuth(client, "codex", true);
    expect(sentRequest(fetchImpl).search).toBe("?provider=codex&is_webui=true");
  });

  it("rejects a non-https auth URL", async () => {
    const { client } = recordingClient(
      json({ status: "ok", url: "http://auth.example.invalid/x", state: "s" }),
    );
    await expect(startOAuth(client, "claude")).rejects.toMatchObject({
      code: "invalid_response",
    });
  });

  it("rejects a response without a state", async () => {
    const { client } = recordingClient(
      json({ status: "ok", url: "https://auth.example.invalid/x" }),
    );
    await expect(startOAuth(client, "claude")).rejects.toMatchObject({
      code: "invalid_response",
    });
  });

  it("surfaces provider-not-found as a 404 without a success result", async () => {
    const { client } = recordingClient(
      () => new Response(JSON.stringify({ error: "provider_not_found" }), { status: 404 }),
    );
    await expect(startOAuth(client, "missing")).rejects.toMatchObject({
      status: 404,
      apiCode: "provider_not_found",
    });
  });
});

describe("pollOAuthStatus", () => {
  it("reports wait while pending", async () => {
    const { client, fetchImpl } = recordingClient(json(statusWaitFixture));
    await expect(pollOAuthStatus(client, "example-state-1")).resolves.toBe("wait");
    expect(sentRequest(fetchImpl)).toMatchObject({
      path: "/v8/management/oauth/status",
      search: "?state=example-state-1",
    });
  });

  it("reports ok on success", async () => {
    const { client } = recordingClient(json(statusOkFixture));
    await expect(pollOAuthStatus(client, "s")).resolves.toBe("ok");
  });

  it("reports error for a provider failure", async () => {
    const { client } = recordingClient(json(statusErrorFixture));
    await expect(pollOAuthStatus(client, "s")).resolves.toBe("error");
  });

  it("maps any other status value to unknown", async () => {
    const { client } = recordingClient(json({ status: "pending-review" }));
    await expect(pollOAuthStatus(client, "s")).resolves.toBe("unknown");
  });

  it("rejects a response without a status", async () => {
    const { client } = recordingClient(json({}));
    await expect(pollOAuthStatus(client, "s")).rejects.toMatchObject({
      code: "invalid_response",
    });
  });

  it("aborts the in-flight poll when the caller's signal fires", async () => {
    const fetchImpl = vi.fn(
      (_input: URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    const client = new ManagementApiClient({
      apiBase: "http://cpa.example.invalid",
      managementKey: MANAGEMENT_KEY,
      revision: 1,
      getCurrentRevision: () => 1,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const controller = new AbortController();
    const pending = pollOAuthStatus(client, "s", controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: "aborted" });
  });
});

describe("cancelOAuthSession", () => {
  it("deletes the session by state", async () => {
    const { client, fetchImpl } = recordingClient(json(cancelFixture));
    await cancelOAuthSession(client, "example-state-1");
    expect(sentRequest(fetchImpl)).toMatchObject({
      method: "DELETE",
      path: "/v8/management/oauth/session",
      search: "?state=example-state-1",
    });
  });

  it("rejects an unconfirmed cancellation", async () => {
    const { client } = recordingClient(json({ status: "error" }));
    await expect(cancelOAuthSession(client, "s")).rejects.toMatchObject({
      code: "invalid_response",
    });
  });
});

describe("importVertexCredential", () => {
  it("posts multipart with field file and a fixed name, and returns no auth-file path", async () => {
    const { client, fetchImpl } = recordingClient(json(vertexFixture));
    const result = await importVertexCredential(
      client,
      new Blob(['{"type":"service_account"}']),
      "europe-west4",
    );
    const sent = sentRequest(fetchImpl);
    expect(sent).toMatchObject({
      method: "POST",
      path: "/v8/management/oauth/import",
      search: "?provider=vertex",
    });
    const form = sent.body as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect((form.get("file") as File).name).toBe("vertex-service-account.json");
    expect(form.get("location")).toBe("europe-west4");
    expect(result).toEqual({
      projectId: "example-project",
      email: "user@example.invalid",
      location: "us-central1",
    });
    expect(JSON.stringify(result)).not.toContain(vertexFixture["auth-file"]);
  });

  it("omits the location field when none is given", async () => {
    const { client, fetchImpl } = recordingClient(json(vertexFixture));
    await importVertexCredential(client, new Blob(["{}"]));
    const form = sentRequest(fetchImpl).body as FormData;
    expect(form.has("location")).toBe(false);
  });

  it("rejects a response without the import fields", async () => {
    const { client } = recordingClient(json({ status: "ok" }));
    await expect(importVertexCredential(client, new Blob(["{}"]))).rejects.toMatchObject({
      code: "invalid_response",
    });
  });
});

describe("OAuth callback", () => {
  it("GET sends provider, state and code without the management key", async () => {
    const { client, fetchImpl } = recordingClient(json(callbackFixture));
    await getOAuthCallback(client, { provider: "claude", state: "s", code: "c" });
    const sent = sentRequest(fetchImpl);
    expect(sent).toMatchObject({
      method: "GET",
      path: "/v8/management/oauth/callback",
    });
    expect(new URL(`http://x${sent.search}`).searchParams.get("state")).toBe("s");
    expect(sent.headers.has("Authorization")).toBe(false);
  });

  it("GET passes provider errors through the query", async () => {
    const { client, fetchImpl } = recordingClient(json(callbackFixture));
    await getOAuthCallback(client, {
      provider: "claude",
      state: "s",
      error: "access_denied",
      error_description: "denied",
    });
    expect(sentRequest(fetchImpl).search).toContain("error=access_denied");
  });

  it("POST sends the body without the management key", async () => {
    const { client, fetchImpl } = recordingClient(json(callbackFixture));
    await postOAuthCallback(client, {
      provider: "codex",
      state: "s",
      redirect_url: "https://example.invalid/cb?code=c&state=s",
    });
    const sent = sentRequest(fetchImpl);
    expect(sent).toMatchObject({ method: "POST", path: "/v8/management/oauth/callback" });
    expect(JSON.parse(sent.body as string)).toMatchObject({ provider: "codex", state: "s" });
    expect(sent.headers.has("Authorization")).toBe(false);
  });

  it("surfaces a rejected callback without inventing a status", async () => {
    const { client } = recordingClient(
      () => new Response(JSON.stringify({ error: "invalid state" }), { status: 400 }),
    );
    await expect(getOAuthCallback(client, { provider: "p", state: "bad" })).rejects.toMatchObject({
      status: 400,
    });
  });

  it("rejects a callback response that is not confirmed", async () => {
    const { client } = recordingClient(json({ status: "pending" }));
    await expect(postOAuthCallback(client, { provider: "p", state: "s" })).rejects.toMatchObject({
      code: "invalid_response",
    });
  });
});
