import { describe, expect, it, vi } from "vite-plus/test";
import { routerModes } from "../../src/app/entry/build-config";

vi.mock("../../src/app/entry/render-app", () => ({ renderApp: vi.fn() }));

describe("project smoke", () => {
  it("imports the app entry modules", async () => {
    vi.resetModules();
    const main = await import("../../src/app/entry/main");
    vi.resetModules();
    vi.stubEnv("MODE", "management");
    const management = await import("../../src/app/entry/management");
    expect(main.routerMode).toBe("history");
    expect(management.routerMode).toBe("hash");
    vi.unstubAllEnvs();
  });

  it("exposes hash, history, and demo router modes", () => {
    expect(routerModes).toEqual(["hash", "history", "demo"]);
  });
});
