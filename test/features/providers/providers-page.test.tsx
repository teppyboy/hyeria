import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryRouter, MemoryRouter, RouterProvider } from "react-router";
import { Providers } from "../../../src/app/providers";
import { appRoutes } from "../../../src/app/router";
import { ProvidersPage } from "../../../src/features/providers/routes/ProvidersPage";
import { sessionStore } from "../../../src/stores/session";
import { preferencesStore } from "../../../src/stores/preferences";

const API_BASE = "http://cpa.example.invalid";
const SECRET = "sk-live-do-not-render-123";
const BASE_URL = "https://private-upstream.example.invalid";

const configWithGroups = {
  "api-keys": {
    codex: [
      {
        name: "codex-team",
        enabled: true,
        "base-url": BASE_URL,
        headers: { "X-Team": "ops" },
        keys: [{ "api-key": SECRET, weight: 2 }, { "api-key": "   " }],
      },
    ],
    "custom-backend": [{ keys: [] }],
  },
};

let root: Root | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  sessionStore.getState().disconnect();
  preferencesStore.getState().setLanguage(null);
});

/** Serves `/config` with the given body or status; every other path is a 404. */
function stubConfig(response: () => Response | Promise<Response>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: URL) => {
      const path = new URL(input).pathname.replace("/v8/management", "");
      if (path === "/config") return response();
      return new Response("{}", { status: 404 });
    }),
  );
}

async function connect() {
  await sessionStore
    .getState()
    .connect({ apiBase: API_BASE, managementKey: "mk", remember: false });
}

/** The connect probe also reads `/config`, so it succeeds first and the test's response applies after. */
async function connectThen(response: () => Response | Promise<Response>) {
  stubConfig(() => new Response(JSON.stringify(configWithGroups)));
  await connect();
  stubConfig(response);
}

function mountPage() {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() =>
    root?.render(
      <Providers>
        <MemoryRouter>
          <ProvidersPage />
        </MemoryRouter>
      </Providers>,
    ),
  );
  return host;
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

describe("providers page", () => {
  it("shows a loading state while the config is pending", async () => {
    await connectThen(() => new Promise<Response>(() => {}));
    const host = mountPage();
    await vi.waitFor(() => expect(host.textContent).toContain("Loading provider groups"));
  });

  it("shows an error alert without the server message when the config cannot load", async () => {
    await connectThen(
      () => new Response(JSON.stringify({ error: "internal detail" }), { status: 500 }),
    );
    const host = mountPage();
    // The query retries once on a 5xx, so the alert appears after the retry delay.
    await vi.waitFor(
      () =>
        expect(host.querySelector("[role='alert']")?.textContent).toBe(
          "Provider groups could not be loaded.",
        ),
      { timeout: 4000 },
    );
    expect(host.textContent).not.toContain("internal detail");
  });

  it("shows the empty state when no provider groups are configured", async () => {
    stubConfig(() => new Response(JSON.stringify({ "config-version": 8 })));
    await connect();
    const host = mountPage();
    await vi.waitFor(() =>
      expect(host.textContent).toContain("No provider groups are configured."),
    );
    expect(host.querySelector("table")).toBeNull();
  });

  it("lists group names, known/unknown badges, and key counts without secrets or endpoints", async () => {
    stubConfig(() => new Response(JSON.stringify(configWithGroups)));
    await connect();
    const host = mountPage();
    await vi.waitFor(() => expect(host.querySelector("table")).not.toBeNull());

    const rows = [...host.querySelectorAll("tbody tr")].map((row) =>
      [...row.querySelectorAll("td")].map((cell) => cell.textContent),
    );
    expect(rows).toEqual([
      ["codex", "Known", "1", "2", "1"],
      ["custom-backend", "Unknown", "1", "0", "0"],
    ]);
    expect(host.textContent).not.toContain(SECRET);
    expect(host.textContent).not.toContain(BASE_URL);
    expect(host.textContent).not.toContain("base-url");
    expect(host.textContent).not.toContain("X-Team");
  });

  it("gives the page one workspace header and a bounded table region", async () => {
    stubConfig(() => new Response(JSON.stringify(configWithGroups)));
    await connect();
    const host = mountPage();
    await vi.waitFor(() => expect(host.querySelector("table")).not.toBeNull());

    expect(host.querySelectorAll("[data-slot='workspace-header']")).toHaveLength(1);
    expect(host.querySelector("h1")?.textContent).toBe("AI providers");
    expect(
      host.querySelector("section[aria-labelledby] table")?.parentElement?.className,
    ).toContain("overflow-x-auto");
  });

  it("states that editing is deferred and links to the raw configuration editor", async () => {
    stubConfig(() => new Response(JSON.stringify(configWithGroups)));
    await connect();
    const host = mountPage();
    await vi.waitFor(() => expect(host.querySelector("table")).not.toBeNull());

    expect(host.textContent).toContain("Editing provider groups is deferred");
    expect(host.querySelector("button")).toBeNull();
    const rawLink = host.querySelector("a[href='/config']");
    expect(rawLink?.textContent).toBe("Open raw configuration");
    expect(rawLink?.className).toContain("min-h-11");
  });

  it("is reachable at /ai-providers instead of the placeholder page", async () => {
    stubConfig(() => new Response(JSON.stringify(configWithGroups)));
    await connect();
    const { host, router } = mountRoute("/ai-providers");
    await vi.waitFor(() => expect(host.querySelector("table")).not.toBeNull());

    expect(router.state.location.pathname).toBe("/ai-providers");
    expect([...host.querySelectorAll("h1")].map((h) => h.textContent)).toContain("AI providers");
    expect(host.textContent).not.toContain("This page is not available yet.");
  });

  it("localizes the page copy", async () => {
    stubConfig(() => new Response(JSON.stringify(configWithGroups)));
    await connect();
    preferencesStore.getState().setLanguage("ru");
    const host = mountPage();
    await vi.waitFor(() => expect(host.querySelector("table")).not.toBeNull());

    expect(host.querySelector("h1")?.textContent).toBe("Провайдеры ИИ");
    expect(host.textContent).not.toContain("Editing provider groups is deferred");
  });
});
