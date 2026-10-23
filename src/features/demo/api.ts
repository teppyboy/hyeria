import type { ManagementApiTransport, RequestOptions } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { parse, stringify } from "yaml";
import {
  demoApiKeyBuckets,
  demoConfig,
  demoCredentials,
  demoLatestVersion,
  demoLogs,
  demoPluginStore,
  demoPlugins,
  demoQuota,
} from "./fixtures";

type JsonRecord = Record<string, unknown>;
type DemoValue = JsonRecord | string | number | boolean | null | undefined;
type DemoState = {
  config: JsonRecord;
  credentials: JsonRecord[];
  plugins: JsonRecord[];
  logs: string[];
  pluginStore: JsonRecord[];
};

function copy<T>(value: T): T {
  return structuredClone(value);
}

function unsupported(method: string, path: string): ApiError {
  return new ApiError({
    status: null,
    code: "invalid_response",
    message: `The demo API does not implement ${method} ${path}.`,
  });
}

function result() {
  return { status: "ok", "config-version": 8 };
}

function queryValue(options: RequestOptions | undefined, name: string): string | undefined {
  const value = options?.query?.[name];
  return value === undefined ? undefined : String(value);
}

function configAt(config: JsonRecord, path: string): DemoValue {
  return path
    .split("/")
    .filter(Boolean)
    .reduce<DemoValue>((value, segment): DemoValue => {
      if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
      return value[decodeURIComponent(segment)] as DemoValue;
    }, config);
}

function setConfigAt(config: JsonRecord, path: string, value: unknown, merge: boolean): void {
  const segments = path.split("/").filter(Boolean).map(decodeURIComponent);
  if (segments.length === 0) {
    Object.keys(config).forEach((key) => delete config[key]);
    Object.assign(config, copy(value as JsonRecord));
    return;
  }
  let node = config;
  for (const segment of segments.slice(0, -1)) {
    if (node[segment] === null || typeof node[segment] !== "object" || Array.isArray(node[segment]))
      node[segment] = {};
    node = node[segment] as JsonRecord;
  }
  const key = segments.at(-1)!;
  node[key] =
    merge && isRecord(node[key]) && isRecord(value)
      ? { ...node[key], ...copy(value) }
      : copy(value);
}

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deleteConfigAt(config: JsonRecord, path: string): void {
  const segments = path.split("/").filter(Boolean).map(decodeURIComponent);
  if (!segments.length) return;
  let node: JsonRecord | undefined = config;
  for (const segment of segments.slice(0, -1)) {
    const child: unknown = node[segment];
    if (!isRecord(child)) return;
    node = child;
  }
  delete node[segments.at(-1)!];
}

function makeState(): DemoState {
  return {
    config: copy(demoConfig),
    credentials: demoCredentials.files.map((item) => copy(item) as JsonRecord),
    plugins: demoPlugins.plugins.map((item) => copy(item) as JsonRecord),
    logs: [...demoLogs.lines],
    pluginStore: demoPluginStore.plugins.map((item) => copy(item) as JsonRecord),
  };
}

export function createDemoApi(): ManagementApiTransport {
  const state = makeState();

  async function get<T = unknown>(path: string, _options?: RequestOptions): Promise<T> {
    if (path === "/config") return copy(state.config) as T;
    if (path.startsWith("/config/") && path !== "/config/plugins")
      return copy(configAt(state.config, path.slice(7))) as T;
    if (path === "/config.yaml") return stringify(state.config) as T;
    if (path === "/credentials") return { files: copy(state.credentials) } as T;
    if (path === "/credentials/models") return { models: ["demo-model"] } as T;
    if (path === "/credentials/download")
      return new Blob(["{}"], { type: "application/json" }) as T;
    if (path === "/plugins") return { ...copy(demoPlugins), plugins: copy(state.plugins) } as T;
    if (path === "/plugins/store") return { plugins: copy(state.pluginStore), errors: [] } as T;
    if (path === "/config/plugins") return copy((state.config.plugins as JsonRecord) ?? {}) as T;
    if (path.match(/^\/plugins\/[^/]+\/quota$/)) return copy(demoQuota) as T;
    if (path === "/server/latest-version") return copy(demoLatestVersion) as T;
    if (path === "/observability/logs") {
      return {
        lines: [...state.logs],
        "line-count": state.logs.length,
        "latest-timestamp": demoLogs["latest-timestamp"],
        "next-cursor": state.logs.length ? demoLogs["next-cursor"] : "",
      } as T;
    }
    if (path === "/observability/logs/errors") return { files: [] } as T;
    if (path === "/observability/usage/api-keys") return copy(demoApiKeyBuckets) as T;
    if (path === "/observability/usage/queue") return [] as T;
    if (path.match(/^\/observability\/logs\/errors\/[^/]+$/)) return "" as T;
    if (path.match(/^\/routing\/model-definitions\/[^/]+$/)) {
      const channel = decodeURIComponent(path.slice("/routing/model-definitions/".length));
      return { channel, models: ["demo-model"] } as T;
    }
    throw unsupported("GET", path);
  }

  async function mutate<T = unknown>(
    method: "POST" | "PUT" | "PATCH" | "DELETE",
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    if ((method === "PUT" || method === "PATCH") && path === "/config") {
      if (!isRecord(body)) throw unsupported(method, path);
      if (method === "PUT") state.config = copy(body);
      else state.config = { ...state.config, ...copy(body) };
      return result() as T;
    }
    if ((method === "PUT" || method === "PATCH") && path === "/config.yaml") {
      const parsed = parse(String(body));
      if (!isRecord(parsed)) throw unsupported(method, path);
      state.config = copy(parsed);
      return result() as T;
    }
    if (
      (method === "PUT" || method === "PATCH") &&
      path.startsWith("/config/") &&
      !path.startsWith("/config/plugins/")
    ) {
      setConfigAt(state.config, path.slice(7), body, method === "PATCH");
      return result() as T;
    }
    if (method === "DELETE" && path.startsWith("/config/")) {
      deleteConfigAt(state.config, path.slice(7));
      return result() as T;
    }
    if (method === "PATCH" && path === "/credentials/status" && isRecord(body)) {
      const name = String(body.name);
      const file = state.credentials.find((item) => item.name === name);
      if (file) file.disabled = body.disabled === true;
      return { status: "ok" } as T;
    }
    if (method === "PATCH" && path === "/credentials/fields") return { status: "ok" } as T;
    if (method === "POST" && path === "/credentials/refresh") return { status: "ok" } as T;
    if (method === "POST" && path === "/credentials") {
      const name = queryValue(options, "name");
      if (name && !state.credentials.some((item) => item.name === name)) {
        state.credentials.push({
          id: name,
          auth_index: `demo-${state.credentials.length}`,
          name,
          provider: "demo-provider",
          status: "ready",
          disabled: false,
          unavailable: false,
          runtime_only: false,
          source: "file",
        });
      }
      return { status: "ok" } as T;
    }
    if (method === "POST" && path === "/routing/cooldown/reset") {
      const authIndex =
        isRecord(body) && typeof body.auth_index === "string" ? body.auth_index : "demo-auth-index";
      return { status: "ok", auth_index: authIndex, models: ["demo-model"] } as T;
    }
    if (
      (method === "PUT" || method === "PATCH") &&
      path.match(/^\/config\/plugins\/configs\/[^/]+$/)
    ) {
      const id = path.split("/").at(-1)!;
      const configs = ((state.config.plugins as JsonRecord).configs ??= {}) as JsonRecord;
      configs[id] = copy(body);
      return result() as T;
    }
    if (
      (method === "PUT" || method === "PATCH") &&
      path.match(/^\/config\/plugins\/configs\/[^/]+\/enabled$/)
    ) {
      const id = path.split("/").at(-2)!;
      const configs = ((state.config.plugins as JsonRecord).configs ??= {}) as JsonRecord;
      configs[id] = { ...(configs[id] ?? {}), enabled: body === true };
      const plugin = state.plugins.find((item) => item.id === id);
      if (plugin) plugin.enabled = body === true;
      return result() as T;
    }
    if (method === "DELETE" && path === "/observability/logs") {
      const removed = state.logs.length;
      state.logs = [];
      return { success: true, message: "Demo logs cleared.", removed } as T;
    }
    if (method === "DELETE" && path === "/credentials") {
      if (queryValue(options, "all") === "true") {
        const deleted = state.credentials.filter((item) => !item.runtime_only).length;
        state.credentials = state.credentials.filter((item) => item.runtime_only);
        return { status: "ok", deleted } as T;
      }
      const name = queryValue(options, "name");
      state.credentials = state.credentials.filter((item) => item.name !== name);
      return { status: "ok" } as T;
    }
    if (method === "DELETE" && path.match(/^\/plugins\/[^/]+$/)) {
      const id = path.split("/").at(-1);
      state.plugins = state.plugins.filter((item) => item.id !== id);
      return { status: "ok" } as T;
    }
    throw unsupported(method, path);
  }

  return {
    get,
    post: (path, body, options) => mutate("POST", path, body, options),
    put: (path, body, options) => mutate("PUT", path, body, options),
    patch: (path, body, options) => mutate("PATCH", path, body, options),
    delete: (path, options) => mutate("DELETE", path, undefined, options),
    getText: (path, options) => get<string>(path, options),
    getBlob: (path, options) => get<Blob>(path, options),
    postForm: (path, _form, options) => mutate("POST", path, undefined, options),
  };
}
