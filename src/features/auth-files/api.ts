import type { ManagementApiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import {
  authFileListSchema,
  authFileNameSchema,
  deleteAllResultSchema,
  okStatusSchema,
} from "./schemas";

export interface AuthFileView {
  id: string;
  authIndex: string;
  name: string;
  provider: string;
  status: string;
  disabled: boolean;
  unavailable: boolean;
  runtimeOnly: boolean;
  source: string;
}

function invalidResponse(message: string): ApiError {
  return new ApiError({ status: null, code: "invalid_response", message });
}

/** Rejects unsafe names before they reach a query string or multipart filename. */
function requireFileName(name: string): string {
  if (!authFileNameSchema.safeParse(name).success) {
    throw new TypeError(
      "A credential file name must be a .json file name without path separators.",
    );
  }
  return name;
}

/** Lists metadata only; credential contents and backend-specific fields never leave this function. */
export async function listAuthFiles(client: ManagementApiClient): Promise<AuthFileView[]> {
  const parsed = authFileListSchema.safeParse(await client.get("/credentials"));
  if (!parsed.success) {
    throw invalidResponse("The server did not return a credential file list.");
  }
  return parsed.data.files.map((file) => ({
    id: file.id,
    authIndex: file.auth_index,
    name: file.name,
    provider: file.provider,
    status: file.status,
    disabled: file.disabled,
    unavailable: file.unavailable,
    runtimeOnly: file.runtime_only,
    source: file.source,
  }));
}

/** Uploads the JSON text as the raw request body, named by the query string. */
export async function uploadAuthFileRaw(
  client: ManagementApiClient,
  name: string,
  json: string,
): Promise<void> {
  requireFileName(name);
  const parsed = okStatusSchema.safeParse(
    await client.post("/credentials", json, { query: { name }, contentType: "application/json" }),
  );
  if (!parsed.success) throw invalidResponse("The server did not confirm the credential upload.");
}

/** Uploads as multipart field `file`; the filename carries the validated name. */
export async function uploadAuthFileMultipart(
  client: ManagementApiClient,
  name: string,
  file: Blob,
): Promise<void> {
  requireFileName(name);
  const form = new FormData();
  form.append("file", file, name);
  const parsed = okStatusSchema.safeParse(await client.postForm("/credentials", form));
  if (!parsed.success) throw invalidResponse("The server did not confirm the credential upload.");
}

export async function deleteAuthFile(client: ManagementApiClient, name: string): Promise<void> {
  requireFileName(name);
  await client.delete("/credentials", { query: { name } });
}

/** Returns how many credential files the server deleted. */
export async function deleteAllAuthFiles(client: ManagementApiClient): Promise<number> {
  const parsed = deleteAllResultSchema.safeParse(
    await client.delete("/credentials", { query: { all: true } }),
  );
  if (!parsed.success) throw invalidResponse("The server did not confirm the credential deletion.");
  return parsed.data.deleted;
}

/** Downloads the credential file; the save name is sanitized, the request name is validated. */
export async function downloadAuthFile(
  client: ManagementApiClient,
  name: string,
): Promise<{ blob: Blob; filename: string }> {
  requireFileName(name);
  const blob = await client.getBlob("/credentials/download", { query: { name } });
  return { blob, filename: safeDownloadFilename(name) };
}

/**
 * Turns any backend name into a safe save name: the leaf only, unsafe characters replaced, no
 * leading dots or `..`, always `.json`.
 */
export function safeDownloadFilename(name: string): string {
  const leaf = name.split(/[\\/]/).pop() ?? "";
  const stem = leaf
    .replace(/\.json$/i, "")
    .replace(/[^A-Za-z0-9._@+-]/g, "_")
    .replace(/\.{2,}/g, "_")
    .replace(/^[._]+/, "")
    .slice(0, 200);
  return `${stem || "credential"}.json`;
}
