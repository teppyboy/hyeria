import type { ManagementApiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { configProbeSchema } from "./schemas";

/** Login probe: a successful authenticated config read proves the address, version path and key. */
export async function probeConfig(client: ManagementApiClient): Promise<void> {
  const body = await client.get("/config");
  if (!configProbeSchema.safeParse(body).success) {
    throw new ApiError({
      status: null,
      code: "invalid_response",
      message: "The server did not return a v8 configuration document.",
    });
  }
}
