import { describe, expect, it } from "vite-plus/test";
import { configNodePath } from "../../../src/lib/config/config-paths";

describe("configNodePath", () => {
  it("builds a v8 config node path from mapping keys", () => {
    expect(configNodePath(["api-keys", "0"])).toBe("/config/api-keys/0");
    expect(configNodePath(["management", "secret-key"])).toBe("/config/management/secret-key");
  });

  it("percent-encodes each segment so reserved characters stay inside one key", () => {
    expect(configNodePath(["providers", "a b?c#d"])).toBe("/config/providers/a%20b%3Fc%23d");
    expect(configNodePath(["ünï"])).toBe("/config/%C3%BCn%C3%AF");
  });

  it("rejects an empty path because the root is not a node", () => {
    expect(() => configNodePath([])).toThrow(TypeError);
  });

  it.each([[""], ["."], [".."]])("rejects the segment %j", (segment) => {
    expect(() => configNodePath(["management", segment])).toThrow(TypeError);
  });

  it("rejects segments containing a slash so keys cannot escape their level", () => {
    expect(() => configNodePath(["providers", "a/b"])).toThrow(TypeError);
  });
});
