import { describe, expect, it } from "vite-plus/test";
import {
  applySafeConfigEdits,
  readSafeConfigView,
  serializeConfigDocument,
} from "../../../src/features/config/editor/patch";

const original = {
  management: { "allow-remote": false, unknown: "preserve me" },
  requests: { "proxy-url": "http://proxy.example.invalid:8080" },
  routing: {
    strategy: "round-robin",
    retry: { "request-retry": 2 },
    unsupported: { keep: true },
  },
  observability: {
    logs: { "logging-to-file": false },
    usage: { "usage-statistics-enabled": true },
  },
  plugins: {
    enabled: true,
    configs: {
      codex: { enabled: false, priority: 1, "plugin-unknown": "keep" },
    },
  },
  access: { "management-key": "do-not-expose" },
  oauth: { token: "do-not-expose" },
  "unknown-section": { value: "keep" },
};

describe("safe config document patching", () => {
  it("reads only registered scalar fields, including existing plugin entries", () => {
    expect(readSafeConfigView(original)).toEqual({
      "management.allow-remote": false,
      "requests.proxy-url": "http://proxy.example.invalid:8080",
      "routing.strategy": "round-robin",
      "routing.retry.request-retry": 2,
      "observability.logs.logging-to-file": false,
      "observability.usage.usage-statistics-enabled": true,
      "plugins.enabled": true,
      "plugins.configs.codex.enabled": false,
      "plugins.configs.codex.priority": 1,
    });
    expect(readSafeConfigView(original)).not.toHaveProperty("access.management-key");
    expect(readSafeConfigView(original)).not.toHaveProperty("oauth.token");
  });

  it("hides registered values that fail their field contract", () => {
    const invalid = {
      ...original,
      management: { "allow-remote": "yes" },
      routing: { strategy: "unknown", retry: { "request-retry": -1 } },
      plugins: { configs: { codex: { priority: 1.5 } } },
    };

    const view = readSafeConfigView(invalid);
    expect(view["management.allow-remote"]).toBeUndefined();
    expect(view["routing.strategy"]).toBeUndefined();
    expect(view["routing.retry.request-retry"]).toBeUndefined();
    expect(view["plugins.configs.codex.priority"]).toBeUndefined();
  });

  it("hides proxy URLs with any userinfo authority, including empty userinfo", () => {
    for (const proxyUrl of [
      "http://user:password@proxy.example.invalid:8080",
      "http://user@proxy.example.invalid:8080",
      "http://@proxy.example.invalid:8080",
    ]) {
      const document = { ...original, requests: { "proxy-url": proxyUrl } };
      expect(readSafeConfigView(document)["requests.proxy-url"]).toBeUndefined();
      expect(() =>
        applySafeConfigEdits(original, [{ path: ["requests", "proxy-url"], value: proxyUrl }]),
      ).toThrow(TypeError);
    }

    expect(
      readSafeConfigView({
        ...original,
        requests: { "proxy-url": "http://proxy.example.invalid" },
      })["requests.proxy-url"],
    ).toBe("http://proxy.example.invalid");
  });

  it("patches nested safe fields without reconstructing the document", () => {
    const draft = applySafeConfigEdits(original, [
      { path: ["management", "allow-remote"], value: true },
      { path: ["routing", "retry", "request-retry"], value: 4 },
      { path: ["observability", "logs", "logging-to-file"], value: true },
      { path: ["plugins", "configs", "codex", "priority"], value: 3 },
    ]);

    expect(draft).toMatchObject({
      management: { "allow-remote": true, unknown: "preserve me" },
      routing: { retry: { "request-retry": 4 }, unsupported: { keep: true } },
      observability: { logs: { "logging-to-file": true } },
      plugins: { configs: { codex: { priority: 3, "plugin-unknown": "keep" } } },
      access: { "management-key": "do-not-expose" },
      oauth: { token: "do-not-expose" },
      "unknown-section": { value: "keep" },
    });
    expect(original.management["allow-remote"]).toBe(false);
  });

  it("supports select/text edits and removes only registered fields", () => {
    const draft = applySafeConfigEdits(original, [
      { path: ["requests", "proxy-url"], value: "http://new-proxy.example.invalid" },
      { path: ["routing", "strategy"], value: "round-robin" },
      { path: ["plugins", "enabled"], value: undefined },
      { path: ["plugins", "configs", "codex", "enabled"], value: undefined },
    ]);

    expect(draft.requests).toEqual({ "proxy-url": "http://new-proxy.example.invalid" });
    expect(draft.routing).toMatchObject({ strategy: "round-robin" });
    expect(draft.plugins).toMatchObject({ configs: { codex: { priority: 1 } } });
    expect(draft.plugins).toHaveProperty("configs.codex.plugin-unknown", "keep");
    expect(draft).toHaveProperty("access.management-key", "do-not-expose");
  });

  it("leaves absent fields absent and rejects unregistered or unknown plugin paths", () => {
    const absent = { plugins: { configs: {} } };
    expect(
      applySafeConfigEdits(absent, [{ path: ["management", "allow-remote"], value: undefined }]),
    ).toEqual(absent);
    expect(() =>
      applySafeConfigEdits(original, [{ path: ["access", "management-key"], value: "changed" }]),
    ).toThrow(TypeError);
    expect(() =>
      applySafeConfigEdits(original, [
        { path: ["plugins", "configs", "new-plugin", "enabled"], value: true },
      ]),
    ).toThrow(TypeError);
  });

  it("serializes valid documents and rejects values that are not JSON-safe", () => {
    expect(serializeConfigDocument({ enabled: true, nested: { count: 2 } })).toBe(
      "enabled: true\nnested:\n  count: 2\n",
    );
    expect(() => serializeConfigDocument({ value: undefined })).toThrow(TypeError);
    expect(() => serializeConfigDocument({ value: Number.NaN })).toThrow(TypeError);
    expect(() => serializeConfigDocument({ value: () => true })).toThrow(TypeError);
  });
});
