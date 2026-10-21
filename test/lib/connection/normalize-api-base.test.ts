import { describe, expect, it } from "vite-plus/test";
import { InvalidConnectionInputError, normalizeApiBase } from "@/lib/connection/normalize-api-base";

const httpsPage = {
  protocol: "https:",
  origin: "https://cpa.example.com",
  pathname: "/management.html",
};

describe("normalizeApiBase", () => {
  it.each([
    ["localhost:8317", "http://localhost:8317"],
    ["cpa.example.com", "http://cpa.example.com"],
    ["https://cpa.example.com", "https://cpa.example.com"],
    ["HTTP://Example.com:80/", "http://example.com"],
    ["https://cpa.example.com/v8/management", "https://cpa.example.com"],
    ["https://cpa.example.com/v8/management/", "https://cpa.example.com"],
    ["https://cpa.example.com/proxy/v8/management///", "https://cpa.example.com/proxy"],
    ["https://cpa.example.com/management.html", "https://cpa.example.com"],
    ["  https://cpa.example.com/  ", "https://cpa.example.com"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeApiBase(input)).toBe(expected);
  });

  it("inherits https from the page for host-only input and derives from it when empty", () => {
    expect(normalizeApiBase("cpa.example.com:8443", httpsPage)).toBe(
      "https://cpa.example.com:8443",
    );
    expect(normalizeApiBase("", httpsPage)).toBe("https://cpa.example.com");
  });

  it.each([
    "",
    "ftp://example.com",
    "javascript:alert(1)",
    "file:///etc/passwd",
    "https://user:pass@example.com",
    "https://user@example.com",
    "https://example.com/?key=secret",
    "https://example.com/#key=secret",
    "https://",
    "http://exa mple.com",
  ])("rejects %j", (input) => {
    expect(() => normalizeApiBase(input)).toThrow(InvalidConnectionInputError);
  });

  it("never echoes rejected input", () => {
    try {
      normalizeApiBase("https://u:hunter2@example.com/?key=hunter2");
    } catch (error) {
      expect((error as Error).message).not.toContain("hunter2");
    }
  });
});
