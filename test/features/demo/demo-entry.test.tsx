import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { Providers } from "../../../src/app/providers";
import { DemoBanner } from "../../../src/features/demo/DemoBanner";
import { LoginPage } from "../../../src/routes/login";
import {
  createSessionStore,
  sessionStore,
  type DemoApiTransport,
} from "../../../src/stores/session";
import { preferencesStore } from "../../../src/stores/preferences";

// SAFETY: This test fake deliberately ignores generic response types; the bootstrap only checks identity.
const transport = {
  get: vi.fn(async () => ({})),
  post: vi.fn(async () => ({})),
  put: vi.fn(async () => ({})),
  patch: vi.fn(async () => ({})),
  delete: vi.fn(async () => ({})),
  getText: vi.fn(async () => ""),
  getBlob: vi.fn(async () => new Blob()),
  postForm: vi.fn(async () => ({})),
} as unknown as DemoApiTransport;

let root: Root | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  sessionStore.getState().disconnect();
  preferencesStore.getState().setLanguage(null);
});

describe("demo bootstrap", () => {
  it("authenticates an ephemeral session without storage or a production probe", () => {
    const storage = { load: vi.fn(), save: vi.fn(), clear: vi.fn() };
    const store = createSessionStore({ storage });
    store.getState().initializeDemo(transport);

    expect(store.getState()).toMatchObject({
      isAuthenticated: true,
      isDemo: true,
      apiBase: null,
      managementKey: null,
      remember: false,
    });
    expect(store.getState().getClient()).toBe(transport);
    expect(storage.load).not.toHaveBeenCalled();
    expect(storage.save).not.toHaveBeenCalled();
    expect(storage.clear).not.toHaveBeenCalled();
  });

  it("localizes the shared demo copy", () => {
    preferencesStore.getState().setLanguage("ru");
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() =>
      root?.render(
        <MemoryRouter>
          <DemoBanner />
        </MemoryRouter>,
      ),
    );

    expect(host.textContent).toContain("Интерактивная демонстрация.");
    expect(host.textContent).toContain("Действия имитируются");
    expect(host.textContent).toContain("после перезагрузки");
  });

  it("localizes the demo login copy without exposing credential controls", () => {
    preferencesStore.getState().setLanguage("ru");
    sessionStore.getState().initializeDemo(transport);
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() =>
      root?.render(
        <Providers>
          <MemoryRouter initialEntries={["/login"]}>
            <LoginPage />
          </MemoryRouter>
        </Providers>,
      ),
    );

    expect(host.textContent).toContain(
      "Эта демонстрация не использует адрес API или ключ управления",
    );
    expect(host.textContent).toContain("Открыть обзор демонстрации");
    expect(host.querySelector('input[autocomplete="url"]')).toBeNull();
    expect(host.querySelector('input[type="password"]')).toBeNull();
  });
});
