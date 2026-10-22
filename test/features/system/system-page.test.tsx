import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Providers } from "../../../src/app/providers";
import { SystemPage } from "../../../src/features/system/routes/SystemPage";
import { sessionStore } from "../../../src/stores/session";
import config from "../../fixtures/v8/config.json";
import credentials from "../../fixtures/v8/credentials-list.json";
import latest from "../../fixtures/v8/server-latest-version.json";
import models from "../../fixtures/v8/model-definitions.illustrative.json";

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

describe("system page", () => {
  it("does not show the empty channel state when credential discovery fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: URL) => {
        const path = new URL(input).pathname.replace("/v8/management", "");
        if (path === "/config") return new Response(JSON.stringify(config));
        if (path === "/credentials") return new Response("{}", { status: 502 });
        if (path === "/server/latest-version") return new Response(JSON.stringify(latest));
        return new Response("{}", { status: 404 });
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
          <SystemPage />
        </Providers>,
      ),
    );
    await vi.waitFor(
      () => expect(host.textContent).toContain("Credential summary is unavailable."),
      {
        timeout: 4000,
      },
    );
    expect(host.textContent).not.toContain("No candidate channels yet.");
  });

  it("names each model channel row with its channel label and count", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: URL) => {
        const path = new URL(input).pathname.replace("/v8/management", "");
        if (path === "/config") return new Response(JSON.stringify(config));
        if (path === "/credentials") return new Response(JSON.stringify(credentials));
        if (path === "/server/latest-version") return new Response(JSON.stringify(latest));
        if (path.startsWith("/routing/model-definitions/"))
          return new Response(JSON.stringify(models));
        return new Response("{}", { status: 404 });
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
          <SystemPage />
        </Providers>,
      ),
    );
    await settle();
    expect(host.textContent).toContain("claude");
    expect(host.textContent).toContain("codex");
    expect(host.textContent).toContain("Models: 2");
    expect(host.textContent).not.toContain("user@example.invalid");
  });
});
