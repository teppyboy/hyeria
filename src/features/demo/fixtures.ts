export const demoConfig = {
  "config-version": 8,
  management: { "allow-remote": false },
  requests: { "proxy-url": "direct" },
  routing: { strategy: "round-robin", retry: { "request-retry": 2 } },
  "api-keys": {
    demo: [{ name: "demo-group", keys: [{ weight: 1 }] }],
  },
  observability: {
    logs: { "logging-to-file": true },
    usage: { "usage-statistics-enabled": true },
  },
  plugins: {
    enabled: true,
    configs: { "demo-plugin": { enabled: true, priority: 10 } },
  },
} as const;

export const demoCredentials = {
  files: [
    {
      id: "demo-user",
      auth_index: "demo-auth-index",
      name: "demo-user.json",
      provider: "demo-provider",
      status: "ready",
      disabled: false,
      unavailable: false,
      runtime_only: false,
      source: "file",
    },
    {
      id: "demo-runtime",
      auth_index: "demo-runtime-index",
      name: "demo-runtime",
      provider: "demo-provider",
      status: "ready",
      disabled: false,
      unavailable: false,
      runtime_only: true,
      source: "memory",
    },
  ],
} as const;

export const demoPlugins = {
  plugins_enabled: true,
  plugins_dir: "demo-plugins",
  plugins: [
    {
      id: "demo-plugin",
      path: "demo-plugin",
      enabled: true,
      metadata: { name: "Demo plugin", version: "1.0.0" },
      config_fields: [],
      menus: [],
    },
  ],
} as const;

export const demoPluginStore = {
  plugins: [{ id: "demo-plugin", source_id: "demo-source", version: "1.0.0", installed: true }],
  errors: [],
} as const;

export const demoLogs = {
  lines: ["demo request accepted"],
  "line-count": 1,
  "latest-timestamp": 1_700_000_000,
  "next-cursor": "demo-cursor",
} as const;

export const demoApiKeyBuckets = {
  demo: { success: 3, failure: 0 },
} as const;

export const demoQuota = { remaining: 42, limit: 100 } as const;

export const demoLatestVersion = { "latest-version": "v8.0.0-demo" } as const;
