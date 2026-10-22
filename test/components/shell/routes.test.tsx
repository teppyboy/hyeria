import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router";
import { Providers } from "../../../src/app/providers";
import { sessionStore } from "../../../src/stores/session";
import { preferencesStore } from "../../../src/stores/preferences";
import { appRoutes } from "../../../src/app/router";

const MANAGEMENT_KEY = "super-secret-management-key";
const API_BASE = "http://127.0.0.1:8317";

let root: Root | undefined;
function mount(path: string) {
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
async function settle() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}
function routerSnapshot(router: ReturnType<typeof createMemoryRouter>) {
  return JSON.stringify(router.state.location);
}
afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  sessionStore.getState().disconnect();
  preferencesStore.getState().setLanguage(null);
});

describe("protected routing", () => {
  it("redirects unauthenticated users to login and keeps only a safe internal path", async () => {
    const { host, router } = mount("/config?secret=no#ignored");
    await settle();
    expect(router.state.location.pathname).toBe("/login");
    expect(host.textContent).toContain("Connect to your CLI Proxy API server");
    expect(routerSnapshot(router)).not.toContain("secret=no");
    expect(host.innerHTML).not.toContain("secret=no");
  });

  it("returns a successful login from /config to /config", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 200 })),
    );
    const { router } = mount("/config");
    await settle();
    expect(router.state.location.pathname).toBe("/login");
    await act(async () => {
      await sessionStore.getState().connect({
        apiBase: API_BASE,
        managementKey: MANAGEMENT_KEY,
        remember: false,
      });
    });
    await settle();
    expect(sessionStore.getState().isAuthenticated).toBe(true);
    expect(router.state.location.pathname).toBe("/config");
  });

  it("never places the management key in route state, URL or rendered output", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 200 })),
    );
    const { host, router } = mount("/quota?secret=no#ignored");
    await settle();
    await act(async () => {
      await sessionStore.getState().connect({
        apiBase: API_BASE,
        managementKey: MANAGEMENT_KEY,
        remember: false,
      });
    });
    await settle();
    expect(router.state.location.pathname).toBe("/quota");
    expect(routerSnapshot(router)).not.toContain(MANAGEMENT_KEY);
    expect(window.location.href).not.toContain(MANAGEMENT_KEY);
    expect(host.innerHTML).not.toContain(MANAGEMENT_KEY);
  });

  it("renders authenticated navigation landmarks", async () => {
    sessionStore.setState({ isAuthenticated: true });
    const { host } = mount("/config");
    await settle();
    expect(host.querySelector("header")).not.toBeNull();
    expect(host.querySelector("nav[aria-label='Main navigation']")).not.toBeNull();
    expect(host.querySelector("main#main-content")).not.toBeNull();
  });

  it("localizes placeholder page text", async () => {
    sessionStore.setState({ isAuthenticated: true });
    preferencesStore.getState().setLanguage("ru");
    const { host } = mount("/quota");
    await settle();
    expect(host.textContent).toContain("Эта страница пока недоступна.");
    expect(host.textContent).not.toContain("This page is not available yet.");
  });

  it("keeps the router on the shared route table", () => {
    expect(appRoutes).toHaveLength(1);
    expect(appRoutes[0]?.path).toBe("*");
  });
});
