import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useManagementClient } from "@/features/auth/queries";
import { useSessionStore } from "@/stores/session";
import { clearLogs, downloadErrorLog, fetchLogPage, listErrorLogs } from "./api";

export const logsKeys = { all: ["logs"] as const };

type LogPageParam = { after?: number; cursor?: string };

/** Reads log batches with the server cursor; the query signal cancels requests on unmount. */
export function useLogsQuery(limit = 100) {
  const revision = useSessionStore((state) => state.connectionRevision);
  const getClient = useManagementClient();
  return useInfiniteQuery({
    queryKey: [...logsKeys.all, revision, "lines", limit],
    queryFn: ({ pageParam, signal }) =>
      fetchLogPage(getClient(), { ...pageParam, limit }, signal),
    initialPageParam: {} as LogPageParam,
    getNextPageParam: (lastPage): LogPageParam | undefined =>
      lastPage.nextCursor
        ? { after: lastPage.latestTimestamp, cursor: lastPage.nextCursor }
        : undefined,
    retry: false,
  });
}

export function useErrorLogsQuery() {
  const revision = useSessionStore((state) => state.connectionRevision);
  const getClient = useManagementClient();
  return useQuery({
    queryKey: [...logsKeys.all, revision, "error-files"],
    queryFn: ({ signal }) => listErrorLogs(getClient(), signal),
    retry: false,
  });
}

export function useClearLogsMutation() {
  const getClient = useManagementClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [...logsKeys.all, "clear"],
    mutationFn: () => clearLogs(getClient()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: logsKeys.all }),
  });
}

/** Downloads only a server-approved error-log name; the API layer validates the path segment. */
export function useDownloadErrorLogMutation() {
  const getClient = useManagementClient();
  return useMutation({
    mutationKey: [...logsKeys.all, "download-error"],
    mutationFn: async (name: string) => {
      const { blob, filename } = await downloadErrorLog(getClient(), name);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    },
  });
}
