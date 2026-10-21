import { ApiError, apiErrorFromResponse } from "./errors";
import { parseCapabilityHeaders, hasCapabilities, type ServerCapabilities } from "./headers";

export const MANAGEMENT_PATH = "/v8/management";
const DEFAULT_TIMEOUT_MS = 30_000;
// The only management routes that must not carry the key (docs/contracts/v8-endpoints.md §1).
const UNAUTHENTICATED_PATH = /^\/oauth\/callback\/?$/;

export interface ManagementApiClientConfig {
  /** Normalized base from normalizeApiBase (no management suffix). */
  apiBase: string;
  managementKey: string;
  /** Connection revision this client belongs to. */
  revision: number;
  /** Returns the session's current revision; a mismatch means responses are stale. */
  getCurrentRevision: () => number;
  /** Aborted when the owning connection ends. */
  connectionSignal?: AbortSignal;
  /** Called for a 401 on a request that carried the key, only while the revision is current. */
  onUnauthorized?: (revision: number) => void;
  /** Called with parsed version/build/plugin headers, only while the revision is current. */
  onCapabilities?: (capabilities: ServerCapabilities, revision: number) => void;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export interface RequestOptions {
  signal?: AbortSignal;
  query?: Record<string, string | number | boolean | undefined>;
  /** Overrides the JSON content type for string bodies, e.g. `application/yaml`. */
  contentType?: string;
  accept?: string;
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export class ManagementApiClient {
  readonly revision: number;
  private readonly config: ManagementApiClientConfig;
  constructor(config: ManagementApiClientConfig) {
    this.config = config;
    this.revision = config.revision;
  }

  get<T = unknown>(path: string, options?: RequestOptions) {
    return this.json<T>("GET", path, undefined, options);
  }
  post<T = unknown>(path: string, body?: unknown, options?: RequestOptions) {
    return this.json<T>("POST", path, body, options);
  }
  put<T = unknown>(path: string, body?: unknown, options?: RequestOptions) {
    return this.json<T>("PUT", path, body, options);
  }
  patch<T = unknown>(path: string, body?: unknown, options?: RequestOptions) {
    return this.json<T>("PATCH", path, body, options);
  }
  delete<T = unknown>(path: string, options?: RequestOptions) {
    return this.json<T>("DELETE", path, undefined, options);
  }
  getText(path: string, options?: RequestOptions) {
    return this.send("GET", path, undefined, options, (r) => r.text());
  }
  getBlob(path: string, options?: RequestOptions) {
    return this.send("GET", path, undefined, options, (r) => r.blob());
  }
  /** Multipart upload; the browser sets the boundary, so no content type is supplied. */
  postForm<T = unknown>(path: string, form: FormData, options?: RequestOptions) {
    return this.send("POST", path, form, options, (r) => parseJson<T>(r));
  }

  private json<T>(method: Method, path: string, body: unknown, options?: RequestOptions) {
    return this.send(method, path, body, options, (r) => parseJson<T>(r));
  }

  private async send<T>(
    method: Method,
    path: string,
    body: unknown,
    options: RequestOptions | undefined,
    read: (response: Response) => Promise<T>,
  ): Promise<T> {
    const { config } = this;
    if (!path.startsWith("/")) throw new TypeError("Management paths must start with '/'.");
    const sendsKey = !UNAUTHENTICATED_PATH.test(path);
    const assertCurrent = () => {
      if (config.getCurrentRevision() !== config.revision) {
        throw new ApiError({
          status: null,
          code: "aborted",
          message: "The connection changed; the request was discarded.",
        });
      }
    };
    assertCurrent();

    const url = new URL(config.apiBase + MANAGEMENT_PATH + path);
    for (const [name, value] of Object.entries(options?.query ?? {})) {
      if (value !== undefined) url.searchParams.set(name, String(value));
    }

    const headers = new Headers();
    if (sendsKey) headers.set("Authorization", `Bearer ${config.managementKey}`);
    if (options?.accept) headers.set("Accept", options.accept);
    let payload: BodyInit | undefined;
    if (body instanceof FormData) {
      payload = body;
    } else if (body !== undefined) {
      const isRawString = options?.contentType !== undefined && typeof body === "string";
      headers.set("Content-Type", options?.contentType ?? "application/json");
      payload = isRawString ? body : JSON.stringify(body);
    }

    const controller = new AbortController();
    let timedOut = false;
    const abort = () => controller.abort();
    const sources = [options?.signal, config.connectionSignal];
    for (const source of sources) {
      if (source?.aborted) abort();
      source?.addEventListener("abort", abort, { once: true });
    }
    const timer = setTimeout(() => {
      timedOut = true;
      abort();
    }, config.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    const secrets = [config.managementKey];
    try {
      let response: Response;
      try {
        response = await (config.fetchImpl ?? fetch)(url, {
          method,
          headers,
          body: payload,
          signal: controller.signal,
          credentials: "omit",
          cache: "no-store",
        });
      } catch {
        // Original error text is dropped: it can embed the request URL.
        assertCurrent();
        throw timedOut
          ? new ApiError({ status: null, code: "timeout", message: "The request timed out." })
          : controller.signal.aborted
            ? new ApiError({ status: null, code: "aborted", message: "The request was cancelled." })
            : new ApiError({
                status: null,
                code: "network",
                message:
                  "Could not reach the server. Check the address, that it is running, and that it allows this origin.",
              });
      }

      if (!response.ok) {
        const error = await apiErrorFromResponse(response, secrets);
        assertCurrent();
        if (error.status === 401 && sendsKey) config.onUnauthorized?.(config.revision);
        throw error;
      }

      const result = await read(response);
      assertCurrent();
      const capabilities = parseCapabilityHeaders(response.headers);
      if (hasCapabilities(capabilities)) config.onCapabilities?.(capabilities, config.revision);
      return result;
    } finally {
      clearTimeout(timer);
      for (const source of sources) source?.removeEventListener("abort", abort);
    }
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (text === "") return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError({
      status: response.status,
      code: "invalid_response",
      message: "The server returned a response that is not valid JSON.",
    });
  }
}
