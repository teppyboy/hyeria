import type { ManagementApiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { modelDefinitionsSchema } from "./schemas";

/** Model count for one channel; a body without a models array is a malformed response. */
export async function fetchModelCount(
  client: ManagementApiClient,
  channel: string,
  signal?: AbortSignal,
): Promise<number> {
  const body = await client.get(`/routing/model-definitions/${encodeURIComponent(channel)}`, {
    signal,
  });
  const parsed = modelDefinitionsSchema.safeParse(body);
  if (!parsed.success || parsed.data.models === undefined) {
    throw new ApiError({
      status: null,
      code: "invalid_response",
      message: "The server did not return a model list.",
    });
  }
  return parsed.data.models.length;
}
