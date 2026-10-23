import { createStore, useStore, type StoreApi } from "zustand";
import { ManagementApiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { EMPTY_CAPABILITIES, type ServerCapabilities } from "@/lib/api/headers";
import { normalizeApiBase } from "@/lib/connection/normalize-api-base";
import {
  createLocalRememberedSessionStorage,
  type RememberedSessionStorage,
} from "@/lib/connection/remembered-session-storage";
import { probeConfig } from "@/features/auth/api";
import { connectInputSchema, type ConnectInput } from "@/features/auth/schemas";

export type SessionEndReason = "disconnected" | "unauthorized";

/** Structural seam for the in-memory demo transport; the production client remains unchanged. */
export type DemoApiTransport = Pick<
  ManagementApiClient,
  "get" | "post" | "put" | "patch" | "delete" | "getText" | "getBlob" | "postForm"
>;

export interface SessionState {
  isAuthenticated: boolean;
  apiBase: string | null;
  /** Memory only unless the user opted into remembering; never copied anywhere else. */
  managementKey: string | null;
  /** Bumped whenever a connection starts or ends; in-flight work from older revisions is discarded. */
  connectionRevision: number;
  capabilities: ServerCapabilities;
  remember: boolean;
  endReason: SessionEndReason | null;
  isDemo: boolean;
  connect(input: ConnectInput): Promise<void>;
  /** Loads a remembered session (if any) and connects with it. Returns false when none is usable. */
  restoreRememberedConnection(): Promise<boolean>;
  disconnect(): void;
  clearPersistedConnection(): void;
  /** Client bound to the active connection revision; throws when not authenticated. */
  getClient(): ManagementApiClient;
  /** Installs an ephemeral transport without probing, normalizing, or persisting credentials. */
  initializeDemo(transport: DemoApiTransport): void;
}

export interface SessionStoreDeps {
  storage?: RememberedSessionStorage;
  fetchImpl?: typeof fetch;
  location?: Pick<Location, "protocol" | "origin" | "pathname">;
}

const LOGGED_OUT = {
  isAuthenticated: false,
  apiBase: null,
  managementKey: null,
  capabilities: EMPTY_CAPABILITIES,
  remember: false,
  isDemo: false,
} as const;

export function createSessionStore(deps: SessionStoreDeps = {}): StoreApi<SessionState> {
  const storage = deps.storage ?? createLocalRememberedSessionStorage();
  let controller = new AbortController();
  let activeClient: ManagementApiClient | null = null;
  let demoTransport: DemoApiTransport | null = null;

  return createStore<SessionState>()((set, get) => {
    /** Ends the current connection: bumps the revision and aborts everything started under it. */
    const endConnection = (endReason: SessionEndReason | null) => {
      controller.abort();
      controller = new AbortController();
      activeClient = null;
      set({
        ...LOGGED_OUT,
        isDemo: demoTransport !== null,
        endReason,
        connectionRevision: get().connectionRevision + 1,
      });
    };

    const buildClient = (
      apiBase: string,
      managementKey: string,
      revision: number,
      handleUnauthorized: boolean,
    ) =>
      new ManagementApiClient({
        apiBase,
        managementKey,
        revision,
        getCurrentRevision: () => get().connectionRevision,
        connectionSignal: controller.signal,
        fetchImpl: deps.fetchImpl,
        onCapabilities: (capabilities) => set({ capabilities }),
        // During the login probe a 401 is reported to the caller instead of ending a session.
        onUnauthorized: handleUnauthorized
          ? () => {
              storage.clear();
              endConnection("unauthorized");
            }
          : undefined,
      });

    return {
      ...LOGGED_OUT,
      connectionRevision: 0,
      endReason: null,
      isDemo: false,

      async connect(input) {
        demoTransport = null;
        const { managementKey, remember } = connectInputSchema.parse(input);
        const apiBase = normalizeApiBase(input.apiBase, deps.location);
        endConnection(null);
        const revision = get().connectionRevision;
        const probeClient = buildClient(apiBase, managementKey, revision, false);
        try {
          await probeConfig(probeClient);
        } catch (error) {
          if (get().connectionRevision === revision) set({ capabilities: EMPTY_CAPABILITIES });
          throw error;
        }
        if (get().connectionRevision !== revision) return; // superseded while probing
        activeClient = buildClient(apiBase, managementKey, revision, true);
        if (remember) storage.save({ apiBase, managementKey });
        else storage.clear();
        set({
          isAuthenticated: true,
          apiBase,
          managementKey,
          remember,
        });
      },

      async restoreRememberedConnection() {
        const saved = storage.load();
        if (!saved) return false;
        try {
          await get().connect({ ...saved, remember: true });
          return true;
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) storage.clear(); // stale remembered key
          return false;
        }
      },

      disconnect() {
        if (!demoTransport) storage.clear();
        demoTransport = null;
        endConnection("disconnected");
      },

      clearPersistedConnection() {
        if (!demoTransport) storage.clear();
        set({ remember: false });
      },

      getClient() {
        if (!get().isAuthenticated || !activeClient)
          throw new Error("Not connected to a management API.");
        return activeClient;
      },

      initializeDemo(transport) {
        controller.abort();
        controller = new AbortController();
        demoTransport = transport;
        // SAFETY: DemoApiTransport and ManagementApiClient expose the same request method port.
        activeClient = transport as unknown as ManagementApiClient;
        set({
          isAuthenticated: true,
          isDemo: true,
          apiBase: null,
          managementKey: null,
          remember: false,
          endReason: null,
          connectionRevision: get().connectionRevision + 1,
          capabilities: EMPTY_CAPABILITIES,
        });
      },
    };
  });
}

export const sessionStore = createSessionStore();
export function useSessionStore<T>(selector: (state: SessionState) => T): T {
  return useStore(sessionStore, selector);
}
useSessionStore.getState = sessionStore.getState;
useSessionStore.subscribe = sessionStore.subscribe;
