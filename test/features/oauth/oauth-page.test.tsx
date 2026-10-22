import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router";
import { Providers } from "../../../src/app/providers";
import { appRoutes } from "../../../src/app/router";
import { sessionStore } from "../../../src/stores/session";
import { preferencesStore } from "../../../src/stores/preferences";
import authUrlFixture from "../../fixtures/v8/oauth-auth-url.json";
import statusOkFixture from "../../fixtures/v8/oauth-status-ok.json";

const API_BASE = "http://cpa.example.invalid";

let root: Root | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  sessionStore.getState().disconnect();
  preferencesStore.getState().setLanguage(null);
});

function response(body: unknown) {
  return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
}

async function connect() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => response({ "config-version": 8 })),
  );
  await sessionStore
    .getState()
    .connect({ apiBase: API_BASE, managementKey: "mk", remember: false });
}

function mountRoute(path: string) {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  act(() =>
    root?.render(
      <Providers>
        <RouterProvider router={router} />
      </Providers>,
    ),
  );
  return { host, router };
}

describe("OAuth page", () => {
  it("is reachable at /oauth and completes a browser flow", async () => {
    await connect();
    const fetchMock = vi.fn(async (input: URL) => {
      const path = new URL(input).pathname.replace("/v8/management", "");
      if (path === "/oauth/auth-url") return response(authUrlFixture);
      if (path === "/oauth/status") return response(statusOkFixture);
      return response({});
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("open", vi.fn());

    const { host, router } = mountRoute("/oauth");
    expect(router.state.location.pathname).toBe("/oauth");
    expect(host.textContent).toContain("OAuth sign-in");
    expect(host.textContent).not.toContain("This page is not available yet.");

    const start = [...host.querySelectorAll("button")].find(
      (button) => button.textContent === "Start OAuth",
    );
    expect(start).not.toBeUndefined();
    await act(async () => start?.click());
    await vi.waitFor(() => expect(host.textContent).toContain("OAuth completed"));
    expect(fetchMock.mock.calls.map(([input]) => new URL(input).pathname)).toEqual([
      "/v8/management/oauth/auth-url",
      "/v8/management/oauth/status",
    ]);
  });
});
