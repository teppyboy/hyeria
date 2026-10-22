import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useManagementClient } from "@/features/auth/queries";
import { useAuthFilesQuery } from "@/features/auth-files/queries";
import { resetCooldown } from "./api";

export const quotaKeys = { all: ["quota"] as const };

/** Credential metadata is the only authoritative source of opaque auth indexes. */
export function useQuotaCredentialsQuery() {
  return useAuthFilesQuery();
}

export function useResetCooldownMutation() {
  const getClient = useManagementClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [...quotaKeys.all, "cooldown-reset"],
    mutationFn: (authIndex: string) => resetCooldown(getClient(), authIndex),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: quotaKeys.all }),
  });
}
