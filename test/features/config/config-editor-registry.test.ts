import { describe, expect, it } from "vite-plus/test";
import {
  SAFE_CONFIG_FIELDS,
  SAFE_CONFIG_SECTIONS,
} from "../../../src/features/config/editor/registry";

describe("safe config editor registry", () => {
  it("registers exactly the evidenced safe paths", () => {
    expect(SAFE_CONFIG_FIELDS.map((field) => field.path.join("."))).toEqual([
      "management.allow-remote",
      "requests.proxy-url",
      "routing.strategy",
      "routing.retry.request-retry",
      "observability.logs.logging-to-file",
      "observability.usage.usage-statistics-enabled",
      "plugins.enabled",
      "plugins.configs.<plugin>.enabled",
      "plugins.configs.<plugin>.priority",
    ]);
  });

  it("marks every visual field as non-secret and excludes credential sections", () => {
    expect(SAFE_CONFIG_FIELDS.every((field) => field.secret === false)).toBe(true);
    expect(
      SAFE_CONFIG_FIELDS.some((field) =>
        ["access", "oauth", "api-keys", "secret-key"].some((part) => field.path.includes(part)),
      ),
    ).toBe(false);
  });

  it("only offers the verified routing strategy and declares numeric constraints", () => {
    const strategy = SAFE_CONFIG_FIELDS.find(
      (field) => field.path.join(".") === "routing.strategy",
    );
    expect(strategy?.options).toEqual([
      { value: "round-robin", labelKey: "config.option.roundRobin" },
    ]);

    const retry = SAFE_CONFIG_FIELDS.find(
      (field) => field.path.join(".") === "routing.retry.request-retry",
    );
    expect(retry).toMatchObject({ minimum: 0, integer: true });

    const priority = SAFE_CONFIG_FIELDS.find(
      (field) => field.path.join(".") === "plugins.configs.<plugin>.priority",
    );
    expect(priority).toMatchObject({ integer: true });
    expect(priority).not.toHaveProperty("defaultValue");
  });

  it("has no duplicate concrete registry paths and exposes all editor sections", () => {
    const paths = SAFE_CONFIG_FIELDS.map((field) => field.path.join("."));
    expect(new Set(paths).size).toBe(paths.length);
    expect(SAFE_CONFIG_SECTIONS.map((section) => section.id)).toEqual([
      "management",
      "requests",
      "routing",
      "observability",
      "plugins",
      "advanced-yaml",
    ]);
  });
});
