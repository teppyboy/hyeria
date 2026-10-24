import type { ReactNode } from "react";
import { useApiKeyBucketsQuery } from "../queries";
import { usePreferencesStore } from "@/stores/preferences";
import { translate } from "@/lib/i18n";
import { toAnalyticsViewModel } from "../view-models";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionGroup } from "@/components/workspace/ActionGroup";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
import { WorkspaceState } from "@/components/workspace/WorkspaceState";

export function AnalyticsPage() {
  const language = usePreferencesStore((state) => state.language);
  const t = (key: string) => translate(language, key);
  const buckets = useApiKeyBucketsQuery();
  const refreshAction = (
    <ActionGroup>
      <Button type="button" variant="outline" onClick={() => void buckets.refetch()}>
        {t("analytics.refresh")}
      </Button>
    </ActionGroup>
  );
  const liveStatus = (
    <p role="note" data-slot="analytics-scope" className="text-sm text-muted-foreground">
      {t("analytics.liveStatus")}
    </p>
  );
  const header = (status: ReactNode = liveStatus) => (
    <WorkspaceHeader title={t("analytics.title")} status={status} actions={refreshAction} />
  );
  if (buckets.isPending)
    return (
      <section className="mx-auto grid max-w-5xl gap-6">
        {header()}
        <WorkspaceState kind="loading" title={t("analytics.loading")} />
      </section>
    );
  if (buckets.isError)
    return (
      <section className="mx-auto grid max-w-5xl gap-6">
        {header()}
        <WorkspaceState kind="error" title={t("analytics.error")} />
      </section>
    );
  const view = toAnalyticsViewModel(buckets.data);
  return (
    <section className="mx-auto grid max-w-5xl gap-6">
      {header()}
      {view.empty ? (
        <WorkspaceState kind="empty" title={t("analytics.empty")} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              {t("analytics.observed")} {new Date(view.observedAt).toLocaleString()}
            </p>
            <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-all text-xs">
              {view.serialized}
            </pre>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
