export interface ServerCapabilities {
  version: string | null;
  buildDate: string | null;
  supportsPlugins: boolean | null;
}

export const EMPTY_CAPABILITIES: ServerCapabilities = {
  version: null,
  buildDate: null,
  supportsPlugins: null,
};

const MAX_HEADER_VALUE = 128;

function text(headers: Headers, ...names: string[]): string | null {
  for (const name of names) {
    const value = headers.get(name)?.trim(); // Headers.get is case-insensitive
    if (value) return value.slice(0, MAX_HEADER_VALUE);
  }
  return null;
}

/**
 * x-cpa-* names come from the official client source, not the API doc; value formats are unverified
 * (docs/contracts/v8-endpoints.md §1), so values stay opaque strings and unknown booleans become null.
 */
export function parseCapabilityHeaders(headers: Headers): ServerCapabilities {
  const plugin = text(headers, "x-cpa-support-plugin")?.toLowerCase();
  return {
    version: text(headers, "x-cpa-version", "x-server-version"),
    buildDate: text(headers, "x-cpa-build-date", "x-server-build-date"),
    supportsPlugins:
      plugin === "true" || plugin === "1"
        ? true
        : plugin === "false" || plugin === "0"
          ? false
          : null,
  };
}

export function hasCapabilities(value: ServerCapabilities): boolean {
  return value.version !== null || value.buildDate !== null || value.supportsPlugins !== null;
}
