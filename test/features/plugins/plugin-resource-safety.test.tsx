import { describe, expect, it } from "vite-plus/test";
import { pluginRecordSchema } from "../../../src/features/plugins/schemas";

describe("plugin resource trust boundary", () => {
  it("keeps undocumented menu payloads opaque for future verified renderers", () => {
    const payload = { id: "p", menus: [{ type: "html", html: "<img src=x onerror=alert(1)>" }] };
    const parsed = pluginRecordSchema.parse(payload);
    expect(parsed.menus).toEqual(payload.menus);
    expect(JSON.stringify(parsed)).toContain("onerror");
    // Metadata is data only; current plugin pages render identifiers, never these fields.
  });
});
