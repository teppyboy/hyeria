import { afterEach, describe, expect, it } from "vite-plus/test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NotificationProvider } from "../../../src/components/feedback/NotificationProvider";
import { ErrorBoundary } from "../../../src/components/feedback/ErrorBoundary";
import { ConfirmDialog } from "../../../src/components/feedback/ConfirmDialog";
import { useUiStore } from "../../../src/stores/ui";
import { preferencesStore } from "../../../src/stores/preferences";

let root: Root | undefined;
function mount(element: React.ReactNode) {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root?.render(element));
  return host;
}
afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  useUiStore.getState().reset();
  preferencesStore.getState().setLanguage(null);
});

describe("feedback components", () => {
  it("announces notifications and allows dismissal", () => {
    useUiStore.getState().notify("Saved", "success");
    const host = mount(<NotificationProvider />);
    expect(host.querySelector('[role="status"]')?.textContent).toContain("Saved");
    expect(host.querySelector("button")?.className).toContain("min-h-11");
    act(() => host.querySelector("button")?.click());
    expect(host.querySelector('[role="status"]')).toBeNull();
  });

  it("localizes the notification dismiss control", () => {
    preferencesStore.getState().setLanguage("zh-CN");
    useUiStore.getState().notify("Saved", "success");
    const host = mount(<NotificationProvider />);
    expect(host.querySelector("button")?.textContent).toBe("关闭通知");
  });

  it("shows a generic error boundary message without exposing arbitrary exception text", () => {
    const host = mount(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>,
    );
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("Something went wrong");
    expect(host.textContent).not.toContain("private detail");
  });

  it("localizes the error boundary fallback text", () => {
    preferencesStore.getState().setLanguage("ru");
    const host = mount(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>,
    );
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("Произошла ошибка.");
    expect(host.textContent).toContain("Повторить");
  });

  it("resolves confirmation based on the user's choice", async () => {
    const pending = useUiStore
      .getState()
      .requestConfirm({ title: "Delete?", description: "Irreversible", destructive: true });
    mount(<ConfirmDialog />);
    expect(useUiStore.getState().confirm?.title).toBe("Delete?");
    act(() => useUiStore.getState().resolveConfirm(true));
    await expect(pending).resolves.toBe(true);
  });
});
function ThrowError(): never {
  throw new Error("private detail");
}
