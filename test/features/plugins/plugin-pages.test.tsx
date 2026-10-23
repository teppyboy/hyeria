import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router";
import { Providers } from "../../../src/app/providers";
import { appRoutes } from "../../../src/app/router";
import { sessionStore } from "../../../src/stores/session";

let root: Root | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  sessionStore.getState().disconnect();
});

function json(value: unknown) {
  return new Response(JSON.stringify(value), { headers: { "content-type": "application/json" } });
}

async function mount(path: string, responses: (url: URL) => unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: URL) => json(responses(new URL(input)))),
  );
  await sessionStore
    .getState()
    .connect({ apiBase: "http://cpa.example.invalid", managementKey: "mk", remember: false });
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
  return host;
}

describe("plugin management pages", () => {
  it("renders identifiers but never interprets menu HTML", async () => {
    const host = await mount("/plugins", (url) =>
      url.pathname.endsWith("/plugins")
        ? {
            plugins_enabled: true,
            plugins: [
              { id: "safe", menus: [{ type: "html", html: "<script>executed()</script>" }] },
            ],
          }
        : { "config-version": 8 },
    );
    await vi.waitFor(() => expect(host.textContent).toContain("safe"));
    expect(host.querySelector("script")).toBeNull();
    expect(host.innerHTML).not.toContain("executed()");
  });

  it("shows executable-artifact warning before requesting confirmation and install", async () => {
    const calls: string[] = [];
    const host = await mount("/plugin-store", (url) => {
      calls.push(url.pathname);
      if (url.pathname.endsWith("/plugins/store"))
        return { plugins: [{ id: "store-plugin", source_id: "official", version: "1.0" }] };
      if (url.pathname.endsWith("/plugins")) return { plugins: [] };
      return { "config-version": 8 };
    });
    vi.stubGlobal(
      "confirm",
      vi.fn(() => false),
    );
    await vi.waitFor(() => expect(host.textContent).toContain("store-plugin"));
    expect(host.textContent).toContain("install executable code on the backend");
    const button = [...host.querySelectorAll("button")].find(
      (item) => item.textContent === "Install",
    );
    await act(async () => button?.click());
    expect(calls.some((path) => path.endsWith("/install"))).toBe(false);
  });
});
