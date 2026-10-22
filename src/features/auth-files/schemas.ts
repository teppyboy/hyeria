import { z } from "zod";

/** A bare `*.json` leaf name: no path separators, spaces, control characters, leading dot or `..`. */
export const authFileNameSchema = z
  .string()
  .regex(/^[A-Za-z0-9_@+-][A-Za-z0-9._@+-]{0,199}\.json$/)
  .refine((name) => !name.includes(".."));

/** Metadata fields only; per-provider fields are UNKNOWN and are stripped by the object schema. */
const authFileRecordSchema = z.object({
  id: z.string(),
  auth_index: z.string(),
  name: z.string(),
  provider: z.string(),
  status: z.string(),
  disabled: z.boolean(),
  unavailable: z.boolean(),
  runtime_only: z.boolean(),
  source: z.string(),
});
export const authFileListSchema = z.object({ files: z.array(authFileRecordSchema) });

export const okStatusSchema = z.object({ status: z.literal("ok") });

export const deleteAllResultSchema = okStatusSchema.extend({
  deleted: z.number().int().nonnegative(),
});
