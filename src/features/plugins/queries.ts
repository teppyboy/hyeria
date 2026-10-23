import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useManagementClient } from "@/features/auth/queries";
import { useSessionStore } from "@/stores/session";
import {
  getPluginConfig,
  getPluginQuota,
  installPlugin,
  listPluginStore,
  listPlugins,
  setPluginConfig,
  setPluginEnabled,
  uninstallPlugin,
} from "./api";

export const pluginKeys = {
  all: ["plugins"] as const,
  list: () => [...pluginKeys.all, "list"] as const,
  config: () => [...pluginKeys.all, "config"] as const,
  store: () => [...pluginKeys.all, "store"] as const,
  quota: (id: string, authIndex: string) => [...pluginKeys.all, "quota", id, authIndex] as const,
};

export function usePluginsQuery() {
  const getClient = useManagementClient();
  const supported = useSessionStore((state) => state.capabilities.supportsPlugins);
  return useQuery({
    queryKey: pluginKeys.list(),
    queryFn: ({ signal }) => listPlugins(getClient(), signal),
    enabled: supported !== false,
  });
}

export function usePluginConfigQuery() {
  const getClient = useManagementClient();
  return useQuery({
    queryKey: pluginKeys.config(),
    queryFn: ({ signal }) => getPluginConfig(getClient(), signal),
  });
}

export function usePluginStoreQuery() {
  const getClient = useManagementClient();
  const supported = useSessionStore((state) => state.capabilities.supportsPlugins);
  return useQuery({
    queryKey: pluginKeys.store(),
    queryFn: ({ signal }) => listPluginStore(getClient(), signal),
    enabled: supported !== false,
  });
}

export function usePluginQuotaQuery(id: string, authIndex: string) {
  const getClient = useManagementClient();
  return useQuery({
    queryKey: pluginKeys.quota(id, authIndex),
    queryFn: ({ signal }) => getPluginQuota(getClient(), id, authIndex, signal),
    enabled: id.length > 0 && authIndex.length > 0,
  });
}

export function usePluginConfigMutations() {
  const getClient = useManagementClient();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: pluginKeys.all });
  return {
    setConfig: useMutation({
      mutationFn: ({ id, config }: { id: string; config: Record<string, unknown> }) =>
        setPluginConfig(getClient(), id, config),
      onSuccess: invalidate,
    }),
    setEnabled: useMutation({
      mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
        setPluginEnabled(getClient(), id, enabled),
      onSuccess: invalidate,
    }),
    install: useMutation({
      mutationFn: ({ id, source, version }: { id: string; source?: string; version?: string }) =>
        installPlugin(getClient(), id, { source, version }),
      onSuccess: invalidate,
    }),
    uninstall: useMutation({
      mutationFn: (id: string) => uninstallPlugin(getClient(), id),
      onSuccess: invalidate,
    }),
  };
}
