import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ActionGroup } from "@/components/workspace/ActionGroup";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
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
    <section className="mx-auto grid max-w-5xl gap-6">
      <WorkspaceHeader
        title={t("nav.logs")}
        description={t("logs.viewerDescription")}
        actions={
          <ActionGroup destructive>
            <Button variant="destructive" disabled={clear.isPending} onClick={confirmClear}>
              {t("logs.clear")}
            </Button>
          </ActionGroup>
        }
      />

      <section aria-labelledby="logs-viewer" className="grid gap-4">
        <h2 id="logs-viewer" className="text-base font-medium">
          {t("logs.viewerTitle")}
        </h2>
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
          <ActionGroup>
            <Button
              variant="outline"
              disabled={logs.isFetchingNextPage}
              onClick={() => void logs.fetchNextPage()}
            >
              {logs.isFetchingNextPage ? t("logs.loadingMore") : t("logs.loadMore")}
            </Button>
          </ActionGroup>
        )}
        {logs.isSuccess && logs.data.pages.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {t("logs.lineCount")}: {logs.data.pages.reduce((sum, page) => sum + page.lineCount, 0)}
          </p>
        )}
      </section>

      <section aria-labelledby="logs-errors" className="grid gap-3">
        <div>
          <h2 id="logs-errors" className="text-base font-medium">
            {t("logs.errorFilesTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("logs.errorFilesDescription")}</p>
        </div>
        <ErrorLogDownloads
          files={errorLogs.data}
          isPending={errorLogs.isPending}
          isError={errorLogs.isError}
          busy={download.isPending}
          onDownload={(name) => download.mutate(name)}
        />
      </section>
      {(logs.isFetching || errorLogs.isFetching) && !logs.isPending && !errorLogs.isPending && (
        <div className="h-1 w-full animate-pulse rounded bg-muted" aria-hidden="true" />
      )}
    </section>
  );
}
