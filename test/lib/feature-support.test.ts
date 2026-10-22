import { describe, expect, it } from "vite-plus/test";
import { ApiError } from "../../src/lib/api/errors";
import {
  candidateModelChannels,
  compareVersions,
  endpointStateFromError,
  modelChannelFromError,
  pluginSupportFrom,
} from "../../src/lib/feature-support/capabilities";

const apiError = (status: number | null) =>
  new ApiError({ status, code: "http_error", message: "x" });

describe("endpoint state from errors", () => {
  it("maps 404 to unsupported and 401 to unauthorized, everything else to error", () => {
    expect(endpointStateFromError(apiError(404))).toBe("unsupported");
    expect(endpointStateFromError(apiError(401))).toBe("unauthorized");
    expect(endpointStateFromError(apiError(502))).toBe("error");
    expect(endpointStateFromError(new TypeError("boom"))).toBe("error");
  });

  it("treats a 400 unknown-channel answer as an unavailable channel, not a fatal error", () => {
    expect(modelChannelFromError(apiError(400))).toBe("unknown-channel");
    expect(modelChannelFromError(apiError(500))).toBe("error");
  });
});

describe("plugin support", () => {
  it("prefers the header and treats a missing header as unknown, not unsupported", () => {
    expect(pluginSupportFrom(true, "unsupported")).toBe("supported");
    expect(pluginSupportFrom(false, "ok")).toBe("unsupported");
    expect(pluginSupportFrom(null, "ok")).toBe("supported");
    expect(pluginSupportFrom(null, "unsupported")).toBe("unknown");
    expect(pluginSupportFrom(false, "unknown")).toBe("unsupported");
    expect(pluginSupportFrom(null, "error")).toBe("unknown");
    expect(pluginSupportFrom(null, "unknown")).toBe("unknown");
  });
});

describe("version comparison", () => {
  it("compares dotted versions ignoring a leading v", () => {
    expect(compareVersions("v1.2.2", "v1.2.3")).toBe("update-available");
    expect(compareVersions("1.2.3", "v1.2.3")).toBe("up-to-date");
    expect(compareVersions("v2.0.0", "v1.9.9")).toBe("ahead");
    expect(compareVersions("v1.2", "v1.2.0")).toBe("up-to-date");
  });

  it("reports unknown for missing or non-numeric versions", () => {
    expect(compareVersions(null, "v1.2.3")).toBe("unknown");
    expect(compareVersions("v1.2.3", "v1.2.3-beta")).toBe("unknown");
  });
});

describe("candidate model channels", () => {
  it("de-duplicates and sorts credential providers, dropping empty names", () => {
    expect(candidateModelChannels(["codex", "claude", "codex", ""])).toEqual(["claude", "codex"]);
  });
});
