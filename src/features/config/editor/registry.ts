import type { ConfigFieldDefinition, ConfigSectionDefinition } from "./types";

/** Verified safe visual fields; unsupported and secret-bearing settings stay in Advanced YAML. */
export const SAFE_CONFIG_FIELDS: readonly ConfigFieldDefinition[] = [
  {
    path: ["management", "allow-remote"],
    kind: "boolean",
    labelKey: "config.field.management.allowRemote",
    descriptionKey: "config.field.management.allowRemoteDescription",
    secret: false,
  },
  {
    path: ["requests", "proxy-url"],
    kind: "text",
    labelKey: "config.field.requests.proxyUrl",
    descriptionKey: "config.field.requests.proxyUrlDescription",
    secret: false,
  },
  {
    path: ["routing", "strategy"],
    kind: "select",
    labelKey: "config.field.routing.strategy",
    descriptionKey: "config.field.routing.strategyDescription",
    options: [{ value: "round-robin", labelKey: "config.option.roundRobin" }],
    secret: false,
  },
  {
    path: ["routing", "retry", "request-retry"],
    kind: "number",
    labelKey: "config.field.routing.requestRetry",
    descriptionKey: "config.field.routing.requestRetryDescription",
    minimum: 0,
    integer: true,
    secret: false,
  },
  {
    path: ["observability", "logs", "logging-to-file"],
    kind: "boolean",
    labelKey: "config.field.observability.loggingToFile",
    descriptionKey: "config.field.observability.loggingToFileDescription",
    secret: false,
  },
  {
    path: ["observability", "usage", "usage-statistics-enabled"],
    kind: "boolean",
    labelKey: "config.field.observability.usageStatisticsEnabled",
    descriptionKey: "config.field.observability.usageStatisticsEnabledDescription",
    secret: false,
  },
  {
    path: ["plugins", "enabled"],
    kind: "boolean",
    labelKey: "config.field.plugins.enabled",
    descriptionKey: "config.field.plugins.enabledDescription",
    secret: false,
  },
  {
    path: ["plugins", "configs", "<plugin>", "enabled"],
    kind: "boolean",
    labelKey: "config.field.plugins.pluginEnabled",
    descriptionKey: "config.field.plugins.pluginEnabledDescription",
    secret: false,
  },
  {
    path: ["plugins", "configs", "<plugin>", "priority"],
    kind: "number",
    labelKey: "config.field.plugins.pluginPriority",
    descriptionKey: "config.field.plugins.pluginPriorityDescription",
    integer: true,
    secret: false,
  },
] as const;

export const SAFE_CONFIG_SECTIONS: readonly ConfigSectionDefinition[] = [
  {
    id: "management",
    labelKey: "config.section.management",
    descriptionKey: "config.section.managementDescription",
  },
  {
    id: "requests",
    labelKey: "config.section.requests",
    descriptionKey: "config.section.requestsDescription",
  },
  {
    id: "routing",
    labelKey: "config.section.routing",
    descriptionKey: "config.section.routingDescription",
  },
  {
    id: "observability",
    labelKey: "config.section.observability",
    descriptionKey: "config.section.observabilityDescription",
  },
  {
    id: "plugins",
    labelKey: "config.section.plugins",
    descriptionKey: "config.section.pluginsDescription",
  },
  {
    id: "advanced-yaml",
    labelKey: "config.section.advancedYaml",
    descriptionKey: "config.section.advancedYamlDescription",
  },
] as const;
