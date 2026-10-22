import { z } from "zod";

/** A bare `*.json` leaf name: no path separators, spaces, control characters, leading dot or `..`. */
export const authFileNameSchema = z
  .string()
  .regex(/^[A-Za-z0-9_@+-][A-Za-z0-9._@+-]{0,199}\.json$/)
  .refine((name) => !name.includes(".."));

/** Opaque listed identifier (file-backed or runtime-only); the contract does not define its form beyond being a string. */
export const authFileIdentifierSchema = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9._@+-]{0,199}$/)
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

export const authFileModelsSchema = z.looseObject({ models: z.array(z.unknown()) });

const FIELD_PATH = /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/;

/** Dot-path metadata keys with JSON values; `name` remains the request's file selector. */
export const authFileFieldsSchema = z.record(
  z
    .string()
    .regex(FIELD_PATH)
    .refine((path) => path !== "name"),
  z.json(),
);
