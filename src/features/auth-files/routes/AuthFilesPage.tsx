import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { translate } from "@/lib/i18n";
import { usePreferencesStore } from "@/stores/preferences";
import { useUiStore } from "@/stores/ui";
import type { AuthFileView } from "../api";
import { AuthFileDetails } from "../components/AuthFileDetails";
import { AuthFileTable } from "../components/AuthFileTable";
import { UploadDialog } from "../components/UploadDialog";
import {
  useAuthFilesQuery,
  useDeleteAllAuthFilesMutation,
  useDeleteAuthFileMutation,
  useDownloadAuthFileMutation,
  useRefreshAuthFilesMutation,
  useSetAuthFileDisabledMutation,
} from "../queries";

export function AuthFilesPage() {
  const language = usePreferencesStore((state) => state.language);
  const t = (key: string) => translate(language, key);
  const files = useAuthFilesQuery();
  const refresh = useRefreshAuthFilesMutation();
  const deleteOne = useDeleteAuthFileMutation();
  const deleteAll = useDeleteAllAuthFilesMutation();
  const setDisabled = useSetAuthFileDisabledMutation();
  const download = useDownloadAuthFileMutation();
  const [uploading, setUploading] = useState(false);
  const [details, setDetails] = useState<AuthFileView | null>(null);
  const busy =
    refresh.isPending ||
    deleteOne.isPending ||
    deleteAll.isPending ||
    setDisabled.isPending ||
    download.isPending;

  const notifyError = () => useUiStore.getState().notify(t("authFiles.actionError"), "error");

  function handleRefresh() {
    refresh.mutate(undefined, {
      onSuccess: () => useUiStore.getState().notify(t("authFiles.refreshed")),
      onError: notifyError,
    });
  }

  function handleToggleDisabled(file: AuthFileView) {
    if (file.fileName === null) return;
    setDisabled.mutate({ name: file.fileName, disabled: !file.disabled }, { onError: notifyError });
  }

  function handleDownload(file: AuthFileView) {
    if (file.fileName === null) return;
    download.mutate(file.fileName, { onError: notifyError });
  }

  async function handleDelete(file: AuthFileView) {
    if (file.fileName === null) return;
    const accepted = await useUiStore.getState().requestConfirm({
      title: t("authFiles.deleteTitle"),
      description: t("authFiles.deleteDescription"),
      confirmLabel: t("authFiles.delete"),
      destructive: true,
    });
    if (!accepted) return;
    deleteOne.mutate(file.fileName, {
      onSuccess: () => useUiStore.getState().notify(t("authFiles.deleted")),
      onError: notifyError,
    });
  }

  async function handleDeleteAll() {
    const accepted = await useUiStore.getState().requestConfirm({
      title: t("authFiles.deleteAllTitle"),
      description: t("authFiles.deleteAllDescription"),
      confirmLabel: t("authFiles.deleteAll"),
      destructive: true,
    });
    if (!accepted) return;
    deleteAll.mutate(undefined, {
      onSuccess: () => useUiStore.getState().notify(t("authFiles.deletedAll")),
      onError: notifyError,
    });
  }

  return (
    <section className="mx-auto grid max-w-5xl gap-4">
      <h1 className="text-2xl font-semibold">{t("nav.authFiles")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t("authFiles.files")}</CardTitle>
          <CardDescription>{t("authFiles.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={busy}>
              {t("authFiles.refresh")}
            </Button>
            <Button variant="outline" onClick={() => setUploading(true)} disabled={busy}>
              {t("authFiles.upload")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAll}
              disabled={busy || !files.isSuccess || files.data.length === 0}
            >
              {t("authFiles.deleteAll")}
            </Button>
          </div>
          {files.isPending && (
            <div className="space-y-2">
              <p className="text-muted-foreground">{t("authFiles.loading")}</p>
              <Skeleton className="h-32 w-full" />
            </div>
          )}
          {files.isError && <p role="alert">{t("authFiles.loadError")}</p>}
          {files.isSuccess && files.data.length === 0 && (
            <p className="text-muted-foreground">{t("authFiles.empty")}</p>
          )}
          {files.isSuccess && files.data.length > 0 && (
            <AuthFileTable
              files={files.data}
              busy={busy}
              onDetails={setDetails}
              onToggleDisabled={handleToggleDisabled}
              onDownload={handleDownload}
              onDelete={handleDelete}
            />
          )}
        </CardContent>
      </Card>
      {uploading && <UploadDialog onClose={() => setUploading(false)} />}
      {details && <AuthFileDetails file={details} onClose={() => setDetails(null)} />}
    </section>
  );
}
