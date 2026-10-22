import { z } from "zod";

/** Plugin IDs are path segments, so only plain identifiers are allowed. */
export const pluginIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/)
  .refine((id) => !id.includes(".."));

/** Auth indexes are opaque strings (docs/contracts/v8-endpoints.md §3.6); only emptiness and size are checked. */
export const authIndexSchema = z.string().min(1).max(256);

export const cooldownResetSchema = z.object({
  status: z.literal("ok"),
  auth_index: z.string(),
  models: z.array(z.string()),
});

/** Provider quota bodies are UNKNOWN; only a top-level JSON object is required, and its detail is kept. */
export const pluginQuotaSchema = z.record(z.string(), z.unknown());
