import type { ReactNode } from "react";
import { useApiKeyBucketsQuery } from "../queries";
import { toAnalyticsViewModel } from "../view-models";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionGroup } from "@/components/workspace/ActionGroup";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
import { WorkspaceState } from "@/components/workspace/WorkspaceState";

export function AnalyticsPage() {
  const buckets = useApiKeyBucketsQuery();
  const header = (status?: ReactNode, actions?: ReactNode) => (
    <WorkspaceHeader title="Analytics" status={status} actions={actions} />
  );
  if (buckets.isPending)
    return (
      <section className="mx-auto grid max-w-5xl gap-6">
        {header()}
        <WorkspaceState kind="loading" title="Loading live usage buckets…" />
      </section>
    );
  if (buckets.isError)
    return (
      <section className="mx-auto grid max-w-5xl gap-6">
        {header()}
        <WorkspaceState kind="error" title="Live usage buckets are unavailable on this server." />
      </section>
    );
  const view = toAnalyticsViewModel(buckets.data);
  return (
    <section className="mx-auto grid max-w-5xl gap-6">
      {header(
        <p role="note" data-slot="analytics-scope" className="text-sm text-muted-foreground">
          {view.coverageNote} This is not durable history and may reset when the backend restarts.
        </p>,
        <ActionGroup>
          <Button type="button" variant="outline" onClick={() => void buckets.refetch()}>
            Refresh snapshot
          </Button>
        </ActionGroup>,
      )}
      {view.empty ? (
        <WorkspaceState kind="empty" title="No live usage buckets were returned." />
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
    </section>
  );
}
