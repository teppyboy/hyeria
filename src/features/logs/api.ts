import type { ManagementApiClient } from "@/lib/api/client";
import { ApiError, redactDeep, redactSensitive } from "@/lib/api/errors";
import {
  errorLogListSchema,
  errorLogNameSchema,
  logClearSchema,
  logPageSchema,
  usageQueueSchema,
} from "./schemas";

export interface LogPageQuery {
  /** Unix timestamp; only lines newer than this are returned. */
  after?: number;
  /** Positive line limit; without `after` the server returns the newest lines. */
  limit?: number;
  /** Opaque cursor from the previous page. */
  cursor?: string;
}

export interface LogPageView {
  /** Lines with obvious credentials redacted. */
  lines: string[];
  lineCount: number;
  latestTimestamp: number;
  nextCursor: string;
  /** True when the server reset the supplied cursor; the caller must drop its cursor state. */
  cursorReset: boolean;
}

export interface ErrorLogFileView {
  name: string;
  size: number;
  modified: number;
  /** False when the name does not match `error-*.log`; such entries cannot be downloaded. */
  downloadable: boolean;
}

function invalidResponse(message: string): ApiError {
  return new ApiError({ status: null, code: "invalid_response", message });
}

/** Fetches a page of log lines; the caller passes `nextCursor` back for incremental reads. */
export async function fetchLogPage(
  client: ManagementApiClient,
  query: LogPageQuery,
  signal?: AbortSignal,
): Promise<LogPageView> {
  if (query.limit !== undefined && (!Number.isInteger(query.limit) || query.limit < 1)) {
    throw new TypeError("A log line limit must be a positive integer.");
  }
  const parsed = logPageSchema.safeParse(
    await client.get("/observability/logs", {
      query: { after: query.after, limit: query.limit, cursor: query.cursor },
      signal,
    }),
  );
  if (!parsed.success) throw invalidResponse("The server did not return a log page.");
  return {
    lines: parsed.data.lines.map((line) => redactSensitive(line)),
    lineCount: parsed.data["line-count"],
    latestTimestamp: parsed.data["latest-timestamp"],
    nextCursor: parsed.data["next-cursor"],
    cursorReset: parsed.data["cursor-reset"] === true,
  };
}

/** Deletes the log file contents on the server; irreversible, so the caller must confirm first. */
export async function clearLogs(client: ManagementApiClient): Promise<{ removed: number; message: string }> {
  const parsed = logClearSchema.safeParse(await client.delete("/observability/logs"));
  if (!parsed.success) throw invalidResponse("The server did not confirm the log clear.");
  return { removed: parsed.data.removed, message: redactSensitive(parsed.data.message) };
}

/** Lists request-error log files; names outside `error-*.log` are listed but marked not downloadable. */
export async function listErrorLogs(
  client: ManagementApiClient,
  signal?: AbortSignal,
): Promise<ErrorLogFileView[]> {
  const parsed = errorLogListSchema.safeParse(
    await client.get("/observability/logs/errors", { signal }),
  );
  if (!parsed.success) throw invalidResponse("The server did not return an error log list.");
  return parsed.data.files.map((file) => ({
    name: file.name,
    size: file.size,
    modified: file.modified,
    downloadable: errorLogNameSchema.safeParse(file.name).success,
  }));
}

/**
 * Downloads one request-error log as redacted text; the save name is the validated log name, so the
 * server never chooses a path. Download failures surface as ApiError from the client.
 */
export async function downloadErrorLog(
  client: ManagementApiClient,
  name: string,
): Promise<{ blob: Blob; filename: string }> {
  if (!errorLogNameSchema.safeParse(name).success) {
    throw new TypeError("An error log name must match error-*.log without path separators.");
  }
  const text = await client.getText(`/observability/logs/errors/${name}`);
  return { blob: new Blob([redactSensitive(text)], { type: "text/plain" }), filename: name };
}

/**
 * Pops up to `count` usage records. DESTRUCTIVE: the server removes what it returns, so this must
 * only run from an explicit user action and must never be retried or prefetched.
 */
export async function consumeUsageQueue(
  client: ManagementApiClient,
  count: number,
): Promise<unknown[]> {
  if (!Number.isInteger(count) || count < 1) {
    throw new TypeError("A usage queue count must be a positive integer.");
  }
  const parsed = usageQueueSchema.safeParse(
    await client.get("/observability/usage/queue", { query: { count } }),
  );
  if (!parsed.success) throw invalidResponse("The server did not return a usage record list.");
  return redactDeep(parsed.data) as unknown[];
}
