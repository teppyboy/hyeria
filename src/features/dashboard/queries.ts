import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useManagementClient } from "@/features/auth/queries";
import { useModelChannelQueries, modelChannelAvailability } from "@/features/models/queries";
import { useSessionStore } from "@/stores/session";
import {
  buildCapabilitySnapshot,
  candidateModelChannels,
  endpointStateFromError,
  type CapabilitySnapshot,
  type EndpointState,
} from "@/lib/feature-support/capabilities";
import { fetchCredentialsSummary, fetchPluginsProbe } from "./api";

export const dashboardKeys = { all: ["dashboard"] as const };

/** Credential summary shared by the dashboard and system pages (same key, one request). */
export function useCredentialsSummaryQuery() {
  const revision = useSessionStore((state) => state.connectionRevision);
  const getClient = useManagementClient();
  return useQuery({
    queryKey: [...dashboardKeys.all, revision, "credentials"],
    queryFn: ({ signal }) => fetchCredentialsSummary(getClient(), signal),
  });
}

export function endpointStateFromQuery(query: UseQueryResult<unknown, Error>): EndpointState {
  if (query.isSuccess) return "ok";
  if (query.isError) return endpointStateFromError(query.error);
  return "unknown";
}

export function useDashboardQuery() {
  const revision = useSessionStore((state) => state.connectionRevision);
  const capabilities = useSessionStore((state) => state.capabilities);
  const getClient = useManagementClient();
  const plugins = useQuery({
    queryKey: [...dashboardKeys.all, revision, "plugins"],
    queryFn: ({ signal }) => fetchPluginsProbe(getClient(), signal),
  });
  const credentials = useCredentialsSummaryQuery();
  const channels = candidateModelChannels(credentials.data?.providers ?? []);
  const modelQueries = useModelChannelQueries(channels);

  const modelChannels = channels.map((channel, index) =>
    modelChannelAvailability(channel, modelQueries[index]),
  );
  const snapshot: CapabilitySnapshot = buildCapabilitySnapshot({
    capabilities,
    endpoints: {
      "/plugins": endpointStateFromQuery(plugins),
      "/credentials": endpointStateFromQuery(credentials),
    },
    modelChannels,
  });
  return {
    snapshot,
    pluginsEnabled: plugins.data?.pluginsEnabled ?? null,
    plugins,
    credentials,
  };
}
