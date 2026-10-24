import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { AppShell } from "../../../src/components/shell/AppShell";
import { Header } from "../../../src/components/shell/Header";
import { preferencesStore } from "../../../src/stores/preferences";
import { useUiStore } from "../../../src/stores/ui";
import { sessionStore } from "../../../src/stores/session";

let root: Root | undefined;
function renderShell() {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() =>
    root?.render(
      <MemoryRouter>
        <AppShell>
          <h1>Protected content</h1>
        </AppShell>
      </MemoryRouter>,
    ),
  );
  return host;
}
afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  preferencesStore.getState().setLanguage(null);
  preferencesStore.getState().setTheme("system");
  useUiStore.getState().reset();
  sessionStore.getState().disconnect();
});

describe("application shell", () => {
  it("renders landmarks, navigation, theme/language controls and legal access", () => {
    const host = renderShell();
    expect(host.querySelector("nav[aria-label='Main navigation']")).not.toBeNull();
    expect(host.querySelector("main#main-content h1")?.textContent).toBe("Protected content");
    expect(host.querySelector("#language")).not.toBeNull();
    expect(host.querySelector("#theme")).not.toBeNull();
    expect(host.querySelector("a[href='#main-content']")).not.toBeNull();
  });

  it("opens the legal notice from the header with the canonical source link", () => {
    renderShell();
    const about = document.querySelector<HTMLButtonElement>(
      "header button[aria-label='About Hyeria']",
    );
    act(() => about?.click());
    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain("AGPLv3");
    expect(dialog?.textContent).toContain("without any warranty");
    expect(dialog?.querySelector("a[href='https://github.com/teppyboy/hyeria']")).not.toBeNull();
  });

  it("toggles the sidebar from its keyboard-accessible button", () => {
    const host = renderShell();
    const button = host.querySelector<HTMLButtonElement>("button[aria-label='Toggle sidebar']");
    expect(button).not.toBeNull();
    act(() => button?.click());
    expect(useUiStore.getState().sidebarOpen).toBe(false);
    expect(button?.getAttribute("aria-expanded")).toBe("false");
    expect(host.querySelector("aside#app-navigation")?.className).toContain("sidebar-collapsed");
  });

  it("renders navigation icons with accessible labels in the collapsed rail", () => {
    const host = renderShell();
    const navigation = host.querySelector("aside#app-navigation");
    expect(navigation?.querySelector("a[href='/'] svg")).not.toBeNull();
    expect(navigation?.querySelector("a[href='/config'] svg")).not.toBeNull();
    expect(navigation?.querySelector("a[href='/']")?.textContent).toContain("Dashboard");
  });

  it("marks the collapsed rail for hover and keyboard expansion", () => {
    const host = renderShell();
    const button = host.querySelector<HTMLButtonElement>("button[aria-label='Toggle sidebar']");
    act(() => button?.click());
    const aside = host.querySelector("aside#app-navigation");
    expect(aside?.getAttribute("data-collapsed")).toBe("true");
    expect(aside?.getAttribute("data-hover-expand")).toBe("true");
  });

  it("opens mobile navigation from its keyboard-accessible trigger", () => {
    const host = renderShell();
    const button = host.querySelector<HTMLButtonElement>("button[aria-label='Open navigation']");
    expect(button).not.toBeNull();
    act(() => button?.click());
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
    expect(
      document.body.querySelector('[role="dialog"] nav[aria-label="Main navigation"]'),
    ).not.toBeNull();
  });

  it("closes the mobile sheet when a navigation link is activated", () => {
    renderShell();
    const trigger = document.querySelector<HTMLButtonElement>(
      "button[aria-label='Open navigation']",
    );
    act(() => trigger?.click());
    const link = document.body.querySelector<HTMLAnchorElement>(
      '[role="dialog"] nav[aria-label="Main navigation"] a[href="/config"]',
    );
    expect(link).not.toBeNull();
    act(() => link?.click());
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it("keeps the mobile trigger keyboard-focusable and labelled in the header", () => {
    renderShell();
    const trigger = document.querySelector<HTMLButtonElement>(
      "header button[aria-label='Open navigation']",
    );
    expect(trigger).not.toBeNull();
    expect(trigger?.tagName).toBe("BUTTON");
    expect(trigger?.disabled).toBe(false);
    trigger?.focus();
    expect(document.activeElement).toBe(trigger);
  });

  it("points the desktop sidebar toggle at the navigation it controls", () => {
    const host = renderShell();
    const toggle = host.querySelector("button[aria-label='Toggle sidebar']");
    expect(toggle?.getAttribute("aria-controls")).toBe("app-navigation");
    expect(host.querySelector("aside#app-navigation")).not.toBeNull();
  });

  it("does not expose management credentials in shell output", () => {
    const host = renderShell();
    expect(host.textContent).not.toContain("managementKey");
    expect(host.innerHTML).not.toContain("secret");
  });

  it("distinguishes connected and demo sessions without rendering connection details", () => {
    sessionStore.setState({
      isAuthenticated: true,
      isDemo: false,
      apiBase: "https://private.invalid",
    });
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() =>
      root?.render(
        <MemoryRouter>
          <Header />
        </MemoryRouter>,
      ),
    );
    expect(host.textContent).toContain("Connected session");
    expect(host.textContent).not.toContain("private.invalid");

    act(() => sessionStore.setState({ isDemo: true, apiBase: null, managementKey: null }));
    expect(host.textContent).toContain("Interactive demo");
    expect(host.textContent).not.toContain("managementKey");
  });

  it("exposes safe session status and shell motion hooks without connection details", () => {
    sessionStore.setState({
      isAuthenticated: true,
      isDemo: false,
      apiBase: "https://private.invalid",
    });
    const host = renderShell();
    expect(
      host.querySelector('[data-slot="connection-status"]')?.getAttribute("data-session-mode"),
    ).toBe("connected");
    expect(host.querySelector('[data-shell="app-shell"]')?.className).toContain("motion-shell");
    expect(host.querySelector('[data-slot="connection-status"]')?.textContent).toContain(
      "Connected session",
    );
    expect(host.textContent).not.toContain("private.invalid");
  });

  it("keeps shell controls at the minimum touch target", () => {
    const host = renderShell();
    expect(host.querySelector("#language")?.className).toContain("min-h-11");
    expect(host.querySelector("#language")?.className).toContain("w-12");
    expect(host.querySelector("#language")?.className).toContain("sm:w-auto");
    expect(host.querySelector("#theme")?.className).toContain("min-h-11");
    expect(host.querySelector("#theme")?.className).toContain("w-12");
    expect(host.querySelector("#theme")?.className).toContain("sm:w-auto");
    expect(host.querySelector("button[aria-label='About Hyeria']")?.className).toContain(
      "min-h-11",
    );
    expect(host.querySelector("button[aria-label='Disconnect']")?.className).toContain("min-h-11");
    expect(host.querySelector("button[aria-label='Open navigation']")?.className).toContain(
      "min-h-11",
    );
    expect(host.querySelector("aside#app-navigation a[href='/']")?.className).toContain(
      "sidebar-link",
    );
  });

  it("preserves selected and status styling for reduced-motion users", () => {
    sessionStore.setState({ isAuthenticated: true, isDemo: false });
    const host = renderShell();
    expect(host.querySelector('[data-shell="app-shell"]')?.className).toContain("motion-shell");
    expect(host.querySelector("aside#app-navigation a[aria-current='page']")?.className).toContain(
      "bg-accent",
    );
    expect(host.querySelector('[data-slot="connection-status"]')?.className).toContain(
      "text-muted-foreground",
    );
  });

  it("keeps reduced-motion selectors free of entrance and spatial choreography", () => {
    const css = readFileSync(resolve(process.cwd(), "src/styles/tokens.css"), "utf8");
    const reducedMotion = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reducedMotion).toContain("animation: none");
    expect(reducedMotion).toContain("transform: none");
    expect(reducedMotion).toContain("button:active:not(:disabled)");
    expect(reducedMotion).toContain('.sidebar-link[aria-current="page"]');
    expect(reducedMotion).toContain("#main-content > *");
    expect(reducedMotion).toContain('[data-slot="dialog-content"]');
    expect(reducedMotion).toContain('[data-slot="sheet-content"]');
    expect(reducedMotion).toContain("transition: none");
  });

  it("keeps the desktop sidebar control out of the mobile header and exposes the mobile trigger", () => {
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() =>
      root?.render(
        <MemoryRouter>
          <Header />
        </MemoryRouter>,
      ),
    );
    expect(host.querySelector("button[aria-label='Toggle sidebar']")?.className).toContain(
      "hidden",
    );
    expect(host.querySelector("button[aria-label='Open navigation']")).not.toBeNull();
  });
});
