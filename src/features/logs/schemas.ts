import { z } from "zod";

export const logPageSchema = z.object({
  lines: z.array(z.string()),
  "line-count": z.number().int().nonnegative(),
  "latest-timestamp": z.number().int().nonnegative(),
  "next-cursor": z.string(),
  "cursor-reset": z.boolean().optional(),
});

export const logClearSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  removed: z.number().int().nonnegative(),
});

const errorLogRecordSchema = z.object({
  name: z.string(),
  size: z.number().int().nonnegative(),
  modified: z.number().int().nonnegative(),
});
export const errorLogListSchema = z.object({ files: z.array(errorLogRecordSchema) });

/** Only `error-*.log` leaves are accepted; no separators, no traversal, no spaces. */
export const errorLogNameSchema = z
  .string()
  .regex(/^error-[A-Za-z0-9._-]{1,180}\.log$/)
  .refine((name) => !name.includes(".."));

/** Usage records are undocumented (UNKNOWN); each record is passed through unread apart from redaction. */
export const usageQueueSchema = z.array(z.unknown());
