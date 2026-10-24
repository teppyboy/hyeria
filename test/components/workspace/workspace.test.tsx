import { afterEach, describe, expect, it } from "vite-plus/test";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Button } from "../../../src/components/ui/button";
import { ActionGroup } from "../../../src/components/workspace/ActionGroup";
import { StatusCell } from "../../../src/components/workspace/StatusCell";
import { WorkspaceHeader } from "../../../src/components/workspace/WorkspaceHeader";
import { WorkspaceState } from "../../../src/components/workspace/WorkspaceState";
import { preferencesStore } from "../../../src/stores/preferences";

let root: Root | undefined;
const render = (children: ReactNode) => {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root?.render(children));
  return host;
};

afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  preferencesStore.getState().setLanguage(null);
});

describe("workspace primitives", () => {
  it("renders one route heading with description, status, and action regions", () => {
    const host = render(
      <WorkspaceHeader
        title="Dashboard"
        description="Understand the current server state."
        status={<span>Connected session</span>}
        actions={<button type="button">Refresh</button>}
      />,
    );

    expect(host.querySelectorAll("h1")).toHaveLength(1);
    expect(host.querySelector("h1")?.textContent).toBe("Dashboard");
    expect(host.textContent).toContain("Understand the current server state.");
    expect(host.querySelector('[data-slot="workspace-status"]')?.textContent).toContain(
      "Connected session",
    );
    expect(host.querySelector('[data-slot="workspace-actions"] button')?.textContent).toBe(
      "Refresh",
    );
    expect(host.querySelector('[data-slot="workspace-actions"]')?.className).toContain("w-full");
    expect(host.querySelector('[data-slot="workspace-actions"]')?.className).toContain("sm:w-auto");
  });

  it("omits the action region when no actions are supplied", () => {
    const host = render(<WorkspaceHeader title="Dashboard" />);
    expect(host.querySelector('[data-slot="workspace-actions"]')).toBeNull();
  });

  it("exposes status cell facts with semantic tone tokens", () => {
    const host = render(<StatusCell label="Version" value="v8.0" tone="success" detail="Ready" />);
    const cell = host.querySelector('[data-slot="status-cell"]');

    expect(cell?.textContent).toContain("Version");
    expect(cell?.textContent).toContain("v8.0");
    expect(cell?.textContent).toContain("Ready");
    expect(cell?.getAttribute("data-tone")).toBe("success");
    expect(cell?.className).toContain("text-success");
    expect(cell?.className).not.toMatch(/#[0-9a-f]/i);
    expect(cell?.querySelector(":scope > p")).toBeNull();
    expect(cell?.querySelector(":scope > dd:last-child")?.textContent).toBe("Ready");
  });

  it("localizes fallback state titles while preserving explicit titles", () => {
    preferencesStore.getState().setLanguage("zh-CN");
    const host = render(<WorkspaceState kind="loading" />);
    expect(host.querySelector("h2")?.textContent).toBe("加载中");

    const explicit = render(<WorkspaceState kind="loading" title="Custom loading" />);
    expect(explicit.querySelector("h2")?.textContent).toBe("Custom loading");
  });

  it("announces workspace state with the appropriate live role", () => {
    expect(
      render(<WorkspaceState kind="loading" title="Loading data" />).querySelector(
        '[role="status"]',
      ),
    ).not.toBeNull();
    expect(
      render(<WorkspaceState kind="success" title="Saved" />).querySelector('[role="status"]'),
    ).not.toBeNull();
    expect(
      render(<WorkspaceState kind="error" title="Could not load" />).querySelector(
        '[role="alert"]',
      ),
    ).not.toBeNull();
  });

  it("preserves action order and marks destructive groups", () => {
    const host = render(
      <ActionGroup destructive>
        <Button variant="outline">Keep</Button>
        <Button variant="destructive">Delete</Button>
      </ActionGroup>,
    );
    const group = host.querySelector('[data-slot="action-group"]');

    expect([...host.querySelectorAll("button")].map((button) => button.textContent)).toEqual([
      "Keep",
      "Delete",
    ]);
    expect(group?.getAttribute("data-destructive")).toBe("true");
    expect(group?.className).toContain("border-destructive");
    expect(
      [...host.querySelectorAll("button")].every((button) => button.className.includes("min-h-11")),
    ).toBe(true);
  });
});
