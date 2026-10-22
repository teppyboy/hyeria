import { parseAllDocuments } from "yaml";

/** The JSON-compatible values a parsed config document can hold. */
export type YamlValue = string | number | boolean | null | YamlValue[] | YamlMapping;
export type YamlMapping = { [key: string]: YamlValue };

export type ParseResult =
  | { ok: true; value: YamlMapping; text: string }
  | { ok: false; message: string };

/** Messages are fixed strings: parser errors can echo source text, and the source may hold secrets. */
export function parseAndValidateYaml(text: string): ParseResult {
  const documents = parseAllDocuments(text);
  if (documents.length > 1) return failure("YAML must contain exactly one document.");

  const errors = documents.flatMap((document) => document.errors);
  if (errors.some((error) => error.code === "DUPLICATE_KEY")) {
    return failure("YAML contains a duplicate mapping key.");
  }
  if (errors.length > 0) return failure("YAML is malformed.");

  const [document] = documents;
  if (document === undefined) return failure("YAML document is empty.");

  let parsed: unknown;
  try {
    parsed = document.toJS();
  } catch {
    // An unresolved alias only throws when the document is converted to JS.
    return failure("YAML is malformed.");
  }
  if (parsed === null) return failure("YAML document is empty.");
  if (!isRecord(parsed)) return failure("YAML document must be a mapping.");
  const value = toYamlMapping(parsed);
  if (value === undefined) return failure("YAML is malformed.");
  return { ok: true, value, text };
}

/** Returns undefined for any value outside the JSON-compatible set, such as binary or dates. */
function toYamlMapping(value: Record<string, unknown>): YamlMapping | undefined {
  const entries: [string, YamlValue][] = [];
  for (const [key, item] of Object.entries(value)) {
    const converted = toYamlValue(item);
    if (converted === undefined) return undefined;
    entries.push([key, converted]);
  }
  // Object.fromEntries keeps a `__proto__` key as own data instead of setting the prototype.
  return Object.fromEntries(entries);
}

function toYamlValue(value: unknown): YamlValue | undefined {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return value;
  if (Array.isArray(value)) {
    const items: YamlValue[] = [];
    for (const item of value) {
      const converted = toYamlValue(item);
      if (converted === undefined) return undefined;
      items.push(converted);
    }
    return items;
  }
  if (isRecord(value)) return toYamlMapping(value);
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function failure(message: string): ParseResult {
  return { ok: false, message };
}
