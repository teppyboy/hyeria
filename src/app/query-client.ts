import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/errors";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Client errors and aborts will not change on retry; transient failures get one more try.
        retry: (failureCount, error) =>
          !(
            error instanceof ApiError &&
            (error.status === null ? error.code === "aborted" : error.status < 500)
          ) && failureCount < 1,
        refetchOnWindowFocus: false,
        staleTime: 0,
      },
    },
  });
}

export const queryClient = createQueryClient();

/** Drops every cached server result and cancels in-flight fetches belonging to the previous instance. */
export async function resetServerState(client: QueryClient = queryClient): Promise<void> {
  await client.cancelQueries();
  client.clear();
}
