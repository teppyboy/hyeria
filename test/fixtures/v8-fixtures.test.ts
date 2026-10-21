import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";

const dir = join(import.meta.dirname, "v8");
const files = readdirSync(dir).filter((name) => /\.(json|ya?ml)$/.test(name));

// Credential-shaped values that must never be committed to fixtures.
const forbidden = [
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, // JWT
  /\bsk-(?!example)[A-Za-z0-9_-]{16,}/, // API key
  /\b(?:ghp|gho|github_pat)_[A-Za-z0-9_]{16,}/,
  /\bAIza[A-Za-z0-9_-]{30,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\$2[aby]\$\d{2}\$/, // bcrypt hash
];

describe("v8 fixtures", () => {
  it("includes fixtures", () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it.each(files)("%s is valid and sanitized", (name) => {
    const text = readFileSync(join(dir, name), "utf8");
    if (name.endsWith(".json")) expect(() => JSON.parse(text)).not.toThrow();
    for (const pattern of forbidden) expect(text).not.toMatch(pattern);
    for (const email of text.match(/[\w.+-]+@[\w.-]+/g) ?? []) {
      expect(email.endsWith("@example.invalid")).toBe(true);
    }
    for (const host of text.match(/https?:\/\/[\w.-]+/g) ?? []) {
      expect(host).toMatch(/\.invalid$/);
    }
  });
});
