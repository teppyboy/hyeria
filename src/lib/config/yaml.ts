import { parseAllDocuments } from "yaml";

/** The JSON-compatible values a parsed config document can hold. */
export type YamlValue = string | number | boolean | null | YamlValue[] | YamlMapping;
export type YamlMapping = { [key: string]: YamlValue };

/** Stable codes, not messages: the UI maps them to localized text, and source text never leaks. */
export type YamlErrorCode =
  | "multiple_documents"
  | "duplicate_key"
  | "malformed"
  | "empty"
  | "not_mapping";

export type ParseResult =
  | { ok: true; value: YamlMapping; text: string }
  | { ok: false; code: YamlErrorCode };

/** Carries only the YAML error code, so the message never echoes source text. */
export class ConfigYamlError extends Error {
  readonly code: YamlErrorCode;

  constructor(code: YamlErrorCode) {
    super(code);
    this.name = "ConfigYamlError";
    this.code = code;
  }
}

export function parseAndValidateYaml(text: string): ParseResult {
  const documents = parseAllDocuments(text);
  if (documents.length > 1) return failure("multiple_documents");

  const errors = documents.flatMap((document) => document.errors);
  if (errors.some((error) => error.code === "DUPLICATE_KEY")) return failure("duplicate_key");
  if (errors.length > 0) return failure("malformed");

  const [document] = documents;
  if (document === undefined) return failure("empty");

  let parsed: unknown;
  try {
    parsed = document.toJS();
  } catch {
    // An unresolved alias only throws when the document is converted to JS.
    return failure("malformed");
  }
  if (parsed === null) return failure("empty");
  if (!isRecord(parsed)) return failure("not_mapping");
  const value = toYamlMapping(parsed);
  if (value === undefined) return failure("malformed");
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

function failure(code: YamlErrorCode): ParseResult {
  return { ok: false, code };
}
