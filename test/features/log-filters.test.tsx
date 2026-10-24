import { afterEach, describe, expect, it } from "vite-plus/test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LogFilters } from "../../src/features/logs/components/LogFilters";
import { preferencesStore } from "../../src/stores/preferences";

let root: Root | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  preferencesStore.getState().setLanguage(null);
});

describe("log filters", () => {
  it("gives the management checkbox a 44px hit area", () => {
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() =>
      root?.render(
        <LogFilters
          search=""
          showManagement={false}
          onSearchChange={() => undefined}
          onShowManagementChange={() => undefined}
        />,
      ),
    );

    expect(host.querySelector('input[type="checkbox"]')?.className).toContain("min-h-11");
    expect(host.querySelector('input[type="checkbox"]')?.className).toContain("min-w-11");
  });
});
