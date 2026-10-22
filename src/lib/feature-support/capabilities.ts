import { ApiError } from "@/lib/api/errors";
import type { ServerCapabilities } from "@/lib/api/headers";

/**
 * Per-endpoint result. `unsupported` is a 404, which cannot distinguish "management disabled",
 * "Home mode" and "route missing" (docs/contracts/v8-endpoints.md §4), so it never means "not installed".
 */
export type EndpointState = "ok" | "unsupported" | "unauthorized" | "error" | "unknown";

/** From the x-cpa-support-plugin header when present, else inferred from the /plugins probe. */
export type PluginSupport = "supported" | "unsupported" | "unknown";

/** Aborted requests report `unknown`; a 400 unknown-channel is `unknown-channel`; zero models is `empty`. */
export type ModelChannelState =
  | "loading"
  | "available"
  | "empty"
  | "unknown-channel"
  | "error"
  | "unknown";

export interface ModelChannelAvailability {
  channel: string;
  state: ModelChannelState;
  /** Models the channel reported; null unless the channel answered. */
  modelCount: number | null;
}

export interface CapabilitySnapshot {
  version: string | null;
  buildDate: string | null;
  pluginSupport: PluginSupport;
  endpoints: Record<string, EndpointState>;
  /** Candidate channels derived from credential providers; not authoritative server data. */
  modelChannels: ModelChannelAvailability[];
}

export function endpointStateFromError(error: unknown): EndpointState {
  if (!(error instanceof ApiError)) return "error";
  if (error.code === "aborted") return "unknown";
  if (error.status === 401) return "unauthorized";
  if (error.status === 404) return "unsupported";
  return "error";
}

export function modelChannelFromError(error: unknown): ModelChannelState {
  if (error instanceof ApiError && error.code === "aborted") return "unknown";
  return error instanceof ApiError && error.status === 400 ? "unknown-channel" : "error";
}

export function pluginSupportFrom(header: boolean | null, probe: EndpointState): PluginSupport {
  if (header !== null) return header ? "supported" : "unsupported";
  if (probe === "ok") return "supported";
  if (probe === "unsupported") return "unsupported";
  return "unknown";
}

export function buildCapabilitySnapshot(input: {
  capabilities: ServerCapabilities;
  endpoints: Record<string, EndpointState>;
  modelChannels: ModelChannelAvailability[];
}): CapabilitySnapshot {
  return {
    version: input.capabilities.version,
    buildDate: input.capabilities.buildDate,
    pluginSupport: pluginSupportFrom(
      input.capabilities.supportsPlugins,
      input.endpoints["/plugins"] ?? "unknown",
    ),
    endpoints: input.endpoints,
    modelChannels: input.modelChannels,
  };
}

export type VersionComparison = "update-available" | "up-to-date" | "ahead" | "unknown";

const NUMERIC_PART = /^\d+$/;

/** Compares dotted numeric versions with an optional `v` prefix; anything else is `unknown`. */
export function compareVersions(current: string | null, latest: string | null): VersionComparison {
  const left = parseVersion(current);
  const right = parseVersion(latest);
  if (!left || !right) return "unknown";
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (right[index] ?? 0) - (left[index] ?? 0);
    if (difference > 0) return "update-available";
    if (difference < 0) return "ahead";
  }
  return "up-to-date";
}

function parseVersion(value: string | null): number[] | null {
  if (value === null) return null;
  const parts = value.replace(/^v/i, "").split(".");
  return parts.every((part) => NUMERIC_PART.test(part)) ? parts.map(Number) : null;
}

/** Unique, sorted credential providers. Used only as a heuristic set of candidate channels. */
export function candidateModelChannels(providers: readonly string[]): string[] {
  return [...new Set(providers.filter((provider) => provider.length > 0))].sort();
}
