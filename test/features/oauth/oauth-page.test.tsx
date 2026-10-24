import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
import cancelFixture from "../../fixtures/v8/oauth-cancel.json";
import callbackFixture from "../../fixtures/v8/oauth-callback-ok.json";

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
      if (path === "/oauth/callback") return response(callbackFixture);
      if (path === "/oauth/session") return response(cancelFixture);
      return response({});
    });
    vi.stubGlobal("fetch", fetchMock);
    const popup = {
      location: { replace: vi.fn() },
      close: vi.fn(),
      document: { title: "", body: { textContent: "" } },
      opener: null,
    };
    vi.stubGlobal(
      "open",
      vi.fn(() => popup),
    );

    const { host, router } = mountRoute("/oauth");
    expect(router.state.location.pathname).toBe("/oauth");
    expect(host.querySelector('[data-slot="workspace-header"] h1')?.textContent).toBe("OAuth");
    expect(host.querySelector('[aria-labelledby="oauth-provider"]')).not.toBeNull();
    expect(host.querySelector('[aria-labelledby="oauth-state"]')).not.toBeNull();
    expect(host.textContent).toContain("OAuth sign-in");
    expect(host.textContent).not.toContain("This page is not available yet.");

    const start = [...host.querySelectorAll("button")].find(
      (button) => button.textContent === "Start OAuth",
    );
    expect(start).not.toBeUndefined();
    await act(async () => start?.click());
    expect(popup.document.title).toBe("OAuth sign-in");
    expect(popup.document.body.textContent).toBe("Waiting for authorization…");
    expect(
      readFileSync(resolve(process.cwd(), "src/features/oauth/routes/OAuthPage.tsx"), "utf8"),
    ).toContain('className="inline-flex min-h-11 items-center text-sm underline"');
    await vi.waitFor(() => expect(host.textContent).toContain("OAuth completed"));
    expect(fetchMock.mock.calls.map(([input]) => new URL(input).pathname)).toEqual([
      "/v8/management/oauth/auth-url",
      "/v8/management/oauth/status",
    ]);
  });

  it("submits a pasted callback without exposing OAuth values in state, then clears it", async () => {
    await connect();
    const fetchMock = vi.fn(async (input: URL) => {
      const path = new URL(input).pathname.replace("/v8/management", "");
      if (path === "/oauth/auth-url") return response(authUrlFixture);
      if (path === "/oauth/status") return response({ status: "wait" });
      if (path === "/oauth/callback") return response(callbackFixture);
      if (path === "/oauth/session") return response(cancelFixture);
      return response({});
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal(
      "open",
      vi.fn(() => ({
        location: { replace: vi.fn() },
        close: vi.fn(),
        document: { title: "", body: { textContent: "" } },
        opener: null,
      })),
    );
    const { host } = mountRoute("/oauth");
    const start = [...host.querySelectorAll("button")].find(
      (button) => button.textContent === "Start OAuth",
    );
    await act(async () => start?.click());
    await vi.waitFor(() => expect(host.textContent).toContain("Complete callback"));
    const input = host.querySelector<HTMLInputElement>("#oauth-redirect-url");
    expect(input).not.toBeNull();
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, "https://callback.example.invalid/?code=secret&state=private");
      input?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const complete = [...host.querySelectorAll("button")].find(
      (button) => button.textContent === "Complete callback",
    );
    await act(async () => complete?.click());
    await vi.waitFor(() => expect(host.textContent).toContain("OAuth completed"));
    const callbackCall = fetchMock.mock.calls.find(([input]) =>
      new URL(input).pathname.endsWith("/oauth/callback"),
    ) as unknown as [URL, RequestInit] | undefined;
    expect(callbackCall).toBeDefined();
    expect(JSON.stringify(callbackCall?.[1].body)).toContain(
      "https://callback.example.invalid/?code=secret&state=private",
    );
    expect(new Headers(callbackCall?.[1].headers).has("Authorization")).toBe(false);
    expect(host.textContent).not.toContain("secret");
    expect(host.textContent).not.toContain("private");
    expect(host.querySelector<HTMLInputElement>("#oauth-redirect-url")).toBeNull();
  });
});
