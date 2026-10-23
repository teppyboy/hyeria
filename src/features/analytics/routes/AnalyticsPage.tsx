import { useApiKeyBucketsQuery } from "../queries";
import { toAnalyticsViewModel } from "../view-models";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AnalyticsPage() {
  const buckets = useApiKeyBucketsQuery();
  if (buckets.isPending) return <p role="status">Loading live usage buckets…</p>;
  if (buckets.isError)
    return <p role="alert">Live usage buckets are unavailable on this server.</p>;
  const view = toAnalyticsViewModel(buckets.data);
  return (
    <section className="grid gap-4">
      <h1 className="text-2xl font-semibold">Analytics</h1>
      <p role="note">
        {view.coverageNote} This is not durable history and may reset when the backend restarts.
      </p>
      {view.empty ? (
        <p>No live usage buckets were returned.</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{view.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Observed {new Date(view.observedAt).toLocaleString()}</p>
            <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-all text-xs">
              {view.serialized}
            </pre>
          </CardContent>
        </Card>
      )}
      <Button type="button" variant="outline" onClick={() => void buckets.refetch()}>
        Refresh snapshot
      </Button>
    </section>
  );
}
