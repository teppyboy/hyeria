import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useManagementClient } from "@/features/auth/queries";
import { readConfigYaml, writeConfigYaml } from "./api";
import { useSessionStore } from "@/stores/session";

export const configKeys = { all: ["config"] as const };

/** Raw config YAML as the server stores it; the page edits this text, never a re-serialized object. */
export function useConfigYamlQuery() {
  const revision = useSessionStore((state) => state.connectionRevision);
  const getClient = useManagementClient();
  return useQuery({
    queryKey: [...configKeys.all, revision, "yaml"],
    queryFn: () => readConfigYaml(getClient()),
  });
}

export function useSaveConfigYamlMutation() {
  const queryClient = useQueryClient();
  const getClient = useManagementClient();
  return useMutation({
    mutationKey: [...configKeys.all, "save-yaml"],
    mutationFn: (text: string) => writeConfigYaml(getClient(), text),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: configKeys.all }),
  });
}
