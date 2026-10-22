import { z } from "zod";

// Model entry shape is unverified (docs/contracts/v8-endpoints.md §3.4); only the count is used.
export const modelDefinitionsSchema = z.looseObject({
  models: z.array(z.unknown()).optional(),
});
