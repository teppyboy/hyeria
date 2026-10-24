import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router";
import { Providers } from "../../../src/app/providers";
import { appRoutes } from "../../../src/app/router";
import { sessionStore } from "../../../src/stores/session";
import { useUiStore } from "../../../src/stores/ui";
import credentials from "../../fixtures/v8/credentials-list.json";

let root: Root | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  sessionStore.getState().disconnect();
  useUiStore.getState().reset();
});

function json(value: unknown) {
  return new Response(JSON.stringify(value));
}

async function mountQuota() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: URL) => {
      const path = new URL(input).pathname.replace("/v8/management", "");
      if (path === "/config") return json({ "config-version": 8 });
      if (path === "/credentials") return json(credentials);
      return new Response("{}", { status: 404 });
    }),
  );
  await sessionStore
    .getState()
    .connect({ apiBase: "http://cpa.example.invalid", managementKey: "mk", remember: false });
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  const router = createMemoryRouter(appRoutes, { initialEntries: ["/quota"] });
  act(() =>
    root?.render(
      <Providers>
        <RouterProvider router={router} />
      </Providers>,
    ),
  );
  await vi.waitFor(() => expect(host.textContent).toContain("user@example.invalid"));
  return host;
}

describe("quota page", () => {
  it("gives the page one workspace header with per-credential reset actions and a plugin region", async () => {
    const host = await mountQuota();

    expect(host.querySelectorAll("[data-slot='workspace-header']")).toHaveLength(1);
    expect(host.querySelector("[data-slot='workspace-header'] h1")?.textContent).toBe("Quota");
    const row = host.querySelector("[data-slot='quota-credential']");
    expect(row?.textContent).toContain("user@example.invalid");
    expect(row?.querySelector("button")?.textContent).toBe("Reset cooldown");
    expect(row?.querySelector("button")?.closest("[data-slot='action-group']")).not.toBeNull();
    expect(host.textContent).toContain("Plugin quota providers are unavailable");
  });
});
