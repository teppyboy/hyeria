import { useQuery } from "@tanstack/react-query";
import { useManagementClient } from "@/features/auth/queries";
import { useSessionStore } from "@/stores/session";
import { fetchApiKeyBuckets } from "./api";

export const analyticsKeys = { all: ["analytics"] as const };

export function useApiKeyBucketsQuery() {
  const revision = useSessionStore((state) => state.connectionRevision);
  const getClient = useManagementClient();
  return useQuery({
    queryKey: [...analyticsKeys.all, revision, "api-key-buckets"],
    queryFn: ({ signal }) => fetchApiKeyBuckets(getClient(), signal),
    retry: false,
    refetchOnWindowFocus: false,
  });
}
