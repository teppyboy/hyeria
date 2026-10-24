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

function factCell(host: HTMLElement, label: string) {
  return Array.from(host.querySelectorAll<HTMLElement>("[data-slot='status-cell']")).find(
    (cell) => cell.querySelector("dt")?.textContent === label,
  );
}

function region(host: HTMLElement, title: string) {
  const heading = Array.from(host.querySelectorAll("h2")).find((h) => h.textContent === title);
  const found = heading?.closest("section");
  if (!found) throw new Error(`missing region ${title}`);
  return found;
}

describe("dashboard", () => {
  it("renders one workspace header with the dashboard heading and connection context", async () => {
    const host = await mountConnected(routes());
    const headings = host.querySelectorAll("h1");
    expect(headings).toHaveLength(1);
    expect(headings[0]?.textContent).toBe("Dashboard");
    const header = headings[0]?.closest("[data-slot='workspace-header']");
    expect(header?.textContent).toContain("Connected session");
  });

  it("shows version, build date and plugin support as distinct server fact cells", async () => {
    const host = await mountConnected(routes());
    const facts = region(host, "Server");
    expect(facts.querySelectorAll("[data-slot='status-cell']")).toHaveLength(3);
    expect(factCell(facts, "Version")?.querySelector("dd")?.textContent).toBe("v8.0.0");
    expect(factCell(facts, "Build date")?.querySelector("dd")?.textContent).toBe("Unknown");
    expect(factCell(facts, "Plugins")?.textContent).toContain("Supported");
    expect(factCell(facts, "Plugins")?.textContent).toContain("enabled");
  });

  it("renders credential counts as readiness status cells", async () => {
    const host = await mountConnected(routes());
    const readiness = region(host, "Credentials");
    const valueOf = (label: string) => factCell(readiness, label)?.querySelector("dd")?.textContent;
    expect(valueOf("Total")).toBe("2");
    expect(valueOf("Disabled")).toBe("0");
    expect(valueOf("Unavailable")).toBe("0");
    expect(valueOf("Runtime only")).toBe("1");
    expect(factCell(readiness, "Runtime only")?.dataset.tone).toBe("info");
    expect(factCell(readiness, "Total")?.dataset.tone).toBe("default");
  });

  it("marks non-zero disabled readiness with the warning tone", async () => {
    const host = await mountConnected(
      routes({
        "/credentials": () =>
          new Response(
            JSON.stringify({
              files: [
                { provider: "claude", disabled: true, unavailable: false, runtime_only: false },
              ],
            }),
          ),
      }),
    );
    expect(factCell(region(host, "Credentials"), "Disabled")?.dataset.tone).toBe("warning");
  });

  it("keeps model channels in a full-width list with availability and model counts", async () => {
    const host = await mountConnected(routes());
    const channels = region(host, "Model channels");
    const rows = channels.querySelectorAll("ul > li");
    expect(rows).toHaveLength(2);
    expect(channels.textContent).toContain("claude");
    expect(channels.textContent).toContain("codex");
    expect(channels.textContent).toContain("Models available");
    expect(channels.textContent).toContain("Models: 1");
  });

  it("does not render upstream keys or credential names", async () => {
    const host = await mountConnected(routes());
    expect(host.innerHTML).not.toContain("user@example.invalid");
    expect(host.innerHTML).not.toContain("a1b2c3d4e5f67890");
    expect(host.innerHTML).not.toContain("example-plugin");
  });

  it("treats a plugin 404 as unknown endpoint availability, not as proof of absence", async () => {
    const host = await mountConnected(
      routes({
        "/config": () => new Response(JSON.stringify(config)),
        "/plugins": () => new Response("{}", { status: 404 }),
      }),
    );
    expect(factCell(host, "Plugins")?.textContent).toContain(
      "Plugin endpoint unavailable (may be disabled or not present)",
    );
    expect(host.textContent).not.toContain("Not supported by this server");
  });

  it("reports an unsupported plugin capability only when the header is explicitly false", async () => {
    const host = await mountConnected(
      routes({
        "/config": () =>
          new Response(JSON.stringify(config), {
            headers: { "x-cpa-version": "v8.0.0", "x-cpa-support-plugin": "false" },
          }),
      }),
    );
    expect(factCell(host, "Plugins")?.textContent).toContain("Not supported by this server");
  });

  it("shows the empty channel state when there are no credential providers", async () => {
    const host = await mountConnected(
      routes({ "/credentials": () => new Response(JSON.stringify({ files: [] })) }),
    );
    expect(factCell(host, "Total")?.querySelector("dd")?.textContent).toBe("0");
    expect(region(host, "Model channels").querySelector("[role='status']")?.textContent).toBe(
      "No candidate channels yet.",
    );
  });

  it("marks a channel the server rejects with 400 as not recognized, not as an error", async () => {
    const host = await mountConnected(
      routes({
        "/routing/model-definitions/claude": () =>
          new Response(JSON.stringify({ error: "unknown channel" }), { status: 400 }),
      }),
    );
    await vi.waitFor(
      () => expect(host.textContent).toContain("Channel not recognized by the server"),
      { timeout: 4000 },
    );
    expect(host.textContent).not.toContain("Some server information could not be loaded.");
  });

  it("shows the loading state while the credential summary is pending", async () => {
    const host = await mountConnected(
      routes({ "/credentials": () => new Promise<Response>(() => undefined) as never }),
    );
    expect(region(host, "Credentials").querySelector("[data-kind='loading']")).not.toBeNull();
    expect(factCell(host, "Total")).toBeUndefined();
    expect(region(host, "Model channels").querySelector("[role='status']")?.textContent).toBe(
      "Loading",
    );
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
    expect(factCell(host, "Version")?.querySelector("dd")?.textContent).toBe("v8.0.0");
    expect(region(host, "Credentials").querySelector("[role='alert']")?.textContent).toBe(
      "Credential summary is unavailable.",
    );
    expect(host.textContent).not.toContain("No candidate channels yet.");
  });

  it("never requests the destructive usage queue", async () => {
    const fetchMock = routes();
    await mountConnected(fetchMock);
    const paths = fetchMock.mock.calls.map((call) => new URL(call[0] as unknown as URL).pathname);
    expect(paths.some((path) => path.includes("usage/queue"))).toBe(false);
  });
});
