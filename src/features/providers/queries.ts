import { useQuery } from "@tanstack/react-query";
import { useManagementClient } from "@/features/auth/queries";
import { useSessionStore } from "@/stores/session";
import { listProviderGroups } from "./api";

export const providerKeys = { all: ["providers"] as const };

/** Safe provider-group metadata; the view never carries key values or backend endpoints. */
export function useProviderGroupsQuery() {
  const revision = useSessionStore((state) => state.connectionRevision);
  const getClient = useManagementClient();
  return useQuery({
    queryKey: [...providerKeys.all, revision, "groups"],
    queryFn: () => listProviderGroups(getClient()),
  });
}
