import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePreferencesStore } from "@/stores/preferences";
import { useUiStore } from "@/stores/ui";
import { translate } from "@/lib/i18n";
import {
  useClearLogsMutation,
  useDownloadErrorLogMutation,
  useErrorLogsQuery,
  useLogsQuery,
} from "../queries";
import { ErrorLogDownloads } from "../components/ErrorLogDownloads";
import { LogFilters } from "../components/LogFilters";
import { LogViewer } from "../components/LogViewer";

export function LogsPage() {
  const language = usePreferencesStore((state) => state.language);
  const t = (key: string) => translate(language, key);
  const [search, setSearch] = useState("");
  const [showManagement, setShowManagement] = useState(false);
  const logs = useLogsQuery();
  const errorLogs = useErrorLogsQuery();
  const clear = useClearLogsMutation();
  const download = useDownloadErrorLogMutation();
  const confirmClear = async () => {
    const accepted = await useUiStore.getState().requestConfirm({
      title: t("logs.clearTitle"),
      description: t("logs.clearDescription"),
      confirmLabel: t("logs.clear"),
      destructive: true,
    });
    if (!accepted) return;
    clear.mutate(undefined, {
      onSuccess: () => useUiStore.getState().notify(t("logs.clearSuccess")),
      onError: () => useUiStore.getState().notify(t("logs.clearError"), "error"),
    });
  };

  return (
    <section className="mx-auto grid max-w-5xl gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("nav.logs")}</h1>
        <Button variant="destructive" disabled={clear.isPending} onClick={confirmClear}>
          {t("logs.clear")}
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("logs.viewerTitle")}</CardTitle>
          <CardDescription>{t("logs.viewerDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LogFilters
            search={search}
            showManagement={showManagement}
            onSearchChange={setSearch}
            onShowManagementChange={setShowManagement}
          />
          <LogViewer
            batches={logs.data?.pages ?? []}
            isPending={logs.isPending}
            isError={logs.isError}
            search={search}
            showManagement={showManagement}
          />
          {logs.hasNextPage && (
            <Button
              variant="outline"
              disabled={logs.isFetchingNextPage}
              onClick={() => void logs.fetchNextPage()}
            >
              {logs.isFetchingNextPage ? t("logs.loadingMore") : t("logs.loadMore")}
            </Button>
          )}
          {logs.isSuccess && logs.data.pages.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("logs.lineCount")}: {logs.data.pages.reduce((sum, page) => sum + page.lineCount, 0)}
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("logs.errorFilesTitle")}</CardTitle>
          <CardDescription>{t("logs.errorFilesDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ErrorLogDownloads
            files={errorLogs.data}
            isPending={errorLogs.isPending}
            isError={errorLogs.isError}
            busy={download.isPending}
            onDownload={(name) => download.mutate(name)}
          />
        </CardContent>
      </Card>
      {(logs.isFetching || errorLogs.isFetching) && !logs.isPending && !errorLogs.isPending && (
        <Skeleton className="h-1 w-full" />
      )}
    </section>
  );
}
