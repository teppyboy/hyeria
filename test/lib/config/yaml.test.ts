import { describe, expect, it } from "vite-plus/test";
import { parseAndValidateYaml } from "../../../src/lib/config/yaml";

describe("parseAndValidateYaml", () => {
  it("returns the parsed mapping and the original text for a valid mapping", () => {
    const text = "port: 8317\nproviders:\n  - name: openai\n";
    const result = parseAndValidateYaml(text);

    expect(result).toEqual({
      ok: true,
      value: { port: 8317, providers: [{ name: "openai" }] },
      text,
    });
  });

  it("accepts an explicit document start marker and loose unknown nested values", () => {
    const result = parseAndValidateYaml("---\nunknown:\n  deep: [1, {x: y}]\n");

    expect(result).toMatchObject({ ok: true, value: { unknown: { deep: [1, { x: "y" }] } } });
  });

  it.each([
    ["malformed flow sequence", "secret-key: sk-live-123\nbad: [\n"],
    ["unresolved alias", "secret-key: *sk-live-123\n"],
  ])("rejects %s with a fixed message and no source excerpt", (_label, text) => {
    expect(parseAndValidateYaml(text)).toEqual({ ok: false, message: "YAML is malformed." });
  });

  it("keeps a __proto__ mapping key as own data", () => {
    const result = parseAndValidateYaml("__proto__:\n  polluted: true\n");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.hasOwn(result.value, "__proto__")).toBe(true);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("rejects duplicate mapping keys", () => {
    const result = parseAndValidateYaml("secret-key: sk-live-123\nsecret-key: sk-live-456\n");

    expect(result).toEqual({ ok: false, message: "YAML contains a duplicate mapping key." });
  });

  it("rejects multiple documents", () => {
    const result = parseAndValidateYaml("a: 1\n---\nb: 2\n");

    expect(result).toEqual({ ok: false, message: "YAML must contain exactly one document." });
  });

  it.each([
    ["an empty string", ""],
    ["a comment-only document", "# nothing here\n"],
    ["an empty explicit document", "---\n"],
    ["a null document", "null\n"],
  ])("rejects %s as empty", (_label, text) => {
    expect(parseAndValidateYaml(text)).toEqual({
      ok: false,
      message: "YAML document is empty.",
    });
  });

  it.each([
    ["a sequence", "- one\n- two\n"],
    ["a scalar", "just-a-string\n"],
  ])("rejects %s as a non-mapping document", (_label, text) => {
    expect(parseAndValidateYaml(text)).toEqual({
      ok: false,
      message: "YAML document must be a mapping.",
    });
  });
});
