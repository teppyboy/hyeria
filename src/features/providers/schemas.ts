import { z } from "zod";

/** Labels the management UI names directly; other valid group names from the backend are still accepted. */
export const KNOWN_PROVIDER_GROUPS = [
  "gemini",
  "codex",
  "claude",
  "vertex",
  "openai-compatibility",
] as const;

/** Group names become config path segments, so they must be non-blank and cannot contain `/` or be dot segments. */
export const providerGroupNameSchema = z
  .string()
  .refine(
    (name) =>
      name !== "" && name === name.trim() && name !== "." && name !== ".." && !name.includes("/"),
    { message: "Provider group name must be a single non-blank path segment." },
  );

/** Only `api-key` is read; other backend fields pass through so a save does not drop them. A null key is kept as blank. */
export const providerKeySchema = z.looseObject({ "api-key": z.string().nullable() });

/** Only `name`, `enabled` and `keys` are read; `base-url`, headers and other backend fields are preserved as-is. Null is allowed where the API returns it. */
export const providerEntrySchema = z.looseObject({
  name: z.string().nullish(),
  enabled: z.boolean().nullish(),
  keys: z.array(providerKeySchema).nullish(),
});

/** Writes always send a list; PUT replaces the whole group. */
export const providerGroupSchema = z.array(providerEntrySchema);

/** A group read from the server may be null, which means no entries. */
export const providerGroupValueSchema = providerGroupSchema.nullish();

export type ProviderEntry = z.infer<typeof providerEntrySchema>;
