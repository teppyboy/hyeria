import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vite-plus/test";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");

describe("release checks", () => {
  it("validates the declared license and dependency notices", () => {
    expect(() =>
      execFileSync("node", ["scripts/check-licenses.mjs"], { cwd: root, stdio: "pipe" }),
    ).not.toThrow();
  });
});
