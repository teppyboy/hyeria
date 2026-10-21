import { describe, expect, it } from "vite-plus/test";
import { parseCapabilityHeaders } from "@/lib/api/headers";

describe("parseCapabilityHeaders", () => {
  it("reads x-cpa headers case-insensitively", () => {
    const headers = new Headers({
      "X-CPA-Version": "v8.1.0",
      "X-Cpa-Build-Date": "2026-10-01",
      "x-cpa-support-plugin": "true",
    });
    expect(parseCapabilityHeaders(headers)).toEqual({
      version: "v8.1.0",
      buildDate: "2026-10-01",
      supportsPlugins: true,
    });
  });

  it("falls back to x-server-* and treats unknown plugin values as null", () => {
    const headers = new Headers({
      "x-server-version": "7",
      "x-server-build-date": "d",
      "x-cpa-support-plugin": "maybe",
    });
    expect(parseCapabilityHeaders(headers)).toEqual({
      version: "7",
      buildDate: "d",
      supportsPlugins: null,
    });
  });

  it("parses false and missing headers", () => {
    expect(
      parseCapabilityHeaders(new Headers({ "x-cpa-support-plugin": "false" })).supportsPlugins,
    ).toBe(false);
    expect(parseCapabilityHeaders(new Headers())).toEqual({
      version: null,
      buildDate: null,
      supportsPlugins: null,
    });
  });
});
