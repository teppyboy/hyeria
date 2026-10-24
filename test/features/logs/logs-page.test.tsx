import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router";
import { Providers } from "../../../src/app/providers";
import { appRoutes } from "../../../src/app/router";
import { sessionStore } from "../../../src/stores/session";
import { useUiStore } from "../../../src/stores/ui";

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

async function mountLogs() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: URL) => {
      const path = new URL(input).pathname.replace("/v8/management", "");
      if (path === "/config") return json({ "config-version": 8 });
      if (path === "/observability/logs")
        return json({
          lines: ["2026-05-05 12:00:00 info request accepted"],
          "line-count": 1,
          "latest-timestamp": 1777982400,
          "next-cursor": "",
        });
      if (path === "/observability/logs/errors") return json({ files: [] });
      return new Response("{}", { status: 404 });
    }),
  );
  await sessionStore
    .getState()
    .connect({ apiBase: "http://cpa.example.invalid", managementKey: "mk", remember: false });
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  const router = createMemoryRouter(appRoutes, { initialEntries: ["/logs"] });
  act(() =>
    root?.render(
      <Providers>
        <RouterProvider router={router} />
      </Providers>,
    ),
  );
  await vi.waitFor(() => expect(host.textContent).toContain("request accepted"));
  return host;
}

describe("logs page", () => {
  it("gives the page one workspace header with the clear action and a separate viewer region", async () => {
    const host = await mountLogs();

    expect(host.querySelectorAll("[data-slot='workspace-header']")).toHaveLength(1);
    expect(host.querySelector("[data-slot='workspace-header'] h1")?.textContent).toBe("Logs");
    const clear = [...host.querySelectorAll("button")].find(
      (button) => button.textContent === "Clear logs",
    );
    expect(clear?.closest("[data-slot='workspace-header']")).not.toBeNull();
    expect(clear?.closest("[data-slot='action-group']")?.getAttribute("data-destructive")).toBe(
      "true",
    );
    const filters = host.querySelector("[data-slot='log-filters']");
    expect(filters).not.toBeNull();
    expect(filters?.contains(host.querySelector("pre"))).toBe(false);
    expect(host.querySelector("pre")?.closest("[data-slot='log-viewer']")).not.toBeNull();
  });
});
