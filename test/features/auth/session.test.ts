import { describe, expect, it, vi } from "vite-plus/test";
import { QueryClient } from "@tanstack/react-query";
import { createSessionStore } from "@/stores/session";
import {
  REMEMBERED_SESSION_STORAGE_KEY,
  createLocalRememberedSessionStorage,
} from "@/lib/connection/remembered-session-storage";
import { resetServerState } from "@/app/query-client";
import config from "../../fixtures/v8/config.json";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, v),
  };
}

function setup(fetchImpl: typeof fetch) {
  const local = memoryStorage();
  const store = createSessionStore({
    fetchImpl,
    storage: createLocalRememberedSessionStorage(() => local),
  });
  return { store, local };
}

const ok = () =>
  vi.fn(
    async () =>
      new Response(JSON.stringify(config), {
        headers: { "x-cpa-version": "v8.0.0", "x-cpa-support-plugin": "true" },
      }),
  );

describe("session store", () => {
  it("connects via config probe, captures capabilities and keeps the key in memory only", async () => {
    const fetchMock = ok();
    const { store, local } = setup(fetchMock as unknown as typeof fetch);
    await store
      .getState()
      .connect({ apiBase: "cpa.example.com/v8/management", managementKey: "mk" });
    const state = store.getState();
    expect(state).toMatchObject({
      isAuthenticated: true,
      apiBase: "http://cpa.example.com",
      managementKey: "mk",
      remember: false,
      rememberedSessionWarning: null,
    });
    expect(state.capabilities).toEqual({
      version: "v8.0.0",
      buildDate: null,
      supportsPlugins: true,
    });
    expect((fetchMock.mock.calls[0] as unknown as [URL])[0].href).toBe(
      "http://cpa.example.com/v8/management/config",
    );
    expect(local.length).toBe(0);
  });

  it("leaves the session logged out and reports the error on failed login (401 does not mark unauthorized)", async () => {
    const { store, local } = setup(
      (async () =>
        new Response(JSON.stringify({ error: "invalid management key" }), {
          status: 401,
        })) as unknown as typeof fetch,
    );
    await expect(
      store.getState().connect({ apiBase: "http://h", managementKey: "bad" }),
    ).rejects.toMatchObject({ status: 401 });
    expect(store.getState()).toMatchObject({
      isAuthenticated: false,
      managementKey: null,
      endReason: null,
    });
    expect(local.length).toBe(0);
  });

  it("rejects bad input without any request", async () => {
    const fetchMock = ok();
    const { store } = setup(fetchMock as unknown as typeof fetch);
    await expect(
      store.getState().connect({ apiBase: "ftp://h", managementKey: "k" }),
    ).rejects.toThrow();
    await expect(
      store.getState().connect({ apiBase: "http://h", managementKey: "  " }),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("remembers only on opt-in, with the warning, and disconnect clears everything", async () => {
    const { store, local } = setup(ok() as unknown as typeof fetch);
    await store.getState().connect({ apiBase: "http://h", managementKey: "mk", remember: true });
    expect(store.getState().rememberedSessionWarning).toMatch(/not encrypted/);
    expect(JSON.parse(local.getItem(REMEMBERED_SESSION_STORAGE_KEY)!)).toEqual({
      apiBase: "http://h",
      managementKey: "mk",
    });
    const revision = store.getState().connectionRevision;
    store.getState().disconnect();
    expect(local.length).toBe(0);
    expect(store.getState()).toMatchObject({
      isAuthenticated: false,
      managementKey: null,
      apiBase: null,
      endReason: "disconnected",
    });
    expect(store.getState().capabilities.version).toBeNull();
    expect(store.getState().connectionRevision).toBeGreaterThan(revision);
    expect(() => store.getState().getClient()).toThrow();
  });

  it("clearPersistedConnection removes storage but keeps the live session", async () => {
    const { store, local } = setup(ok() as unknown as typeof fetch);
    await store.getState().connect({ apiBase: "http://h", managementKey: "mk", remember: true });
    store.getState().clearPersistedConnection();
    expect(local.length).toBe(0);
    expect(store.getState()).toMatchObject({
      isAuthenticated: true,
      remember: false,
      rememberedSessionWarning: null,
    });
  });

  it("restores a remembered session and drops a corrupted one", async () => {
    const { store, local } = setup(ok() as unknown as typeof fetch);
    local.setItem(REMEMBERED_SESSION_STORAGE_KEY, "{not json");
    expect(await store.getState().restoreRememberedConnection()).toBe(false);
    expect(local.length).toBe(0);
    local.setItem(
      REMEMBERED_SESSION_STORAGE_KEY,
      JSON.stringify({ apiBase: "http://h", managementKey: "mk", extra: "x" }),
    );
    expect(await store.getState().restoreRememberedConnection()).toBe(true);
    expect(store.getState().remember).toBe(true);
    expect(JSON.parse(local.getItem(REMEMBERED_SESSION_STORAGE_KEY)!)).toEqual({
      apiBase: "http://h",
      managementKey: "mk",
    });
  });

  it("a 401 on an authenticated request clears the session and persisted key; 403 does not", async () => {
    let status = 200;
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify(status === 200 ? config : { error: "x" }), { status }),
    );
    const { store, local } = setup(fetchMock as unknown as typeof fetch);
    await store.getState().connect({ apiBase: "http://h", managementKey: "mk", remember: true });
    status = 403;
    await expect(store.getState().getClient().get("/config")).rejects.toMatchObject({
      status: 403,
    });
    expect(store.getState().isAuthenticated).toBe(true);
    status = 401;
    await expect(store.getState().getClient().get("/config")).rejects.toMatchObject({
      status: 401,
    });
    expect(store.getState()).toMatchObject({
      isAuthenticated: false,
      managementKey: null,
      endReason: "unauthorized",
    });
    expect(local.length).toBe(0);
  });

  it("switching connections aborts and discards in-flight requests of the old instance", async () => {
    const pendingByHost = new Map<string, () => void>();
    const fetchMock = vi.fn((input: URL | string, init?: RequestInit) => {
      const url = new URL(input);
      if (
        url.pathname.endsWith("/config") &&
        url.hostname === "a" &&
        pendingByHost.size === 0 &&
        !store.getState().isAuthenticated
      ) {
        return Promise.resolve(new Response(JSON.stringify(config)));
      }
      if (url.pathname.endsWith("/models")) {
        return new Promise<Response>((resolve, reject) => {
          pendingByHost.set(url.hostname, () => resolve(new Response("{}", { status: 401 })));
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        });
      }
      return Promise.resolve(new Response(JSON.stringify(config)));
    });
    const { store } = setup(fetchMock as unknown as typeof fetch);
    await store.getState().connect({ apiBase: "http://a", managementKey: "ka" });
    const oldClient = store.getState().getClient();
    const inFlight = oldClient.get("/models");
    await store.getState().connect({ apiBase: "http://b", managementKey: "kb" });
    await expect(inFlight).rejects.toMatchObject({ code: "aborted" });
    expect(store.getState()).toMatchObject({ isAuthenticated: true, apiBase: "http://b" });
    await expect(oldClient.get("/config")).rejects.toMatchObject({ code: "aborted" });
  });

  it("a superseded login probe does not authenticate", async () => {
    const releases: Array<() => void> = [];
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) =>
          releases.push(() => resolve(new Response(JSON.stringify(config)))),
        ),
    );
    const { store } = setup(fetchMock as unknown as typeof fetch);
    const first = store.getState().connect({ apiBase: "http://a", managementKey: "ka" });
    const second = store.getState().connect({ apiBase: "http://b", managementKey: "kb" });
    releases.forEach((r) => r());
    await expect(first).rejects.toMatchObject({ code: "aborted" });
    await second;
    expect(store.getState().apiBase).toBe("http://b");
  });
});

describe("resetServerState", () => {
  it("clears cached queries", async () => {
    const client = new QueryClient();
    client.setQueryData(["config"], { a: 1 });
    await resetServerState(client);
    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });
});
