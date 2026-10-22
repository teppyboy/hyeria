import { useQueries, type UseQueryResult } from "@tanstack/react-query";
import { useManagementClient } from "@/features/auth/queries";
import { useSessionStore } from "@/stores/session";
import {
  modelChannelFromError,
  type ModelChannelAvailability,
} from "@/lib/feature-support/capabilities";
import { fetchModelCount } from "./api";

export const modelKeys = { all: ["models"] as const };

/** One query per candidate channel; each channel's loading and failure are independent. */
export function useModelChannelQueries(channels: readonly string[]) {
  const revision = useSessionStore((state) => state.connectionRevision);
  const getClient = useManagementClient();
  return useQueries({
    queries: channels.map((channel) => ({
      queryKey: [...modelKeys.all, revision, "channel", channel],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        fetchModelCount(getClient(), channel, signal),
    })),
  });
}

export function modelChannelAvailability(
  channel: string,
  query: UseQueryResult<number, Error>,
): ModelChannelAvailability {
  if (query.isSuccess)
    return {
      channel,
      state: query.data > 0 ? "available" : "empty",
      modelCount: query.data,
    };
  if (query.isError)
    return { channel, state: modelChannelFromError(query.error), modelCount: null };
  return { channel, state: "loading", modelCount: null };
}
