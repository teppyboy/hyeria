import { describe, expect, it, vi } from "vite-plus/test";
import { routerModes } from "../../src/app/entry/build-config";

describe("project smoke", () => {
  it("runs in a DOM test environment", () => {
    expect(document.createElement("div")).toBeInstanceOf(HTMLElement);
  });

  it("imports the app entry modules", async () => {
    document.body.innerHTML = '<div id="root"></div>';
    vi.resetModules();
    const main = await import("../../src/app/entry/main");
    vi.resetModules();
    vi.stubEnv("MODE", "management");
    const management = await import("../../src/app/entry/management");
    expect(main.routerMode).toBe("history");
    expect(management.routerMode).toBe("hash");
    vi.unstubAllEnvs();
  });

  it("exposes only hash and history router modes", () => {
    expect(routerModes).toEqual(["hash", "history"]);
  });
});
