import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ManagementApiClient } from "@/lib/api/client";
import { useManagementClient } from "@/features/auth/queries";
import { useSessionStore } from "@/stores/session";
import {
  deleteAllAuthFiles,
  deleteAuthFile,
  downloadAuthFile,
  listAuthFileModels,
  listAuthFiles,
  refreshAuthFiles,
  setAuthFileDisabled,
  uploadAuthFileMultipart,
} from "./api";

export const authFileKeys = { all: ["auth-files"] as const };

export function useAuthFilesQuery() {
  const revision = useSessionStore((state) => state.connectionRevision);
  const getClient = useManagementClient();
  return useQuery({
    queryKey: [...authFileKeys.all, revision, "list"],
    queryFn: () => listAuthFiles(getClient()),
  });
}

/** Models for one credential by its file name; disabled while there is no file name to ask about. */
export function useAuthFileModelsQuery(fileName: string | null) {
  const revision = useSessionStore((state) => state.connectionRevision);
  const getClient = useManagementClient();
  return useQuery({
    queryKey: [...authFileKeys.all, revision, "models", fileName],
    queryFn: () => listAuthFileModels(getClient(), fileName ?? ""),
    enabled: fileName !== null,
  });
}

/** Every mutation here can change the list, so each one refreshes it when it settles. */
function useAuthFileMutation<TVariables, TData>(
  mutationKey: string,
  mutationFn: (client: ManagementApiClient, variables: TVariables) => Promise<TData>,
) {
  const queryClient = useQueryClient();
  const getClient = useManagementClient();
  return useMutation({
    mutationKey: [...authFileKeys.all, mutationKey],
    mutationFn: (variables: TVariables) => mutationFn(getClient(), variables),
    onSettled: () => queryClient.invalidateQueries({ queryKey: authFileKeys.all }),
  });
}

export function useUploadAuthFileMutation() {
  return useAuthFileMutation("upload", (client, file: File) =>
    uploadAuthFileMultipart(client, file.name, file),
  );
}

export function useDeleteAuthFileMutation() {
  return useAuthFileMutation("delete", (client, name: string) => deleteAuthFile(client, name));
}

export function useDeleteAllAuthFilesMutation() {
  return useAuthFileMutation("delete-all", (client) => deleteAllAuthFiles(client));
}

export function useSetAuthFileDisabledMutation() {
  return useAuthFileMutation("disabled", (client, input: { name: string; disabled: boolean }) =>
    setAuthFileDisabled(client, input.name, input.disabled),
  );
}

export function useRefreshAuthFilesMutation() {
  return useAuthFileMutation("refresh", (client) => refreshAuthFiles(client));
}

/** Downloads through a blob URL; the save name comes from the API layer, never the server. */
export function useDownloadAuthFileMutation() {
  const getClient = useManagementClient();
  return useMutation({
    mutationKey: [...authFileKeys.all, "download"],
    mutationFn: async (name: string) => {
      const { blob, filename } = await downloadAuthFile(getClient(), name);
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
