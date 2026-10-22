import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router";
import { EditorView } from "@codemirror/view";
import { Providers } from "../../../src/app/providers";
import { appRoutes } from "../../../src/app/router";
import { ConfigPage } from "../../../src/features/config/routes/ConfigPage";
import { preferencesStore } from "../../../src/stores/preferences";
import { sessionStore } from "../../../src/stores/session";
import config from "../../fixtures/v8/config.json";
import configYaml from "../../fixtures/v8/config.yaml?raw";

const API_BASE = "http://cpa.example.invalid";
let root: Root | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  preferencesStore.getState().setLanguage(null);
  sessionStore.getState().disconnect();
});

async function settle() {
  for (let i = 0; i < 6; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

function confirmButton(scope: HTMLElement | null) {
  return [...(scope?.querySelectorAll("button") ?? [])].find(
    (button) => button.textContent === "Save changes",
  );
}

async function mountPage(yamlResponse: () => Response, writeResponse?: () => Response) {
  const fetchMock = vi.fn(async (input: URL, init?: RequestInit) => {
    const path = new URL(input).pathname.replace("/v8/management", "");
    if (path === "/config") return new Response(JSON.stringify(config));
    if (path === "/config.yaml" && init?.method === "PUT")
      return (
        writeResponse?.() ?? new Response(JSON.stringify({ status: "ok", "config-version": 8 }))
      );
    if (path === "/config.yaml") return yamlResponse();
    return new Response("{}", { status: 404 });
  });
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
        <ConfigPage />
      </Providers>,
    ),
  );
  await settle();
  return { host, fetchMock };
}

function editor(host: HTMLElement) {
  return host.querySelector<HTMLElement>(".cm-editor");
}

function editorText(host: HTMLElement) {
  return editorView(host)?.state.doc.toString();
}

function editorView(host: HTMLElement) {
  const content = host.querySelector<HTMLElement>(".cm-content");
  return content ? EditorView.findFromDOM(content) : null;
}

function dialog() {
  return document.body.querySelector<HTMLElement>('[role="dialog"]');
}

function saveButton(host: HTMLElement) {
  return [...host.querySelectorAll("button")].find((button) => button.textContent === "Save") as
    | HTMLButtonElement
    | undefined;
}

async function typeDraft(host: HTMLElement, value: string) {
  // Replacing the whole document dispatches a user-style change through the CodeMirror view.
  await act(async () => {
    const view = editorView(host);
    view?.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
  });
}

describe("config page", () => {
  it("shows a loading state until the raw YAML is read", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: URL) => {
        const path = new URL(input).pathname.replace("/v8/management", "");
        if (path === "/config") return new Response(JSON.stringify(config));
        return new Promise<Response>(() => {});
      }),
    );
    await sessionStore
      .getState()
      .connect({ apiBase: API_BASE, managementKey: "mk", remember: false });
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() =>
      root?.render(
        <Providers>
          <ConfigPage />
        </Providers>,
      ),
    );
    await settle();
    expect(host.textContent).toContain("Loading config");
    expect(editor(host)).toBeNull();
  });

  it("shows the loaded YAML verbatim in an accessible editor", async () => {
    const { host } = await mountPage(() => new Response(configYaml));
    expect(host.querySelector(".cm-content")?.getAttribute("aria-label")).toBe("Config YAML");
    expect(editorText(host)).toBe(configYaml);
  });

  it("shows the read-only visual summary above the raw YAML editor", async () => {
    const { host } = await mountPage(() => new Response(configYaml));
    const summary = [...host.querySelectorAll("li")].map((item) => item.textContent);
    expect(summary).toEqual(["management", "requests", "routing", "plugins"]);
    expect(host.querySelector("#config-raw-yaml .cm-editor")).not.toBeNull();
  });

  it("shows an alert when the YAML cannot be read", async () => {
    const { host } = await mountPage(() => new Response("{}", { status: 502 }));
    // A 5xx read is retried once after a delay, so the alert appears after the retry settles.
    await vi.waitFor(() => expect(host.querySelector('[role="alert"]')).not.toBeNull(), {
      timeout: 4000,
    });
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      "Config could not be loaded.",
    );
    expect(editor(host)).toBeNull();
  });

  it("rejects invalid YAML before any write request", async () => {
    const { host, fetchMock } = await mountPage(() => new Response(configYaml));
    await typeDraft(host, "port: [");
    await act(async () => saveButton(host)?.click());
    await settle();
    expect(host.querySelector('[role="alert"]')?.textContent).toBe("YAML is malformed.");
    expect(dialog()).toBeNull();
    const writes = fetchMock.mock.calls.filter(([, init]) => init?.method === "PUT");
    expect(writes).toHaveLength(0);
  });

  it("opens a redacted diff before writing and writes the draft verbatim once confirmed", async () => {
    const draft = "# keep this comment\nport:   8317\nrequest-retry: 4\n";
    const { host, fetchMock } = await mountPage(() => new Response(configYaml));
    await typeDraft(host, draft);
    await act(async () => saveButton(host)?.click());
    await settle();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(false);
    expect(dialog()?.textContent).toContain("request-retry");
    const confirm = [...(dialog()?.querySelectorAll("button") ?? [])].find(
      (button) => button.textContent === "Save changes",
    );
    await act(async () => confirm?.click());
    await settle();
    const write = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT");
    expect(write?.[1]?.body).toBe(draft);
    expect(dialog()).toBeNull();
    expect(host.querySelector('[role="status"]')?.textContent).toBe("Config saved.");
  });

  it("does not write when the diff is cancelled", async () => {
    const { host, fetchMock } = await mountPage(() => new Response(configYaml));
    await typeDraft(host, "port: 1\n");
    await act(async () => saveButton(host)?.click());
    await settle();
    const cancel = [...(dialog()?.querySelectorAll("button") ?? [])].find(
      (button) => button.textContent === "Cancel",
    );
    await act(async () => cancel?.click());
    await settle();
    expect(dialog()).toBeNull();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(false);
  });

  it("maps a 422 write rejection to a localized message without the server text", async () => {
    const { host } = await mountPage(
      () => new Response(configYaml),
      () =>
        new Response(JSON.stringify({ error: "invalid_config", message: "sk-live-987654321" }), {
          status: 422,
        }),
    );
    await typeDraft(host, "port: 1\n");
    await act(async () => saveButton(host)?.click());
    await settle();
    await act(async () => confirmButton(dialog())?.click());
    await settle();
    expect(host.querySelector('[role="alert"]')?.textContent).toBe(
      "The server rejected this configuration as invalid.",
    );
    expect(host.textContent).not.toContain("sk-live");
  });

  it("maps a read-only field rejection to its own message", async () => {
    const { host } = await mountPage(
      () => new Response(configYaml),
      () => new Response(JSON.stringify({ error: "read_only_field" }), { status: 400 }),
    );
    await typeDraft(host, "port: 1\n");
    await act(async () => saveButton(host)?.click());
    await settle();
    await act(async () => confirmButton(dialog())?.click());
    await settle();
    expect(host.querySelector('[role="alert"]')?.textContent).toBe(
      "The config contains a field that is read-only on the server.",
    );
  });

  it("mounts the page at /config through the app router", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: URL) => {
        const path = new URL(input).pathname.replace("/v8/management", "");
        if (path === "/config.yaml") return new Response(configYaml);
        return new Response(JSON.stringify(config));
      }),
    );
    await sessionStore
      .getState()
      .connect({ apiBase: API_BASE, managementKey: "mk", remember: false });
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    const router = createMemoryRouter(appRoutes, { initialEntries: ["/config"] });
    act(() =>
      root?.render(
        <Providers>
          <RouterProvider router={router} />
        </Providers>,
      ),
    );
    await vi.waitFor(() => expect(editorText(host)).toBe(configYaml), { timeout: 2000 });
    expect(router.state.location.pathname).toBe("/config");
    expect(host.textContent).not.toContain("This page is not available yet.");
  });

  it("localizes visible strings and the editor label to the selected language", async () => {
    preferencesStore.getState().setLanguage("ru");
    const { host } = await mountPage(() => new Response(configYaml));
    expect(host.querySelector("h1")?.textContent).toBe("Конфигурация");
    expect(host.querySelector(".cm-content")?.getAttribute("aria-label")).toBe("YAML конфигурации");
    expect(
      [...host.querySelectorAll("button")].some((button) => button.textContent === "Сохранить"),
    ).toBe(true);
  });

  it("shows an alert when the write fails", async () => {
    const { host } = await mountPage(
      () => new Response(configYaml),
      () => new Response("{}", { status: 500 }),
    );
    await typeDraft(host, "port: 8317\n");
    await act(async () => saveButton(host)?.click());
    await settle();
    await act(async () => confirmButton(dialog())?.click());
    await settle();
    expect(host.querySelector('[role="alert"]')?.textContent).toBe("Config could not be saved.");
  });
});
