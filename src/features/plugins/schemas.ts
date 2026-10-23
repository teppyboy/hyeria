import { z } from "zod";

/** Plugin IDs are backend path segments; keep them opaque but never allow traversal or separators. */
export const pluginIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/)
  .refine((id) => !id.includes(".."));

/** Store source IDs and versions are query/body values, not path segments. */
export const pluginSourceIdSchema = z.string().min(1).max(256);
export const pluginVersionSchema = z.string().min(1).max(128);
export const pluginAuthIndexSchema = z.string().min(1).max(256);

/**
 * Plugin response shapes are only partially documented by v8. Unknown fields stay available to
 * the feature, while IDs and menu labels receive the validation needed at this trust boundary.
 */
export const pluginRecordSchema = z.looseObject({
  id: pluginIdSchema,
  path: z.string().max(4096).optional(),
  enabled: z.boolean().optional(),
  metadata: z.unknown().optional(),
  config_fields: z.unknown().optional(),
  menus: z.unknown().optional(),
});

export const pluginsResponseSchema = z.looseObject({
  plugins_enabled: z.boolean().optional(),
  plugins_dir: z.string().max(4096).optional(),
  plugins: z.unknown().optional(),
});

export const pluginConfigSchema = z.record(z.string(), z.unknown());

export const configMutationResponseSchema = z.looseObject({
  status: z.literal("ok"),
  "config-version": z.literal(8).optional(),
});

export const pluginInstallResponseSchema = z.object({
  status: z.literal("installed"),
  source_id: z.string(),
  id: pluginIdSchema,
  version: z.string(),
  path: z.string(),
  restart_required: z.boolean(),
});

export const pluginStoreRecordSchema = z.looseObject({
  id: pluginIdSchema.optional(),
  source_id: z.string().optional(),
  version: z.string().optional(),
  installed: z.boolean().optional(),
  update_available: z.boolean().optional(),
});

export const pluginStoreResponseSchema = z.looseObject({
  plugins: z.unknown().optional(),
  errors: z.unknown().optional(),
});

export type PluginInstallResult = z.infer<typeof pluginInstallResponseSchema>;
export type PluginRecord = z.infer<typeof pluginRecordSchema>;
export type PluginStoreRecord = z.infer<typeof pluginStoreRecordSchema>;
