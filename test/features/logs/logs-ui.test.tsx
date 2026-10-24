import { afterEach, describe, expect, it } from "vite-plus/test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ErrorLogDownloads } from "../../../src/features/logs/components/ErrorLogDownloads";
import { LogFilters } from "../../../src/features/logs/components/LogFilters";
import { LogViewer } from "../../../src/features/logs/components/LogViewer";
import { preferencesStore } from "../../../src/stores/preferences";

let root: Root | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  preferencesStore.getState().setLanguage(null);
});

function mount(element: React.ReactNode) {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root?.render(element));
  return host;
}

describe("logs UI", () => {
  it("keeps the viewer scrolling inside its own bounded region", () => {
    const host = mount(
      <LogViewer
        batches={[
          {
            lines: ["request accepted"],
            lineCount: 1,
            latestTimestamp: 1,
            nextCursor: "",
            cursorReset: false,
          },
        ]}
        isPending={false}
        isError={false}
        search=""
        showManagement={false}
      />,
    );

    const viewer = host.querySelector("pre");
    expect(viewer?.className).toContain("overflow-auto");
    expect(viewer?.className).toContain("max-h-[32rem]");
    expect(viewer?.closest('[data-slot="log-viewer"]')?.className).toContain("max-w-full");
    expect(viewer?.closest('[data-slot="log-viewer"]')?.className).toContain("overflow-x-auto");
  });

  it("filters management lines and searches across fetched pages", () => {
    const host = mount(
      <LogViewer
        batches={[
          {
            lines: ["request accepted", "management request hidden", "request failed"],
            lineCount: 3,
            latestTimestamp: 1,
            nextCursor: "",
            cursorReset: false,
          },
        ]}
        isPending={false}
        isError={false}
        search="failed"
        showManagement={false}
      />,
    );

    expect(host.textContent).toBe("request failed");
  });

  it("does not offer downloads for server-listed unsafe names", () => {
    const host = mount(
      <ErrorLogDownloads
        files={[
          { name: "error-safe.log", size: 1, modified: 1, downloadable: true },
          { name: "../not-safe.log", size: 1, modified: 1, downloadable: false },
        ]}
        isPending={false}
        isError={false}
        busy={false}
        onDownload={() => undefined}
      />,
    );

    expect(host.querySelectorAll("button")).toHaveLength(1);
    expect(host.textContent).toContain("../not-safe.log");
  });

  it("keeps the management checkbox connected to the filter state", () => {
    let showManagement = false;
    const host = mount(
      <LogFilters
        search=""
        showManagement={showManagement}
        onSearchChange={() => undefined}
        onShowManagementChange={(value) => {
          showManagement = value;
        }}
      />,
    );
    const checkbox = host.querySelector<HTMLInputElement>("input[type='checkbox']");
    expect(checkbox?.checked).toBe(false);
    act(() => {
      checkbox?.click();
    });
    expect(showManagement).toBe(true);
  });
});
