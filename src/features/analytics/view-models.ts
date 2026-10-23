import { redactDeep, redactSensitive } from "@/lib/api/errors";
import type { AnalyticsSnapshot } from "./schemas";

export interface AnalyticsViewModel {
  title: string;
  scope: "live";
  observedAt: number;
  empty: boolean;
  serialized: string;
  coverageNote: string;
}

export function toAnalyticsViewModel(snapshot: AnalyticsSnapshot): AnalyticsViewModel {
  const data = snapshot.data;
  const empty = Array.isArray(data)
    ? data.length === 0
    : data !== null && typeof data === "object" && Object.keys(data).length === 0;
  return {
    title: "Usage bucket snapshot",
    scope: "live",
    observedAt: snapshot.observedAt,
    empty,
    serialized: JSON.stringify(redactDeep(data), null, 2),
    coverageNote: redactSensitive(snapshot.note),
  };
}
