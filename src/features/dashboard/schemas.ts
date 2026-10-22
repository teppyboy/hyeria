import { z } from "zod";

// Permissive on purpose: plugin item and credential status vocabularies are unverified
// (docs/contracts/v8-endpoints.md §3.6, §3.8). Only the fields the summaries read are named.
export const pluginsListSchema = z.looseObject({
  plugins_enabled: z.boolean().optional(),
});

export const credentialsListSchema = z.looseObject({
  files: z.array(
    z.looseObject({
      provider: z.string().optional(),
      disabled: z.boolean().optional(),
      unavailable: z.boolean().optional(),
      runtime_only: z.boolean().optional(),
    }),
  ),
});
