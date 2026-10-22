import { useMutation, useQuery } from "@tanstack/react-query";
import { useManagementClient } from "@/features/auth/queries";
import { useCredentialsSummaryQuery } from "@/features/dashboard/queries";
import { useModelChannelQueries } from "@/features/models/queries";
import { useSessionStore, sessionStore } from "@/stores/session";
import { candidateModelChannels } from "@/lib/feature-support/capabilities";
import { fetchLatestVersion } from "./api";

export const systemKeys = { all: ["system"] as const };

/** Latest release, independent of capability data; a failure leaves the rest of the page usable. */
export function useLatestVersionQuery() {
  const revision = useSessionStore((state) => state.connectionRevision);
  const getClient = useManagementClient();
  return useQuery({
    queryKey: [...systemKeys.all, revision, "latest-version"],
    queryFn: ({ signal }) => fetchLatestVersion(getClient(), signal),
  });
}

export function useSystemQueries() {
  const latestVersion = useLatestVersionQuery();
  const credentials = useCredentialsSummaryQuery();
  const channels = candidateModelChannels(credentials.data?.providers ?? []);
  const modelDefinitions = useModelChannelQueries(channels);
  // Local cleanup only: removes the remembered key from this browser, never calls the server.
  const forgetRememberedSession = useMutation({
    mutationKey: [...systemKeys.all, "forget-remembered-session"],
    mutationFn: async () => sessionStore.getState().clearPersistedConnection(),
  });
  return { latestVersion, channels, modelDefinitions, forgetRememberedSession };
}
