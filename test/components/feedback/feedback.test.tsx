import { afterEach, describe, expect, it } from "vite-plus/test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NotificationProvider } from "../../../src/components/feedback/NotificationProvider";
import { ErrorBoundary } from "../../../src/components/feedback/ErrorBoundary";
import { ConfirmDialog } from "../../../src/components/feedback/ConfirmDialog";
import { APP_VERSION, LegalNotice, SOURCE_URL } from "../../../src/components/feedback/LegalNotice";
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

  it("renders a concise About notice with retained project details and repository link", () => {
    const host = mount(<LegalNotice open onOpenChange={() => undefined} />);
    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.querySelector("section h2")?.textContent).toBe("Independent project");
    expect(dialog?.querySelectorAll("section")).toHaveLength(3);
    expect(dialog?.textContent).toContain("Copyright © Hyeria contributors.");
    expect(dialog?.textContent).toContain("AGPLv3");
    expect(dialog?.textContent).toContain(`Version: ${APP_VERSION}`);
    expect(dialog?.textContent).not.toContain("Corresponding Source");
    expect(dialog?.textContent).not.toContain("Network use");
    expect(dialog?.textContent).not.toContain("Build from source");
    expect(dialog?.textContent).not.toContain("Warranty");
    expect(dialog?.textContent).not.toContain("Branding status");
    expect(dialog?.querySelector(`a[href="${SOURCE_URL}"]`)?.textContent).toBe("View repository");
    expect(dialog?.querySelector("button span.sr-only")?.textContent).toBe("Close");
    expect(dialog?.querySelector('[data-legal-scroll="true"]')?.className).toContain(
      "overflow-y-auto",
    );
    expect(host).toBeTruthy();
  });

  it("localizes About section labels", () => {
    preferencesStore.getState().setLanguage("ru");
    mount(<LegalNotice open onOpenChange={() => undefined} />);
    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog?.querySelector("section h2")?.textContent).toBe("Независимый проект");
    expect(dialog?.querySelector(`a[href="${SOURCE_URL}"]`)?.textContent).toBe(
      "Открыть репозиторий",
    );
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
