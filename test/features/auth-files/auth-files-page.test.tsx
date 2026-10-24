import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router";
import { Providers } from "../../../src/app/providers";
import { appRoutes } from "../../../src/app/router";
import { sessionStore } from "../../../src/stores/session";
import { preferencesStore } from "../../../src/stores/preferences";
import { useUiStore } from "../../../src/stores/ui";
import listFixture from "../../fixtures/v8/credentials-list.json";

const API_BASE = "http://cpa.example.invalid";
const SECRET = "sk-live-do-not-render-123";

let root: Root | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  sessionStore.getState().disconnect();
  preferencesStore.getState().setLanguage(null);
  useUiStore.getState().reset();
});

type Responder = (path: string, init: RequestInit | undefined) => Response | Promise<Response>;

/** Routes `/config` (the connect probe) to a config document; `responder` handles everything else. */
function stubApi(responder: Responder) {
  const fetchMock = vi.fn(async (input: URL, init?: RequestInit) => {
    const path = new URL(input).pathname.replace("/v8/management", "");
    if (path === "/config") return new Response(JSON.stringify({ "config-version": 8 }));
    return responder(path, init);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function connect(responder: Responder) {
  stubApi(responder);
  await sessionStore
    .getState()
    .connect({ apiBase: API_BASE, managementKey: "mk", remember: false });
}

function mountRoute(path: string) {
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

async function waitForRows(host: HTMLElement) {
  await vi.waitFor(() => expect(host.querySelector("tbody tr")).not.toBeNull());
}

function rowFor(host: HTMLElement, name: string) {
  const row = [...host.querySelectorAll("tbody tr")].find((tr) => tr.textContent?.includes(name));
  if (!row) throw new Error(`no row for ${name}`);
  return row as HTMLElement;
}

function buttonIn(scope: HTMLElement, label: string) {
  const button = [...scope.querySelectorAll("button")].find((b) => b.textContent === label);
  if (!button) throw new Error(`no button ${label}`);
  return button;
}

const fileRow = { ...listFixture.files[0], name: "user.json", id: "user.json" };
const runtimeRow = listFixture.files[1];

describe("auth files page", () => {
  it("is reachable at /auth-files instead of the placeholder page", async () => {
    await connect(() => new Response("{}", { status: 404 }));
    stubApi((path) => {
      if (path === "/credentials") return new Response(JSON.stringify({ files: [fileRow] }));
      return new Response("{}", { status: 404 });
    });
    const { host, router } = mountRoute("/auth-files");
    await waitForRows(host);
    expect(router.state.location.pathname).toBe("/auth-files");
    expect([...host.querySelectorAll("h1")].map((h) => h.textContent)).toContain("Auth files");
    expect(host.textContent).not.toContain("This page is not available yet.");
  });

  it("gives the page one workspace header with safe actions grouped apart from delete", async () => {
    await connectAndList([fileRow]);
    const { host } = mountRoute("/auth-files");
    await waitForRows(host);

    expect(host.querySelectorAll("[data-slot='workspace-header']")).toHaveLength(1);
    expect(host.querySelector("[data-slot='workspace-header'] h1")?.textContent).toBe("Auth files");
    const safeGroup = host.querySelector("[data-slot='action-group'][data-destructive='false']");
    const destructiveGroup = host.querySelector(
      "[data-slot='action-group'][data-destructive='true']",
    );
    expect(safeGroup).not.toBeNull();
    expect(destructiveGroup).not.toBeNull();
    expect(buttonIn(host, "Refresh").closest("[data-slot='action-group']")).toBe(safeGroup);
    expect(buttonIn(host, "Delete all").closest("[data-slot='action-group']")).toBe(
      destructiveGroup,
    );
    expect(buttonIn(host, "Upload").closest("[data-slot='action-group']")).toBe(safeGroup);
    expect(host.querySelector("table")?.parentElement?.className).toContain("overflow-x-auto");
    const row = rowFor(host, "user.json");
    const rowDelete = buttonIn(row, "Delete").closest("[data-slot='action-group']");
    expect(rowDelete?.getAttribute("data-destructive")).toBe("true");
    expect(buttonIn(row, "Download").closest("[data-slot='action-group']")).not.toBe(rowDelete);
    expect(
      buttonIn(row, "Download")
        .closest("[data-slot='action-group']")
        ?.getAttribute("data-destructive"),
    ).toBe("false");
  });

  it("lists metadata rows without credential contents", async () => {
    await connect(() => new Response("{}", { status: 404 }));
    stubApi((path) => {
      if (path === "/credentials")
        return new Response(
          JSON.stringify({
            files: [{ ...fileRow, access_token: SECRET, email: "x@example.invalid" }],
          }),
        );
      return new Response("{}", { status: 404 });
    });
    const { host } = mountRoute("/auth-files");
    await waitForRows(host);
    expect(host.textContent).toContain("user.json");
    expect(host.textContent).not.toContain(SECRET);
    expect(host.textContent).not.toContain("x@example.invalid");
  });

  it("does not render the internal auth index in file details", async () => {
    await connectAndList([fileRow]);
    const { host } = mountRoute("/auth-files");
    await waitForRows(host);

    act(() => buttonIn(rowFor(host, "user.json"), "Details").click());
    await vi.waitFor(() =>
      expect(document.querySelector('[data-slot="dialog-content"]')).not.toBeNull(),
    );
    expect(document.querySelector('[data-slot="dialog-content"]')?.textContent).not.toContain(
      fileRow.auth_index,
    );
    expect(document.querySelector('[data-slot="dialog-content"]')?.textContent).not.toContain(
      "Auth index",
    );
  });

  it("disables per-file actions for runtime-only entries with no file name", async () => {
    await connect(() => new Response("{}", { status: 404 }));
    stubApi((path) => {
      if (path === "/credentials") return new Response(JSON.stringify({ files: [runtimeRow] }));
      return new Response("{}", { status: 404 });
    });
    const { host } = mountRoute("/auth-files");
    await waitForRows(host);
    const row = rowFor(host, "runtime-example");
    for (const label of ["Disable", "Download", "Delete"])
      expect(buttonIn(row, label).disabled).toBe(true);
  });

  it("asks for confirmation before deleting and sends nothing when cancelled", async () => {
    const fetchMock = await connectAndList([fileRow]);
    const { host } = mountRoute("/auth-files");
    await waitForRows(host);

    act(() => buttonIn(rowFor(host, "user.json"), "Delete").click());
    await vi.waitFor(() => expect(useUiStore.getState().confirm).not.toBeNull());
    expect(useUiStore.getState().confirm?.destructive).toBe(true);
    expect(useUiStore.getState().confirm?.description).toContain("user.json");
    const deleteButton = rowFor(host, "user.json").querySelector<HTMLButtonElement>(
      'button[aria-label="Delete: user.json"]',
    );
    expect(deleteButton).not.toBeNull();
    await act(async () => useUiStore.getState().resolveConfirm(false));
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(false);
  });

  it("deletes one file after confirmation", async () => {
    const fetchMock = await connectAndList([fileRow], { delete: true });
    const { host } = mountRoute("/auth-files");
    await waitForRows(host);

    act(() => buttonIn(rowFor(host, "user.json"), "Delete").click());
    await vi.waitFor(() => expect(useUiStore.getState().confirm).not.toBeNull());
    await act(async () => useUiStore.getState().resolveConfirm(true));
    await vi.waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([input, init]) =>
            init?.method === "DELETE" && new URL(input).search === "?name=user.json",
        ),
      ).toBe(true),
    );
  });

  it("confirms before deleting all and sends the all=true request", async () => {
    const fetchMock = await connectAndList([fileRow], { deleteAll: true });
    const { host } = mountRoute("/auth-files");
    await waitForRows(host);

    act(() => buttonIn(host, "Delete all").click());
    await vi.waitFor(() => expect(useUiStore.getState().confirm).not.toBeNull());
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(false);
    await act(async () => useUiStore.getState().resolveConfirm(true));
    await vi.waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([input, init]) => init?.method === "DELETE" && new URL(input).search === "?all=true",
        ),
      ).toBe(true),
    );
  });

  it("toggles disabled state by name", async () => {
    const fetchMock = await connectAndList([fileRow], { status: true });
    const { host } = mountRoute("/auth-files");
    await waitForRows(host);

    act(() => buttonIn(rowFor(host, "user.json"), "Disable").click());
    await vi.waitFor(() =>
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PATCH")).toBe(true),
    );
    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH");
    expect(JSON.parse(patch?.[1]?.body as string)).toEqual({ name: "user.json", disabled: true });
  });

  it("shows a generic error without echoing server text", async () => {
    await connectAndList([fileRow], {
      status: true,
      statusResponse: () =>
        new Response(JSON.stringify({ error: "internal", message: "leaked upstream detail" }), {
          status: 500,
        }),
    });
    const { host } = mountRoute("/auth-files");
    await waitForRows(host);

    act(() => buttonIn(rowFor(host, "user.json"), "Disable").click());
    await vi.waitFor(() =>
      expect(useUiStore.getState().notifications.at(-1)?.message).toBe(
        "The auth file action could not be completed.",
      ),
    );
    expect(JSON.stringify(useUiStore.getState().notifications)).not.toContain("leaked");
  });

  it("downloads the file blob under a sanitized save name", async () => {
    const createObjectURL = vi.fn(() => "blob:auth-test");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL, revokeObjectURL }));
    const saved: { href: string; download: string }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      saved.push({ href: this.href, download: this.download });
    });
    await connectAndList([fileRow], { download: true });
    const { host } = mountRoute("/auth-files");
    await waitForRows(host);

    act(() => buttonIn(rowFor(host, "user.json"), "Download").click());
    await vi.waitFor(() => expect(saved).toHaveLength(1));
    expect(saved[0]).toEqual({ href: "blob:auth-test", download: "user.json" });
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  });
});

/** Connects, then serves the list plus whichever mutation endpoints the test enables. */
async function connectAndList(
  files: unknown[],
  options: {
    delete?: boolean;
    deleteAll?: boolean;
    status?: boolean;
    statusResponse?: () => Response;
    download?: boolean;
  } = {},
) {
  await connect(() => new Response("{}", { status: 404 }));
  return stubApi((path, init) => {
    if (path === "/credentials" && init?.method !== "DELETE")
      return new Response(JSON.stringify({ files }));
    if (path === "/credentials" && options.delete) return new Response("{}");
    if (path === "/credentials" && options.deleteAll)
      return new Response(JSON.stringify({ status: "ok", deleted: 1 }));
    if (path === "/credentials/status" && options.status)
      return options.statusResponse?.() ?? new Response("{}");
    if (path === "/credentials/download" && options.download)
      return new Response("{}", { status: 200 });
    return new Response("{}", { status: 404 });
  });
}
