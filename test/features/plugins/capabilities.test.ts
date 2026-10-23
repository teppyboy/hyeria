import { describe, expect, it } from "vite-plus/test";
import { pluginCapabilities } from "../../../src/features/plugins/capabilities";

describe("plugin capability normalization", () => {
  it("keeps unknown capability unknown and excludes path-like IDs", () => {
    const snapshot = pluginCapabilities(null, [{ id: "valid" }, { id: "../bad" }, { id: "a/b" }]);
    expect(snapshot.supported).toBeNull();
    expect(snapshot.pluginIds).toEqual(["valid"]);
  });

  it("deduplicates plugin identifiers for navigation", () => {
    expect(pluginCapabilities(true, [{ id: "same" }, { id: "same" }]).pluginIds).toEqual(["same"]);
  });
});
