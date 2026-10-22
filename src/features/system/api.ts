import type { ManagementApiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { z } from "zod";

const latestVersionSchema = z.looseObject({ "latest-version": z.string().min(1) });

/** Latest released version as reported by the backend; failure statuses are unverified (§3.2). */
export async function fetchLatestVersion(
  client: ManagementApiClient,
  signal?: AbortSignal,
): Promise<string> {
  const body = await client.get("/server/latest-version", { signal });
  const parsed = latestVersionSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError({
      status: null,
      code: "invalid_response",
      message: "The server did not return a latest version.",
    });
  }
  return parsed.data["latest-version"];
}
