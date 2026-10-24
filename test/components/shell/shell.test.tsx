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
