import { redactDeep, redactSensitive } from "@/lib/api/errors";
import type { AnalyticsSnapshot } from "./schemas";

export interface AnalyticsViewModel {
  title: string;
  scope: "live";
  observedAt: number;
  empty: boolean;
  rows: { label: string; value: string }[];
  coverageNote: string;
}

export function toAnalyticsViewModel(snapshot: AnalyticsSnapshot): AnalyticsViewModel {
  const data = snapshot.data;
  const empty = Array.isArray(data)
    ? data.length === 0
    : data !== null && typeof data === "object" && Object.keys(data).length === 0;
  const redacted = redactDeep(data);
  const entries =
    redacted !== null && typeof redacted === "object"
      ? Object.entries(redacted)
      : [["value", redacted] as [string, unknown]];
  return {
    title: "Usage bucket snapshot",
    scope: "live",
    observedAt: snapshot.observedAt,
    empty,
    rows: entries.map(([label, value]) => ({
      label,
      value: typeof value === "string" ? value : JSON.stringify(value),
    })),
    coverageNote: redactSensitive(snapshot.note),
  };
}
