import { z } from "zod";

export const connectInputSchema = z.object({
  apiBase: z.string(),
  managementKey: z.string().trim().min(1, "Enter the management key."),
  remember: z.boolean().default(false),
});
export type ConnectInput = z.input<typeof connectInputSchema>;

/** A v8 config body is the document itself; the probe only needs to know it is an object. */
export const configProbeSchema = z.record(z.string(), z.unknown());
