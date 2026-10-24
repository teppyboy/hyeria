import { afterEach, describe, expect, it } from "vite-plus/test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { App } from "../../src/app/App";
import { Providers } from "../../src/app/providers";
import { preferencesStore } from "../../src/stores/preferences";
import { sessionStore } from "../../src/stores/session";

let root: Root | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  sessionStore.getState().disconnect();
  preferencesStore.getState().setLanguage(null);
});

function render(path: string) {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() =>
    root?.render(
      <Providers>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </Providers>,
    ),
  );
  return host;
}

describe("unavailable routes", () => {
  it.each(["/quick-start", "/not-a-route"])("uses the workspace state surface for %s", (path) => {
    sessionStore.setState({ isAuthenticated: true });
    const host = render(path);

    expect(host.querySelectorAll('[data-slot="workspace-header"]')).toHaveLength(1);
    expect(
      host.querySelector('[data-slot="workspace-state"][data-kind="unavailable"]'),
    ).not.toBeNull();
    expect(host.querySelector("h1")?.textContent).toBe("Hyeria");
    expect(host.textContent).toContain("This page is not available yet.");
  });

  it("keeps unavailable copy localized", () => {
    sessionStore.setState({ isAuthenticated: true });
    preferencesStore.getState().setLanguage("ru");
    const host = render("/quick-start");

    expect(host.textContent).toContain("Эта страница пока недоступна.");
    expect(host.textContent).not.toContain("This page is not available yet.");
  });
});
