import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router";
import { Providers } from "../../../src/app/providers";
import { appRoutes } from "../../../src/app/router";
import { sessionStore } from "../../../src/stores/session";
import { preferencesStore } from "../../../src/stores/preferences";

let root: Root | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  sessionStore.getState().disconnect();
  preferencesStore.getState().setLanguage(null);
});

function json(value: unknown) {
  return new Response(JSON.stringify(value));
}

async function mountAnalytics(usage: () => Response | Promise<Response>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: URL) => {
      const path = new URL(input).pathname.replace("/v8/management", "");
      if (path === "/config") return json({ "config-version": 8 });
      if (path === "/observability/usage/api-keys") return usage();
      return new Response("{}", { status: 404 });
    }),
  );
  await sessionStore
    .getState()
    .connect({ apiBase: "http://cpa.example.invalid", managementKey: "mk", remember: false });
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  const router = createMemoryRouter(appRoutes, { initialEntries: ["/analytics"] });
  act(() =>
    root?.render(
      <Providers>
        <RouterProvider router={router} />
      </Providers>,
    ),
  );
  return host;
}

describe("analytics workspace", () => {
  it("localizes the live snapshot workspace and keeps its status framing", async () => {
    preferencesStore.getState().setLanguage("ru");
    const host = await mountAnalytics(() => json({ success: 3 }));
    await vi.waitFor(() => expect(host.textContent).toContain("Аналитика"));

    expect(host.querySelectorAll("[data-slot='workspace-header']")).toHaveLength(1);
    expect(host.querySelector("[data-slot='workspace-header'] h1")?.textContent).toBe("Аналитика");
    const status = host.querySelector("[data-slot='analytics-scope']");
    expect(status?.textContent).toContain("не история");
    const actions = host.querySelectorAll("[data-slot='workspace-actions'] button");
    expect(actions).toHaveLength(1);
    expect(actions[0]?.textContent).toBe("Обновить снимок");
  });

  it("uses a loading status region while the snapshot is pending", async () => {
    const host = await mountAnalytics(() => new Promise<Response>(() => {}));
    await vi.waitFor(() =>
      expect(
        host.querySelector("[data-slot='workspace-state'][data-kind='loading']"),
      ).not.toBeNull(),
    );
    expect(host.querySelector("[data-slot='workspace-header']")).not.toBeNull();
    expect(host.querySelector("[data-slot='analytics-scope']")?.textContent).toContain("Live");
    expect(host.querySelector("[data-slot='workspace-actions'] button")?.textContent).toBe(
      "Refresh snapshot",
    );
    expect(
      host.querySelector("[data-slot='workspace-state'][data-kind='loading']")?.textContent,
    ).toContain("Loading live usage buckets");
  });

  it("uses an alert region when the snapshot is unavailable", async () => {
    const host = await mountAnalytics(() => new Response("{}", { status: 500 }));
    await vi.waitFor(
      () =>
        expect(
          host.querySelector("[data-slot='workspace-state'][data-kind='error']"),
        ).not.toBeNull(),
      { timeout: 4000 },
    );
    expect(host.querySelector("[data-slot='workspace-header']")).not.toBeNull();
    expect(host.querySelector("[data-slot='analytics-scope']")?.textContent).toContain("Live");
    expect(host.querySelector("[data-slot='workspace-actions'] button")?.textContent).toBe(
      "Refresh snapshot",
    );
    expect(
      host.querySelector("[data-slot='workspace-state'][data-kind='error']")?.textContent,
    ).toContain("unavailable");
  });
});
