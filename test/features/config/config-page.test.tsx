import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Providers } from "../../../src/app/providers";
import { ConfigPage } from "../../../src/features/config/routes/ConfigPage";
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
  sessionStore.getState().disconnect();
});

async function settle() {
  for (let i = 0; i < 6; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
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
  return host.querySelector<HTMLTextAreaElement>("textarea");
}

function saveButton(host: HTMLElement) {
  return [...host.querySelectorAll("button")].find((button) => button.textContent === "Save") as
    | HTMLButtonElement
    | undefined;
}

async function typeDraft(host: HTMLElement, value: string) {
  // The native setter bypasses React's value tracking so the change event fires as a user edit.
  await act(async () => {
    const element = editor(host);
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(
      element,
      value,
    );
    element?.dispatchEvent(new Event("input", { bubbles: true }));
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
    expect(editor(host)?.getAttribute("aria-label")).toBe("Config YAML");
    expect(editor(host)?.value).toBe(configYaml);
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
    const writes = fetchMock.mock.calls.filter(([, init]) => init?.method === "PUT");
    expect(writes).toHaveLength(0);
  });

  it("writes the draft text verbatim after it validates", async () => {
    const draft = "# keep this comment\nport:   8317\n";
    const { host, fetchMock } = await mountPage(() => new Response(configYaml));
    await typeDraft(host, draft);
    await act(async () => saveButton(host)?.click());
    await settle();
    const write = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT");
    expect(write?.[1]?.body).toBe(draft);
    expect(host.querySelector('[role="status"]')?.textContent).toBe("Config saved.");
  });

  it("shows an alert when the write fails", async () => {
    const { host } = await mountPage(
      () => new Response(configYaml),
      () => new Response("{}", { status: 500 }),
    );
    await typeDraft(host, "port: 8317\n");
    await act(async () => saveButton(host)?.click());
    await settle();
    expect(host.querySelector('[role="alert"]')?.textContent).toBe("Config could not be saved.");
  });
});
