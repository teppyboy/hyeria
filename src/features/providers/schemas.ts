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

/** Only `api-key` is read; other backend fields pass through so a save does not drop them. */
export const providerKeySchema = z.looseObject({ "api-key": z.string() });

/** Only `name`, `enabled` and `keys` are read; `base-url`, headers and other backend fields are preserved as-is. */
export const providerEntrySchema = z.looseObject({
  name: z.string().optional(),
  enabled: z.boolean().optional(),
  keys: z.array(providerKeySchema).optional(),
});

export const providerGroupSchema = z.array(providerEntrySchema);

export type ProviderEntry = z.infer<typeof providerEntrySchema>;
