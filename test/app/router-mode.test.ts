import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { getRouterMode } from "../../src/app/entry/router-mode";
import { appRoutes, createAppRouter } from "../../src/app/router";

afterEach(() => vi.unstubAllEnvs());

describe("getRouterMode", () => {
  it("uses hash routing for the management build mode", () => {
    vi.stubEnv("MODE", "management");
    expect(getRouterMode()).toBe("hash");
  });

  it("uses history routing for every other mode", () => {
    vi.stubEnv("MODE", "production");
    expect(getRouterMode()).toBe("history");
  });
});

describe("createAppRouter", () => {
  it("builds a hash router that resolves the shared routes from the URL hash", () => {
    window.history.replaceState(null, "", "/#/");
    const router = createAppRouter("hash");
    expect(router.routes).toHaveLength(appRoutes.length);
    expect(router.state.location.pathname).toBe("/");
    router.dispose();
  });

  it("builds a history router that resolves the shared routes from the URL path", () => {
    window.history.replaceState(null, "", "/");
    const router = createAppRouter("history");
    expect(router.routes).toHaveLength(appRoutes.length);
    expect(router.state.location.pathname).toBe("/");
    router.dispose();
  });
});
