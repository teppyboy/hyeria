export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "validation"
  | "upstream"
  | "unavailable"
  | "server"
  | "http_error"
  | "network"
  | "timeout"
  | "aborted"
  | "invalid_response";

export type ApiErrorDetails = Readonly<Record<string, string | number | boolean>>;

export class ApiError extends Error {
  /** HTTP status; null when no response was received. */
  readonly status: number | null;
  /** Hyeria's status/transport category. */
  readonly code: ApiErrorCode;
  /** Backend `error` identifier (e.g. `read_only_field`), only when it looks like an identifier. */
  readonly apiCode: string | null;
  readonly details: ApiErrorDetails;

  constructor(init: {
    status: number | null;
    code: ApiErrorCode;
    apiCode?: string | null;
    message: string;
    details?: ApiErrorDetails;
  }) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.apiCode = init.apiCode ?? null;
    this.details = init.details ?? {};
  }
}

const STATUS_CODES: Record<number, [ApiErrorCode, string]> = {
  400: ["bad_request", "The server rejected the request."],
  401: ["unauthorized", "The management key is missing or invalid."],
  403: [
    "forbidden",
    "Access to the management API is not allowed (remote management may be disabled).",
  ],
  404: [
    "not_found",
    "Not found. The resource may not exist, or management may be disabled on this server.",
  ],
  409: ["conflict", "The request conflicts with the current server state."],
  422: ["validation", "The server could not accept the submitted configuration."],
  502: ["upstream", "The server reported an upstream failure."],
  503: ["unavailable", "The service is currently unavailable."],
};

const API_CODE = /^[A-Za-z0-9_][A-Za-z0-9_ .:-]{0,79}$/;
const DETAIL_KEYS = ["field", "channel", "restart_required"] as const;
const MAX_MESSAGE = 300;

export function redactSensitive(value: string, secrets: readonly string[] = []): string {
  let out = value;
  for (const secret of secrets) if (secret) out = out.split(secret).join("[redacted]");
  return out
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g, "[redacted]")
    .replace(/\b(?:sk|rk|pk)-[A-Za-z0-9_-]{8,}/g, "[redacted]")
    .replace(
      /\b(api[_-]?key|access[_-]?token|refresh[_-]?token|token|secret|password|credential|authorization|management[_-]?key)(["']?\s*[:=]\s*["']?)[^\s"',&]+/gi,
      "$1$2[redacted]",
    )
    .replace(/([?&](?:code|state|key|token)=)[^&\s]+/gi, "$1[redacted]");
}

/** Builds a safe error from a non-2xx response; the raw body is never retained. */
export async function apiErrorFromResponse(
  response: Response,
  secrets: readonly string[] = [],
): Promise<ApiError> {
  const status = response.status;
  const [code, fallback] =
    STATUS_CODES[status] ??
    (status >= 500
      ? (["server", "The server failed to process the request."] as const)
      : (["http_error", `The server responded with status ${status}.`] as const));

  let body: unknown;
  try {
    body = JSON.parse(await response.text());
  } catch {
    body = undefined; // text/empty bodies are intentionally not echoed
  }
  const record =
    body !== null && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};

  const rawCode = typeof record.error === "string" ? record.error : null;
  const apiCode = rawCode && API_CODE.test(rawCode) ? redactSensitive(rawCode, secrets) : null;
  const rawMessage = typeof record.message === "string" ? record.message : null;
  const message = rawMessage
    ? redactSensitive(rawMessage, secrets).slice(0, MAX_MESSAGE)
    : apiCode
      ? `${fallback} (${apiCode})`
      : fallback;

  const details: Record<string, string | number | boolean> = {};
  for (const key of DETAIL_KEYS) {
    const value = record[key];
    if (typeof value === "string")
      details[key] = redactSensitive(value, secrets).slice(0, MAX_MESSAGE);
    else if (typeof value === "number" || typeof value === "boolean") details[key] = value;
  }
  return new ApiError({ status, code, apiCode, message, details });
}
