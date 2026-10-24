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
  sessionStore.getState().disconnect();
});

function json(value: unknown) {
  return new Response(JSON.stringify(value));
}

describe("analytics page", () => {
  it("labels data as live and never queries the destructive usage queue", async () => {
    const paths: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: URL) => {
        const url = new URL(input);
        paths.push(url.pathname);
        return url.pathname.endsWith("/config")
          ? json({ "config-version": 8 })
          : json({ success: 3, "api-key": "[TEST-CREDENTIAL-MARKER]" });
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
    await vi.waitFor(() => expect(host.textContent).toContain("Analytics"));
    expect(host.textContent).toContain("Live in-memory buckets");
    expect(host.textContent).not.toContain("[TEST-CREDENTIAL-MARKER]");
    expect(paths.some((path) => path.endsWith("/observability/usage/queue"))).toBe(false);
  });
});
