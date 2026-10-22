import { z } from "zod";
import type { ManagementApiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { OAuthFlowKind, OAuthStatusResult } from "./state-machine";

export interface OAuthAuthUrl {
  url: string;
  /** Needed for polling and cancel; callers must not store it in routes, logs or query keys. */
  state: string;
  flow: OAuthFlowKind;
  userCode: string | null;
  expiresIn: number | null;
}

export interface VertexImportResult {
  projectId: string;
  email: string;
  location: string;
}

// Type aliases, not interfaces: the client's query type needs an implicit index signature.
export type OAuthCallbackQuery = {
  provider: string;
  state: string;
  code?: string;
  error?: string;
  error_description?: string;
};

export type OAuthCallbackBody = {
  provider: string;
  state: string;
  redirect_url?: string;
  code?: string;
  error?: string;
};

const authUrlSchema = z.object({
  status: z.literal("ok"),
  url: z.string(),
  state: z.string().min(1),
  flow: z.string().optional(),
  user_code: z.string().optional(),
  expires_in: z.number().nonnegative().optional(),
});

const statusSchema = z.object({ status: z.string() });

const okStatusSchema = z.object({ status: z.literal("ok") });

// `auth-file` is deliberately absent: it is a server filesystem path and never leaves this module.
const vertexImportSchema = z.object({
  status: z.literal("ok"),
  project_id: z.string(),
  email: z.string(),
  location: z.string(),
});

// Uploaded service-account files get a fixed name so the user's local file name never reaches the server.
const VERTEX_FILE_NAME = "vertex-service-account.json";

function invalidResponse(message: string): ApiError {
  return new ApiError({ status: null, code: "invalid_response", message });
}

/** Returns the normalized URL only for absolute https URLs; http, javascript:, data: and relative values are null. */
export function parseHttpsUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

/** Starts a browser or device flow; the returned URL is untrusted and must pass parseHttpsUrl. */
export async function startOAuth(
  client: ManagementApiClient,
  provider: string,
  webui = false,
): Promise<OAuthAuthUrl> {
  const parsed = authUrlSchema.safeParse(
    await client.get("/oauth/auth-url", { query: { provider, is_webui: webui || undefined } }),
  );
  if (!parsed.success) {
    throw invalidResponse("The server did not return an OAuth authorization URL.");
  }
  const data = parsed.data;
  const url = parseHttpsUrl(data.url);
  if (url === null) throw invalidResponse("The server returned an OAuth URL that is not HTTPS.");
  return {
    url,
    state: data.state,
    flow: data.flow === "device" ? "device" : "wait",
    userCode: data.user_code ?? null,
    expiresIn: data.expires_in ?? null,
  };
}

/** Maps the documented wait/ok/error values; any other provider value is reported as unknown. */
export async function pollOAuthStatus(
  client: ManagementApiClient,
  state: string,
  signal?: AbortSignal,
): Promise<OAuthStatusResult> {
  const parsed = statusSchema.safeParse(
    await client.get("/oauth/status", { query: { state }, signal }),
  );
  if (!parsed.success) throw invalidResponse("The server did not return an OAuth status.");
  const status = parsed.data.status;
  return status === "wait" || status === "ok" || status === "error" ? status : "unknown";
}

export async function cancelOAuthSession(
  client: ManagementApiClient,
  state: string,
): Promise<void> {
  const parsed = okStatusSchema.safeParse(
    await client.delete("/oauth/session", { query: { state } }),
  );
  if (!parsed.success) throw invalidResponse("The server did not confirm the OAuth cancellation.");
}

/** Uploads a Vertex service-account file as multipart; the response's file path is not returned. */
export async function importVertexCredential(
  client: ManagementApiClient,
  serviceAccount: Blob,
  location?: string,
): Promise<VertexImportResult> {
  const form = new FormData();
  form.append("file", serviceAccount, VERTEX_FILE_NAME);
  if (location !== undefined) form.append("location", location);
  const parsed = vertexImportSchema.safeParse(
    await client.postForm("/oauth/import", form, { query: { provider: "vertex" } }),
  );
  if (!parsed.success) throw invalidResponse("The server did not confirm the Vertex import.");
  return {
    projectId: parsed.data.project_id,
    email: parsed.data.email,
    location: parsed.data.location,
  };
}

/** Unauthenticated by design; the shared client omits the management key on this path. */
export async function getOAuthCallback(
  client: ManagementApiClient,
  query: OAuthCallbackQuery,
): Promise<void> {
  const parsed = okStatusSchema.safeParse(await client.get("/oauth/callback", { query }));
  if (!parsed.success) throw invalidResponse("The server did not confirm the OAuth callback.");
}

/** Unauthenticated by design; the shared client omits the management key on this path. */
export async function postOAuthCallback(
  client: ManagementApiClient,
  body: OAuthCallbackBody,
): Promise<void> {
  const parsed = okStatusSchema.safeParse(await client.post("/oauth/callback", body));
  if (!parsed.success) throw invalidResponse("The server did not confirm the OAuth callback.");
}
