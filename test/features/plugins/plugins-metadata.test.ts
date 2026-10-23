import { describe, expect, it } from "vite-plus/test";
import { pluginRecordSchema, pluginsResponseSchema } from "../../../src/features/plugins/schemas";

describe("plugin metadata parsing", () => {
  it("preserves unknown resource shapes without interpreting them", () => {
    const metadata = { menus: [{ arbitrary: "payload", html: "<script>bad()</script>" }] };
    expect(pluginRecordSchema.safeParse({ id: "valid-plugin", ...metadata }).success).toBe(true);
    expect(pluginRecordSchema.parse({ id: "valid-plugin", ...metadata }).menus).toEqual(
      metadata.menus,
    );
  });

  it("does not fail the entire list because one plugin ID is malformed", () => {
    const response = pluginsResponseSchema.safeParse({
      plugins_enabled: true,
      plugins: [{ id: "valid" }, { id: "../invalid", menus: [{ html: "<script>" }] }],
    });
    expect(response.success).toBe(true);
  });
});
