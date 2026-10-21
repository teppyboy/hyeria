import { describe, expect, it, vi } from "vite-plus/test";
import { ManagementApiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

function setup(
  fetchImpl: typeof fetch,
  overrides: Partial<ConstructorParameters<typeof ManagementApiClient>[0]> = {},
) {
  const state = { revision: 1 };
  const onUnauthorized = vi.fn();
  const onCapabilities = vi.fn();
  const client = new ManagementApiClient({
    apiBase: "https://cpa.example.com/base",
    managementKey: "mk-secret",
    revision: 1,
    getCurrentRevision: () => state.revision,
    onUnauthorized,
    onCapabilities,
    fetchImpl,
    ...overrides,
  });
  return { client, state, onUnauthorized, onCapabilities };
}

const jsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), init);
const lastCall = (fn: ReturnType<typeof vi.fn>) => {
  const [url, init] = fn.mock.calls.at(-1)! as [URL, RequestInit];
  return { url, init, headers: new Headers(init.headers) };
};

describe("ManagementApiClient requests", () => {
  it("sends Bearer to /v8/management with query, JSON body and no cookies/X-Management-Key", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ status: "ok" }));
    const { client } = setup(fetchMock as unknown as typeof fetch);
    await client.put("/config/round-robin", true, { query: { a: 1, skip: undefined } });
    const { url, init, headers } = lastCall(fetchMock);
    expect(url.href).toBe("https://cpa.example.com/base/v8/management/config/round-robin?a=1");
    expect(init.method).toBe("PUT");
    expect(init.credentials).toBe("omit");
    expect(headers.get("authorization")).toBe("Bearer mk-secret");
    expect(headers.get("x-management-key")).toBeNull();
    expect(headers.get("content-type")).toBe("application/json");
    expect(init.body).toBe("true");
  });

  it("does not send the key to /oauth/callback", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ status: "ok" }));
    const { client } = setup(fetchMock as unknown as typeof fetch);
    await client.post("/oauth/callback", { provider: "codex" });
    expect(lastCall(fetchMock).headers.get("authorization")).toBeNull();
  });

  it("supports YAML text, blob and multipart", async () => {
    const fetchMock = vi.fn(async (_u: unknown, init?: RequestInit) =>
      init?.method === "GET"
        ? new Response("a: 1\n", { headers: { "content-type": "application/yaml" } })
        : jsonResponse({ status: "ok" }),
    );
    const { client } = setup(fetchMock as unknown as typeof fetch);
    expect(await client.getText("/config.yaml", { accept: "application/yaml" })).toBe("a: 1\n");
    expect(lastCall(fetchMock).headers.get("accept")).toBe("application/yaml");
    await client.put("/config.yaml", "a: 2\n", { contentType: "application/yaml" });
    expect(lastCall(fetchMock).init.body).toBe("a: 2\n");
    expect(lastCall(fetchMock).headers.get("content-type")).toBe("application/yaml");
    const blob = await client.getBlob("/credentials/download");
    expect(blob).toBeInstanceOf(Blob);
    const form = new FormData();
    form.set("file", new Blob(["{}"]), "a.json");
    await client.postForm("/credentials", form);
    const { init, headers } = lastCall(fetchMock);
    expect(init.body).toBe(form);
    expect(headers.get("content-type")).toBeNull();
  });

  it("reports capability headers while the revision is current", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({}, { headers: { "X-CPA-Version": "v8.0.1" } }),
    );
    const { client, onCapabilities } = setup(fetchMock as unknown as typeof fetch);
    await client.get("/config");
    expect(onCapabilities).toHaveBeenCalledWith(
      { version: "v8.0.1", buildDate: null, supportsPlugins: null },
      1,
    );
  });
});

describe("ManagementApiClient failures", () => {
  it("throws safe ApiError and calls onUnauthorized only for 401", async () => {
    let status = 401;
    const fetchMock = vi.fn(async () =>
      jsonResponse({ error: "invalid management key" }, { status }),
    );
    const { client, onUnauthorized } = setup(fetchMock as unknown as typeof fetch);
    await expect(client.get("/config")).rejects.toMatchObject({
      status: 401,
      code: "unauthorized",
      apiCode: "invalid management key",
    });
    expect(onUnauthorized).toHaveBeenCalledWith(1);
    status = 403;
    await expect(client.get("/config")).rejects.toMatchObject({ status: 403, code: "forbidden" });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("does not treat a 401 from the unauthenticated callback as a session failure", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ error: "x" }, { status: 401 }));
    const { client, onUnauthorized } = setup(fetchMock as unknown as typeof fetch);
    await expect(client.get("/oauth/callback")).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("maps network failures without leaking the URL or key", async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError("Failed to fetch https://cpa.example.com/base?key=mk-secret");
    });
    const { client } = setup(fetchMock as unknown as typeof fetch);
    const error = await client.get("/config").catch((e: ApiError) => e);
    expect(error).toMatchObject({ status: null, code: "network" });
    expect(JSON.stringify(error) + (error as Error).message).not.toContain("mk-secret");
  });

  it("times out and honours caller abort", async () => {
    const hang: typeof fetch = (_u, init) =>
      new Promise((_, reject) =>
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        ),
      );
    const { client } = setup(hang, { timeoutMs: 10 });
    await expect(client.get("/config")).rejects.toMatchObject({ code: "timeout" });
    const ac = new AbortController();
    const pending = setup(hang).client.get("/config", { signal: ac.signal });
    ac.abort();
    await expect(pending).rejects.toMatchObject({ code: "aborted" });
  });

  it("rejects invalid JSON on success", async () => {
    const { client } = setup((async () => new Response("<html>")) as unknown as typeof fetch);
    await expect(client.get("/config")).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("discards stale responses and side effects after the revision changes", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const fetchMock = vi.fn(async () => {
      await gate;
      return jsonResponse({ ok: 1 }, { status: 401, headers: { "x-cpa-version": "old" } });
    });
    const { client, state, onUnauthorized, onCapabilities } = setup(
      fetchMock as unknown as typeof fetch,
    );
    const pending = client.get("/config");
    state.revision = 2;
    release();
    await expect(pending).rejects.toMatchObject({ code: "aborted" });
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(onCapabilities).not.toHaveBeenCalled();
    await expect(client.get("/config")).rejects.toMatchObject({ code: "aborted" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
