import { z } from "zod";

/** Non-destructive in-memory bucket response is provider-defined; preserve it without inventing fields. */
export const usageBucketsSchema = z.unknown();

export const analyticsSourceSchema = z.enum(["api-key-buckets", "logs", "quotas"]);
export type AnalyticsSource = z.infer<typeof analyticsSourceSchema>;

export interface AnalyticsSnapshot<T = unknown> {
  source: AnalyticsSource;
  scope: "live";
  observedAt: number;
  data: T;
  note: string;
}
