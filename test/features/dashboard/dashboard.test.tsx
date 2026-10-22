import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Providers } from "../../../src/app/providers";
import { DashboardPage } from "../../../src/features/dashboard/routes/DashboardPage";
import { sessionStore } from "../../../src/stores/session";
import config from "../../fixtures/v8/config.json";
import credentials from "../../fixtures/v8/credentials-list.json";
import plugins from "../../fixtures/v8/plugins-list.illustrative.json";

const API_BASE = "http://cpa.example.invalid";
let root: Root | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  sessionStore.getState().disconnect();
});

async function settle() {
  for (let i = 0; i < 6; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

function routes(overrides: Record<string, () => Response> = {}) {
  return vi.fn(async (input: URL) => {
    const path = new URL(input).pathname.replace("/v8/management", "");
    const override = overrides[path];
    if (override) return override();
    if (path === "/config")
      return new Response(JSON.stringify(config), {
        headers: { "x-cpa-version": "v8.0.0", "x-cpa-support-plugin": "true" },
      });
    if (path === "/plugins") return new Response(JSON.stringify(plugins));
    if (path === "/credentials") return new Response(JSON.stringify(credentials));
    if (path.startsWith("/routing/model-definitions/"))
      return new Response(JSON.stringify({ channel: "x", models: [{ id: "m" }] }));
    return new Response("{}", { status: 404 });
  });
}

async function mountConnected(fetchMock: ReturnType<typeof routes>) {
  vi.stubGlobal("fetch", fetchMock);
  await sessionStore
    .getState()
    .connect({ apiBase: API_BASE, managementKey: "mk", remember: false });
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() =>
    root?.render(
      <Providers>
        <DashboardPage />
      </Providers>,
    ),
  );
  await settle();
  return host;
}

describe("dashboard", () => {
  it("shows version, plugin support and credential counts from the probes", async () => {
    const host = await mountConnected(routes());
    expect(host.textContent).toContain("Version: v8.0.0");
    expect(host.textContent).toContain("Build date: Unknown");
    expect(host.textContent).toContain("Total: 2");
    expect(host.textContent).toContain("Runtime only: 1");
  });

  it("does not render upstream keys or credential names", async () => {
    const host = await mountConnected(routes());
    expect(host.innerHTML).not.toContain("user@example.invalid");
    expect(host.innerHTML).not.toContain("a1b2c3d4e5f67890");
    expect(host.innerHTML).not.toContain("example-plugin");
  });

  it("reports an unsupported plugin capability when the probe answers 404", async () => {
    const host = await mountConnected(
      routes({
        "/config": () => new Response(JSON.stringify(config)),
        "/plugins": () => new Response("{}", { status: 404 }),
      }),
    );
    expect(host.textContent).toContain("Plugins: Not supported by this server");
  });

  it("keeps the rest of the dashboard when one endpoint fails", async () => {
    const host = await mountConnected(
      routes({ "/credentials": () => new Response("{}", { status: 502 }) }),
    );
    // A 5xx is retried once by the query client, so wait for the final error state.
    await vi.waitFor(
      () => expect(host.textContent).toContain("Credential summary is unavailable."),
      {
        timeout: 4000,
      },
    );
    expect(host.textContent).toContain("Version: v8.0.0");
  });

  it("never requests the destructive usage queue", async () => {
    const fetchMock = routes();
    await mountConnected(fetchMock);
    const paths = fetchMock.mock.calls.map((call) => new URL(call[0] as unknown as URL).pathname);
    expect(paths.some((path) => path.includes("usage/queue"))).toBe(false);
  });
});
