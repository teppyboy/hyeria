import type { ManagementApiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { configNodePath } from "@/lib/config/config-paths";
import { z } from "zod";

export type ConfigDocument = Record<string, unknown>;

export interface MutationResult {
  status: "ok";
  configVersion: 8;
}

const mutationResultSchema = z.object({ status: z.literal("ok"), "config-version": z.literal(8) });

/** Keeps only the documented success fields; any other response shape is malformed. */
function toMutationResult(body: unknown): MutationResult {
  const parsed = mutationResultSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError({
      status: null,
      code: "invalid_response",
      message: "The server did not return a config mutation result.",
    });
  }
  return { status: "ok", configVersion: 8 };
}

export async function readConfig(client: ManagementApiClient): Promise<ConfigDocument> {
  return client.get<ConfigDocument>("/config");
}

export async function readConfigYaml(client: ManagementApiClient): Promise<string> {
  return client.getText("/config.yaml", { accept: "application/yaml" });
}

export async function writeConfig(
  client: ManagementApiClient,
  document: ConfigDocument,
): Promise<MutationResult> {
  if (typeof document !== "object" || document === null || Array.isArray(document)) {
    throw new TypeError("A config document must be a non-null object.");
  }
  return toMutationResult(await client.put("/config", document));
}

export async function writeConfigYaml(
  client: ManagementApiClient,
  yaml: string,
): Promise<MutationResult> {
  return toMutationResult(
    await client.put("/config.yaml", yaml, { contentType: "application/yaml" }),
  );
}

/** Sends the value as-is; `undefined` has no JSON form, so it must not reach the wire as an empty body. */
export async function putConfigPath(
  client: ManagementApiClient,
  path: readonly string[],
  value: unknown,
): Promise<MutationResult> {
  if (value === undefined) throw new TypeError("A config value cannot be undefined.");
  return toMutationResult(await client.put(configNodePath(path), value));
}

export async function patchConfigPath(
  client: ManagementApiClient,
  path: readonly string[],
  value: unknown,
): Promise<MutationResult> {
  if (value === undefined) throw new TypeError("A config value cannot be undefined.");
  return toMutationResult(await client.patch(configNodePath(path), value));
}

/** `configNodePath` rejects the empty path, so deleting the root is never sent. */
export async function deleteConfigPath(
  client: ManagementApiClient,
  path: readonly string[],
): Promise<MutationResult> {
  return toMutationResult(await client.delete(configNodePath(path)));
}
