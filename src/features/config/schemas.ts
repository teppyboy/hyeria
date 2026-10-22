import { z } from "zod";

/** Top-level sections safe to name in the visual summary; `access` and `oauth` hold credentials and stay out. */
export const visualSafeSectionSchema = z.enum([
  "management",
  "requests",
  "routing",
  "observability",
  "plugins",
]);
