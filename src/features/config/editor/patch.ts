import { stringify } from "yaml";
import { SAFE_CONFIG_FIELDS } from "./registry";
import type { ConfigEdit, ConfigFieldDefinition, JsonValue, SafeConfigView } from "./types";

const URL_USERINFO = /^[a-z][a-z\d+.-]*:\/\/[^/?#@\s]+@/i;
const hasOwn = (value: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

/** Reads only the registered, non-secret fields from a parsed config document. */
export function readSafeConfigView(document: Record<string, unknown>): SafeConfigView {
  const view: Record<string, string | number | boolean | undefined> = {};

  for (const field of SAFE_CONFIG_FIELDS) {
    if (field.path.includes("<plugin>")) {
      const configs = readAtPath(document, ["plugins", "configs"]);
      if (!isRecord(configs)) continue;
      for (const [plugin, config] of Object.entries(configs)) {
        if (!isRecord(config)) continue;
        const path = field.path.map((segment) => (segment === "<plugin>" ? plugin : segment));
        const value = readAtPath(document, path);
        view[path.join(".")] =
          isSafeViewValue(value) && !isHiddenFieldValue(field, value) ? value : undefined;
      }
      continue;
    }

    const value = readAtPath(document, field.path);
    view[field.path.join(".")] =
      isSafeViewValue(value) && !isHiddenFieldValue(field, value) ? value : undefined;
  }

  return view;
}

/** Applies registered edits to a deep clone, preserving every unregistered document value. */
export function applySafeConfigEdits(
  document: Record<string, unknown>,
  edits: readonly ConfigEdit[],
): Record<string, unknown> {
  const draft = cloneValue(document);
  if (!isRecord(draft)) throw new TypeError("A config document must be a non-null object.");

  for (const edit of edits) {
    const field = findField(edit.path);
    if (field === undefined) {
      throw new TypeError(`Config path is not registered: ${JSON.stringify(edit.path)}.`);
    }
    if (edit.path.includes("<plugin>")) {
      throw new TypeError("A config edit must use a concrete plugin path.");
    }
    if (isPluginPath(field.path) && !hasExistingPlugin(draft, edit.path[2])) {
      throw new TypeError(`Config plugin does not exist: ${JSON.stringify(edit.path[2])}.`);
    }
    if (edit.value !== undefined) assertFieldValue(field, edit.value);
    if (edit.value === undefined) deleteAtPath(draft, edit.path);
    else setAtPath(draft, edit.path, cloneValue(edit.value));
  }

  return draft;
}

/** Serializes a JSON-safe config mapping using the same YAML package conventions as the app. */
export function serializeConfigDocument(document: Record<string, unknown>): string {
  assertJsonSafe(document);
  if (!isRecord(document)) throw new TypeError("A config document must be a non-null object.");
  return stringify(document);
}

function findField(path: readonly string[]): ConfigFieldDefinition | undefined {
  return SAFE_CONFIG_FIELDS.find(
    (field) =>
      field.path.length === path.length &&
      field.path.every((segment, index) => segment === path[index] || segment === "<plugin>"),
  );
}

function isPluginPath(path: readonly string[]): boolean {
  return path.includes("<plugin>");
}

function hasExistingPlugin(document: Record<string, unknown>, plugin: string | undefined): boolean {
  const configs = readAtPath(document, ["plugins", "configs"]);
  return typeof plugin === "string" && isRecord(configs) && hasOwn(configs, plugin);
}

function readAtPath(document: unknown, path: readonly string[]): JsonValue | undefined {
  let current: JsonValue | undefined = isJsonValue(document) ? document : undefined;
  for (const segment of path) {
    if (!isRecord(current) || !hasOwn(current, segment)) return undefined;
    current = current[segment];
  }
  return current;
}

function setAtPath(
  document: Record<string, unknown>,
  path: readonly string[],
  value: JsonValue,
): void {
  let current: Record<string, unknown> = document;
  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = path[index];
    const next = current[segment];
    if (!isRecord(next)) {
      const replacement: Record<string, unknown> = {};
      defineOwn(current, segment, replacement);
      current = replacement;
    } else {
      current = next;
    }
  }
  defineOwn(current, path[path.length - 1], value);
}

function deleteAtPath(document: Record<string, unknown>, path: readonly string[]): void {
  let current: unknown = document;
  for (let index = 0; index < path.length - 1; index += 1) {
    if (!isRecord(current) || !hasOwn(current, path[index])) return;
    current = current[path[index]];
  }
  if (isRecord(current)) delete current[path[path.length - 1]];
}

function defineOwn(target: Record<string, unknown>, key: string, value: unknown): void {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    writable: true,
    value,
  });
}

type ClonedValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

function cloneValue<T extends JsonValue>(value: T): T;
function cloneValue(value: Record<string, unknown>): Record<string, unknown>;
function cloneValue(value: unknown): ClonedValue;
function cloneValue(value: unknown): ClonedValue {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (isRecord(value)) {
    const clone: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) defineOwn(clone, key, cloneValue(item));
    return clone;
  }
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  throw new TypeError("A config value cannot be cloned.");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeViewValue(value: unknown): value is string | number | boolean {
  return (
    typeof value === "string" ||
    (typeof value === "number" && Number.isFinite(value)) ||
    typeof value === "boolean"
  );
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (!isRecord(value)) return false;
  return Object.values(value).every(isJsonValue);
}

function isHiddenFieldValue(
  field: ConfigFieldDefinition,
  value: string | number | boolean,
): boolean {
  return (
    field.path.join(".") === "requests.proxy-url" &&
    typeof value === "string" &&
    URL_USERINFO.test(value)
  );
}

function assertFieldValue(field: ConfigFieldDefinition, value: JsonValue): void {
  switch (field.kind) {
    case "boolean":
      if (typeof value !== "boolean") throw invalidFieldValue(field);
      return;
    case "text":
      if (typeof value !== "string") throw invalidFieldValue(field);
      if (field.path.join(".") === "requests.proxy-url" && URL_USERINFO.test(value)) {
        throw new TypeError("A proxy URL containing userinfo cannot be edited visually.");
      }
      return;
    case "number":
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        (field.integer === true && !Number.isInteger(value)) ||
        (field.minimum !== undefined && value < field.minimum) ||
        (field.maximum !== undefined && value > field.maximum)
      ) {
        throw invalidFieldValue(field);
      }
      return;
    case "select":
      if (typeof value !== "string" || !field.options.some((option) => option.value === value)) {
        throw invalidFieldValue(field);
      }
      return;
  }
}

function invalidFieldValue(field: ConfigFieldDefinition): TypeError {
  return new TypeError(`Invalid value for config path ${JSON.stringify(field.path)}.`);
}

function assertJsonSafe(
  value: unknown,
  path: readonly string[] = [],
  seen = new WeakSet<Record<string, unknown> | unknown[]>(),
): void {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`A config number at ${JSON.stringify(path)} must be finite.`);
    }
    return;
  }
  if (Array.isArray(value)) {
    if (seen.has(value))
      throw new TypeError(`A config value at ${JSON.stringify(path)} cannot be cyclic.`);
    seen.add(value);
    value.forEach((item, index) => assertJsonSafe(item, [...path, String(index)], seen));
    seen.delete(value);
    return;
  }
  if (!isRecord(value)) {
    throw new TypeError(`A config value at ${JSON.stringify(path)} is not JSON-safe.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`A config value at ${JSON.stringify(path)} is not JSON-safe.`);
  }
  if (seen.has(value))
    throw new TypeError(`A config value at ${JSON.stringify(path)} cannot be cyclic.`);
  seen.add(value);
  for (const [key, item] of Object.entries(value)) assertJsonSafe(item, [...path, key], seen);
  seen.delete(value);
}
