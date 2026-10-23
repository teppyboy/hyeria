import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useManagementClient } from "@/features/auth/queries";
import { authFileKeys } from "@/features/auth-files/queries";
import {
  cancelOAuthSession,
  importVertexCredential,
  pollOAuthStatus,
  postOAuthCallback,
  startOAuth,
  type OAuthAuthUrl,
  type OAuthCallbackBody,
  type VertexImportResult,
} from "./api";

export const oauthKeys = { all: ["oauth"] as const };

export function useStartOAuthMutation() {
  const getClient = useManagementClient();
  return useMutation({
    mutationKey: [...oauthKeys.all, "start"],
    mutationFn: (provider: string) => startOAuth(getClient(), provider),
  });
}

export function usePollOAuthMutation() {
  const getClient = useManagementClient();
  return useMutation({
    mutationKey: [...oauthKeys.all, "poll"],
    mutationFn: (input: { state: string; signal?: AbortSignal }) =>
      pollOAuthStatus(getClient(), input.state, input.signal),
  });
}

export function useCancelOAuthMutation() {
  const getClient = useManagementClient();
  return useMutation({
    mutationKey: [...oauthKeys.all, "cancel"],
    mutationFn: (state: string) => cancelOAuthSession(getClient(), state),
  });
}

export function usePostOAuthCallbackMutation() {
  const getClient = useManagementClient();
  return useMutation({
    mutationKey: [...oauthKeys.all, "callback"],
    mutationFn: (input: { body: OAuthCallbackBody; signal?: AbortSignal }) =>
      postOAuthCallback(getClient(), input.body, input.signal),
  });
}

export function useImportVertexCredentialMutation() {
  const getClient = useManagementClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [...oauthKeys.all, "vertex-import"],
    mutationFn: (input: { file: Blob; location?: string }) =>
      importVertexCredential(getClient(), input.file, input.location),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authFileKeys.all }),
  });
}

export type { OAuthAuthUrl, VertexImportResult };
