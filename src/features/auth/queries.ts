import { useMutation } from "@tanstack/react-query";
import { sessionStore, useSessionStore } from "@/stores/session";
import type { ConnectInput } from "./schemas";

export const authKeys = { all: ["auth"] as const };

export function useConnectMutation() {
  return useMutation({
    mutationKey: [...authKeys.all, "connect"],
    mutationFn: (input: ConnectInput) => sessionStore.getState().connect(input),
  });
}

/** Client for the active connection, or throws when logged out; call inside query/mutation functions. */
export function useManagementClient() {
  useSessionStore((state) => state.connectionRevision);
  return () => sessionStore.getState().getClient();
}
