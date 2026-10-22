import type { ManagementApiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import {
  authFileFieldsSchema,
  authFileIdentifierSchema,
  authFileListSchema,
  authFileModelsSchema,
  authFileNameSchema,
  deleteAllResultSchema,
  okStatusSchema,
} from "./schemas";

export interface AuthFileView {
  id: string;
  authIndex: string;
  /** Listed name as the backend reports it; may not be a `.json` file name. */
  name: string;
  /** Strict `.json` name usable for download/delete/status; null for runtime-only or non-`.json` entries. */
  fileName: string | null;
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

/** Models also accept runtime-only opaque IDs, but never path-like or traversal names. */
function requireAuthFileIdentifier(name: string): string {
  if (!authFileIdentifierSchema.safeParse(name).success) {
    throw new TypeError("A credential file identifier must be a safe opaque name.");
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
    fileName:
      !file.runtime_only && authFileNameSchema.safeParse(file.name).success ? file.name : null,
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

/** Sets the disabled flag by name and preserves the undocumented response without inspecting it. */
export async function setAuthFileDisabled(
  client: ManagementApiClient,
  name: string,
  disabled: boolean,
): Promise<unknown> {
  requireFileName(name);
  return client.patch("/credentials/status", { name, disabled });
}

/** Writes metadata fields by name; keys are validated so credential material cannot be written here. */
export async function patchAuthFileFields(
  client: ManagementApiClient,
  name: string,
  fields: Record<string, unknown>,
): Promise<unknown> {
  requireFileName(name);
  const parsed = authFileFieldsSchema.safeParse(fields);
  if (!parsed.success) {
    throw new TypeError("Credential fields must be JSON metadata paths, not credential material.");
  }
  return client.patch("/credentials/fields", { name, ...parsed.data });
}

/** Asks the server to refresh file-backed OAuth credentials; one request per call, never retried. */
export async function refreshAuthFiles(client: ManagementApiClient): Promise<unknown> {
  return client.post("/credentials/refresh");
}

/** Lists the models one credential file exposes; entries are undocumented and passed through unread. */
export async function listAuthFileModels(
  client: ManagementApiClient,
  name: string,
): Promise<unknown[]> {
  requireAuthFileIdentifier(name);
  const parsed = authFileModelsSchema.safeParse(
    await client.get("/credentials/models", { query: { name } }),
  );
  if (!parsed.success) {
    throw invalidResponse("The server did not return a credential model list.");
  }
  return parsed.data.models;
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
