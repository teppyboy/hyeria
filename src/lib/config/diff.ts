import { redactSensitive } from "../api/errors";
import { ConfigYamlError, parseAndValidateYaml, type YamlMapping, type YamlValue } from "./yaml";

export type ConfigChange =
  | { path: string[]; kind: "added"; after: string }
  | { path: string[]; kind: "removed"; before: string }
  | { path: string[]; kind: "changed"; before: string; after: string };

export interface ConfigDiff {
  changes: ConfigChange[];
}

const REDACTED = "[redacted]";
// Matches by key substring so variants such as `openai-api-key` and `client_secret` are caught.
const SENSITIVE_KEY =
  /secret|token|password|passwd|credential|authorization|api[-_]?key|private[-_]?key|user[-_]?name/i;
const URL_USERINFO = /^([a-z][a-z\d+.-]*:\/\/)[^/?#@\s]+@/i;

/**
 * Returns the changed config paths between two YAML documents. Mapping key order is ignored,
 * lists are compared as whole values, and sensitive values are redacted in the rendered output.
 */
export function buildConfigDiff(before: string, after: string): ConfigDiff {
  const parsedBefore = parseAndValidateYaml(before);
  if (!parsedBefore.ok) throw new ConfigYamlError(parsedBefore.code);
  const parsedAfter = parseAndValidateYaml(after);
  if (!parsedAfter.ok) throw new ConfigYamlError(parsedAfter.code);

  const changes: ConfigChange[] = [];
  collectChanges(parsedBefore.value, parsedAfter.value, [], changes);
  return { changes };
}

function collectChanges(
  before: YamlValue,
  after: YamlValue,
  path: string[],
  changes: ConfigChange[],
): void {
  if (isMapping(before) && isMapping(after)) {
    // Sorted keys make the change list come out in lexicographic path order.
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
    for (const key of keys) {
      const childPath = [...path, key];
      if (!Object.hasOwn(after, key)) {
        changes.push({ path: childPath, kind: "removed", before: render(childPath, before[key]) });
      } else if (!Object.hasOwn(before, key)) {
        changes.push({ path: childPath, kind: "added", after: render(childPath, after[key]) });
      } else {
        collectChanges(before[key], after[key], childPath, changes);
      }
    }
    return;
  }
  if (canonicalJson(before) !== canonicalJson(after)) {
    changes.push({
      path,
      kind: "changed",
      before: render(path, before),
      after: render(path, after),
    });
  }
}

/** A value under any sensitive ancestor is hidden whole, so its leaves cannot leak. */
function render(path: string[], value: YamlValue): string {
  if (path.some((segment) => SENSITIVE_KEY.test(segment))) return JSON.stringify(REDACTED);
  // Token-shaped strings under neutral keys are caught by value patterns, as in API error text.
  return redactSensitive(stringifyValue(redact(value), false));
}

function redact(value: YamlValue): YamlValue {
  if (Array.isArray(value)) return value.map(redact);
  if (isMapping(value)) {
    // Object.fromEntries keeps a `__proto__` key as own data instead of setting the prototype.
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        SENSITIVE_KEY.test(key) ? REDACTED : redact(item),
      ]),
    );
  }
  if (typeof value === "string") return value.replace(URL_USERINFO, `$1${REDACTED}@`);
  return value;
}

/** Stable key order at every depth, so equal mappings compare equal regardless of key order. */
function canonicalJson(value: YamlValue): string {
  return stringifyValue(value, true);
}

/**
 * JSON text, except non-finite numbers are written bare (Infinity, NaN). JSON.stringify would emit
 * null for them, which made `.inf` and `null` compare equal.
 */
function stringifyValue(value: YamlValue, sortKeys: boolean): string {
  if (Array.isArray(value))
    return `[${value.map((item) => stringifyValue(item, sortKeys)).join(",")}]`;
  if (isMapping(value)) {
    const keys = sortKeys ? Object.keys(value).sort() : Object.keys(value);
    const entries = keys.map(
      (key) => `${JSON.stringify(key)}:${stringifyValue(value[key], sortKeys)}`,
    );
    return `{${entries.join(",")}}`;
  }
  if (typeof value === "number" && !Number.isFinite(value)) return String(value);
  return JSON.stringify(value);
}

function isMapping(value: YamlValue): value is YamlMapping {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
