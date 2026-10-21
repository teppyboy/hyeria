import { useEffect, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient, resetServerState } from "./query-client";
import { sessionStore } from "@/stores/session";

/** Clears all cached server state whenever the connection revision changes (disconnect, 401, instance switch). */
export function Providers({ children }: { children: ReactNode }) {
  useEffect(
    () =>
      sessionStore.subscribe((state, previous) => {
        if (state.connectionRevision !== previous.connectionRevision)
          void resetServerState(queryClient);
      }),
    [],
  );
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
